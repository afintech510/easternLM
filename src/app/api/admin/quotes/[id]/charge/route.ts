import { NextResponse } from "next/server";
import Stripe from "stripe";
import { requireAdmin } from "@/lib/admin/auth";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { convertQuoteToOrder } from "@/lib/quotes/convert";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

type RouteContext = { params: Promise<{ id: string }> };

// 3.5% card surcharge — matches the customer-facing online quote payment flow.
const CC_SURCHARGE_RATE = 0.035;

// POST — admin keys in the customer's card to charge the full quote amount (MOTO).
// Two phases:
//   1. body {}                       → create a card-only PaymentIntent, return clientSecret
//   2. body { paymentIntentId }      → verify it succeeded, then create a PAID order from the quote
export async function POST(request: Request, context: RouteContext) {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  const { id } = await context.params;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = getSupabaseAdminClient() as any;

  const body = await request.json().catch(() => ({}));
  const { paymentIntentId } = body;

  // Fetch quote
  const { data: quote, error: qErr } = await supabase
    .from("quotes")
    .select("*")
    .eq("id", id)
    .single();

  if (qErr || !quote) return NextResponse.json({ error: "Quote not found" }, { status: 404 });
  if (quote.converted_order_id) return NextResponse.json({ error: "Quote already converted to an order" }, { status: 400 });
  if (!["accepted", "sent", "viewed"].includes(quote.status)) {
    return NextResponse.json({ error: `Cannot charge a quote in "${quote.status}" status` }, { status: 400 });
  }

  const baseCents = quote.total_cents as number;
  const surchargeCents = Math.round(baseCents * CC_SURCHARGE_RATE);
  const amountCents = baseCents + surchargeCents;

  // ── Phase 1: create the PaymentIntent ──
  if (!paymentIntentId) {
    if (!baseCents || baseCents < 50) {
      return NextResponse.json({ error: "Quote total must be at least $0.50" }, { status: 400 });
    }
    try {
      const pi = await stripe.paymentIntents.create({
        amount: amountCents,
        currency: "usd",
        // card only — no Link, wallets, or redirects (keyed-in MOTO entry)
        payment_method_types: ["card"],
        capture_method: "automatic",
        description: `Quote ${quote.quote_number} — manual card charge`,
        metadata: {
          source: "admin_manual_quote_charge",
          quote_id: quote.id,
          quote_number: quote.quote_number,
          customer_name: quote.customer_name ?? "",
          base_cents: String(baseCents),
          surcharge_cents: String(surchargeCents),
        },
      });
      return NextResponse.json({
        clientSecret: pi.client_secret,
        paymentIntentId: pi.id,
        baseCents,
        surchargeCents,
        amountCents,
      });
    } catch (err) {
      return NextResponse.json({ error: err instanceof Error ? err.message : "Failed to create payment" }, { status: 500 });
    }
  }

  // ── Phase 2: verify payment + create the order ──
  let pi: Stripe.PaymentIntent;
  try {
    pi = await stripe.paymentIntents.retrieve(paymentIntentId);
  } catch {
    return NextResponse.json({ error: "Payment not found" }, { status: 400 });
  }

  if (pi.status !== "succeeded") {
    return NextResponse.json({ error: `Payment not completed (status: ${pi.status})` }, { status: 400 });
  }
  // Make sure this PaymentIntent actually belongs to this quote.
  if (pi.metadata?.quote_id && pi.metadata.quote_id !== quote.id) {
    return NextResponse.json({ error: "Payment does not match this quote" }, { status: 400 });
  }

  const paidSurchargeCents = Number(pi.metadata?.surcharge_cents ?? surchargeCents);
  const nowIso = new Date().toISOString();

  // Record the full payment on the quote (for financial history) before converting.
  await supabase
    .from("quotes")
    .update({
      status: "accepted",
      accepted_at: quote.accepted_at ?? nowIso,
      deposit_paid_at: quote.deposit_paid_at ?? nowIso,
      deposit_paid_cents: baseCents,
      updated_at: nowIso,
    })
    .eq("id", id);

  // Build the order, marked paid in full via manually-keyed card.
  try {
    const { orderId } = await convertQuoteToOrder({
      quote: { ...quote, deposit_paid_at: quote.deposit_paid_at ?? nowIso, deposit_paid_cents: baseCents },
      supabase,
      createdBy: auth.userId,
      payment: {
        status: "paid",
        // card_online is the allowed enum value for a Stripe card charge
        // (the keyed-in / MOTO nature is captured by the PI metadata).
        paymentMethod: "card_online",
        ccSurchargeCents: paidSurchargeCents,
        depositPaidCentsOverride: baseCents,
        stripePaymentIntentId: paymentIntentId,
      },
    });
    return NextResponse.json({ ok: true, orderId, amountCents: pi.amount });
  } catch (err) {
    // Payment succeeded but order creation failed — surface loudly so staff can reconcile.
    return NextResponse.json(
      { error: `Card charged, but order creation failed: ${err instanceof Error ? err.message : "unknown"}. Payment ${paymentIntentId} — create the order manually.` },
      { status: 500 },
    );
  }
}
