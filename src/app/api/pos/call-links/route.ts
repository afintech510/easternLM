import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

/**
 * GET /api/pos/call-links?call_id=xxx — get linked orders for a call
 * POST /api/pos/call-links — link a call to an order
 * DELETE /api/pos/call-links?id=xxx — unlink
 */

export async function GET(request: Request) {
  const url = new URL(request.url);
  const callId = url.searchParams.get("call_id");
  if (!callId) return NextResponse.json([]);

  const supabase = getSupabaseAdminClient();
  const { data } = await supabase
    .from("call_order_links")
    .select(
      `
      id, linked_by, linked_at,
      order:orders (id, order_number, grand_total_cents, status, placed_at)
    `
    )
    .eq("call_id", callId)
    .order("linked_at", { ascending: false });

  return NextResponse.json(data ?? []);
}

export async function POST(request: Request) {
  const { callId, orderId, linkedBy } = await request.json();
  if (!callId || !orderId) {
    return NextResponse.json(
      { error: "callId and orderId required" },
      { status: 400 }
    );
  }

  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("call_order_links")
    .insert({
      call_id: callId,
      order_id: orderId,
      linked_by: linkedBy ?? "Counter",
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json(data);
}

export async function DELETE(request: Request) {
  const url = new URL(request.url);
  const id = url.searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "id required" }, { status: 400 });
  }

  const supabase = getSupabaseAdminClient();
  await supabase.from("call_order_links").delete().eq("id", id);

  return NextResponse.json({ ok: true });
}
