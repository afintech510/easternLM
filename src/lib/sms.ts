/**
 * Unified SMS sender — RingCentral primary, Twilio fallback.
 * All outbound SMS in the app should use sendSms() from this module.
 */

const RC_CLIENT_ID = "aCtUW9yyeLhdl5lTGj019d";
const RC_CLIENT_SECRET = "A9CZh1xxecPbFJryDGhBek5B7b2AYpiKfeKs0BfYCsYa";
const RC_SERVER = "https://platform.ringcentral.com";
const RC_DEFAULT_FROM = "+13153625323"; // RingCentral SMS-enabled number

// ─── Public API ──────────────────────────────────────────────────

export async function sendSms(
  to: string,
  body: string,
  from?: string,
): Promise<{ ok: boolean; messageId?: string; error?: string }> {
  const toNormalized = normalizePhone(to);
  if (!toNormalized) return { ok: false, error: "Invalid phone number" };

  // Primary: RingCentral
  const rcJwt = process.env.RINGCENTRAL_JWT;
  if (rcJwt) {
    const result = await sendViaRingCentral(toNormalized, body, from ?? RC_DEFAULT_FROM, rcJwt);
    if (result.ok) return result;
    console.warn("[SMS] RingCentral failed, trying Twilio fallback:", result.error);
  }

  // Fallback: Twilio
  return sendViaTwilio(toNormalized, body);
}

// ─── RingCentral ─────────────────────────────────────────────────

let cachedToken: { token: string; expiresAt: number } | null = null;

async function getRcAccessToken(jwt: string): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60000) {
    return cachedToken.token;
  }

  const res = await fetch(`${RC_SERVER}/restapi/oauth/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${Buffer.from(`${RC_CLIENT_ID}:${RC_CLIENT_SECRET}`).toString("base64")}`,
    },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
  });

  if (!res.ok) throw new Error(`RingCentral auth failed: ${res.status}`);

  const data = await res.json();
  cachedToken = { token: data.access_token, expiresAt: Date.now() + data.expires_in * 1000 };
  return data.access_token;
}

async function sendViaRingCentral(
  to: string, body: string, from: string, jwt: string,
): Promise<{ ok: boolean; messageId?: string; error?: string }> {
  try {
    const token = await getRcAccessToken(jwt);

    const res = await fetch(`${RC_SERVER}/restapi/v1.0/account/~/extension/~/sms`, {
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
