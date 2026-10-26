import type { NextRequest } from "next/server";

/**
 * Printed QR codes (shirts, banner) link straight to the site with
 * utm_source=<thing>_qr. Middleware calls this on those landings to write a
 * row to qr_scans — a hard scan count alongside GA. Edge-safe: Web Crypto +
 * Supabase REST, no Node APIs.
 */
export function getQrScanSource(request: NextRequest): string | null {
  if (request.method !== "GET") return null;
  // Only real page loads — not RSC/prefetch requests from client navigation
  if (request.headers.get("rsc") || request.headers.get("next-router-prefetch")) return null;
  const src = request.nextUrl.searchParams.get("utm_source");
  return src && /^[a-z0-9_-]{1,40}_qr$/i.test(src) ? src.toLowerCase() : null;
}

export async function logQrScan(request: NextRequest, source: string): Promise<void> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return;

  const content = request.nextUrl.searchParams.get("utm_content");
  const ip =
    request.headers.get("cf-connecting-ip")?.trim() ||
    request.headers.get("x-real-ip")?.trim() ||
    request.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
    "unknown";

  try {
    await fetch(`${url}/rest/v1/qr_scans`, {
      method: "POST",
      headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json", Prefer: "return=minimal" },
      body: JSON.stringify({
        source,
        variant: content && /^[A-Za-z0-9_-]{1,40}$/.test(content) ? content : null,
        ip_hash: await hashIp(ip),
        user_agent: request.headers.get("user-agent")?.slice(0, 500) ?? null,
        referer: request.headers.get("referer")?.slice(0, 500) ?? null,
      }),
    });
  } catch {
    // Never affect the page load
  }
}

// Same salt + output as hashIp() in rate-limit.ts, via Web Crypto
async function hashIp(ip: string): Promise<string> {
  const salt = process.env.RATE_LIMIT_SALT ?? "elm-rate-limit";
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`${salt}:${ip}`));
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("").slice(0, 32);
}
