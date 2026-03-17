import { NextResponse } from "next/server";
import Stripe from "stripe";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

type RouteContext = { params: Promise<{ token: string }> };

export async function POST(request: Request, context: RouteContext) {
  const { token } = await context.params;
  const { amount_cents } = await request.json();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = getSupabaseAdminClient() as any;

  const { data: stmt, error } = await supabase
    .from("statements")
    .select("id, statement_number, balance_due_cents, status, customers(charge_account_name, first_name, last_name, billing_email, email)")
    .eq("public_token", token)
    .single();

  if (error || !stmt) return NextResponse.json({ error: "Statement not found" }, { status: 404 });
  if (stmt.status === "paid") return NextResponse.json({ error: "Already paid" }, { status: 400 });

  const payAmount = amount_cents ?? stmt.balance_due_cents;
  if (payAmount <= 0) return NextResponse.json({ error: "Invalid amount" }, { status: 400 });

  const stripeKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeKey) return NextResponse.json({ error: "Stripe not configured" }, { status: 500 });

  const stripe = new Stripe(stripeKey);
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.easternlm.com";

  const customer = stmt.customers ?? {};
  const accountName = customer.charge_account_name || [customer.first_name, customer.last_name].filter(Boolean).join(" ") || "Customer";
  const custEmail = customer.billing_email || customer.email;

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    line_items: [
      {
        price_data: {
          currency: "usd",
          product_data: {
            name: `Statement Payment — ${stmt.statement_number}`,
            description: `Eastern Landscape & Mason Supply — ${accountName}`,
          },
          unit_amount: payAmount,
        },
        quantity: 1,
      },
    ],
    customer_email: custEmail ?? undefined,
    success_url: `${siteUrl}/pay/${token}?paid=success`,
    cancel_url: `${siteUrl}/pay/${token}`,
    metadata: {
      type: "statement_payment",
      statementId: stmt.id,
      statementToken: token,
      statementNumber: stmt.statement_number,
      amountCents: String(payAmount),
    },
  });

  return NextResponse.json({ url: session.url });
}
