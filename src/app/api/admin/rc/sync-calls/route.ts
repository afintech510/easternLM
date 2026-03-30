import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  getRingCentralAccessToken,
  getRingCentralServerUrl,
  phoneDigits,
} from "@/lib/ringcentral/auth";

/**
 * POST /api/admin/rc/sync-calls
 * Backfills call_records from RingCentral Call Log API (last 7 days).
 * Auto-matches customers by phone number.
 */
export async function POST() {
  try {
    const token = await getRingCentralAccessToken();
    const server = getRingCentralServerUrl();
    const supabase = getSupabaseAdminClient() as any;

    const sevenDaysAgo = new Date(
      Date.now() - 7 * 24 * 60 * 60 * 1000
    ).toISOString();

    const res = await fetch(
      `${server}/restapi/v1.0/account/~/call-log?dateFrom=${sevenDaysAgo}&perPage=250&view=Detailed`,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    if (!res.ok) {
      return NextResponse.json(
        { error: `RC API error: ${res.status}` },
        { status: 500 }
      );
    }

    const data = await res.json();
    let imported = 0;

    for (const record of data.records ?? []) {
      const sessionId = record.sessionId ?? record.id?.toString();
      if (!sessionId) continue;

      const direction = record.direction?.toLowerCase() ?? "inbound";
      const fromNumber = record.from?.phoneNumber ?? "";
      const toNumber = record.to?.[0]?.phoneNumber ?? record.to?.phoneNumber ?? "";

      const status =
        record.result === "Accepted" || record.result === "Call connected"
          ? "completed"
          : record.result === "Missed" || record.result === "No Answer"
          ? "missed"
          : record.result === "Voicemail"
          ? "voicemail"
          : record.result === "Rejected"
          ? "missed"
          : "completed";

      // Auto-match customer
      const customerPhone = direction === "inbound" ? fromNumber : toNumber;
      const digits = phoneDigits(customerPhone);
      let customerId = null;
      if (digits.length >= 10) {
        const { data: customer } = await supabase
          .from("customers")
          .select("id")
          .ilike("phone", `%${digits}%`)
          .limit(1)
          .maybeSingle();
        customerId = customer?.id ?? null;
      }

      const { error } = await supabase.from("call_records").upsert(
        {
          rc_session_id: sessionId,
          direction,
          from_number: fromNumber,
          to_number: toNumber,
          from_name: record.from?.name ?? null,
          status,
          started_at: record.startTime,
          ended_at: record.startTime
            ? new Date(
                new Date(record.startTime).getTime() +
                  (record.duration ?? 0) * 1000
              ).toISOString()
            : null,
          duration_seconds: record.duration ?? null,
          rc_recording_id: record.recording?.id?.toString() ?? null,
          extension_id: record.extension?.id?.toString() ?? null,
          customer_id: customerId,
          customer_match_type: customerId ? "auto_phone" : null,
          requires_follow_up: status === "missed",
        },
        { onConflict: "rc_session_id", ignoreDuplicates: true }
      );

      if (!error) imported++;
    }

    return NextResponse.json({
      ok: true,
      imported,
      total: data.records?.length ?? 0,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}
