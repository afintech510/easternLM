import { NextResponse } from "next/server";
import Stripe from "stripe";
import { requireAdmin } from "@/lib/admin/auth";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

/**
 * POST /api/admin/book-now/[id]/capture
 * Capture the full authorization or a partial amount (platform fee only).
 * Body: { amountCents?: number } — omit for full capture.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  const { id: orderId } = await params;
  const body = await request.json().catch(() => ({}));
  const amountCents: number | undefined = body.amountCents;

  const supabase = getSupabaseAdminClient();

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
    const captureParams: Stripe.PaymentIntentCaptureParams = {};
    if (amountCents && amountCents > 0 && amountCents < order.grand_total_cents) {
      captureParams.amount_to_capture = amountCents;
    }

    const pi = await stripe.paymentIntents.capture(piId, captureParams);

    // Update order
    const captured = pi.amount_received;
    await (supabase as any)
      .from("orders")
      .update({
        status: "confirmed",
        platform_fee_cents: captured,
        metadata: {
          ...(order.metadata || {}),
          authorizationStatus: "captured",
          capturedAt: new Date().toISOString(),
          capturedAmountCents: captured,
        },
      })
      .eq("id", orderId);

    return NextResponse.json({ ok: true, capturedCents: captured, stripeStatus: pi.status });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Stripe capture failed" }, { status: 400 });
  }
}
