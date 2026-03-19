import { NextResponse } from "next/server";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Status check mode — poll a PaymentIntent's status
    if (body.checkStatus && body.paymentIntentId) {
      const pi = await stripe.paymentIntents.retrieve(body.paymentIntentId, {
        expand: ["latest_charge"],
      });
      const charge = pi.latest_charge as Stripe.Charge | null;
      return NextResponse.json({
        status: pi.status,
        paymentIntentId: pi.id,
        last4: (charge?.payment_method_details as any)?.card_present?.last4 ?? null,
      });
    }

    const { amountCents, orderId, metadata } = body;

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
