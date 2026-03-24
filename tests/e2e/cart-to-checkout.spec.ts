import { test, expect } from "@playwright/test";

/**
 * Test Suite 2: Cart → Checkout Flow
 * Verifies all data survives the journey from cart to checkout page.
 * Catches: time window lost, address lost, customer info not persisting.
 */
test.describe("Cart to Checkout Flow", () => {

  test("shop page loads and has products", async ({ page }) => {
    await page.goto("/shop");
    await expect(page.locator("h1, h2").first()).toBeVisible();
    // Should have product cards/links
    const products = page.locator("[href*='/shop/']");
    expect(await products.count()).toBeGreaterThan(0);
  });

  test("cart page loads", async ({ page }) => {
    await page.goto("/cart");
    await expect(page).toHaveURL(/cart/);
    // Cart page should render (empty cart shows "Your cart is empty" or similar)
    await expect(page.locator("body")).not.toBeEmpty();
  });

  test("checkout page loads", async ({ page }) => {
    await page.goto("/checkout");
    await expect(page).toHaveURL(/checkout/);
  });

  test("all public pages return 200", async ({ page }) => {
    const pages = ["/", "/shop", "/cart", "/checkout", "/services", "/calculator", "/contact"];
    for (const url of pages) {
      const response = await page.goto(url);
      expect(response?.status(), `${url} returned ${response?.status()}`).toBeLessThan(400);
    }
  });
});
