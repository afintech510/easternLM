import { NextResponse } from "next/server";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(request: Request) {
  try {
    const { readerId, paymentIntentId } = await request.json();

    if (!readerId || !paymentIntentId) {
      return NextResponse.json({ error: "readerId and paymentIntentId required" }, { status: 400 });
    }

    // Simulated reader for development
    if (readerId === "simulated") {
      // In test mode, simulate a successful payment
      const pi = await stripe.paymentIntents.confirm(paymentIntentId, {
        payment_method: "pm_card_visa",
      } as Stripe.PaymentIntentConfirmParams);
      return NextResponse.json({ status: pi.status, paymentIntent: pi });
    }

    // Real reader: process on device
    const reader = await stripe.terminal.readers.processPaymentIntent(
      readerId,
      { payment_intent: paymentIntentId },
    );

    return NextResponse.json({ reader, status: "processing" });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Payment failed" }, { status: 500 });
  }
}
