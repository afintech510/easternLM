import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  getRingCentralAccessToken,
  getRingCentralServerUrl,
} from "@/lib/ringcentral/auth";

/**
 * GET /api/pos/counter-checkin — current check-in state
 * POST /api/pos/counter-checkin — toggle counter phone status
 *
 * When checked IN:  Counter (Ext 102) rings alone first, then Ronnie joins.
 * When checked OUT: Counter + Ronnie ring simultaneously.
 */

export async function GET() {
  const supabase = getSupabaseAdminClient();

  const { data } = await supabase
    .from("counter_checkins")
    .select("checked_in, staff_name, checked_in_at")
    .eq("extension_id", "102")
    .order("checked_in_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return NextResponse.json({
    checkedIn: data?.checked_in ?? false,
    staffName: data?.staff_name ?? null,
    since: data?.checked_in_at ?? null,
  });
}

export async function POST(request: Request) {
  const { checkedIn, staffName } = await request.json();
  const supabase = getSupabaseAdminClient();

  // Update RingCentral call queue membership if configured
  const queueId = process.env.RC_CALL_QUEUE_ID;
  if (queueId) {
    try {
      const token = await getRingCentralAccessToken();
      const server = getRingCentralServerUrl();
      const extId = process.env.RC_COUNTER_EXTENSION_ID ?? "102";

      const res = await fetch(
        `${server}/restapi/v1.0/account/~/call-queues/${queueId}/members`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            records: [
              {
                id: extId,
                acceptCurrentQueueCalls: checkedIn,
              },
            ],
          }),
        }
      );

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        console.error("[RC] Queue membership update failed:", err);
        // Don't fail the whole request — log state anyway
      }
    } catch (err) {
      console.error("[RC] Counter check-in RC API error:", err);
    }
  }

  // Log the check-in state change
  await supabase.from("counter_checkins").insert({
    extension_id: "102",
    staff_name: staffName ?? "Counter",
    checked_in: checkedIn,
  });

  return NextResponse.json({ ok: true, checkedIn });
}
