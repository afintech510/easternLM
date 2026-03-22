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
    return NextResponse.json({ ok: true, alreadyConverted: true });
  }

  const ccSurcharge = Math.round(quote.total_cents * 0.03);

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

  // Notify office
  try {
    const { Resend } = await import("resend");
    const resend = new Resend(process.env.RESEND_API_KEY);
    const f = (c: number) => `$${(c / 100).toFixed(2)}`;
    await resend.emails.send({
      from: `Eastern LM <${process.env.RESEND_FROM_EMAIL ?? "orders@send.easternlm.com"}>`,
      to: ["adam@easternbuilding.supply", "ronnie@easternbuilding.supply"],
      subject: `Card Order: ${quote.customer_name} — ${f(quote.total_cents + ccSurcharge)}`,
      html: `<p>Quote ${quote.quote_number} paid by card.</p>
        <p>${quote.customer_name} — ${f(quote.total_cents + ccSurcharge)}</p>
        <p>${quote.delivery_address ? `Delivery: ${quote.delivery_address}` : "Pickup"}</p>
        ${quote.delivery_date ? `<p>Date: ${quote.delivery_date}</p>` : ""}
        ${quote.delivery_time_window ? `<p>Time: ${quote.delivery_time_window}</p>` : ""}
        ${quote.delivery_notes ? `<p>Notes: ${quote.delivery_notes}</p>` : ""}`,
    });
  } catch {}

  return NextResponse.json({ ok: true, orderId: order?.id });
}
