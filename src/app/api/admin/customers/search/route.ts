import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/auth";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export async function GET(request: Request) {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim();
  const flagged = searchParams.get("flagged");

  // Flagged customers filter — return all scammer-flagged customers
  if (flagged === "true") {
    const supabase = getSupabaseAdminClient();
    const { data: customers, error } = await supabase
      .from("customers")
      .select("*")
      .eq("is_scammer", true)
      .order("updated_at", { ascending: false })
      .limit(100);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ customers: (customers || []).map(c => ({ ...c, recent_orders: [] })) });
  }

  if (!q || q.length < 2) {
    return NextResponse.json({ error: "Query must be at least 2 characters" }, { status: 400 });
  }

  const supabase = getSupabaseAdminClient();

  // Determine search type based on query format
  const isPhone = /^\d{3,}$/.test(q.replace(/[\s()\-+.]/g, ""));
  const isEmail = q.includes("@");

  let customerQuery;

  if (isPhone) {
    // Phone search: normalize to digits and match
    const digits = q.replace(/\D/g, "");
    customerQuery = supabase
      .from("customers")
      .select("*")
      .ilike("phone", `%${digits}%`)
      .order("total_orders", { ascending: false })
      .limit(20);
  } else if (isEmail) {
    customerQuery = supabase
      .from("customers")
      .select("*")
      .ilike("email", `%${q}%`)
      .order("total_orders", { ascending: false })
      .limit(20);
  } else {
    // Full-text search across name, address, company
    // Use ilike for simple substring matching (more forgiving than FTS for yard staff)
    const pattern = `%${q}%`;
    customerQuery = supabase
      .from("customers")
      .select("*")
      .or(
        `first_name.ilike.${pattern},last_name.ilike.${pattern},company_name.ilike.${pattern},address.ilike.${pattern},city.ilike.${pattern}`
      )
      .order("total_orders", { ascending: false })
      .limit(20);
  }

  const { data: customers, error } = await customerQuery;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Fetch order history for each customer (both platform orders and WooCommerce legacy)
  const results = await Promise.all(
    (customers || []).map(async (customer) => {
      // New platform orders
      const { data: platformOrders } = await supabase
        .from("orders")
        .select("id, placed_at, grand_total_cents, status, payment_method, delivery_method, order_items(product_name, quantity, unit_price_cents)")
        .eq("customer_id", customer.id)
        .order("placed_at", { ascending: false })
        .limit(15);

      // Legacy WooCommerce orders
      const { data: wcOrders } = await supabase
        .from("order_history")
        .select("wc_order_id, order_date, status, payment_method, order_total_cents, delivery_address, delivery_city, delivery_notes, items")
        .eq("customer_id", customer.id)
        .order("order_date", { ascending: false })
        .limit(15);

      // Merge and sort by date (newest first)
      const merged = [
        ...(platformOrders ?? []).map((o: any) => ({
          wc_order_id: o.id?.slice(0, 8),
          order_date: o.placed_at,
          order_total_cents: o.grand_total_cents,
          payment_method: o.payment_method,
          delivery_address: o.delivery_method,
          items: (o.order_items ?? []).map((i: any) => ({ name: i.product_name, quantity: i.quantity, costCents: i.unit_price_cents })),
          source: "platform",
          status: o.status,
        })),
        ...(wcOrders ?? []).map((o: any) => ({
          ...o,
          source: "woocommerce",
        })),
      ].sort((a: any, b: any) => new Date(b.order_date).getTime() - new Date(a.order_date).getTime())
       .slice(0, 15);

      return { ...customer, recent_orders: merged };
    })
  );

  return NextResponse.json({ customers: results, total: results.length, query: q });
}
