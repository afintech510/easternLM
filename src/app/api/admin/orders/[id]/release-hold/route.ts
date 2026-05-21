import { NextResponse } from "next/server";
import Stripe from "stripe";
import { requireAdmin } from "@/lib/admin/auth";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

/**
 * POST /api/admin/orders/[id]/release-hold
 * Cancel a previously authorized PaymentIntent. No charge to customer, no fee.
 * Used for >20mi delivery orders that we can't fulfill after review.
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
    .select("id, stripe_checkout_session_id, capture_method, status, metadata")
    .eq("id", orderId)
    .single();

  if (error || !order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  const piId = order.stripe_checkout_session_id;
  if (!piId || !piId.startsWith("pi_")) {
    return NextResponse.json({ error: "No PaymentIntent found on order" }, { status: 400 });
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

  try {
    await stripe.paymentIntents.cancel(piId);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any)
      .from("orders")
      .update({
        status: "cancelled",
        metadata: {
          ...(order.metadata || {}),
          authorizationStatus: "released",
          cancelledAt: new Date().toISOString(),
        },
      })
      .eq("id", orderId);

    return NextResponse.json({ ok: true });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Stripe cancel failed" }, { status: 400 });
  }
}
