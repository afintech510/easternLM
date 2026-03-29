import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

/**
 * GET /api/pos/call-log — recent call records for the POS phone tab
 *
 * Query params:
 *   filter: "all" | "missed" | "today" (default: "today")
 *   limit: number (default: 50)
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const filter = url.searchParams.get("filter") ?? "today";
  const limit = Math.min(parseInt(url.searchParams.get("limit") ?? "50"), 100);

  const supabase = getSupabaseAdminClient();

  let query = supabase
    .from("call_records")
    .select(
      `
      *,
      customer:customers (
        id, first_name, last_name, phone, company_name,
        total_orders, total_spent_cents, tags
      )
    `
    )
    .order("started_at", { ascending: false })
    .limit(limit);

  if (filter === "today") {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    query = query.gte("started_at", todayStart.toISOString());
  } else if (filter === "missed") {
    query = query
      .eq("status", "missed")
      .eq("requires_follow_up", true)
      .eq("follow_up_resolved", false);
  }

  const { data, error } = await query;

  if (error) {
    console.error("[CallLog] Query error:", error);
    return NextResponse.json([], { status: 500 });
  }

  return NextResponse.json(data ?? []);
}
