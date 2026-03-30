import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  getRingCentralAccessToken,
  getRingCentralServerUrl,
  phoneDigits,
} from "@/lib/ringcentral/auth";

const BUSINESS_NUMBERS = ["+16318746244", "+16313668524", "+16313951661"];

/**
 * POST /api/admin/rc/sync-messages
 * Pulls SMS history from RingCentral and stores in sms_messages.
 * Defaults to last 30 days.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const days = (body as any).days ?? 30;

    const token = await getRingCentralAccessToken();
    const server = getRingCentralServerUrl();
    const supabase = getSupabaseAdminClient() as any;

    const dateFrom = new Date(
      Date.now() - days * 24 * 60 * 60 * 1000
    ).toISOString();

    let imported = 0;
    let page = 1;
    let hasMore = true;

    while (hasMore) {
      const res = await fetch(
        `${server}/restapi/v1.0/account/~/extension/~/message-store?dateFrom=${dateFrom}&messageType=SMS&perPage=100&page=${page}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (!res.ok) break;

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
            created_at: msg.creationTime,
          },
          { onConflict: "rc_message_id", ignoreDuplicates: true }
        );

        if (!error) imported++;
      }

      hasMore = (data.paging?.page ?? 1) < (data.paging?.totalPages ?? 1);
      page++;
    }

    return NextResponse.json({ ok: true, imported });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}
