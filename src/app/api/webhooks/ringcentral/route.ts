import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  // RingCentral validation: echoes Validation-Token header
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = getSupabaseAdminClient() as any;

  // ── INCOMING CALL (presence with telephony state) ──────────
  if (event.includes("/presence")) {
    const presenceBody = body.body;
    const telephony = presenceBody?.telephonyStatus;
    const activeCalls = presenceBody?.activeCalls;

    if (telephony === "Ringing" && activeCalls?.length > 0) {
      for (const call of activeCalls) {
        if (call.direction !== "Inbound") continue;

        const callerPhone = call.from;
        if (!callerPhone) continue;

        const digits = callerPhone.replace(/\D/g, "").slice(-10);
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
          .select("id, first_name, last_name, company_name, phone, email, address, city, total_orders, total_spent_cents, tags, is_charge_account, charge_account_name")
          .ilike("phone", `%${digits}%`)
          .order("total_orders", { ascending: false })
          .limit(1)
          .maybeSingle();

        // Insert — triggers Supabase Realtime → POS popup
        await supabase.from("incoming_calls").insert({
          caller_phone: callerPhone,
          caller_digits: digits,
          customer_id: customer?.id ?? null,
          customer_data: customer ?? null,
          session_id: call.sessionId ?? body.subscriptionId ?? null,
        });

        console.log(`[RC] Incoming call: ${callerPhone} → customer: ${customer ? [customer.first_name, customer.last_name].filter(Boolean).join(" ") : "unknown"}`);
      }
    }
  }

  // ── INCOMING SMS ───────────────────────────────────────────
  if (event.includes("/message-store")) {
    const msgBody = body.body;
    if (msgBody?.type === "SMS" && msgBody?.direction === "Inbound") {
      const from = msgBody.from?.phoneNumber;
      const to = msgBody.to?.[0]?.phoneNumber;
      const text = msgBody.subject ?? "";
      const messageId = msgBody.id;

      if (from && text) {
        const digits = from.replace(/\D/g, "").slice(-10);

        // Look up customer
        const { data: customer } = await supabase
          .from("customers")
          .select("id, first_name, last_name, company_name, phone, email, address, city, total_orders")
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

        if (!existingMsg) {
          // Insert as incoming event (POS popup will show it)
          await supabase.from("incoming_calls").insert({
            caller_phone: from,
            caller_digits: digits,
            customer_id: customer?.id ?? null,
            customer_data: customer ? { ...customer, sms_message: text } : { sms_message: text },
            session_id: `sms-${messageId}`,
          });

          // Check if it's a keyword command
          const upper = text.trim().toUpperCase();
          const isKeyword = ["STOP", "HELP", "START", "YES", "NO"].includes(upper);

          if (!isKeyword) {
            // Auto-create a service lead from SMS
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

            // Auto-reply via RingCentral (same number they texted)
            try {
              await sendRingSMS(
                to || "+16318746244",
                from,
                `Thanks for reaching out to Eastern LM! We got your message and will follow up shortly. Call us anytime: (631) 874-6244`
              );
            } catch (err) {
              console.error("[RC] Auto-reply failed:", err);
            }
          }

          console.log(`[RC] Incoming SMS from ${from}: "${text.slice(0, 80)}"`);
        }
      }
    }
  }

  return NextResponse.json({ ok: true });
}

// ── Send SMS via RingCentral API ─────────────────────────────
async function sendRingSMS(fromNumber: string, toNumber: string, text: string) {
  const RC_CLIENT_ID = "aCtUW9yyeLhdl5lTGj019d";
  const RC_CLIENT_SECRET = "REDACTED_RINGCENTRAL_SECRET";
  const RC_JWT = process.env.RINGCENTRAL_JWT;

  if (!RC_JWT) {
    console.warn("[RC] RINGCENTRAL_JWT not set, skipping SMS send");
    return;
  }

  // Get access token
  const authRes = await fetch("https://platform.ringcentral.com/restapi/oauth/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${Buffer.from(`${RC_CLIENT_ID}:${RC_CLIENT_SECRET}`).toString("base64")}`,
    },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${RC_JWT}`,
  });

  if (!authRes.ok) throw new Error(`RC auth failed: ${authRes.status}`);
  const { access_token } = await authRes.json();

  // Send SMS
  const smsRes = await fetch(
    "https://platform.ringcentral.com/restapi/v1.0/account/~/extension/~/sms",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${access_token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: { phoneNumber: fromNumber },
        to: [{ phoneNumber: toNumber }],
        text,
      }),
    }
  );

  if (!smsRes.ok) {
    const err = await smsRes.text();
    throw new Error(`RC SMS failed: ${smsRes.status} — ${err}`);
  }

  console.log(`[RC] SMS sent: ${fromNumber} → ${toNumber}`);
}
