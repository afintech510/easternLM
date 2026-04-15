import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { scheduleFollowUps } from "@/lib/follow-ups/engine";

type Ctx = { params: Promise<{ orderId: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  const { orderId } = await ctx.params;
  const supabase = getSupabaseAdminClient() as any;

  const { data: order } = await supabase
    .from("orders")
    .select("id, customer_name, customer_phone, delivery_address, delivery_date, delivery_time_window, grand_total_cents, payment_method, status, delivery_notes, order_items(product_name, quantity, unit)")
    .eq("id", orderId)
    .single();

  if (!order) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ order: { ...order, items: order.order_items ?? [] } });
}

export async function POST(request: Request, ctx: Ctx) {
  const { orderId } = await ctx.params;
  const { photos, cashCollected } = await request.json();
  const supabase = getSupabaseAdminClient() as any;

  await supabase.from("orders").update({
    status: "delivered",
    metadata: supabase.rpc ? undefined : undefined, // keep existing
    delivery_confirmed_at: new Date().toISOString(),
    delivery_photos: photos ?? [],
  }).eq("id", orderId);

  // If we need to add columns, use metadata instead
  const { data: order } = await supabase.from("orders").select("metadata, customer_name, customer_phone, customer_email, delivery_address").eq("id", orderId).single();
  await supabase.from("orders").update({
    status: "delivered",
    metadata: {
      ...(order?.metadata ?? {}),
      delivery_confirmed_at: new Date().toISOString(),
      delivery_photos: photos ?? [],
      cash_collected: cashCollected ?? false,
    },
  }).eq("id", orderId);

  // Schedule review solicitation follow-ups (fire-and-forget)
  if (order) {
    try {
      await scheduleFollowUps(supabase, {
        id: orderId,
        customer_name: order.customer_name,
        customer_phone: order.customer_phone,
        customer_email: order.customer_email,
        delivery_address: order.delivery_address,
      });
    } catch (err) {
      console.error("[delivery/confirm] scheduleFollowUps failed:", err);
    }
  }

  return NextResponse.json({ ok: true });
}
