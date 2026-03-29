/**
 * Shared RingCentral authentication — JWT bearer token exchange with caching.
 *
 * Credentials come from environment variables:
 *   RINGCENTRAL_CLIENT_ID, RINGCENTRAL_CLIENT_SECRET, RINGCENTRAL_JWT
 *   RINGCENTRAL_SERVER_URL (defaults to https://platform.ringcentral.com)
 */

const RC_SERVER =
  process.env.RINGCENTRAL_SERVER_URL ?? "https://platform.ringcentral.com";

function getCredentials() {
  const clientId = process.env.RINGCENTRAL_CLIENT_ID;
  const clientSecret = process.env.RINGCENTRAL_CLIENT_SECRET;
  const jwt = process.env.RINGCENTRAL_JWT;

  if (!clientId || !clientSecret) {
    throw new Error(
      "RINGCENTRAL_CLIENT_ID and RINGCENTRAL_CLIENT_SECRET must be set"
    );
  }
  if (!jwt) {
    throw new Error("RINGCENTRAL_JWT must be set");
  }

  return { clientId, clientSecret, jwt };
}

// ── Cached token ─────────────────────────────────────────────────
let cachedToken: { token: string; expiresAt: number } | null = null;

export async function getRingCentralAccessToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) {
    return cachedToken.token;
  }

  const { clientId, clientSecret, jwt } = getCredentials();

  const res = await fetch(`${RC_SERVER}/restapi/oauth/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
    },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`RingCentral auth failed (${res.status}): ${text}`);
  }

  const data = await res.json();
  cachedToken = {
    token: data.access_token,
    expiresAt: Date.now() + data.expires_in * 1000,
  };
  return data.access_token;
}

export function getRingCentralServerUrl(): string {
  return RC_SERVER;
}

/** Normalize a phone string to E.164 (+1XXXXXXXXXX) or return null. */
export function normalizePhone(phone: string): string | null {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  if (phone.startsWith("+") && digits.length >= 11) return `+${digits}`;
  return null;
}

/** Extract last 10 digits for fuzzy matching. */
export function phoneDigits(phone: string): string {
  return phone.replace(/\D/g, "").slice(-10);
}
