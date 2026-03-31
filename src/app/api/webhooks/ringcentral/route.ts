import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { phoneDigits } from "@/lib/ringcentral/auth";
import { EXTENSION_NAMES, mapRCStatus } from "@/lib/ringcentral/helpers";
import { sendSms } from "@/lib/sms";

export async function POST(request: Request) {
  // ── RingCentral validation handshake ─────────────────────────
  const validationToken = request.headers.get("Validation-Token");
  if (validationToken) {
    return new NextResponse(null, {
      status: 200,
      headers: { "Validation-Token": validationToken },
    });
  }

  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: true });
  }

  const event = body.event ?? "";
  const supabase = getSupabaseAdminClient();

  // ── TELEPHONY SESSION EVENTS (new — writes to call_records) ──
  if (event.includes("/telephony/sessions")) {
    try {
      await handleTelephonySession(supabase, body.body);
    } catch (err) {
      console.error("[RC] Telephony session error:", err);
    }
  }

  // ── PRESENCE EVENTS (legacy — writes to incoming_calls for POS popup) ──
  if (event.includes("/presence")) {
    try {
      await handlePresenceEvent(supabase, body);
    } catch (err) {
      console.error("[RC] Presence event error:", err);
    }
  }

  // ── INCOMING SMS ─────────────────────────────────────────────
  if (event.includes("/message-store")) {
    try {
      await handleIncomingSms(supabase, body.body);
    } catch (err) {
      console.error("[RC] SMS event error:", err);
    }
  }

  return NextResponse.json({ ok: true });
}

