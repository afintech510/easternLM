import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

/**
 * POST /api/quote/[token]/confirm-card
 * Called after successful Stripe card payment on quote page.
 * Creates an order from the quote with all delivery details preserved.
 */
export async function POST(
  request: Request,
  context: { params: Promise<{ token: string }> }
) {
  const { token } = await context.params;
  const { paymentIntentId } = await request.json().catch(() => ({}));
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = getSupabaseAdminClient() as any;

  const { data: quote } = await supabase
    .from("quotes")
    .select("*")
    .eq("public_token", token)
    .maybeSingle();

  if (!quote) return NextResponse.json({ error: "Quote not found" }, { status: 404 });
  if (["converted"].includes(quote.status)) {
    // Return the existing order ID if already converted
    return NextResponse.json({ ok: true, alreadyConverted: true, orderId: quote.converted_order_id });
  }

  // Idempotency: if an order already exists for this quote, don't create another
  if (quote.converted_order_id) {
    return NextResponse.json({ ok: true, orderId: quote.converted_order_id, alreadyConverted: true });
  }

  const ccSurcharge = Math.round(quote.total_cents * 0.035);

  // Update quote status
  await supabase.from("quotes").update({
    status: "accepted",
    accepted_at: new Date().toISOString(),
  }).eq("id", quote.id);

  // Create order with all delivery details
  const { data: order } = await supabase.from("orders").insert({
    stripe_checkout_session_id: paymentIntentId || null,
    customer_name: quote.customer_name,
    customer_email: quote.customer_email || null,
    customer_phone: quote.customer_phone || null,
    customer_id: quote.customer_id || null,
    customer_address: quote.customer_address || null,
    status: "paid",
    payment_method: "card_online",
    source: "quote",
    quote_id: quote.id,
    delivery_method: quote.delivery_address ? "delivery" : "pickup",
    delivery_address: quote.delivery_address || null,
    delivery_date: quote.delivery_date || null,
    delivery_time_window: quote.delivery_time_window || null,
    delivery_notes: quote.delivery_notes || null,
    access_constraints: quote.access_constraints || {},
    materials_subtotal_cents: quote.subtotal_cents,
    delivery_total_cents: quote.delivery_fee_cents || 0,
    tax_cents: quote.tax_cents,
    cc_surcharge_cents: ccSurcharge,
    grand_total_cents: quote.total_cents + ccSurcharge,
    metadata: { quote_id: quote.id, quote_number: quote.quote_number, source: "quote_card" },
  }).select("id").single();

  if (order) {
    // Create order items from quote line items
    const items = (quote.line_items || []).map((item: any) => ({
      order_id: order.id,
      product_name: item.description,
      quantity: item.quantity,
      unit: item.unit,
      unit_price_cents: item.unit_price_cents,
      line_subtotal_cents: item.total_cents,
    }));
    if (items.length > 0) await supabase.from("order_items").insert(items);

    // Link quote to order
    await supabase.from("quotes").update({ converted_order_id: order.id, status: "converted" }).eq("id", quote.id);

    // Auto-create delivery assignments
    if (quote.delivery_address) {
      try {
        const { createDeliveryAssignments } = await import("@/lib/dispatch/auto-assign");
        const { data: fullOrder } = await supabase.from("orders").select("*").eq("id", order.id).single();
        if (fullOrder) await createDeliveryAssignments(fullOrder as any);
      } catch {}
    }
  }

  // Send confirmation email to customer
  try {
    const { sendQuoteConfirmationEmail } = await import("@/lib/email/quote-confirmation");
    await sendQuoteConfirmationEmail(quote, { depositAmountCents: quote.deposit_required_cents > 0 ? (quote.deposit_required_cents + Math.round(quote.deposit_required_cents * 0.035)) : (quote.total_cents + ccSurcharge), paymentMethod: "card" });
  } catch (err) { console.error("[confirm-card] Customer email error:", err); }

  // Notify office
  try {
    const { Resend } = await import("resend");
    const resend = new Resend(process.env.RESEND_API_KEY);
    const f = (c: number) => `$${(c / 100).toFixed(2)}`;
    const lineItems = (quote.line_items || []) as Array<{ description: string; quantity: number; unit: string; total_cents: number; unit_price_cents: number }>;
    const materialItems = lineItems.filter((i) => i.unit !== "trip" && i.unit !== "load");
    const itemsSummary = materialItems.map((i) => `${i.quantity} ${i.unit} ${i.description}`).join(", ") || "items";
    const isDelivery = !!quote.delivery_address;

    const itemsHtml = materialItems.map((i) =>
      `<tr><td style="padding:4px 8px;border-bottom:1px solid #eee;">${i.description}</td><td style="padding:4px 8px;border-bottom:1px solid #eee;text-align:center;">${i.quantity} ${i.unit}</td><td style="padding:4px 8px;border-bottom:1px solid #eee;text-align:right;">${f(i.total_cents)}</td></tr>`
    ).join("");

    // SMS to office
    const { sendSms } = await import("@/lib/sms");
    const smsLines = [
      `🆕 QUOTE ORDER — ${quote.customer_name}`,
      `📦 ${itemsSummary}`,
      `💰 ${f(quote.total_cents + ccSurcharge)} (materials ${f(quote.subtotal_cents)})`,
      `💳 Card payment (${quote.quote_number})`,
    ];
    if (isDelivery) {
      smsLines.push(`🚛 Delivery: ${quote.delivery_address}`);
      if (quote.delivery_date || quote.delivery_time_window) smsLines.push(`📅 ${quote.delivery_date || "TBD"} · ${quote.delivery_time_window || "Flexible"}`);
      if (quote.delivery_fee_cents > 0) smsLines.push(`Delivery fee: ${f(quote.delivery_fee_cents)}`);
      if (quote.delivery_notes) smsLines.push(`📝 ${quote.delivery_notes}`);
    } else {
      smsLines.push("🏗️ Pickup");
    }
    smsLines.push(`📞 ${quote.customer_phone || "No phone"}`);
    await sendSms("+16318746244", smsLines.join("\n")).catch(() => {});

    await resend.emails.send({
      from: `Eastern LM <${process.env.RESEND_FROM_EMAIL ?? "orders@easternlm.com"}>`,
      to: ["adam@easternbuilding.supply", "ronnie@easternbuilding.supply"],
      subject: `Card Order: ${quote.customer_name} — ${itemsSummary} — ${f(quote.total_cents + ccSurcharge)}`,
      html: `<div style="font-family:sans-serif;max-width:560px;">
        <h2 style="color:#1a3a5c;margin-bottom:4px;">Quote Order — Card Payment</h2>
        <p style="color:#666;margin-top:0;">${quote.quote_number}</p>

        <table style="width:100%;border-collapse:collapse;margin:12px 0;">
          <tr style="background:#1a3a5c;color:white;">
            <th style="padding:6px 8px;text-align:left;">Material</th>
            <th style="padding:6px 8px;text-align:center;">Qty</th>
            <th style="padding:6px 8px;text-align:right;">Subtotal</th>
          </tr>
          ${itemsHtml}
        </table>

        ${isDelivery ? `
        <div style="background:#f0f4f8;border-radius:6px;padding:12px;margin:12px 0;">
          <p style="margin:0 0 4px;font-weight:600;color:#1a3a5c;">🚛 Delivery Details</p>
          <p style="margin:2px 0;"><strong>Address:</strong> ${quote.delivery_address}</p>
          <p style="margin:2px 0;"><strong>Date:</strong> ${quote.delivery_date || "Not specified"}</p>
          <p style="margin:2px 0;"><strong>Time:</strong> ${quote.delivery_time_window || "Flexible"}</p>
          <p style="margin:2px 0;"><strong>Delivery Fee:</strong> ${f(quote.delivery_fee_cents || 0)}</p>
          ${quote.delivery_notes ? `<p style="margin:2px 0;"><strong>Notes:</strong> ${quote.delivery_notes}</p>` : ""}
        </div>` : `<p>🏗️ <strong>Pickup</strong></p>`}

        <table style="width:100%;margin:12px 0;font-size:14px;">
          <tr><td>Materials:</td><td style="text-align:right;">${f(quote.subtotal_cents)}</td></tr>
          ${isDelivery ? `<tr><td>Delivery:</td><td style="text-align:right;">${f(quote.delivery_fee_cents || 0)}</td></tr>` : ""}
          <tr><td>Tax:</td><td style="text-align:right;">${f(quote.tax_cents)}</td></tr>
          <tr><td>CC Surcharge:</td><td style="text-align:right;">${f(ccSurcharge)}</td></tr>
          <tr style="font-weight:bold;font-size:16px;"><td>Total:</td><td style="text-align:right;">${f(quote.total_cents + ccSurcharge)}</td></tr>
        </table>

        <div style="background:#f9f9f9;border-radius:6px;padding:12px;margin:12px 0;">
          <p style="margin:2px 0;"><strong>Customer:</strong> ${quote.customer_name}</p>
          <p style="margin:2px 0;"><strong>Phone:</strong> ${quote.customer_phone || "—"}</p>
          <p style="margin:2px 0;"><strong>Email:</strong> ${quote.customer_email || "—"}</p>
        </div>

        <p style="margin-top:16px;"><a href="https://easternlm.com/admin/operations" style="background:#c8952e;color:white;padding:10px 20px;border-radius:6px;text-decoration:none;font-weight:bold;">View in Admin →</a></p>
      </div>`,
    });
  } catch {}

  return NextResponse.json({ ok: true, orderId: order?.id });
}
