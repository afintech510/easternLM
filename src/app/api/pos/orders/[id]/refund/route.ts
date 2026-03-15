import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
type Ctx = { params: Promise<{ id: string }> };

export async function POST(request: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const { amountCents, reason } = await request.json();
  const supabase = getSupabaseAdminClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: order } = await supabase.from("orders").select("*").eq("id", id).single() as { data: any };
  if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });

  // Card refund via Stripe
  if (order.payment_method === "card_terminal" && order.stripe_payment_intent_id) {
    try {
      await stripe.refunds.create({
        payment_intent: order.stripe_payment_intent_id,
        amount: amountCents || undefined,
        reason: "requested_by_customer",
      });
    } catch (err) {
      return NextResponse.json({ error: err instanceof Error ? err.message : "Stripe refund failed" }, { status: 500 });
    }
  }

  const isPartial = amountCents && amountCents < order.grand_total_cents;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase.from("orders").update({
    status: isPartial ? "partially_refunded" : "refunded",
  }) as any).eq("id", id);

  return NextResponse.json({ ok: true, refundType: isPartial ? "partial" : "full" });
}
