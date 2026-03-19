import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { ensureCustomerForOrder, linkCustomerToOrder, normalizePhone } from "@/lib/customers/lifecycle";
import { deductInventoryForOrder } from "@/lib/inventory/deduct";
import { createDeliveryAssignments } from "@/lib/dispatch/auto-assign";
import { createProjectFromPOSOrder } from "@/lib/projects/auto-create";

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

  // Deduct inventory
  try { await deductInventoryForOrder(order.id as string); } catch (err) { console.error("Inventory deduction failed:", err); }

  // Auto-create delivery assignments
  if (delivery_method === "delivery") {
    try {
      await createDeliveryAssignments({
        id: order.id as string,
        delivery_method: delivery_method || "pickup",
        delivery_address: delivery_address || null,
        delivery_zip: null,
        delivery_schedule: [],
        distance_meters: null,
        duration_seconds: null,
        access_constraints: {},
        metadata: { deliveryDate: delivery_date, notes },
        total_loads: 1,
        total_delivery_days: 1,
      });
    } catch (err) { console.error("Auto-dispatch failed:", err); }
  }

  // Link customer and update stats using shared lifecycle engine
  const { customer_id: explicitCustomerId } = body;
  let resolvedCustomerId = explicitCustomerId || customerId;

  // If no customer found by phone and no explicit ID, try to create one
  if (!resolvedCustomerId && (customer_phone || customer_email)) {
    resolvedCustomerId = await ensureCustomerForOrder({
      customer_name: customer_name || "Walk-in",
      customer_email: customer_email || null,
      customer_phone: customer_phone || null,
      delivery_address: delivery_address || null,
    });
  }

  if (resolvedCustomerId) {
    await linkCustomerToOrder(order.id as string, resolvedCustomerId);

    // For charge account payments, also increment balance
    if (payment_method === "account") {
      const { data: cust } = await (supabase as any)
        .from("customers")
        .select("current_balance_cents, is_charge_account")
        .eq("id", resolvedCustomerId)
        .single();
      if (cust?.is_charge_account) {
        await (supabase as any).from("customers").update({
          current_balance_cents: (cust.current_balance_cents || 0) + grand_total_cents,
        }).eq("id", resolvedCustomerId);
      }
    }
  }

  // Auto-create project if order has labor/service items
  try {
    await createProjectFromPOSOrder({
      id: order.id as string,
      customer_id: resolvedCustomerId ?? null,
      customer_name: customer_name || "Walk-in",
      customer_phone: customer_phone || null,
      customer_email: customer_email || null,
      delivery_address: delivery_address || null,
      delivery_method: delivery_method || "pickup",
      grand_total_cents: grand_total_cents,
    });
  } catch (err) { console.error("POS project auto-create failed:", err); }

  // Notify office: SMS + email on new POS order
  try {
    const fmt = (c: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(c / 100);
    const itemsList = (items as any[])?.map((i: any) => `${i.quantity}x ${i.product_name ?? "item"}`).join(", ") ?? "";
    const sid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const fromPhone = process.env.TWILIO_PHONE_NUMBER;
    if (sid && authToken && fromPhone) {
      await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
        method: "POST",
        headers: { Authorization: `Basic ${Buffer.from(`${sid}:${authToken}`).toString("base64")}`, "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ To: "+16318746244", From: fromPhone, Body: `POS order: ${customer_name ?? "Walk-in"} — ${fmt(grand_total_cents)}\n${delivery_method === "delivery" ? `Delivery: ${delivery_address}` : "Pickup"}\n${itemsList}` }),
      }).catch(() => {});
    }
    const { Resend } = await import("resend");
    const resend = new Resend(process.env.RESEND_API_KEY);
    await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL ?? "orders@send.easternlm.com",
      to: ["adam@easternbuilding.supply", "ronnie@easternbuilding.supply"],
      subject: `POS Order — ${customer_name ?? "Walk-in"} — ${fmt(grand_total_cents)}`,
      html: `<div style="font-family:sans-serif;"><h2 style="color:#1a3a5c;">POS Order</h2><p><b>Customer:</b> ${customer_name ?? "Walk-in"}</p><p><b>Total:</b> ${fmt(grand_total_cents)}</p><p><b>Payment:</b> ${payment_method}</p><p><b>Items:</b> ${itemsList}</p><p><a href="https://easternlm.com/admin/operations" style="background:#c8952e;color:white;padding:10px 20px;border-radius:6px;text-decoration:none;font-weight:bold;">View in Admin</a></p></div>`,
    }).catch(() => {});
  } catch {}

  return NextResponse.json({ ok: true, orderId: order.id });
}
