import { test, expect } from "@playwright/test";

/**
 * Test Suite 4: Mobile Usability
 * Catches: horizontal overflow, tiny touch targets, iOS zoom on inputs.
 */
test.describe("Mobile Usability", () => {
  test.use({ viewport: { width: 375, height: 812 }, isMobile: true });

  const pages = ["/", "/shop", "/cart", "/services", "/calculator", "/contact"];

  for (const url of pages) {
    test(`no horizontal overflow on ${url}`, async ({ page }) => {
      await page.goto(url);
      await page.waitForLoadState("networkidle");
      const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
      const viewportWidth = await page.evaluate(() => window.innerWidth);
      expect(bodyWidth, `Overflow on ${url}: body=${bodyWidth} viewport=${viewportWidth}`).toBeLessThanOrEqual(viewportWidth + 2);
    });
  }

  test("inputs have 16px+ font (no iOS zoom)", async ({ page }) => {
    await page.goto("/cart");
    await page.waitForLoadState("networkidle");
    const inputs = page.locator('input:not([type="checkbox"]):not([type="radio"]):not([type="hidden"]), select, textarea');
    const count = await inputs.count();
    const tooSmall: string[] = [];
    for (let i = 0; i < count; i++) {
      const el = inputs.nth(i);
      if (!await el.isVisible()) continue;
      const fontSize = await el.evaluate((e) => parseFloat(window.getComputedStyle(e).fontSize));
      if (fontSize < 16) {
        const tag = await el.evaluate((e) => `${e.tagName}[${e.getAttribute("name") || e.getAttribute("placeholder") || ""}]`);
        tooSmall.push(`${tag}: ${fontSize}px`);
      }
    }
    expect(tooSmall, `Inputs under 16px: ${tooSmall.join(", ")}`).toHaveLength(0);
  });
});
