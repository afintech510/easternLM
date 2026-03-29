import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

/**
 * GET /api/cron/missed-call-check
 * Runs hourly. Auto-resolves missed calls where the caller called back.
 * Keeps unresolved missed calls flagged for follow-up.
 */
export async function GET() {
  const supabase = getSupabaseAdminClient();

  // Find unresolved missed calls
  const { data: missedCalls } = await supabase
    .from("call_records")
    .select("id, from_number, started_at, customer_id")
    .eq("status", "missed")
    .eq("requires_follow_up", true)
    .eq("follow_up_resolved", false);

  if (!missedCalls || missedCalls.length === 0) {
    return NextResponse.json({ ok: true, flagged: 0, resolved: 0, checked: 0 });
  }

  let resolved = 0;
  let flagged = 0;

  for (const missed of missedCalls) {
    // Check if the same number called back after the missed call
    const { data: callback } = await supabase
      .from("call_records")
      .select("id")
      .eq("from_number", missed.from_number)
      .eq("direction", "inbound")
      .in("status", ["answered", "completed"])
      .gt("started_at", missed.started_at)
      .limit(1)
      .maybeSingle();

    if (callback) {
      // They called back — auto-resolve
      await supabase
        .from("call_records")
        .update({
          follow_up_resolved: true,
          follow_up_resolved_at: new Date().toISOString(),
          follow_up_resolved_by: "auto (callback detected)",
        })
        .eq("id", missed.id);
      resolved++;
    } else {
      flagged++;
    }
  }

  return NextResponse.json({
    ok: true,
    flagged,
    resolved,
    checked: missedCalls.length,
  });
}
