import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  const { order } = await request.json();

  if (!Array.isArray(order) || order.length === 0) {
    return NextResponse.json({ error: "order array required" }, { status: 400 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = getSupabaseAdminClient() as any;

  // Batch update — gaps of 10 for future inserts
  for (let i = 0; i < order.length; i++) {
    await supabase
      .from("products")
      .update({ pos_sort_order: i * 10 })
      .eq("id", order[i]);
  }

  return NextResponse.json({ ok: true, updated: order.length });
}
