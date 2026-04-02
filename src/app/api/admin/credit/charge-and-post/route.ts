import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { customer_id, amount_cents, payment_method_id, payment_intent_id, note, created_by } = body;

    if (!customer_id || !amount_cents || amount_cents <= 0) {
      return NextResponse.json({ error: "customer_id and positive amount_cents required" }, { status: 400 });
    }

    const stripeKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeKey) {
      return NextResponse.json({ error: "Stripe not configured" }, { status: 500 });
    }
    const stripe = new Stripe(stripeKey);

    // Step 2: Frontend confirmed a PI — verify and post credit
    if (payment_intent_id) {
      const pi = await stripe.paymentIntents.retrieve(payment_intent_id);
      if (pi.status !== "succeeded") {
        return NextResponse.json({ error: `Payment not succeeded (status: ${pi.status})` }, { status: 400 });
      }

      const supabase = getSupabaseAdminClient();
      const { data, error } = await supabase.rpc("post_credit", {
        p_customer_id: customer_id,
        p_amount_cents: amount_cents,
        p_type: "prepayment",
        p_note: note || "Card prepayment",
        p_created_by: created_by || "admin",
        p_order_id: null,
        p_stripe_payment_intent_id: payment_intent_id,
      });

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }

      return NextResponse.json({
        ledger_id: data.id,
        new_balance_cents: data.balance_after_cents,
        stripe_payment_intent_id: payment_intent_id,
      });
    }

    // Step 1: Create PaymentIntent
    const piParams: Stripe.PaymentIntentCreateParams = {
      amount: amount_cents,
      currency: "usd",
      metadata: { customer_id, purpose: "store_credit_prepayment" },
    };

    if (payment_method_id) {
      piParams.payment_method = payment_method_id;
      piParams.confirm = true;
      piParams.automatic_payment_methods = { enabled: true, allow_redirects: "never" };

      const pi = await stripe.paymentIntents.create(piParams);

      if (pi.status !== "succeeded") {
        return NextResponse.json({ error: "Card charge failed", status: pi.status }, { status: 400 });
      }

      const supabase = getSupabaseAdminClient();
      const { data, error } = await supabase.rpc("post_credit", {
        p_customer_id: customer_id,
        p_amount_cents: amount_cents,
        p_type: "prepayment",
        p_note: note || "Card prepayment (saved card)",
        p_created_by: created_by || "admin",
        p_order_id: null,
        p_stripe_payment_intent_id: pi.id,
      });

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }

      return NextResponse.json({
        ledger_id: data.id,
        new_balance_cents: data.balance_after_cents,
        stripe_payment_intent_id: pi.id,
      });
    }

    // No payment method — return client_secret for frontend card entry
    piParams.automatic_payment_methods = { enabled: true, allow_redirects: "never" };
    const pi = await stripe.paymentIntents.create(piParams);

    return NextResponse.json({
      client_secret: pi.client_secret,
      payment_intent_id: pi.id,
    });
  } catch (err) {
    console.error("POST /api/admin/credit/charge-and-post error:", err);
    const msg = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
