import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

// RingCentral sends a validation request on webhook subscription
export async function POST(request: Request) {
  const body = await request.json();

  // Webhook validation — RingCentral sends a validation token on subscription
  if (body.validationToken) {
    return new NextResponse(null, {
      status: 200,
      headers: { "Validation-Token": body.validationToken },
    });
  }

  // Handle telephony session events
  if (body.event?.includes("/telephony/sessions")) {
    const session = body.body;
    if (!session?.parties) return NextResponse.json({ ok: true });

    for (const party of session.parties) {
      // Only handle inbound calls
      if (party.direction !== "Inbound" || party.status?.code !== "Proceeding") continue;

      const callerPhone = party.from?.phoneNumber;
      if (!callerPhone) continue;

      // Normalize phone (strip +1 prefix)
      const digits = callerPhone.replace(/\D/g, "").slice(-10);

      // Look up customer
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const supabase = getSupabaseAdminClient() as any;
      const { data: customer } = await supabase
        .from("customers")
        .select("id, first_name, last_name, company_name, phone, email, address, city, total_orders, total_spent_cents, tags, is_charge_account, charge_account_name")
        .ilike("phone", `%${digits}%`)
        .order("total_orders", { ascending: false })
        .limit(1)
        .maybeSingle();

      // Broadcast to POS via Supabase Realtime (insert into a lightweight table)
      await (supabase as any)
        .from("incoming_calls")
        .insert({
          caller_phone: callerPhone,
          caller_digits: digits,
          customer_id: customer?.id ?? null,
          customer_data: customer ?? null,
          session_id: session.sessionId ?? body.subscriptionId ?? null,
        });
    }
  }

  return NextResponse.json({ ok: true });
}
