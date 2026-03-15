import { NextResponse } from "next/server";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(request: Request) {
  try {
    const { readerId } = await request.json();

    if (readerId && readerId !== "simulated") {
      await stripe.terminal.readers.cancelAction(readerId);
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Failed to cancel" }, { status: 500 });
  }
}
