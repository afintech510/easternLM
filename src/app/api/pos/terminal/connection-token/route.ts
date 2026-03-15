import { NextResponse } from "next/server";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST() {
  try {
    const token = await stripe.terminal.connectionTokens.create();
    return NextResponse.json({ secret: token.secret });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Failed to create token" }, { status: 500 });
  }
}
