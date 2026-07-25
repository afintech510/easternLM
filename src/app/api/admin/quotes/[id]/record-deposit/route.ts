import { NextResponse } from "next/server";
import Stripe from "stripe";
import { requireAdmin } from "@/lib/admin/auth";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

type RouteContext = { params: Promise<{ id: string }> };

/**
 * POST /api/admin/quotes/[id]/record-deposit
 *
 * Manually record a deposit that was collected OUTSIDE the site's own
 * quote-deposit checkout flow — e.g. a Stripe payment link created by hand,
 * a phone/keyed-in charge, or any payment whose webhook never matched this
 * quote. This is the on-ramp for the Final Invoice flow when the deposit
 * didn't come through /quote/[token]/deposit.
 *
 * Sets deposit_paid_cents / deposit_paid_at / deposit_stripe_payment_id and
 * flips the quote to 'accepted' (if it was pre-acceptance), which unlocks the
 * existing Finalize → Send Balance Paylink controls.
 *
 * Body: {
 *   depositCents: number,           // base deposit applied to the quote (excl. card fee)
 *   stripePaymentIntentId?: string, // optional pi_... reference
 *   paidAt?: string,                // ISO date; defaults to now
 *   force?: boolean,                // overwrite an already-recorded deposit
 * }
 */
export async function POST(request: Request, context: RouteContext) {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  const { id } = await context.params;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = getSupabaseAdminClient() as any;

  const body = await request.json().catch(() => ({}));
  const depositCents = Math.round(Number(body.depositCents));
  const stripePaymentIntentId: string | null =
    typeof body.stripePaymentIntentId === "string" && body.stripePaymentIntentId.trim()
      ? body.stripePaymentIntentId.trim()
      : null;
  const paidAt: string = typeof body.paidAt === "string" && body.paidAt
    ? new Date(body.paidAt).toISOString()
    : new Date().toISOString();
  const force = body.force === true;

  if (!Number.isFinite(depositCents) || depositCents <= 0) {
    return NextResponse.json({ error: "A positive deposit amount is required." }, { status: 400 });
  }

  const { data: quote, error } = await supabase
    .from("quotes")
    .select("id, status, accepted_at, deposit_paid_at, converted_order_id, total_cents")
    .eq("id", id)
    .single();

  if (error || !quote) return NextResponse.json({ error: "Quote not found" }, { status: 404 });

  if (quote.converted_order_id) {
    return NextResponse.json(
      { error: "Quote is already converted to a paid order — nothing to record." },
      { status: 400 },
    );
  }
  if (quote.deposit_paid_at && !force) {
    return NextResponse.json(
      { error: "A deposit is already recorded on this quote. Re-submit with force to overwrite." },
      { status: 409 },
    );
  }
  if (["declined", "disabled", "scammer"].includes(quote.status)) {
    return NextResponse.json(
      { error: `Cannot record a deposit on a '${quote.status}' quote.` },
      { status: 400 },
    );
  }

  // Best-effort Stripe verification: if a PI ref is given and we can retrieve it,
  // require it to be succeeded. If it can't be retrieved (e.g. live/test key
  // mismatch or a link from another account), don't block — just record the ref.
  let stripeNote: string | undefined;
  if (stripePaymentIntentId && stripePaymentIntentId.startsWith("pi_")) {
    const stripeKey = process.env.STRIPE_SECRET_KEY;
    if (stripeKey) {
      try {
        const stripe = new Stripe(stripeKey);
        const pi = await stripe.paymentIntents.retrieve(stripePaymentIntentId);
        if (pi.status !== "succeeded") {
          return NextResponse.json(
            { error: `Payment intent status is '${pi.status}', not 'succeeded'.` },
            { status: 400 },
          );
        }
      } catch {
        stripeNote = "Stripe could not verify this payment intent (recorded reference anyway).";
      }
    }
  }

  const isPreAcceptance = ["draft", "saved", "pending", "sent", "viewed", "expired"].includes(quote.status);

  const { error: updateError } = await supabase
    .from("quotes")
    .update({
      status: isPreAcceptance ? "accepted" : quote.status,
      accepted_at: quote.accepted_at ?? paidAt,
      deposit_paid_cents: depositCents,
      deposit_paid_at: paidAt,
      deposit_stripe_payment_id: stripePaymentIntentId,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  const balanceOwedCents = Math.max(0, (quote.total_cents ?? 0) - depositCents);

  return NextResponse.json({
    ok: true,
    deposit_paid_cents: depositCents,
    balance_owed_cents: balanceOwedCents,
    note: stripeNote,
  });
}
