import { NextResponse } from "next/server";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(request: Request) {
  const { paymentIntentId } = await request.json();
  if (!paymentIntentId) {
    return NextResponse.json({ error: "paymentIntentId required" }, { status: 400 });
  }

  try {
    const intent = await stripe.paymentIntents.cancel(paymentIntentId);
    return NextResponse.json({ ok: true, status: intent.status });
  } catch (err) {
    // May fail if already succeeded or cancelled — that's fine
    return NextResponse.json({
      ok: false,
      error: err instanceof Error ? err.message : "Cancel failed",
    });
  }
}
