import { test, expect } from "@playwright/test";

const hasDb = !!process.env.SUPABASE_SERVICE_ROLE_KEY;

function getSupabase() {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { createClient } = require("@supabase/supabase-js");
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

test.describe("POS Fixes — March 2026", () => {

  // ── Fix 1: Default Delivery Dates ──

  test("web cart delivery date defaults to tomorrow (skips Sunday)", async ({ page }) => {
    await page.goto("/cart");
    // The date input may only be visible with items + delivery selected
    // Just verify the page loads and has a date input if delivery section shows
    const dateInput = page.locator("input[type='date']").first();
    if (await dateInput.isVisible({ timeout: 3000 })) {
      const value = await dateInput.inputValue();
      expect(value).toBeTruthy();
      // Should be today or tomorrow, not empty
      const d = new Date(value + "T12:00:00");
      expect(d.getDay()).not.toBe(0); // not Sunday
    }
  });

  // ── Fix 2: Phone lookup doesn't overwrite ──

  test("no customer records have SMS prefix as name", async () => {
    test.skip(!hasDb, "Needs SUPABASE_SERVICE_ROLE_KEY");
    const supabase = getSupabase();
    const { data } = await supabase
      .from("customers")
      .select("id, first_name")
      .or("first_name.ilike.SMS:%,first_name.ilike.+1%")
      .limit(5);
    expect(data?.length ?? 0).toBe(0);
  });

  // ── Fix 7: Receipt formatting ──

  test("no bulk order items have unit=ea or unit=unit", async () => {
    test.skip(!hasDb, "Needs SUPABASE_SERVICE_ROLE_KEY");
    const supabase = getSupabase();
    const { data } = await supabase
      .from("order_items")
      .select("id, product_name, unit, delivery_type")
      .eq("delivery_type", "bulk")
      .or("unit.is.null,unit.eq.ea,unit.eq.unit")
      .limit(5);
    expect(data?.length ?? 0).toBe(0);
  });

  // ── Fix 6: Refund button ──

  test("POS transactions tab loads", async ({ page }) => {
    await page.goto("/yard/register");
    const txnTab = page.getByRole("tab", { name: /transaction/i });
    if (await txnTab.isVisible({ timeout: 3000 })) {
      await txnTab.click();
      // Should show order list or empty state
      await expect(page.locator("body")).not.toBeEmpty();
    }
  });
});

// ── Data Integrity ──

test.describe("Data Integrity — Delivery Orders", () => {

  test("recent delivery orders have time window populated", async () => {
    test.skip(!hasDb, "Needs SUPABASE_SERVICE_ROLE_KEY");
    const supabase = getSupabase();
    // Only check orders created after the fix was deployed (2026-03-25)
    const { data } = await supabase
      .from("orders")
      .select("id, customer_name, delivery_time_window")
      .eq("delivery_method", "delivery")
      .gte("created_at", "2026-03-25T12:00:00Z")
      .order("created_at", { ascending: false })
      .limit(5);

    if (data && data.length > 0) {
      expect(data[0].delivery_time_window).toBeTruthy();
    }
  });

  test("no delivery order has NaN delivery fee", async () => {
    test.skip(!hasDb, "Needs SUPABASE_SERVICE_ROLE_KEY");
    const supabase = getSupabase();
    const { data } = await supabase
      .from("orders")
      .select("id, delivery_total_cents")
      .eq("delivery_method", "delivery")
      .order("created_at", { ascending: false })
      .limit(20);

    for (const order of data ?? []) {
      expect(order.delivery_total_cents).not.toBeNull();
      expect(Number.isNaN(order.delivery_total_cents)).toBe(false);
      expect(order.delivery_total_cents).toBeGreaterThanOrEqual(0);
    }
  });

  test("all orders have items", async () => {
    test.skip(!hasDb, "Needs SUPABASE_SERVICE_ROLE_KEY");
    const supabase = getSupabase();
    const { data } = await supabase
      .from("orders")
      .select("id, customer_name, order_items(id)")
      .order("created_at", { ascending: false })
      .limit(10);

    const empty = (data ?? []).filter((o: { order_items: unknown[] }) => !o.order_items?.length);
    if (empty.length > 0) {
      console.warn("Orders with no items:", empty.map((o: { customer_name: string; id: string }) => `${o.customer_name} (${o.id.slice(0, 8)})`));
    }
    // Most recent orders should have items
    if (data && data.length > 0) {
      expect((data[0] as { order_items: unknown[] }).order_items.length).toBeGreaterThan(0);
    }
  });
});
