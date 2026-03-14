import { readFileSync } from "fs";
import { resolve } from "path";

function readAccessToken(): string {
  const envContent = readFileSync(resolve(__dirname, "..", ".env.local"), "utf-8");
  const match = envContent.match(/SUPABASE_ACCESS_TOKEN=(.+)/);
  if (!match) throw new Error("No access token");
  return match[1].trim();
}

async function executeSql(sql: string): Promise<any> {
  const response = await fetch(
    "https://api.supabase.com/v1/projects/qnwevkgrhdrjqvvabcit/database/query",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${readAccessToken()}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query: sql }),
    }
  );
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`SQL failed (${response.status}): ${text}`);
  }
  return response.json();
}

async function main() {
  // Step 1: Delete all existing products (clean slate for re-import)
  // Products with wc_id are from WC import; without are old placeholders
  console.log("Step 1: Removing old products...");
  let r = await executeSql("DELETE FROM products");
  console.log("  ✓ All products deleted");

  // Step 2: Deactivate all old categories
  console.log("Step 2: Deactivating old categories...");
  r = await executeSql("UPDATE categories SET is_active = false");
  console.log("  ✓ All categories deactivated");

  // Step 3: Apply new seed (categories upsert + products insert)
  console.log("Step 3: Applying new seed-products.sql...");
  const seedSql = readFileSync(
    resolve(__dirname, "..", "supabase/seed-products.sql"),
    "utf-8"
  );

  try {
    r = await executeSql(seedSql);
    console.log("  ✓ Seed applied successfully");
  } catch (err: any) {
    console.error("  ✗ Seed failed:", err.message.substring(0, 500));
    process.exit(1);
  }

  // Step 4: Verify
  console.log("\nStep 4: Verifying...");
  r = await executeSql(`
    SELECT c.slug, c.name, c.is_active as cat_active, count(p.id) as products,
           count(p.id) filter (where p.is_active) as active
    FROM categories c
    LEFT JOIN products p ON p.category_id = c.id
    GROUP BY c.slug, c.name, c.is_active, c.sort_order
    ORDER BY c.sort_order
  `);
  console.log("\n  Category | Active | Products | Active Products");
  console.log("  ---------|--------|----------|----------------");
  for (const row of r) {
    console.log(`  ${row.name.padEnd(22)} | ${row.cat_active ? "YES" : "NO "}    | ${String(row.products).padStart(8)} | ${row.active}`);
  }

  const totals = await executeSql(`
    SELECT
      (SELECT count(*) FROM categories WHERE is_active) as cats,
      (SELECT count(*) FROM products) as total_prods,
      (SELECT count(*) FROM products WHERE is_active) as active_prods
  `);
  console.log("\n  Totals:", JSON.stringify(totals[0]));
  console.log("\n✅ Category restructure complete!");
}

main().catch(console.error);