// ── Telephony session handler ────────────────────────────────────
async function handleTelephonySession(supabase: any, session: any) {
  if (!session) return;

  const parties = session.parties ?? [];
  const sessionId =
    session.telephonySessionId ?? session.id ?? session.sessionId;

  for (const party of parties) {
    const direction = party.direction?.toLowerCase() ?? "inbound";
    const fromNumber =
      party.from?.phoneNumber ?? party.from?.extensionNumber ?? "";
    const toNumber =
      party.to?.phoneNumber ?? party.to?.extensionNumber ?? "";
    const status = mapRCStatus(party.status?.code);

    if (!sessionId || !fromNumber) continue;

    // Build upsert payload — only set fields that have values
    const upsertData: Record<string, any> = {
      rc_session_id: sessionId,
      direction,
      from_number: fromNumber,
      to_number: toNumber,
      from_name: party.from?.name ?? null,
      extension_id: party.extensionId ?? null,
      extension_name:
        EXTENSION_NAMES[party.extensionId ?? ""] ?? null,
      status,
      started_at: session.creationTime ?? new Date().toISOString(),
    };

    if (status === "answered") {
      upsertData.answered_at = new Date().toISOString();
    }
    if (status === "completed" || status === "missed" || status === "voicemail") {
      upsertData.ended_at = new Date().toISOString();
    }
    if (party.duration != null) {
      upsertData.duration_seconds = party.duration;
    }
    if (party.recordings?.[0]?.id) {
      upsertData.rc_recording_id = party.recordings[0].id;
    }

    // Upsert into call_records (same session = same call at different stages)
    const { data: callRecord } = await supabase
      .from("call_records")
      .upsert(upsertData, {
        onConflict: "rc_session_id",
        ignoreDuplicates: false,
      })
      .select("id, customer_id")
      .single();

    if (!callRecord) continue;

    // Auto-match customer by phone on inbound calls
    if (direction === "inbound" && !callRecord.customer_id && fromNumber) {
      const digits = phoneDigits(fromNumber);
      if (digits.length >= 10) {
        const { data: customer } = await supabase
          .from("customers")
          .select("id")
          .ilike("phone", `%${digits}%`)
          .order("total_orders", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (customer) {
          await supabase
            .from("call_records")
            .update({
              customer_id: customer.id,
              customer_match_type: "auto_phone",
            })
            .eq("id", callRecord.id);
        }
      }
    }

    // Flag missed calls for follow-up
    if (status === "missed") {
      await supabase
        .from("call_records")
        .update({ requires_follow_up: true })
        .eq("id", callRecord.id);
    }

    console.log(
      `[RC] Call ${sessionId}: ${direction} ${fromNumber} → ${toNumber} [${status}]`
    );
  }
}

// ── Presence handler (existing popup logic) ──────────────────────
async function handlePresenceEvent(supabase: any, body: any) {
  const presenceBody = body.body;
  const telephony = presenceBody?.telephonyStatus;
  const activeCalls = presenceBody?.activeCalls;

  if (telephony !== "Ringing" || !activeCalls?.length) return;

  for (const call of activeCalls) {
    if (call.direction !== "Inbound") continue;

    const callerPhone = call.from;
    if (!callerPhone) continue;

    const digits = phoneDigits(callerPhone);
    if (digits.length < 10) continue;

    // Dedupe within 30 seconds
    const { data: existing } = await supabase
      .from("incoming_calls")
      .select("id")
      .eq("caller_digits", digits)
      .gte("created_at", new Date(Date.now() - 30000).toISOString())
      .limit(1)
      .maybeSingle();

    if (existing) continue;

    // Look up customer
    const { data: customer } = await supabase
      .from("customers")
      .select(
        "id, first_name, last_name, company_name, phone, email, address, city, total_orders, total_spent_cents, tags, is_charge_account, charge_account_name"
      )
      .ilike("phone", `%${digits}%`)
      .order("total_orders", { ascending: false })
      .limit(1)
      .maybeSingle();

    // Insert → triggers Supabase Realtime → POS popup
    await supabase.from("incoming_calls").insert({
      caller_phone: callerPhone,
      caller_digits: digits,
      customer_id: customer?.id ?? null,
      customer_data: customer ?? null,
      session_id: call.sessionId ?? body.subscriptionId ?? null,
    });

    // Also upsert into call_records (for the Phone tab / call log)
    const sessionId = call.sessionId ?? `presence-${digits}-${Date.now()}`;
    await supabase
      .from("call_records")
      .upsert(
        {
          rc_session_id: sessionId,
          direction: "inbound" as const,
          from_number: callerPhone,
          to_number: "+16318746244",
          from_name: customer
            ? [customer.first_name, customer.last_name]
                .filter(Boolean)
                .join(" ") || null
            : null,
          status: "ringing",
          started_at: new Date().toISOString(),
          customer_id: customer?.id ?? null,
          customer_match_type: customer ? "auto_phone" : null,
        },
        { onConflict: "rc_session_id", ignoreDuplicates: false }
      );

    console.log(
      `[RC] Incoming call: ${callerPhone} → customer: ${
        customer
          ? [customer.first_name, customer.last_name]
              .filter(Boolean)
              .join(" ")
          : "unknown"
      }`
    );
  }
}

// ── Incoming SMS handler ─────────────────────────────────────────
async function handleIncomingSms(supabase: any, msgBody: any) {
  if (msgBody?.type !== "SMS" || msgBody?.direction !== "Inbound") return;

  const from = msgBody.from?.phoneNumber;
  const to = msgBody.to?.[0]?.phoneNumber;
  const text = msgBody.subject ?? "";
  const messageId = msgBody.id;

  if (!from || !text) return;

  const digits = phoneDigits(from);

  // Look up customer
  const { data: customer } = await supabase
    .from("customers")
    .select(
      "id, first_name, last_name, company_name, phone, email, address, city, total_orders"
    )
    .ilike("phone", `%${digits}%`)
    .order("total_orders", { ascending: false })
    .limit(1)
    .maybeSingle();

  // Dedupe SMS by messageId
  const { data: existingMsg } = await supabase
    .from("incoming_calls")
    .select("id")
    .eq("session_id", `sms-${messageId}`)
    .limit(1)
    .maybeSingle();

  if (existingMsg) return;

  // Insert as incoming event (POS popup will show it)
  await supabase.from("incoming_calls").insert({
    caller_phone: from,
    caller_digits: digits,
    customer_id: customer?.id ?? null,
    customer_data: customer
      ? { ...customer, sms_message: text }
      : { sms_message: text },
    session_id: `sms-${messageId}`,
  });

  // Also store in sms_messages for the messaging suite
  const customerName = customer
    ? [customer.first_name, customer.last_name].filter(Boolean).join(" ")
    : null;
  await supabase
    .from("sms_messages")
    .upsert(
      {
        rc_message_id: messageId?.toString(),
        rc_conversation_id: msgBody.conversationId?.toString() ?? null,
        direction: "inbound",
        from_number: from,
        to_number: to || "+16318746244",
        body: text,
        status: "received",
        customer_id: customer?.id ?? null,
        customer_name: customerName,
        business_number: to || "+16318746244",
      },
      { onConflict: "rc_message_id", ignoreDuplicates: true }
    )
    .then(() => {})
    .catch(() => {});

  // Check if it's a keyword command
  const upper = text.trim().toUpperCase();
  const isKeyword = ["STOP", "HELP", "START", "YES", "NO"].includes(upper);

  if (!isKeyword) {
    // Auto-create service lead from SMS
    const customerName = customer
      ? [customer.first_name, customer.last_name].filter(Boolean).join(" ")
      : "Unknown";

    await supabase.from("service_leads").insert({
      customer_id: customer?.id ?? null,
      name: customerName,
      phone: from,
      source: "sms_inbound",
      description: text,
      status: "new",
      notes: `Incoming SMS to ${to || "yard"}: "${text}"`,
    });

    // Auto-reply disabled — staff handles replies manually via POS Messages tab
  }

  console.log(`[RC] Incoming SMS from ${from}: "${text.slice(0, 80)}"`);
}
