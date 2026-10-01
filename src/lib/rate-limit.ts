import { createHash } from "crypto";

/**
 * Fixed-window, in-memory rate limiter. Good enough for the single Docker
 * container we run; counters reset on deploy/restart.
 */

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();
let lastSweep = 0;

export const DAY_MS = 24 * 60 * 60 * 1000;

export type RateLimitResult = { ok: boolean; remaining: number; resetAt: number };

function sweep(now: number) {
  if (now - lastSweep < 60_000) return;
  lastSweep = now;
  for (const [k, b] of buckets) if (b.resetAt <= now) buckets.delete(k);
}

/** Count one hit against `key`. Returns ok=false once `limit` hits land inside the window. */
export function rateLimit(key: string, limit: number, windowMs: number, now: number = Date.now()): RateLimitResult {
  sweep(now);
  let b = buckets.get(key);
  if (!b || b.resetAt <= now) {
    b = { count: 0, resetAt: now + windowMs };
    buckets.set(key, b);
  }
  if (b.count >= limit) return { ok: false, remaining: 0, resetAt: b.resetAt };
  b.count++;
  return { ok: true, remaining: limit - b.count, resetAt: b.resetAt };
}

/** Check without counting. */
export function peekRateLimit(key: string, limit: number, now: number = Date.now()): RateLimitResult {
  const b = buckets.get(key);
  if (!b || b.resetAt <= now) return { ok: true, remaining: limit, resetAt: now };
  return { ok: b.count < limit, remaining: Math.max(0, limit - b.count), resetAt: b.resetAt };
}

/** Test helper. */
export function resetRateLimits() {
  buckets.clear();
  lastSweep = 0;
}

/**
 * Visitor IP. Production sits behind Cloudflare → hampton_nginx, so nginx's
 * X-Real-IP is a Cloudflare edge address shared by many visitors; Cloudflare's
 * CF-Connecting-IP is the real client. The first X-Forwarded-For entry is
 * client-controlled, so it's only a last resort (local dev).
 */
export function getClientIp(request: Request): string {
  const cf = request.headers.get("cf-connecting-ip")?.trim();
  if (cf) return cf;
  const real = request.headers.get("x-real-ip")?.trim();
  if (real) return real;
  const fwd = request.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return "unknown";
}

/** Salted hash so raw IPs never hit the database. */
export function hashIp(ip: string): string {
  const salt = process.env.RATE_LIMIT_SALT ?? "elm-rate-limit";
  return createHash("sha256").update(`${salt}:${ip}`).digest("hex").slice(0, 32);
}

export function retryAfterHeaders(r: RateLimitResult): HeadersInit {
  return { "Retry-After": String(Math.max(1, Math.ceil((r.resetAt - Date.now()) / 1000))) };
}
