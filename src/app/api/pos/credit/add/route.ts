import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { customer_id, amount_cents, type, note, stripe_payment_intent_id, created_by } = body;

    if (!customer_id || !amount_cents || amount_cents <= 0) {
      return NextResponse.json({ error: "customer_id and positive amount_cents required" }, { status: 400 });
    }
    if (!["prepayment", "return_credit", "manual_adjustment"].includes(type)) {
      return NextResponse.json({ error: "Invalid type" }, { status: 400 });
    }

    if (type === "prepayment") {
      if (!stripe_payment_intent_id) {
        return NextResponse.json({ error: "stripe_payment_intent_id required for prepayment" }, { status: 400 });
      }
      const stripeKey = process.env.STRIPE_SECRET_KEY;
      if (!stripeKey) {
        return NextResponse.json({ error: "Stripe not configured" }, { status: 500 });
      }
      const stripe = new Stripe(stripeKey);
      const pi = await stripe.paymentIntents.retrieve(stripe_payment_intent_id);
      if (pi.status !== "succeeded") {
        return NextResponse.json({ error: `Payment not succeeded (status: ${pi.status})` }, { status: 400 });
      }
    }

    const supabase = getSupabaseAdminClient();
    const { data, error } = await supabase.rpc("post_credit", {
      p_customer_id: customer_id,
      p_amount_cents: amount_cents,
      p_type: type,
      p_note: note || null,
      p_created_by: created_by || "staff",
      p_order_id: null,
      p_stripe_payment_intent_id: stripe_payment_intent_id || null,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({
      new_balance_cents: data.balance_after_cents,
      ledger_id: data.id,
    });
  } catch (err) {
    console.error("POST /api/pos/credit/add error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
