/**
 * Apply seed-products.sql to remote Supabase via the Management API
 *
 * Usage: npx tsx scripts/apply-seed.ts
 */

import { readFileSync } from "fs";
import { resolve } from "path";

const SUPABASE_URL = "https://qnwevkgrhdrjqvvabcit.supabase.co";
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || readServiceKey();

function readServiceKey(): string {
  const envPath = resolve(__dirname, "..", ".env.local");
  const envContent = readFileSync(envPath, "utf-8");
  const match = envContent.match(/SUPABASE_SERVICE_ROLE_KEY=(.+)/);
  if (!match) throw new Error("SUPABASE_SERVICE_ROLE_KEY not found in .env.local");
  return match[1].trim();
}

async function executeSql(sql: string): Promise<void> {
  // Use the Supabase Management API to execute SQL
  const projectRef = "qnwevkgrhdrjqvvabcit";
  const accessToken = readAccessToken();

  const response = await fetch(
    `https://api.supabase.com/v1/projects/${projectRef}/database/query`,
    {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query: sql }),
    }
  );

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`SQL execution failed (${response.status}): ${text}`);
  }

  const result = await response.json();
  return result;
}

function readAccessToken(): string {
  const envPath = resolve(__dirname, "..", ".env.local");
  const envContent = readFileSync(envPath, "utf-8");
  const match = envContent.match(/SUPABASE_ACCESS_TOKEN=(.+)/);
  if (!match) throw new Error("SUPABASE_ACCESS_TOKEN not found in .env.local");
  return match[1].trim();
}

async function main() {
  console.log("Step 1: Applying wc_id migration...");

  const migrationSql = readFileSync(
    resolve(__dirname, "..", "supabase/migrations/20260314120000_add_product_wc_fields.sql"),
    "utf-8"
  );

  try {
    await executeSql(migrationSql);
    console.log("  ✓ wc_id and price_note columns ready");
  } catch (err: any) {
    if (err.message.includes("already exists")) {
      console.log("  ✓ Columns already exist (skipping)");
    } else {
      console.log("  ⚠ Migration result:", err.message.substring(0, 200));
    }
  }

  console.log("\nStep 2: Applying seed-products.sql...");

  const seedSql = readFileSync(
    resolve(__dirname, "..", "supabase/seed-products.sql"),
    "utf-8"
  );

  try {
    const result = await executeSql(seedSql);
    console.log("  ✓ Seed applied successfully");
    console.log("  Result:", JSON.stringify(result).substring(0, 300));
  } catch (err: any) {
    console.error("  ✗ Seed failed:", err.message.substring(0, 500));
    process.exit(1);
  }

  console.log("\nStep 3: Verifying...");

  try {
    const countResult = await executeSql(
      "SELECT (SELECT count(*) FROM categories WHERE is_active = true) AS cat_count, (SELECT count(*) FROM products) AS prod_count, (SELECT count(*) FROM products WHERE is_active = true) AS active_count"
    );
    console.log("  ✓ Verification:", JSON.stringify(countResult));
  } catch (err: any) {
    console.error("  ⚠ Verification query failed:", err.message);
  }

  console.log("\n✅ Migration complete!");
}

main().catch(console.error);
