/**
 * Backfill the `city` column on customers that are missing it, using the most
 * recent delivery city from their order history. ~1,273 customers have no city,
 * which makes them invisible to town-level campaign targeting.
 *
 * Source of truth (in priority order):
 *   1. order_history.delivery_city (legacy WC orders — already parsed)
 *   2. order_history.delivery_address (parse city out of "St, City, NY zip")
 *
 * Read-only by default. Pass --apply to write.
 *
 * Usage: npx tsx scripts/backfill-customer-cities.ts            (dry run)
 *        npx tsx scripts/backfill-customer-cities.ts --apply    (writes)
 */

import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import { resolve } from "path";

config({ path: resolve(__dirname, "..", ".env.local") });

const APPLY = process.argv.includes("--apply");
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://qnwevkgrhdrjqvvabcit.supabase.co";
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SERVICE_KEY) {
  console.error("Missing SUPABASE_SERVICE_ROLE_KEY (env or .env.local)");
  process.exit(1);
}

const sb = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

function cityFromAddress(address: string | null): string | null {
  if (!address) return null;
  const parts = address.split(",").map((p) => p.trim());
  if (parts.length >= 2) {
    return parts[1]?.replace(/\s+(NY|New York)\s*\d*/i, "").trim() || null;
  }
  return null;
}

function titleCase(s: string): string {
  return s
    .toLowerCase()
    .split(/\s+/)
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w))
    .join(" ");
}

async function main() {
  console.log(`\n=== Customer city backfill (${APPLY ? "APPLY" : "DRY RUN"}) ===\n`);

  // Customers missing city
  let missing: any[] = [];
  let from = 0;
  const size = 1000;
  while (true) {
    const { data, error } = await sb
      .from("customers")
      .select("id, first_name, last_name, city")
      .or("city.is.null,city.eq.")
      .range(from, from + size - 1);
    if (error) throw error;
    missing = missing.concat(data ?? []);
    if (!data || data.length < size) break;
    from += size;
  }

  console.log(`Customers missing city: ${missing.length}`);

  const resolved: Array<{ id: string; name: string; city: string }> = [];
  for (const c of missing) {
    const { data: oh } = await sb
      .from("order_history")
      .select("delivery_city, delivery_address, order_date")
      .eq("customer_id", c.id)
      .order("order_date", { ascending: false })
      .limit(5);
    let city: string | null = null;
    for (const o of oh ?? []) {
      // Skip yard-pickup orders — delivery_address is the yard (110 Frowein Rd,
      // Center Moriches). Those tell us nothing about where the customer lives,
      // and would falsely flag them as local Center Moriches residents.
      if (o.delivery_address && /frowein/i.test(o.delivery_address)) continue;
      city = (o.delivery_city && o.delivery_city.trim()) || cityFromAddress(o.delivery_address);
      if (city) break;
    }
    if (city) {
      resolved.push({
        id: c.id,
        name: [c.first_name, c.last_name].filter(Boolean).join(" ") || "(no name)",
        city: titleCase(city),
      });
    }
  }

  console.log(`Resolvable from order history: ${resolved.length}`);
  console.log(`Still unknown after backfill: ${missing.length - resolved.length}\n`);

  // Distribution of resolved cities
  const dist: Record<string, number> = {};
  for (const r of resolved) dist[r.city] = (dist[r.city] || 0) + 1;
  console.log("Top resolved cities:");
  Object.entries(dist)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15)
    .forEach(([city, n]) => console.log(`  ${city.padEnd(24)} ${n}`));

  if (!APPLY) {
    console.log("\nDry run — no writes. Re-run with --apply to commit.\n");
    return;
  }

  let updated = 0;
  for (const r of resolved) {
    const { error } = await sb.from("customers").update({ city: r.city }).eq("id", r.id);
    if (error) console.error(`  FAILED ${r.id}: ${error.message}`);
    else updated++;
  }
  console.log(`\nDone. Set city on ${updated} customers.\n`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
