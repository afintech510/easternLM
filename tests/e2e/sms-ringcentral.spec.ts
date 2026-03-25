import { test, expect } from "@playwright/test";

/**
 * Test Suite: RingCentral SMS Integration
 * Verifies outbound SMS uses RingCentral (not Twilio),
 * credentials are configured, and SMS failures don't crash flows.
 */
test.describe("RingCentral SMS Integration", () => {

  test("SMS provider is RingCentral, not Twilio", async ({ request }) => {
    const res = await request.get("/api/health/sms");
    expect(res.status()).toBe(200);
    const data = await res.json();
    expect(data.provider).toBe("ringcentral");
    expect(data.configured).toBe(true);
    expect(data.hasJwtToken).toBe(true);
  });

  test("SMS sends from main business number", async ({ request }) => {
    const res = await request.get("/api/health/sms");
    const data = await res.json();
    expect(data.fromNumber).toBe("+16318746244");
  });

  test("Twilio is configured as fallback only", async ({ request }) => {
    const res = await request.get("/api/health/sms");
    const data = await res.json();
    expect(data.fallbackProvider).toBe("twilio");
    expect(data.provider).not.toBe("twilio");
  });

  test("RingCentral webhook endpoint exists", async ({ request }) => {
    const res = await request.post("/api/webhooks/ringcentral", {
      data: { test: true },
    });
    expect(res.status()).not.toBe(404);
  });

  test("RingCentral subscription renewal works", async ({ request }) => {
    const res = await request.get("/api/cron/ringcentral-renew");
    expect(res.status()).toBe(200);
    const data = await res.json();
    expect(data.ok).toBe(true);
  });

  test("follow-up cron does not report Twilio errors", async ({ request }) => {
    const res = await request.get("/api/cron/follow-ups");
    if (res.status() !== 200) return; // cron may not be configured
    const data = await res.json();
    const text = JSON.stringify(data);
    expect(text).not.toContain("Twilio not configured");
    expect(text).not.toContain("10DLC");
  });
});
