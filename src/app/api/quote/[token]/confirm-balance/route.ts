import { NextResponse } from "next/server";
import Stripe from "stripe";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

/**
 * POST /api/quote/[token]/confirm-balance
 * Called after a successful Stripe balance-payment for a finalized quote.
 * Marks the balance as paid on the quote, and once deposit+balance covers the
 * total, converts the quote to a paid order via the standard convert flow.
 * Idempotent — webhook handler also covers this case.
 */
export async function POST(
  request: Request,
  context: { params: Promise<{ token: string }> }
) {
  const { token } = await context.params;
  const { paymentIntentId } = await request.json().catch(() => ({}));
  if (!paymentIntentId) {
    return NextResponse.json({ error: "paymentIntentId required" }, { status: 400 });
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
  const pi = await stripe.paymentIntents.retrieve(paymentIntentId);
  if (pi.status !== "succeeded") {
    return NextResponse.json({ error: `Payment status is ${pi.status}` }, { status: 400 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = getSupabaseAdminClient() as any;
  const { data: quote } = await supabase
    .from("quotes")
    .select("*")
    .eq("public_token", token)
    .maybeSingle();

  if (!quote) return NextResponse.json({ error: "Quote not found" }, { status: 404 });

  // Idempotency: if already recorded under this PI, no-op.
  if (quote.balance_stripe_payment_id === pi.id && (quote.balance_paid_cents ?? 0) > 0) {
    return NextResponse.json({ ok: true, alreadyRecorded: true });
  }

  // The PI amount includes the 3.5% card surcharge. The balance applied to the
  // quote is the base amount (from PI metadata), not the gross charge.
  const baseAmount = parseInt((pi.metadata?.base_amount as string) || "0", 10);
  const newBalancePaid = (quote.balance_paid_cents ?? 0) + baseAmount;

  await supabase
    .from("quotes")
    .update({
      balance_paid_cents: newBalancePaid,
      balance_paid_at: new Date().toISOString(),
      balance_stripe_payment_id: pi.id,
      updated_at: new Date().toISOString(),
    })
    .eq("id", quote.id);

  // Check whether deposit + balance now covers the total. Allow a small rounding
  // tolerance so a $0.01 leftover doesn't keep the quote stuck.
  const totalPaid = (quote.deposit_paid_cents ?? 0) + newBalancePaid;
  const fullyPaid = totalPaid + 5 >= (quote.total_cents ?? 0);

  let orderId: string | null = quote.converted_order_id ?? null;

  if (fullyPaid && !orderId) {
    // Convert quote to order, inline (mirrors /api/admin/quotes/[id]/convert).
    const ccSurcharge = Math.round((quote.total_cents ?? 0) * 0.035);
    const { data: order } = await supabase
      .from("orders")
      .insert({
        stripe_checkout_session_id: pi.id,
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
        grand_total_cents: (quote.total_cents ?? 0) + ccSurcharge,
        metadata: {
          quote_id: quote.id,
          quote_number: quote.quote_number,
          deposit_paid_cents: quote.deposit_paid_cents ?? 0,
          balance_paid_cents: newBalancePaid,
          source: "quote_balance_paid",
        },
      })
      .select("id")
      .single();

    if (order) {
      orderId = order.id;
      // Order items from quote line items
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const items = ((quote.line_items as any[]) || []).map((item: any) => ({
        order_id: order.id,
        product_name: item.description,
        quantity: item.quantity,
        unit: item.unit,
        unit_price_cents: item.unit_price_cents,
        line_subtotal_cents: item.total_cents,
      }));
      if (items.length > 0) await supabase.from("order_items").insert(items);

      await supabase
        .from("quotes")
        .update({ converted_order_id: orderId, status: "converted" })
        .eq("id", quote.id);
    }
  }

  return NextResponse.json({ ok: true, orderId, fullyPaid });
}
