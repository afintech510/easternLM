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
    customer_email,
    delivery_date,
    delivery_time_window,
    notes,
    status_override,
    tax_exempt,
    tax_exempt_certificate,
    discount_type,
    discount_value,
    discount_reason,
    discount_amount_cents,
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

  // Build order row using actual columns from orders table
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const orderData: any = {
    status: status_override || "paid",
    source: "pos",
    payment_method: payment_method || "cash",
    customer_name: customer_name || "Walk-in",
    customer_email: customer_email || null,
    customer_phone: customer_phone || null,
    delivery_method: delivery_method || "pickup",
    delivery_address: delivery_address || null,
    materials_subtotal_cents: subtotal_cents,
    delivery_total_cents: delivery_fee_cents || 0,
    tax_cents,
    cc_surcharge_cents: cc_fee_cents || 0,
    grand_total_cents,
  };

  if (customerId) orderData.customer_id = customerId;

  // Store delivery scheduling + notes + discount/tax info in metadata
  const metadata: Record<string, unknown> = { source: "pos" };
  if (delivery_date) metadata.deliveryDate = delivery_date;
  if (delivery_time_window) metadata.deliveryTimeWindow = delivery_time_window;
  if (notes) metadata.notes = notes;
  if (tax_exempt) metadata.tax_exempt = true;
  if (tax_exempt_certificate) metadata.tax_exempt_certificate = tax_exempt_certificate;
  if (discount_type) metadata.discount_type = discount_type;
  if (discount_value) metadata.discount_value = discount_value;
  if (discount_reason) metadata.discount_reason = discount_reason;
  if (discount_amount_cents) metadata.discount_amount_cents = discount_amount_cents;
  orderData.metadata = metadata;

  const { data: order, error } = await supabase
    .from("orders")
    .insert(orderData)
    .select("id")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Save order items
  if (items && Array.isArray(items)) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const orderItems = (items as any[]).map((item) => ({
      order_id: order.id as string,
      product_id: (item.product_id as string) || null,
      product_name: (item.product_name as string) || "Unknown",
      product_slug: (item.product_slug as string) || null,
      quantity: (item.quantity as number) || 1,
      unit: "unit" as const,
      unit_price_cents: (item.unit_price_cents as number) || 0,
      line_subtotal_cents: (item.line_total_cents as number) || 0,
    }));
    await supabase.from("order_items").insert(orderItems);
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
