import crypto from "crypto";

const SECRET = process.env.SUPABASE_SERVICE_ROLE_KEY || "fallback-dev-secret";

/** Generate an HMAC-signed confirmation token for a book-now order */
export function generateConfirmationToken(orderId: string, expiresAt: Date): string {
  const payload = `${orderId}:${expiresAt.getTime()}`;
  const signature = crypto.createHmac("sha256", SECRET).update(payload).digest("hex").slice(0, 16);
  // URL-safe base64 of payload + sig
  const token = Buffer.from(`${payload}:${signature}`).toString("base64url");
  return token;
}

/** Verify and decode a confirmation token. Returns orderId if valid, null if expired/tampered. */
export function verifyConfirmationToken(token: string): { orderId: string; expiresAt: Date } | null {
  try {
    const decoded = Buffer.from(token, "base64url").toString("utf8");
    const [orderId, expiresAtStr, signature] = decoded.split(":");
    if (!orderId || !expiresAtStr || !signature) return null;

    const expiresAt = new Date(Number(expiresAtStr));
    if (isNaN(expiresAt.getTime())) return null;
    if (Date.now() > expiresAt.getTime()) return null;

    // Verify HMAC
    const payload = `${orderId}:${expiresAtStr}`;
    const expected = crypto.createHmac("sha256", SECRET).update(payload).digest("hex").slice(0, 16);
    if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return null;

    return { orderId, expiresAt };
  } catch {
    return null;
  }
}
