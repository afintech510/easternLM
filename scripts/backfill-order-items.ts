/**
 * Backfill missing/incorrect order items for specific orders.
 *
 * Usage: npx tsx scripts/backfill-order-items.ts
 *
 * Order #faf85ad5 (Tom Grajewski):
 *   - 0 items in DB. Stripe PI metadata shows $379 materials, 10 yds mulch-class,
 *     delivery via Medium Dump to 4 Sabrina Dr, Eastport.
 *   - $379 / 10 yds = $37.90/yd → Red Mulch ($38/yd) is closest.
 *     However $37.90 × 10 = $379 exactly — likely a web price or slight discount.
 *     We'll insert as "Red Mulch" at $37.90/yd (what was actually charged).
 *
 * Order #c0e0a6e2 (Luke):
 *   - Has 2 items but product_name = "Item" (came from quote with generic name).
 *   - 2 cu yds at $24/yd = Screened Topsoil ($24/yd).
 *   - Fix: update product_name to "Screened Topsoil", link product_id.
 */

import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

async function main() {
  console.log("=== Order Items Backfill ===\n");

  // ─── Order #faf85ad5 (Tom Grajewski) ───────────────────────────
  const tomOrderId = "faf85ad5"; // prefix
  const { data: tomOrders } = await supabase
    .from("orders")
    .select("id, customer_name")
    .ilike("customer_name", "%Tom Grajewski%")
    .order("placed_at", { ascending: false })
    .limit(1);

  const tomOrder = tomOrders?.find((o) => o.id.startsWith(tomOrderId));
  if (!tomOrder) {
    console.log("❌ Tom's order not found");
  } else {
    console.log(`Tom's order: ${tomOrder.id}`);

    // Check existing items
    const { data: existing } = await supabase
      .from("order_items")
      .select("id")
      .eq("order_id", tomOrder.id);

    if (existing && existing.length > 0) {
      console.log(`  Already has ${existing.length} items — skipping`);
    } else {
      // Insert: 10 cu yds Red Mulch at $37.90/yd + 1 delivery load
      const { error } = await supabase.from("order_items").insert([
        {
          order_id: tomOrder.id,
          product_id: "920b9463-f214-4943-8021-2014d5fbeb31", // Red Mulch
          product_name: "Red Mulch",
          product_slug: "red-mulch",
          quantity: 10,
          unit: "cu. yard",
          unit_price_cents: 3790,
          line_subtotal_cents: 37900,
          delivery_type: "bulk",
          material_class: "mulch",
        },
        {
          order_id: tomOrder.id,
          product_id: null,
          product_name: "Delivery Load 1 - Medium Dump",
          product_slug: null,
          quantity: 1,
          unit: "load",
          unit_price_cents: 3500,
          line_subtotal_cents: 3500,
          delivery_type: null,
          material_class: null,
          load_number: 1,
          delivery_day: 1,
          notes: "Material: mulch; Qty: 10",
        },
      ]);

      if (error) {
        console.log(`  ❌ Insert failed: ${error.message}`);
      } else {
        console.log("  ✅ Inserted 2 items (10 cu yds Red Mulch + delivery)");
      }
    }
  }

  // ─── Order #c0e0a6e2 (Luke) ────────────────────────────────────
  console.log("");
  const lukeOrderId = "c0e0a6e2-d46f-402c-83d0-7a2b8786932f";
  const { data: lukeItems } = await supabase
    .from("order_items")
    .select("id, product_name, quantity, unit_price_cents")
    .eq("order_id", lukeOrderId);

  if (!lukeItems || lukeItems.length === 0) {
    console.log("❌ Luke's order items not found");
  } else {
    console.log(`Luke's order: ${lukeOrderId}`);
    console.log(`  Current items: ${lukeItems.map((i) => `${i.quantity}x "${i.product_name}" @$${(i.unit_price_cents / 100).toFixed(2)}`).join(", ")}`);

    // Fix the "Item" entry → "Screened Topsoil"
    const itemToFix = lukeItems.find(
      (i) => i.product_name === "Item" && i.unit_price_cents === 2400,
    );
    if (itemToFix) {
      const { error } = await supabase
        .from("order_items")
        .update({
          product_name: "Screened Topsoil",
          product_id: "3d4ac184-d574-4366-806c-99d0b239fd51",
          product_slug: "screened-topsoil",
          delivery_type: "bulk",
          material_class: "default",
        })
        .eq("id", itemToFix.id);

      if (error) {
        console.log(`  ❌ Update failed: ${error.message}`);
      } else {
        console.log('  ✅ Updated "Item" → "Screened Topsoil" (product linked)');
      }
    } else {
      console.log('  No "Item" at $24/yd found — may already be fixed');
    }
  }

  // ─── Scan for other orders missing items ───────────────────────
  console.log("\n=== Scanning for other orders missing items ===");
  const { data: allOrders } = await supabase
    .from("orders")
    .select("id, customer_name, grand_total_cents, status, placed_at")
    .not("status", "in", '("expired","cancelled")')
    .order("placed_at", { ascending: false });

  const { data: allItems } = await supabase
    .from("order_items")
    .select("order_id");

  const idsWithItems = new Set((allItems ?? []).map((i) => i.order_id));
  const missing = (allOrders ?? []).filter((o) => !idsWithItems.has(o.id));

  if (missing.length === 0) {
    console.log("All orders have items ✅");
  } else {
    console.log(`${missing.length} order(s) still missing items:`);
    for (const o of missing) {
      console.log(
        `  #${o.id.slice(0, 8)} | ${o.customer_name} | $${(o.grand_total_cents / 100).toFixed(2)} | ${o.status} | ${o.placed_at}`,
      );
    }
  }

  console.log("\nDone.");
}

main().catch(console.error);
