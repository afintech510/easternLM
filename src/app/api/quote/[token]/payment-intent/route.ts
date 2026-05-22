import { NextResponse } from "next/server";
import Stripe from "stripe";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

/**
 * POST /api/quote/[token]/payment-intent
 * Creates a PaymentIntent for the quote amount (embedded checkout on our domain).
 * Supports: deposit-only, pay-in-full, or material quote full payment.
 */
export async function POST(
  request: Request,
  context: { params: Promise<{ token: string }> }
) {
  const { token } = await context.params;
  const body = await request.json().catch(() => ({}));
  const customerEmail = body.email;
  const payFullAmount = body.payFullAmount === true;
  // payBalance: pay the remaining balance on a finalized quote (deposit already paid + post-job items added)
  const payBalance = body.payBalance === true;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = getSupabaseAdminClient() as any;
  const { data: quote } = await supabase
    .from("quotes")
    .select("id, quote_number, customer_name, customer_phone, customer_email, total_cents, tax_cents, cc_surcharge_cents, deposit_required_cents, deposit_paid_cents, balance_paid_cents, finalized_at, status, type")
    .eq("public_token", token)
    .maybeSingle();

  if (!quote) {
    return NextResponse.json({ error: "Quote not found" }, { status: 404 });
  }

  if (["converted", "expired", "declined"].includes(quote.status)) {
    return NextResponse.json({ error: `Quote is ${quote.status}` }, { status: 400 });
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

  // Determine charge amount:
  // - Balance payment (finalized invoice): total − deposit_paid − balance_paid
  // - Material quotes: always full total
  // - Service quotes with payFullAmount: full total
  // - Service quotes with deposit: deposit amount only
  let baseAmount: number;
  let intentType = "quote_payment";

  if (payBalance) {
    if (!quote.finalized_at) {
      return NextResponse.json({ error: "Quote has not been finalized" }, { status: 400 });
    }
    const balanceOwed = Math.max(
      0,
      (quote.total_cents ?? 0) - (quote.deposit_paid_cents ?? 0) - (quote.balance_paid_cents ?? 0),
    );
    if (balanceOwed <= 0) {
      return NextResponse.json({ error: "No balance owed on this quote" }, { status: 400 });
    }
    baseAmount = balanceOwed;
    intentType = "quote_balance";
  } else {
    const isService = quote.type === "service" && quote.deposit_required_cents > 0;
    baseAmount = (isService && !payFullAmount)
      ? quote.deposit_required_cents
      : quote.total_cents;
  }

  // Apply 3.5% card surcharge for all card payments
  const ccSurcharge = Math.round(baseAmount * 0.035);
  const chargeAmount = baseAmount + ccSurcharge;

  const paymentIntent = await stripe.paymentIntents.create({
    amount: chargeAmount,
    currency: "usd",
    automatic_payment_methods: { enabled: true, allow_redirects: "always" },
    receipt_email: customerEmail || quote.customer_email || undefined,
    metadata: {
      type: intentType,
      quote_id: quote.id,
      quote_number: quote.quote_number,
      customer_name: quote.customer_name,
      customer_phone: quote.customer_phone ?? "",
      source: "quote_checkout",
      base_amount: String(baseAmount),
      cc_surcharge: String(ccSurcharge),
      pay_full_amount: payFullAmount ? "true" : "false",
      pay_balance: payBalance ? "true" : "false",
    },
  });

  // Update email on quote if provided
  if (customerEmail && customerEmail !== quote.customer_email) {
    await supabase.from("quotes").update({ customer_email: customerEmail }).eq("id", quote.id);
  }

  return NextResponse.json({
    clientSecret: paymentIntent.client_secret,
    paymentIntentId: paymentIntent.id,
    chargeAmountCents: chargeAmount,
    baseAmountCents: baseAmount,
    ccSurchargeCents: ccSurcharge,
  });
}
