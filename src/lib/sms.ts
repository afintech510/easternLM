/**
 * Unified SMS sender — RingCentral primary, Twilio fallback.
 * All outbound SMS in the app should use sendSms() from this module.
 * Every outbound message is automatically stored in sms_messages.
 */

import {
  getRingCentralAccessToken,
  getRingCentralServerUrl,
} from "@/lib/ringcentral/auth";

// The JWT authenticates as Ext 102 (POS Desk, id 63390330004).
// SMS-capable numbers on this extension: +16318746244, +16313668524, +16313951661.
const RC_DEFAULT_FROM = "+16318746244"; // Main business line (631) 874-6244

// Map from-numbers to their RingCentral extension IDs
const RC_EXTENSION_MAP: Record<string, string> = {
  "+16318746244": "63390330004", // Main line — POS Desk (ext 102, JWT owner)
  "+16313668524": "63390330004", // Order & Sales — POS Desk (ext 102)
  "+16313951661": "63390330004", // Adam direct — POS Desk (ext 102)
  "+13153625323": "63390330004", // POS Desk direct — no SmsSender
};

// ─── Public API ──────────────────────────────────────────────────

export async function sendSms(
  to: string,
  body: string,
  from?: string,
): Promise<{ ok: boolean; messageId?: string; error?: string }> {
  const toNormalized = normalizePhone(to);
  if (!toNormalized) return { ok: false, error: "Invalid phone number" };

  const fromNumber = from ?? RC_DEFAULT_FROM;
  let result: { ok: boolean; messageId?: string; error?: string };

  // Primary: RingCentral
  if (process.env.RINGCENTRAL_JWT) {
    result = await sendViaRingCentral(toNormalized, body, fromNumber);
    if (!result.ok) {
      console.warn("[SMS] RingCentral failed, trying Twilio fallback:", result.error);
      result = await sendViaTwilio(toNormalized, body);
    }
  } else {
    result = await sendViaTwilio(toNormalized, body);
  }

  // Store every outbound SMS in sms_messages (non-blocking)
  storeOutboundSms(fromNumber, toNormalized, body, result).catch((err) =>
    console.error("[SMS] Failed to store outbound message:", err)
  );

  return result;
}

async function storeOutboundSms(
  from: string,
  to: string,
  body: string,
  result: { ok: boolean; messageId?: string },
) {
  try {
    // Dynamic import to avoid circular dependencies
    const { getSupabaseAdminClient } = await import("@/lib/supabase/admin");
    const supabase = getSupabaseAdminClient() as any;

    // Auto-match customer by phone
    const digits = to.replace(/\D/g, "").slice(-10);
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

    await supabase.from("sms_messages").upsert(
      {
        rc_message_id: result.messageId ?? null,
        direction: "outbound",
        from_number: from,
        to_number: to,
        body,
        status: result.ok ? "sent" : "failed",
        customer_id: customerId,
        customer_name: customerName,
        business_number: from,
        staff_sender: "System",
      },
      { onConflict: "rc_message_id", ignoreDuplicates: true }
    );
  } catch {
    // Table might not exist yet — don't break SMS sending
  }
}

// ─── RingCentral ─────────────────────────────────────────────────

async function sendViaRingCentral(
  to: string, body: string, from: string,
): Promise<{ ok: boolean; messageId?: string; error?: string }> {
  try {
    const token = await getRingCentralAccessToken();
    const server = getRingCentralServerUrl();

    // Try the requested from-number's extension first
    const extensionId = RC_EXTENSION_MAP[from] ?? "~";
    let res = await fetch(`${server}/restapi/v1.0/account/~/extension/${extensionId}/sms`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: { phoneNumber: from },
        to: [{ phoneNumber: to }],
        text: body,
      }),
    });

    // If cross-extension permission denied, fall back to JWT owner's extension
    if (res.status === 403 && extensionId !== "~") {
      console.warn(`[SMS:RC] Permission denied for ext ${extensionId}, falling back to JWT owner extension`);
      res = await fetch(`${server}/restapi/v1.0/account/~/extension/~/sms`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: { phoneNumber: "+16318746244" }, // Main line — SmsSender on JWT owner ext (102)
          to: [{ phoneNumber: to }],
          text: body,
        }),
      });
    }

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return { ok: false, error: (err as { message?: string }).message ?? `HTTP ${res.status}` };
    }

    const result = await res.json();
    console.log(`[SMS:RC] Sent ${result.id} to ${to}`);
    return { ok: true, messageId: String(result.id) };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "RingCentral error" };
  }
}

// ─── Twilio (fallback) ───────────────────────────────────────────

async function sendViaTwilio(
  to: string, body: string,
): Promise<{ ok: boolean; messageId?: string; error?: string }> {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_PHONE_NUMBER;
  if (!sid || !token || !from) return { ok: false, error: "Twilio not configured" };

  try {
    const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`${sid}:${token}`).toString("base64")}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({ To: to, From: from, Body: body }),
    });
    const data = await res.json();
    if (data.sid) {
      console.log(`[SMS:Twilio] Sent ${data.sid} to ${to}`);
      return { ok: true, messageId: data.sid };
    }
    return { ok: false, error: data.message ?? "Twilio error" };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Twilio error" };
  }
}

// ─── Helpers ─────────────────────────────────────────────────────

function normalizePhone(phone: string): string | null {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  if (phone.startsWith("+") && digits.length >= 11) return `+${digits}`;
  return null;
}
