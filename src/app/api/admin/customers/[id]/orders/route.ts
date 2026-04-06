import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  const supabase = getSupabaseAdminClient();

  // Get customer details for phone-based fallback
  const { data: customer } = await supabase
    .from("customers")
    .select("id, phone, email")
    .eq("id", id)
    .single();

  // Query new orders by customer_id
  const { data: newOrders } = await supabase
    .from("orders")
    .select("id, placed_at, grand_total_cents, materials_subtotal_cents, delivery_method, status, payment_method, account_paid_at, account_payment_method, account_payment_note, order_items(product_name, quantity, unit_price_cents)")
    .eq("customer_id", id)
    .order("placed_at", { ascending: false })
    .limit(20);

  // Query WooCommerce order history by customer_id
  const { data: wcOrders } = await supabase
    .from("order_history")
    .select("id, wc_order_id, order_date, order_total_cents, status, items")
    .eq("customer_id", id)
    .order("order_date", { ascending: false })
    .limit(20);

  // If no results by customer_id, try phone number match
  let phoneOrders: typeof newOrders = [];
  let phoneWcOrders: typeof wcOrders = [];

  if ((!newOrders?.length && !wcOrders?.length) && customer?.phone) {
    const phone = customer.phone.replace(/\D/g, "").slice(-10);
    if (phone.length >= 7) {
      const { data: po } = await supabase
        .from("orders")
        .select("id, placed_at, grand_total_cents, materials_subtotal_cents, delivery_method, status, order_items(product_name, quantity, unit_price_cents)")
        .ilike("customer_phone", `%${phone.slice(-7)}%`)
        .order("placed_at", { ascending: false })
        .limit(20);
      phoneOrders = po;

      const { data: pwo } = await supabase
        .from("order_history")
        .select("id, wc_order_id, order_date, order_total_cents, status, items")
        .ilike("delivery_notes", `%${phone.slice(-7)}%`)
        .order("order_date", { ascending: false })
        .limit(20);
      phoneWcOrders = pwo;
    }
  }

  // Merge and normalize
  const allNew = [...(newOrders ?? []), ...(phoneOrders ?? [])];
  const allWc = [...(wcOrders ?? []), ...(phoneWcOrders ?? [])];

  // Deduplicate by id
  const seenIds = new Set<string>();
  const orders = [
    ...allNew.map((o: any) => {
      if (seenIds.has(o.id)) return null;
      seenIds.add(o.id);
      return {
        id: o.id,
        placed_at: o.placed_at,
        grand_total_cents: o.grand_total_cents,
        status: o.status,
        payment_method: o.payment_method,
        account_paid_at: o.account_paid_at,
        account_payment_method: o.account_payment_method,
        account_payment_note: o.account_payment_note,
        source: "platform",
        order_items: o.order_items ?? [],
      };
    }).filter(Boolean),
    ...allWc.map((o: any) => {
      if (seenIds.has(o.id)) return null;
      seenIds.add(o.id);
      return {
        id: o.id,
        placed_at: o.order_date,
        grand_total_cents: o.order_total_cents,
        status: o.status ?? "completed",
        source: "woocommerce",
        order_items: (o.items ?? []).map((item: any) => ({
          product_name: item.name ?? item.product_name ?? "Item",
          quantity: item.quantity ?? 1,
          unit_price_cents: item.total_cents ? Math.round(item.total_cents / (item.quantity || 1)) : 0,
        })),
      };
    }).filter(Boolean),
  ].sort((a: any, b: any) => new Date(b.placed_at).getTime() - new Date(a.placed_at).getTime())
   .slice(0, 30);

  return NextResponse.json({ orders });
}
