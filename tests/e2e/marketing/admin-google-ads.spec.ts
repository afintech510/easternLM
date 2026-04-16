import { test, expect } from "@playwright/test";

const BASE = process.env.PLAYWRIGHT_BASE_URL || "https://staging.easternlm.com";

test.describe("Google Ads Admin UI", () => {
  test.beforeEach(async ({ page }) => {
    // Login as admin
    await page.goto(`${BASE}/admin/login`);
    await page.fill('input[type="email"]', "adam@easternbuilding.supply");
    await page.fill('input[type="password"]', "Stone110!");
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/admin/);
  });

  test("Google Ads overview page loads", async ({ page }) => {
    await page.goto(`${BASE}/admin/marketing/google-ads`);
    await expect(page.locator("h1")).toContainText("Google Ads");
  });

  test("tab navigation works", async ({ page }) => {
    await page.goto(`${BASE}/admin/marketing/google-ads`);

    // Click Feed tab
    await page.click('a[href*="/feed"]');
    await expect(page).toHaveURL(/\/feed/);

    // Click Campaigns tab
    await page.click('a[href*="/campaigns"]');
    await expect(page).toHaveURL(/\/campaigns/);

    // Click Recommendations tab
    await page.click('a[href*="/recommendations"]');
    await expect(page).toHaveURL(/\/recommendations/);

    // Click Conversions tab
    await page.click('a[href*="/conversions"]');
    await expect(page).toHaveURL(/\/conversions/);
  });

  test("campaigns tab shows created campaigns", async ({ page }) => {
    await page.goto(`${BASE}/admin/marketing/google-ads/campaigns`);
    // Should show at least one of the 5 search campaigns we created
    await expect(page.locator("text=ELM-Search")).toBeVisible();
  });

  test("feed tab shows product sync status", async ({ page }) => {
    await page.goto(`${BASE}/admin/marketing/google-ads/feed`);
    await expect(page.locator("text=Total Offers")).toBeVisible();
  });

  test("conversions tab shows GCLID capture rate", async ({ page }) => {
    await page.goto(`${BASE}/admin/marketing/google-ads/conversions`);
    await expect(page.locator("text=GCLID Capture Rate")).toBeVisible();
  });
});
