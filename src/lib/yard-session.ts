/**
 * Signed httpOnly cookie sessions for PIN-based yard logins.
 * Uses HMAC-SHA256 via the Web Crypto API (edge + Node compatible).
 *
 * Cookie format: base64url(JSON).base64url(HMAC-SHA256)
 */

export const YARD_COOKIE_NAME = "yard_session";
const COOKIE_MAX_AGE = 12 * 60 * 60; // 12 hours in seconds

export interface YardSessionPayload {
  id: string;
  role: string;
  name: string;
  exp: number; // Unix ms
}

function getSecret(): string {
  // Reuse service role key as HMAC secret — it's already a long random secret
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "fallback-dev-secret";
  return key.slice(0, 64);
}

async function getHmacKey(secret: string): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  return globalThis.crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

function base64urlEncode(buf: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(buf)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");
}

function base64urlDecode(str: string): Uint8Array {
  const base64 = str.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(base64);
  return Uint8Array.from(binary, (c) => c.charCodeAt(0));
}

export async function signYardSession(payload: Omit<YardSessionPayload, "exp">): Promise<string> {
  const full: YardSessionPayload = {
    ...payload,
    exp: Date.now() + COOKIE_MAX_AGE * 1000,
  };
  const data = btoa(JSON.stringify(full))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");

  const key = await getHmacKey(getSecret());
  const sigBuf = await globalThis.crypto.subtle.sign("HMAC", key, new TextEncoder().encode(data));
  const sig = base64urlEncode(sigBuf);
  return `${data}.${sig}`;
}

export async function verifyYardSession(cookie: string): Promise<YardSessionPayload | null> {
  try {
    const dotIdx = cookie.lastIndexOf(".");
    if (dotIdx === -1) return null;
    const data = cookie.slice(0, dotIdx);
    const sig = cookie.slice(dotIdx + 1);

    const key = await getHmacKey(getSecret());
    const sigBytes = base64urlDecode(sig);
    const isValid = await globalThis.crypto.subtle.verify(
      "HMAC",
      key,
      sigBytes.buffer as ArrayBuffer,
      new TextEncoder().encode(data),
    );
    if (!isValid) return null;

    const payload: YardSessionPayload = JSON.parse(atob(data.replace(/-/g, "+").replace(/_/g, "/")));
    if (payload.exp < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

export function yardSessionCookieOptions() {
  return {
    name: YARD_COOKIE_NAME,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: COOKIE_MAX_AGE,
  };
}
