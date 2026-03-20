import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  // RingCentral validation: sends Validation-Token header, expects it echoed back
  const validationToken = request.headers.get("Validation-Token");
  if (validationToken) {
    return new NextResponse(null, {
      status: 200,
      headers: { "Validation-Token": validationToken },
    });
  }

  // Parse body safely
  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: true });
  }

  // Handle telephony session events
  if (body.event?.includes("/telephony/sessions")) {
    const session = body.body;
    if (!session?.parties) return NextResponse.json({ ok: true });

    for (const party of session.parties) {
      // Only handle inbound calls that are ringing
      if (party.direction !== "Inbound") continue;
      if (!["Proceeding", "Setup"].includes(party.status?.code)) continue;

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

      // Dedupe: don't insert if same session already logged in last 30 seconds
      const { data: existing } = await supabase
        .from("incoming_calls")
        .select("id")
        .eq("caller_digits", digits)
        .gte("created_at", new Date(Date.now() - 30000).toISOString())
        .limit(1)
        .maybeSingle();

      if (existing) continue;

      // Broadcast to POS via Supabase Realtime
      await supabase.from("incoming_calls").insert({
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
