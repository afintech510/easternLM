import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/auth";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import Stripe from "stripe";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(request: Request, ctx: Ctx) {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  const { id } = await ctx.params;
  const body = await request.json();
  const { processRefund, reason } = body;

  const supabase = getSupabaseAdminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any;

  // Fetch the order
  const { data: order, error: fetchErr } = await sb
    .from("orders")
    .select("*")
    .eq("id", id)
    .single();

  if (fetchErr || !order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  // Process Stripe refund if requested
  let refundId: string | null = null;
  if (processRefund && order.stripe_checkout_session_id) {
    try {
      const stripeKey = process.env.PROD_STRIPE_SECRET_KEY || process.env.STRIPE_SECRET_KEY;
      if (!stripeKey) throw new Error("Stripe key not configured");

      const stripe = new Stripe(stripeKey);

      // Get payment intent from checkout session
      let paymentIntentId = order.stripe_payment_intent_id;

      if (!paymentIntentId && order.stripe_checkout_session_id) {
        const session = await stripe.checkout.sessions.retrieve(order.stripe_checkout_session_id);
        paymentIntentId = session.payment_intent as string;
      }

      if (!paymentIntentId) {
        // Check payments array in metadata
        const payments = (order.payments || order.metadata?.payments) as Array<{ stripe_id?: string }> | undefined;
        const cardPayment = payments?.find((p) => p.stripe_id);
        paymentIntentId = cardPayment?.stripe_id || null;
      }

      if (paymentIntentId) {
        const refund = await stripe.refunds.create({
          payment_intent: paymentIntentId,
          reason: "requested_by_customer",
        });
        refundId = refund.id;
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Refund failed";
      return NextResponse.json({ error: msg }, { status: 500 });
    }
  }

  // Update order status
  const newStatus = processRefund ? "refunded" : "cancelled";
  await sb.from("orders").update({ status: newStatus, updated_at: new Date().toISOString() }).eq("id", id);

  // Remove delivery assignments
  await sb.from("delivery_assignments").delete().eq("order_id", id);

  // Add cancellation note
  const noteText = processRefund
    ? `Order cancelled and refunded${refundId ? ` (${refundId})` : ""}. Reason: ${reason || "Not specified"}`
    : `Order cancelled without refund. Reason: ${reason || "Not specified"}`;

  await sb
    .from("order_notes")
    .insert({
      order_id: id,
      note: noteText,
      created_by: "staff",
    })
    .catch(() => {
      // order_notes table might not exist yet
    });

  return NextResponse.json({ ok: true, status: newStatus, refundId });
}
