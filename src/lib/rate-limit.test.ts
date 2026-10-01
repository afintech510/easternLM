import { getClientIp, hashIp, peekRateLimit, rateLimit, resetRateLimits } from "./rate-limit";

describe("rateLimit", () => {
  beforeEach(() => resetRateLimits());

  it("allows up to the limit then blocks", () => {
    const now = 1_000_000;
    expect(rateLimit("ip:a", 3, 60_000, now)).toMatchObject({ ok: true, remaining: 2 });
    expect(rateLimit("ip:a", 3, 60_000, now)).toMatchObject({ ok: true, remaining: 1 });
    expect(rateLimit("ip:a", 3, 60_000, now)).toMatchObject({ ok: true, remaining: 0 });
    expect(rateLimit("ip:a", 3, 60_000, now).ok).toBe(false);
  });

  it("keeps keys independent", () => {
    const now = 1_000_000;
    rateLimit("ip:a", 1, 60_000, now);
    expect(rateLimit("ip:a", 1, 60_000, now).ok).toBe(false);
    expect(rateLimit("ip:b", 1, 60_000, now).ok).toBe(true);
  });

  it("resets after the window", () => {
    const now = 1_000_000;
    rateLimit("k", 1, 60_000, now);
    expect(rateLimit("k", 1, 60_000, now + 59_999).ok).toBe(false);
    expect(rateLimit("k", 1, 60_000, now + 60_000).ok).toBe(true);
  });

  it("peek does not count", () => {
    const now = 1_000_000;
    expect(peekRateLimit("k", 1, now).ok).toBe(true);
    expect(peekRateLimit("k", 1, now).ok).toBe(true);
    rateLimit("k", 1, 60_000, now);
    expect(peekRateLimit("k", 1, now).ok).toBe(false);
  });
});

describe("hashIp", () => {
  it("is stable and does not contain the raw ip", () => {
    const h = hashIp("203.0.113.9");
    expect(h).toBe(hashIp("203.0.113.9"));
    expect(h).not.toContain("203.0.113.9");
    expect(h).toHaveLength(32);
  });
});

describe("getClientIp", () => {
  const req = (h: Record<string, string>) => new Request("http://x", { headers: h });
  it("prefers Cloudflare's CF-Connecting-IP over spoofable forwarded headers", () => {
    expect(getClientIp(req({ "cf-connecting-ip": "203.0.113.5", "x-real-ip": "172.70.1.1", "x-forwarded-for": "1.2.3.4, 172.70.1.1" }))).toBe("203.0.113.5");
  });
  it("falls back to X-Real-IP, then the first X-Forwarded-For entry", () => {
    expect(getClientIp(req({ "x-real-ip": "198.51.100.7", "x-forwarded-for": "1.2.3.4" }))).toBe("198.51.100.7");
    expect(getClientIp(req({ "x-forwarded-for": "1.2.3.4, 5.6.7.8" }))).toBe("1.2.3.4");
    expect(getClientIp(req({}))).toBe("unknown");
  });
});
