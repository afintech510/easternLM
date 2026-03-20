import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

/**
 * POST /api/quote/[token]/confirm-cod
 * Customer confirms COD — creates order without payment.
 */
export async function POST(
  _request: Request,
  context: { params: Promise<{ token: string }> }
) {
  const { token } = await context.params;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = getSupabaseAdminClient() as any;

  const { data: quote } = await supabase
    .from("quotes")
    .select("*")
    .eq("public_token", token)
    .maybeSingle();

  if (!quote) return NextResponse.json({ error: "Quote not found" }, { status: 404 });
  if (["accepted", "converted"].includes(quote.status)) {
    return NextResponse.json({ error: "Already accepted" }, { status: 400 });
  }

  // Update quote status
  await supabase.from("quotes").update({
    status: "accepted",
    accepted_at: new Date().toISOString(),
  }).eq("id", quote.id);

  // Create order
  const { data: order } = await supabase.from("orders").insert({
    customer_name: quote.customer_name,
    customer_email: quote.customer_email || null,
    customer_phone: quote.customer_phone || null,
    customer_id: quote.customer_id || null,
    status: "confirmed",
    payment_method: "cod",
    source: "quote",
    delivery_method: quote.delivery_address ? "delivery" : "pickup",
    delivery_address: quote.delivery_address || null,
    materials_subtotal_cents: quote.subtotal_cents,
    delivery_total_cents: quote.delivery_fee_cents || 0,
    tax_cents: quote.tax_cents,
    cc_surcharge_cents: 0,
    grand_total_cents: quote.total_cents,
    metadata: { quote_id: quote.id, quote_number: quote.quote_number, source: "quote_cod" },
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
      subject: `COD Order: ${quote.customer_name} — ${f(quote.total_cents)}`,
      html: `<p>Quote ${quote.quote_number} accepted as COD.</p><p>${quote.customer_name} — ${f(quote.total_cents)}</p><p>${quote.delivery_address || "Pickup"}</p>`,
    });
  } catch {}

  return NextResponse.json({ ok: true, orderId: order?.id });
}
