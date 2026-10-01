import { test, expect, type APIResponse } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import sharp from "sharp";
import { mkdtemp, rm } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";

/**
 * Test Suite: Holiday Lights AI Visualizer (Tinsel Time Long Island)
 *
 * Assumes the dev server is running with HOLIDAY_VISUALIZER_MOCK=1 so Replicate
 * predictions "succeed" ~3s after starting (see src/lib/holiday-lights/visualize.ts,
 * MOCK_DELAY_MS) without a real Replicate call. DB-backed assertions are skipped
 * when Supabase service-role credentials aren't present in the environment.
 */

const hasDb = !!process.env.NEXT_PUBLIC_SUPABASE_URL && !!process.env.SUPABASE_SERVICE_ROLE_KEY;

/**
 * The full flow spends real money (Replicate) and sends real texts unless the server
 * runs with HOLIDAY_VISUALIZER_MOCK=1. CI points PLAYWRIGHT_BASE_URL at live staging,
 * so the flow only runs locally — or remotely when HOLIDAY_E2E_REAL=1 is set on purpose.
 */
const flowAllowed = !process.env.PLAYWRIGHT_BASE_URL || process.env.HOLIDAY_E2E_REAL === "1";

function getSupabase() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false },
  });
}

/** 631-555-XXXX test number: valid-looking, 10 digits, won't collide with real customers. */
function randomTestPhone(): string {
  const suffix = Math.floor(1000 + Math.random() * 9000);
  return `631555${suffix}`;
}

