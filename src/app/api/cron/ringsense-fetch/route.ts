import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  getRingCentralAccessToken,
  getRingCentralServerUrl,
} from "@/lib/ringcentral/auth";

/**
 * GET /api/cron/ringsense-fetch
 * Polls RingSense API for AI summaries on calls with recording IDs.
 * Run every 2 minutes via cron. Looks at calls from the last 24 hours.
 */
export async function GET() {
  const supabase = getSupabaseAdminClient();

  // Find calls with recording IDs but no AI summary yet (last 24h)
  const { data: calls } = await supabase
    .from("call_records")
    .select("id, rc_recording_id, started_at")
    .not("rc_recording_id", "is", null)
    .is("ai_summary", null)
    .gte(
      "started_at",
      new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    )
    .order("started_at", { ascending: false })
    .limit(20);

  if (!calls || calls.length === 0) {
    return NextResponse.json({ ok: true, processed: 0, total: 0 });
  }

  let token: string;
  try {
    token = await getRingCentralAccessToken();
  } catch (err) {
    return NextResponse.json(
      { error: "RC auth failed", detail: String(err) },
      { status: 500 }
    );
  }

  const server = getRingCentralServerUrl();
  let processed = 0;

  for (const call of calls) {
    try {
      const res = await fetch(
        `${server}/ai/insights/v1/accounts/~/ai-notes?sourceRecordId=${call.rc_recording_id}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (res.status === 404) {
        // Summary not ready yet — will retry on next run
        continue;
      }

      if (!res.ok) {
        console.error(
          `[RingSense] Failed for recording ${call.rc_recording_id}: ${res.status}`
        );
        continue;
      }

      const data = await res.json();
      const notes = data.records?.[0];

      if (notes) {
        await supabase
          .from("call_records")
          .update({
            ai_summary: notes.summary ?? null,
            ai_action_items:
              notes.actionItems?.map((a: any) => a.text) ?? [],
            ai_transcript: notes.transcript ?? null,
            ai_sentiment: notes.sentiment ?? null,
            ai_fetched_at: new Date().toISOString(),
          })
          .eq("id", call.id);

        processed++;
      }
    } catch (err) {
      console.error(`[RingSense] Error processing call ${call.id}:`, err);
    }
  }

  return NextResponse.json({ ok: true, processed, total: calls.length });
}
