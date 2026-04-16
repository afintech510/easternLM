import { test, expect } from "@playwright/test";

const BASE = process.env.PLAYWRIGHT_BASE_URL || "https://staging.easternlm.com";

test.describe("GCLID Capture", () => {
  test("sets elm_gclid cookie and strips param from URL", async ({ page, context }) => {
    // Visit with gclid param
    await page.goto(`${BASE}/?gclid=test_click_id_12345`);

    // Should redirect to clean URL (no gclid in URL)
    expect(page.url()).not.toContain("gclid");

    // Cookie should be set
    const cookies = await context.cookies();
    const gclidCookie = cookies.find((c) => c.name === "elm_gclid");
    expect(gclidCookie).toBeTruthy();
    expect(gclidCookie?.value).toBe("test_click_id_12345");
    expect(gclidCookie?.httpOnly).toBe(true);
  });

  test("preserves other query params when stripping gclid", async ({ page }) => {
    await page.goto(`${BASE}/shop?category=mulch&gclid=abc123&sort=price`);

    const url = new URL(page.url());
    expect(url.searchParams.has("gclid")).toBe(false);
    expect(url.searchParams.get("category")).toBe("mulch");
    expect(url.searchParams.get("sort")).toBe("price");
  });

  test("cookie persists across page navigations", async ({ page, context }) => {
    await page.goto(`${BASE}/?gclid=persist_test`);
    await page.goto(`${BASE}/shop`);

    const cookies = await context.cookies();
    const gclidCookie = cookies.find((c) => c.name === "elm_gclid");
    expect(gclidCookie?.value).toBe("persist_test");
  });
});
