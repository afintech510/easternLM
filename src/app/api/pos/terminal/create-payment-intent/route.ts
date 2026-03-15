import { NextResponse } from "next/server";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(request: Request) {
  try {
    const { amountCents, orderId, metadata } = await request.json();

    if (!amountCents || amountCents < 50) {
      return NextResponse.json({ error: "Amount must be at least $0.50" }, { status: 400 });
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountCents,
      currency: "usd",
      payment_method_types: ["card_present"],
      capture_method: "automatic",
      metadata: {
        order_id: orderId || "",
        source: "pos",
        ...(metadata || {}),
      },
    });

    return NextResponse.json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
    });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Failed to create payment" }, { status: 500 });
  }
}
