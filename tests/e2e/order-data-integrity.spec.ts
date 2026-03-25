import { test, expect } from "@playwright/test";
import { getLatestWebOrder } from "../helpers/db-helpers";

/**
 * Test Suite 1: Order Data Integrity
 * Verifies that web orders have ALL required fields populated.
 * Catches: time window NULL, missing order_items, NaN totals.
 */
test.describe("Order Data Integrity", () => {
  const hasDb = !!process.env.SUPABASE_SERVICE_ROLE_KEY;

  test("web delivery order has all delivery fields populated", async () => {
    test.skip(!hasDb, "Needs SUPABASE_SERVICE_ROLE_KEY");
    const order = await getLatestWebOrder();
    if (!order) { test.skip(true, "No web orders to test"); return; }

    expect(order.customer_name).toBeTruthy();
    expect(order.grand_total_cents).toBeGreaterThan(0);
    expect(order.grand_total_cents).not.toBeNaN();
    expect(order.materials_subtotal_cents).not.toBeNaN();
    expect(order.tax_cents).not.toBeNaN();
    expect(order.delivery_total_cents).not.toBeNaN();

    // Order items must exist
    expect(order.order_items).toBeDefined();
    expect(order.order_items.length).toBeGreaterThan(0);
    for (const item of order.order_items) {
      expect(item.product_name).toBeTruthy();
      expect(item.quantity).toBeGreaterThan(0);
      expect(item.unit_price_cents).toBeGreaterThan(0);
      expect(item.line_subtotal_cents).toBeGreaterThan(0);
    }

    if (order.delivery_method === "delivery") {
      expect(order.delivery_address).toBeTruthy();
      expect(order.delivery_total_cents).toBeGreaterThan(0);
      // Time window may be null on orders created before the fix (2026-03-25)
      // Only assert on orders created after the fix
      if (new Date(order.created_at) > new Date("2026-03-25T12:00:00Z")) {
        expect(order.delivery_time_window).toBeTruthy();
        expect(order.delivery_time_window).toMatch(/morning|midday|afternoon|flexible/i);
      }
    }
  });

  test("order source is set", async () => {
    test.skip(!hasDb, "Needs SUPABASE_SERVICE_ROLE_KEY");
    const order = await getLatestWebOrder();
    if (!order) { test.skip(true, "No web orders"); return; }
    expect(order.source).toBeTruthy();
    expect(order.source).toBe("web");
  });
});
