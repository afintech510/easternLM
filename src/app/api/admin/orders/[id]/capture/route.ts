import { NextResponse } from "next/server";
import Stripe from "stripe";
import { requireAdmin } from "@/lib/admin/auth";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

/**
 * POST /api/admin/orders/[id]/capture
 * Capture a previously auth-only PaymentIntent for a web/online order.
 * Used for >20mi delivery orders that were held for review.
 * Stripe will fire payment_intent.succeeded which the webhook handler picks up
 * to mark the order paid and run the standard fulfillment side effects
 * (confirmation email, dispatch creation, inventory deduction).
 */
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  const { id: orderId } = await params;
  const supabase = getSupabaseAdminClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: order, error } = await (supabase as any)
    .from("orders")
    .select("id, stripe_checkout_session_id, grand_total_cents, status, capture_method, metadata")
    .eq("id", orderId)
    .single();

  if (error || !order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  if (order.capture_method !== "manual") {
    return NextResponse.json({ error: "Order is not manual-capture" }, { status: 400 });
  }

  const piId = order.stripe_checkout_session_id;
  if (!piId || !piId.startsWith("pi_")) {
    return NextResponse.json({ error: "No PaymentIntent found on order" }, { status: 400 });
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

  try {
    const pi = await stripe.paymentIntents.capture(piId);

    // Stamp metadata; let the webhook handler set status=paid and run the
    // standard side effects (email, dispatch, inventory). Do NOT set status
    // here — the webhook checks for status === "pending" before processing.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any)
      .from("orders")
      .update({
        metadata: {
          ...(order.metadata || {}),
          authorizationStatus: "captured",
          capturedAt: new Date().toISOString(),
          capturedAmountCents: pi.amount_received,
        },
      })
      .eq("id", orderId);

    return NextResponse.json({ ok: true, capturedCents: pi.amount_received, stripeStatus: pi.status });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Stripe capture failed" }, { status: 400 });
  }
}