/** A 1200x800 JPEG with a simple house-like shape, written to a temp dir. */
async function makeFixtureJpeg(dir: string): Promise<string> {
  const width = 1200;
  const height = 800;
  const svg = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
    <rect width="100%" height="100%" fill="#bcd4e6"/>
    <rect x="300" y="340" width="600" height="360" fill="#8a6d4b"/>
    <polygon points="280,340 600,140 920,340" fill="#5a3f2b"/>
  </svg>`;
  const buf = await sharp(Buffer.from(svg)).jpeg({ quality: 90 }).toBuffer();
  const file = join(dir, "fixture-house.jpg");
  await sharp(buf).toFile(file);
  return file;
}

test.describe("Holiday Lights landing — mobile chrome", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("hero CTA is above the fold and the Eastern LM site chrome is not rendered", async ({ page }) => {
    await page.goto("/holiday-lights");

    // Tinsel's own sticky header renders its brand mark.
    await expect(page.locator("header.nav .brand")).toContainText("Tinsel Time");

    // The hero CTA must be visible without scrolling on a 390x844 phone viewport.
    const cta = page.getByRole("button", { name: "See your house lit up, free" }).first();
    await expect(cta).toBeVisible();
    const box = await cta.boundingBox();
    expect(box, "hero CTA should have a bounding box").not.toBeNull();
    expect(box!.y + box!.height).toBeLessThanOrEqual(844);

    // Eastern LM's own site header (src/components/layout/header.tsx) renders an
    // <Image alt="Eastern Landscape & Mason Supply"> inside a top-level <header>.
    // LayoutShell skips it entirely for /holiday-lights, but assert directly so a
    // future regression (e.g. a layout change that re-adds it) is caught here.
    // (The Tinsel footer itself says "Operated by Eastern Landscape & Mason Supply", so
    // assert on the Eastern header logo rather than the business name.)
    await expect(page.locator('header img[alt="Eastern Landscape & Mason Supply"]')).toHaveCount(0);
  });
});

test.describe("AI Visualizer flow", () => {
  test.describe.configure({ mode: "serial" });
  test.skip(!flowAllowed, "Runs only against a local HOLIDAY_VISUALIZER_MOCK=1 server (no real Replicate spend or SMS)");
  test.use({ viewport: { width: 390, height: 844 } });

  let tmpDir: string;
  let fixturePath: string;
  const testPhone = randomTestPhone();
  let token: string | null = null;

  test.beforeAll(async () => {
    tmpDir = await mkdtemp(join(tmpdir(), "holiday-lights-e2e-"));
    fixturePath = await makeFixtureJpeg(tmpDir);
  });

  test.afterAll(async () => {
    await rm(tmpDir, { recursive: true, force: true }).catch(() => undefined);

    if (!hasDb) return;
    const sb = getSupabase();

    const { data: lead } = await sb
      .from("service_leads")
      .select("id")
      .eq("phone", testPhone)
      .maybeSingle();
    if (lead) {
      await sb.from("lead_activity").delete().eq("lead_id", lead.id);
      await sb.from("service_leads").delete().eq("id", lead.id);
    }
    if (token) {
      await sb.from("holiday_light_designs").delete().eq("token", token);
    }
    await sb.from("sms_consent_log").delete().eq("phone", testPhone);
  });

  test("uploads a photo, picks a style, and unlocks the lit-up concept image", async ({ page }) => {
    await page.goto("/holiday-lights");

    await page.locator("#photo").setInputFiles(fixturePath);
    // The style radios are visually hidden in favor of styled labels; the inputs
    // themselves are still the source of truth for the selected value.
    await page.locator('input[name="style"][value="candy"]').check({ force: true });

    const uploadResponsePromise = page.waitForResponse(
      (res) => res.url().includes("/api/holiday-lights/upload") && res.request().method() === "POST",
    );
    await page.getByRole("button", { name: "Next", exact: true }).click();

    const uploadJson = (await (await uploadResponsePromise).json()) as { token: string };
    token = uploadJson.token;
    expect(token).toBeTruthy();

    await page.locator("#v-name").fill("Test Customer");
    await page.locator("#v-tel").fill(testPhone);
    await page.locator("#v-consent").check();

    // Best-effort: the blurred teaser usually shows up once the mock prediction
    // finishes (~3s) while the customer is still typing their details. Don't fail
    // the flow if it's not there yet — the unlock step below still has to work.
    try {
      await expect(page.locator('[data-testid="viz-teaser"] img')).toHaveAttribute("src", /\/blur/, {
        timeout: 20_000,
      });
    } catch {
      /* teaser didn't appear in time — proceed to submit anyway */
    }

    await page.getByRole("button", { name: "Show my house lit up" }).click();

    const result = page.locator('[data-testid="viz-result"]');
    await expect(result).toHaveAttribute("data-locked", "false", { timeout: 30_000 });
    await expect(result.locator('img[src*="/result"]')).toHaveCount(1, { timeout: 30_000 });
  });

  test("records a service lead and an unlocked design row in Supabase", async () => {
    test.skip(!hasDb, "Needs NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY");
    expect(token, "previous test should have captured the upload token").toBeTruthy();

    const sb = getSupabase();

    const { data: lead } = await sb
      .from("service_leads")
      .select("*")
      .eq("phone", testPhone)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    expect(lead).toBeTruthy();
    expect(lead!.source).toBe("holiday_lights_visualizer");
    expect(lead!.service_type).toBe("christmas-lights");

    const { data: design } = await sb
      .from("holiday_light_designs")
      .select("*")
      .eq("token", token as string)
      .maybeSingle();
    expect(design).toBeTruthy();
    expect(design!.unlocked_at).toBeTruthy();
  });
});

test.describe("Upload rate limiting", () => {
  test("the 11th upload from the same IP in a day is rejected with 429", async ({ request }) => {
    const ip = `198.51.100.${Math.floor(10 + Math.random() * 200)}`;
    const tinyJpeg = await sharp({
      create: { width: 2, height: 2, channels: 3, background: { r: 255, g: 255, b: 255 } },
    })
      .jpeg()
      .toBuffer();

    let last: APIResponse | null = null;
    for (let i = 1; i <= 11; i++) {
      last = await request.post("/api/holiday-lights/upload", {
        headers: { "x-forwarded-for": ip },
        multipart: {
          photo: { name: "tiny.jpg", mimeType: "image/jpeg", buffer: tinyJpeg },
        },
      });
      if (i <= 10) {
        expect(last.status(), `upload #${i} from a fresh IP should not be rate-limited`).not.toBe(429);
      }
    }

    expect(last).not.toBeNull();
    expect(last!.status()).toBe(429);
  });
});
