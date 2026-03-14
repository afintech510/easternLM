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
  const result = await executeSql(`
    SELECT c.slug as category, c.name as cat_name, p.name, p.wc_id, p.delivery_type, p.unit, p.price_per_unit_cents, p.is_active
    FROM products p
    JOIN categories c ON c.id = p.category_id
    WHERE p.wc_id IS NOT NULL
    ORDER BY c.sort_order, p.delivery_type DESC, p.name
  `);

  // Group by category
  const grouped: Record<string, any[]> = {};
  for (const row of result) {
    if (!grouped[row.category]) grouped[row.category] = [];
    grouped[row.category].push(row);
  }

  for (const [cat, products] of Object.entries(grouped)) {
    const catName = (products as any[])[0].cat_name;
    console.log(`\n═══ ${catName} (${cat}) — ${(products as any[]).length} products ═══`);
    for (const p of products as any[]) {
      const price = p.price_per_unit_cents > 0 ? `$${(p.price_per_unit_cents / 100).toFixed(2)}` : "NO PRICE";
      const status = p.is_active ? "" : " [INACTIVE]";
      console.log(`  ${p.delivery_type === "bulk" ? "🪨" : "📦"} ${p.name} — ${price}/${p.unit}${status}`);
    }
  }
}

main().catch(console.error);
