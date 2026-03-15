import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  const body = await request.json();
  const supabase = getSupabaseAdminClient();

  const {
    items,
    subtotal_cents,
    tax_cents,
    cc_fee_cents,
    delivery_fee_cents,
    grand_total_cents,
    payment_method,
    delivery_method,
    delivery_address,
    customer_name,
    customer_phone,
    notes,
  } = body;

  // Find customer by phone if provided
  let customerId: string | undefined;
  if (customer_phone) {
    const phone = customer_phone.replace(/\D/g, "");
    if (phone.length === 10) {
      const { data: cust } = await supabase.from("customers").select("id").eq("phone", phone).maybeSingle();
      if (cust) customerId = cust.id;
    }
  }

  // Create order — use `as any` to bypass strict type checks for new columns
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const orderData: any = {
    status: "paid",
    source: "pos",
    payment_method: payment_method || "cash",
    customer_name: customer_name || "Walk-in",
    delivery_method: delivery_method || "pickup",
    delivery_fee_cents: delivery_fee_cents || 0,
    subtotal_cents,
    tax_cents,
    cc_surcharge_cents: cc_fee_cents || 0,
    grand_total_cents,
    items,
  };

  if (customer_phone) orderData.customer_phone = customer_phone;
  if (delivery_address) orderData.delivery_address = delivery_address;
  if (delivery_fee_cents) orderData.delivery_fee_override = delivery_fee_cents;
  if (notes) orderData.notes = notes;
  if (customerId) orderData.customer_id = customerId;

  const { data: order, error } = await supabase
    .from("orders")
    .insert(orderData)
    .select("id")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Update customer order count if linked
  if (customerId) {
    const { data: cust } = await supabase.from("customers").select("total_orders, total_spent_cents").eq("id", customerId).single();
    if (cust) {
      await supabase.from("customers").update({
        total_orders: (cust.total_orders || 0) + 1,
        total_spent_cents: (cust.total_spent_cents || 0) + grand_total_cents,
        last_order_at: new Date().toISOString(),
      }).eq("id", customerId);
    }
  }

  return NextResponse.json({ ok: true, orderId: order.id });
}
