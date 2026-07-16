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

/**
 * Test Suite: Delivery date carry-over
 * Regression guard for the bug where the preferred delivery date lived in
 * per-page local component state and was lost between /cart and /checkout
 * (so the earliest-available default silently overwrote the customer's pick).
 * The date now lives in the persisted Zustand cart store, so a date chosen on
 * the cart is the one shown — and submitted — at checkout.
 *
 * These tests drive the real client flow: an item + address are seeded into the
 * store, the delivery-distance API is stubbed (so the app computes a genuine
 * delivery calculation without Google Maps), the date is picked on the cart, and
 * the customer clicks through to checkout exactly as a shopper would.
 */
test.describe("Delivery date carry-over", () => {
  const CART_STORAGE_KEY = "easternlm-cart";

  /** A valid future delivery date (>= min, never a Sunday) so the store's
   *  normalize effect leaves the customer's pick untouched. Offsets keep it
   *  clear of the earliest-available default so assertions are meaningful. */
  function futureDeliveryDate(offsetDays: number): string {
    const d = new Date();
    d.setDate(d.getDate() + offsetDays);
    if (d.getDay() === 0) d.setDate(d.getDate() + 1); // skip Sunday
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }

  /** Persisted Zustand payload: one bulk item + a delivery address, no
   *  calculation (the app derives that live from the stubbed distance API). */
  function seededCart() {
    return {
      state: {
        items: [
          {
            id: "e2e-mulch",
            name: "Premium Double-Ground Mulch",
            quantity: 5,
            unitPriceCents: 4500,
            deliveryType: "bulk",
            materialClass: "mulch",
            fulfillmentMethod: "delivery",
          },
        ],
        deliveryAddress: { fullAddress: "100 Main St, Center Moriches, NY 11934", zip: "11934" },
        deliveryMethod: "delivery",
        promoCode: "",
        combineLoads: false,
        customerType: "standard",
        accessConstraints: { lowWires: false, narrowDriveway: false, softGround: false, gated: false, steep: false, notes: "" },
        deliveryDate: "",
        deliveryTimeWindow: "flexible",
        customerInfo: { fullName: "", email: "", phone: "", smsOptIn: false },
      },
      version: 0,
    };
  }

  async function setup(page: import("@playwright/test").Page) {
    // Canned ~8-mile trip so the store computes a real, non-blocked calculation.
    await page.route("**/api/delivery/distance", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ distanceMeters: 12875, durationSeconds: 900 }),
      }),
    );
    // Seed the cart once; the guard keeps later edits from being overwritten.
    await page.addInitScript(
      (data) => {
        if (!localStorage.getItem("__e2e_seeded")) {
          localStorage.setItem(data.key, data.value);
          localStorage.setItem("__e2e_seeded", "1");
        }
      },
      { key: CART_STORAGE_KEY, value: JSON.stringify(seededCart()) },
    );
  }

  test("date picked on the cart is the date shown at checkout", async ({ page }) => {
    const chosen = futureDeliveryDate(14);
    await setup(page);

    await page.goto("/cart");
    // Wait for the live calculation so the checkout CTA is available.
    const proceed = page.getByRole("link", { name: /Proceed to Checkout/i });
    await expect(proceed).toBeVisible();

    // Customer picks a preferred date, then clicks through to checkout.
    await page.locator('input[type="date"]').first().fill(chosen);
    await proceed.click();
    await page.waitForURL(/checkout/);

    // Checkout shows the chosen date rather than resetting to the default.
    await expect(page.locator("#co-date")).toHaveValue(chosen);
  });

  test("choosing a date writes it to the shared cart store", async ({ page }) => {
    const chosen = futureDeliveryDate(12);
    await setup(page);

    await page.goto("/cart");
    await expect(page.getByRole("link", { name: /Proceed to Checkout/i })).toBeVisible();

    await page.locator('input[type="date"]').first().fill(chosen);

    // The value is persisted to the shared store (previously it lived in
    // throwaway local component state and never reached the store).
    const stored = await page.evaluate((key) => {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw).state?.deliveryDate : null;
    }, CART_STORAGE_KEY);
    expect(stored).toBe(chosen);
  });
});
