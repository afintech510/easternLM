/**
 * Unified SMS sender — RingCentral primary, Twilio fallback.
 * All outbound SMS in the app should use sendSms() from this module.
 */

import {
  getRingCentralAccessToken,
  getRingCentralServerUrl,
} from "@/lib/ringcentral/auth";

// The JWT authenticates as Ext 101 (Adam Larkin, id 63383649004).
// SMS can only be sent from numbers with SmsSender feature on the JWT owner's extension.
// Per RC API: +16313951661 has SmsSender on Ext 101, +16313668524 has SmsSender on Ext 101.
// +16318746244 (main) has SmsSender on Ext 102 only — NOT on Ext 101 (JWT owner).
// So we must send from a number with SmsSender on the JWT owner's extension.
const RC_DEFAULT_FROM = "+16313951661"; // Adam's direct line — has SmsSender on JWT owner ext

// Map from-numbers to their RingCentral extension IDs
const RC_EXTENSION_MAP: Record<string, string> = {
  "+16313951661": "63383649004", // Adam Larkin (ext 101 — JWT owner, has SmsSender)
  "+16313668524": "63383649004", // Also has SmsSender on ext 101
  "+16318746244": "63390330004", // Main line — SmsSender on ext 102 only (cross-ext, may 403)
  "+13153625323": "63390330004", // POS Desk direct — NO SmsSender feature
};

// ─── Public API ──────────────────────────────────────────────────

export async function sendSms(
  to: string,
  body: string,
  from?: string,
): Promise<{ ok: boolean; messageId?: string; error?: string }> {
  const toNormalized = normalizePhone(to);
  if (!toNormalized) return { ok: false, error: "Invalid phone number" };

  // Primary: RingCentral
  if (process.env.RINGCENTRAL_JWT) {
    const result = await sendViaRingCentral(toNormalized, body, from ?? RC_DEFAULT_FROM);
    if (result.ok) return result;
    console.warn("[SMS] RingCentral failed, trying Twilio fallback:", result.error);
  }

  // Fallback: Twilio
  return sendViaTwilio(toNormalized, body);
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
    // with a number that has SmsSender on ext 101
    if (res.status === 403 && extensionId !== "~") {
      console.warn(`[SMS:RC] Permission denied for ext ${extensionId}, falling back to JWT owner extension`);
      res = await fetch(`${server}/restapi/v1.0/account/~/extension/~/sms`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: { phoneNumber: "+16313951661" }, // Adam's line — SmsSender on JWT owner ext
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
