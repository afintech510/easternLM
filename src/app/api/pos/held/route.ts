import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  const supabase = getSupabaseAdminClient();
  // Auto-expire held orders older than 4 hours
  const fourHoursAgo = new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString();
  await supabase.from("held_orders").delete().lt("created_at", fourHoursAgo);

  const { data } = await supabase.from("held_orders").select("*").order("created_at", { ascending: false });
  return NextResponse.json({ orders: data || [] });
}

export async function POST(request: Request) {
  const body = await request.json();
  const supabase = getSupabaseAdminClient();

  const { data, error } = await supabase.from("held_orders").insert({
    staff_id: body.staff_id,
    customer_name: body.customer_name || "Walk-in",
    customer_phone: body.customer_phone || null,
    items: body.items,
    delivery_method: body.delivery_method || "pickup",
    delivery_address: body.delivery_address || null,
    delivery_fee_cents: body.delivery_fee_cents || 0,
    notes: body.notes || null,
  }).select("id").single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, id: data.id });
}

export async function DELETE(request: Request) {
  const { id } = await request.json();
  const supabase = getSupabaseAdminClient();
  await supabase.from("held_orders").delete().eq("id", id);
  return NextResponse.json({ ok: true });
}
