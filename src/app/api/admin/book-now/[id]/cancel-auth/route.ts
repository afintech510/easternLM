import { NextResponse } from "next/server";
import Stripe from "stripe";
import { requireAdmin } from "@/lib/admin/auth";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

/**
 * POST /api/admin/book-now/[id]/cancel-auth
 * Cancel (release) the authorization hold. No charge to customer.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  const { id: orderId } = await params;
  const supabase = getSupabaseAdminClient();

  const { data: order, error } = await (supabase as any)
    .from("orders")
    .select("id, stripe_checkout_session_id, capture_method, metadata")
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
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Stripe cancel failed" }, { status: 400 });
  }
}
