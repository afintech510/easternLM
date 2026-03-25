import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

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
  const { data: order } = await supabase.from("orders").select("metadata").eq("id", orderId).single();
  await supabase.from("orders").update({
    status: "delivered",
    metadata: {
      ...(order?.metadata ?? {}),
      delivery_confirmed_at: new Date().toISOString(),
      delivery_photos: photos ?? [],
      cash_collected: cashCollected ?? false,
    },
  }).eq("id", orderId);

  return NextResponse.json({ ok: true });
}
