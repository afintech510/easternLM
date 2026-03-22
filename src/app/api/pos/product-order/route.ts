import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  const { order } = await request.json();

  if (!Array.isArray(order) || order.length === 0) {
    return NextResponse.json({ error: "order array required" }, { status: 400 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = getSupabaseAdminClient() as any;

  // Batch update in parallel chunks — gaps of 10 for future inserts
  const CHUNK_SIZE = 50;
  for (let start = 0; start < order.length; start += CHUNK_SIZE) {
    const chunk = order.slice(start, start + CHUNK_SIZE);
    await Promise.all(
      chunk.map((id: string, j: number) =>
        supabase
          .from("products")
          .update({ pos_sort_order: (start + j) * 10 })
          .eq("id", id)
      )
    );
  }

  return NextResponse.json({ ok: true, updated: order.length });
}
