import { NextResponse } from "next/server";
import { requirePOS } from "@/lib/admin/auth";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { reverseInventoryForOrder } from "@/lib/inventory/deduct";

export async function POST(request: Request) {
  const auth = await requirePOS();
  if (auth instanceof NextResponse) return auth;

  const { orderId, type, totalRefundCents, reason } = await request.json();

  if (!orderId || !totalRefundCents || totalRefundCents <= 0) {
    return NextResponse.json({ error: "Invalid refund request" }, { status: 400 });
  }

  const supabase = getSupabaseAdminClient() as any;

  const { data: order, error } = await supabase
    .from("orders")
    .select("id, grand_total_cents, payment_method, payments, status, refunds")
    .eq("id", orderId)
    .single();

  if (error || !order) return NextResponse.json({ error: "Order not found" }, { status: 404 });

  // Build refund record
  const refundRecord = {
    id: crypto.randomUUID(),
    amount_cents: totalRefundCents,
    reason,
    type,
    processed_by: auth.userId,
    processed_at: new Date().toISOString(),
  };

  // Process Stripe refund if card payment
  if (order.payment_method === "card_terminal" || order.payment_method === "card_online") {
    const payments = order.payments as any[] | null;
    const cardPayment = payments?.find((p: any) => p.stripe_payment_intent_id);
    if (cardPayment?.stripe_payment_intent_id) {
      try {
        const Stripe = (await import("stripe")).default;
        const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
        const stripeRefund = await stripe.refunds.create({
          payment_intent: cardPayment.stripe_payment_intent_id,
          amount: totalRefundCents,
          reason: "requested_by_customer",
        });
        (refundRecord as any).stripe_refund_id = stripeRefund.id;
      } catch (err) {
        return NextResponse.json({ error: `Stripe refund failed: ${err instanceof Error ? err.message : "unknown"}` }, { status: 500 });
      }
    }
  }

  // For account payments, credit back
  if (order.payment_method === "account") {
    const { data: linkedOrder } = await supabase.from("orders").select("customer_id").eq("id", orderId).single();
    if (linkedOrder?.customer_id) {
      const { data: cust } = await supabase.from("customers").select("current_balance_cents").eq("id", linkedOrder.customer_id).single();
      if (cust) {
        await supabase.from("customers").update({
          current_balance_cents: Math.max(0, (cust.current_balance_cents ?? 0) - totalRefundCents),
        }).eq("id", linkedOrder.customer_id);
      }
    }
  }

  // Update order
  const existingRefunds = (order.refunds as any[]) ?? [];
  const newStatus = totalRefundCents >= order.grand_total_cents ? "refunded" : "partially_refunded";

  await supabase.from("orders").update({
    status: newStatus,
    refunds: [...existingRefunds, refundRecord],
    updated_at: new Date().toISOString(),
  }).eq("id", orderId);

  // Reverse inventory if full refund
  if (type === "full") {
    try { await reverseInventoryForOrder(orderId); } catch { /* non-fatal */ }
  }

  return NextResponse.json({ ok: true, refund: refundRecord });
}
