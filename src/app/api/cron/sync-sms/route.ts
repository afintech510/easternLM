import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  getRingCentralAccessToken,
  getRingCentralServerUrl,
  phoneDigits,
} from "@/lib/ringcentral/auth";

/**
 * GET /api/cron/sync-sms
 * Syncs recent SMS messages from RingCentral (last 10 minutes).
 * Catches messages sent from the RC mobile/desktop app that the webhook missed.
 * Run every 5 minutes via cron.
 */
export async function GET() {
  try {
    const token = await getRingCentralAccessToken();
    const server = getRingCentralServerUrl();
    const supabase = getSupabaseAdminClient() as any;

    const since = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    let imported = 0;

    const res = await fetch(
      `${server}/restapi/v1.0/account/~/extension/~/message-store?dateFrom=${since}&messageType=SMS&perPage=50`,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    if (!res.ok) {
      return NextResponse.json({ ok: false, error: `RC API: ${res.status}` });
    }

    const data = await res.json();

    for (const msg of data.records ?? []) {
      const fromNumber = msg.from?.phoneNumber ?? "";
      const toNumber = msg.to?.[0]?.phoneNumber ?? "";
      const isOutbound = msg.direction === "Outbound";
      const businessNumber = isOutbound ? fromNumber : toNumber;
      const customerNumber = isOutbound ? toNumber : fromNumber;

      // Auto-match customer
      const digits = phoneDigits(customerNumber);
      let customerId = null;
      let customerName = null;
      if (digits.length >= 10) {
        const { data: customer } = await supabase
          .from("customers")
          .select("id, first_name, last_name")
          .ilike("phone", `%${digits}%`)
          .limit(1)
          .maybeSingle();
        if (customer) {
          customerId = customer.id;
          customerName = [customer.first_name, customer.last_name]
            .filter(Boolean)
            .join(" ");
        }
      }

      const { error } = await supabase.from("sms_messages").upsert(
        {
          rc_message_id: msg.id?.toString(),
          rc_conversation_id: msg.conversationId?.toString() ?? null,
          direction: isOutbound ? "outbound" : "inbound",
          from_number: fromNumber,
          to_number: toNumber,
          body: msg.subject ?? "",
          status: isOutbound ? "sent" : "received",
          customer_id: customerId,
          customer_name: customerName,
          business_number: businessNumber,
          staff_sender: isOutbound ? "RC App" : null,
          created_at: msg.creationTime,
        },
        { onConflict: "rc_message_id", ignoreDuplicates: true }
      );

      if (!error) imported++;
    }

    return NextResponse.json({ ok: true, imported, total: data.records?.length ?? 0 });
  } catch (err) {
    return NextResponse.json({
      ok: false,
      error: err instanceof Error ? err.message : "Unknown error",
    });
  }
}
