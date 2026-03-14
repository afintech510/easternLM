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
  return response.json();
}

async function main() {
  // Deactivate old products that have no wc_id (placeholders from original seed)
  let r = await executeSql("UPDATE products SET is_active = false WHERE wc_id IS NULL");
  console.log("Deactivated old placeholders:", JSON.stringify(r));

  // Check for extra categories
  const keepSlugs = [
    "mulch", "topsoil", "gravel-stone", "sand", "natural-stone",
    "masonry-supplies", "concrete-cement", "pavers", "bagged-material",
    "tools", "chemicals", "landscape", "drainage", "yard-services",
  ];
  const inClause = keepSlugs.map((s) => `'${s}'`).join(",");
  r = await executeSql(`SELECT slug, name FROM categories WHERE slug NOT IN (${inClause})`);
  console.log("Extra categories:", JSON.stringify(r));

  // Deactivate extra categories
  r = await executeSql(`UPDATE categories SET is_active = false WHERE slug NOT IN (${inClause})`);
  console.log("Deactivated extra categories:", JSON.stringify(r));

  // Final counts
  r = await executeSql(
    `SELECT
      (SELECT count(*) FROM categories WHERE is_active = true) AS cats,
      (SELECT count(*) FROM products WHERE is_active = true) AS active,
      (SELECT count(*) FROM products WHERE is_active = false) AS inactive`
  );
  console.log("Final counts:", JSON.stringify(r));
}

main().catch(console.error);
