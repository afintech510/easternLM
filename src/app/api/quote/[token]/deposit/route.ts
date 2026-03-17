import { NextResponse } from "next/server";
import Stripe from "stripe";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

type RouteContext = { params: Promise<{ token: string }> };

export async function POST(_req: Request, context: RouteContext) {
  const { token } = await context.params;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = getSupabaseAdminClient() as any;

  const { data: quote, error } = await supabase
    .from("quotes")
    .select("id, quote_number, title, customer_name, customer_email, deposit_required_cents, status")
    .eq("public_token", token)
    .single();

  if (error || !quote) return NextResponse.json({ error: "Quote not found" }, { status: 404 });
  if (quote.deposit_required_cents <= 0) {
    return NextResponse.json({ error: "No deposit required" }, { status: 400 });
  }
  if (quote.status !== "accepted") {
    return NextResponse.json({ error: "Quote must be accepted before paying deposit" }, { status: 400 });
  }

  const stripeKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeKey) return NextResponse.json({ error: "Stripe not configured" }, { status: 500 });

  const stripe = new Stripe(stripeKey);
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.easternlm.com";

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    line_items: [
      {
        price_data: {
          currency: "usd",
          product_data: {
            name: `Deposit — ${quote.title}`,
            description: `Quote ${quote.quote_number} — Eastern Landscape & Mason Supply`,
          },
          unit_amount: quote.deposit_required_cents,
        },
        quantity: 1,
      },
    ],
    customer_email: quote.customer_email ?? undefined,
    success_url: `${siteUrl}/quote/${token}?deposit=success`,
    cancel_url: `${siteUrl}/quote/${token}`,
    metadata: {
      type: "quote_deposit",
      quoteId: quote.id,
      quoteToken: token,
      quoteNumber: quote.quote_number,
    },
  });

  return NextResponse.json({ url: session.url });
}
