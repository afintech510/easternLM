import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/auth";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export async function GET(request: Request) {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim();

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

  // Fetch order history for each customer
  const results = await Promise.all(
    (customers || []).map(async (customer) => {
      const { data: orders } = await supabase
        .from("order_history")
        .select("wc_order_id, order_date, status, payment_method, order_total_cents, delivery_address, delivery_city, delivery_notes, items")
        .eq("customer_id", customer.id)
        .order("order_date", { ascending: false })
        .limit(10);

      return { ...customer, recent_orders: orders || [] };
    })
  );

  return NextResponse.json({ customers: results, total: results.length, query: q });
}
