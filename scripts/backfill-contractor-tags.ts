/**
 * Backfill the `contractor` tag on existing customers from behavioral signals.
 *
 * The original WooCommerce import only set `contractor` when a billing company
 * name was present (~12 customers). This re-derives it from real signals so the
 * tag actually reflects the contractor base (~370+). The rule MUST stay in sync
 * with `deriveContractorTag` in src/lib/customers/lifecycle.ts (which does the
 * same thing live on every new order).
 *
 * Signals (any one qualifies):
 *   - has an account/charge relationship (account-customer tag or is_charge_account)
 *   - has a company name on file
 *   - 5+ orders AND $1000+ lifetime spend
 *   - bought BOTH masonry and gravel materials (job-site pattern)
 *
 * Read-only by default. Pass --apply to write.
 *
 * Usage: npx tsx scripts/backfill-contractor-tags.ts            (dry run)
 *        npx tsx scripts/backfill-contractor-tags.ts --apply    (writes)
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

// Mirror of deriveContractorTag() in src/lib/customers/lifecycle.ts
function isContractor(c: {
  tags: string[];
  company_name: string | null;
  is_charge_account: boolean | null;
  total_orders: number;
  total_spent_cents: number;
}): boolean {
  const has = (t: string) => (c.tags || []).includes(t);
  if (c.is_charge_account) return true;
  if (has("account-customer")) return true;
  if (c.company_name && c.company_name.trim().length > 1) return true;
  if (c.total_orders >= 5 && c.total_spent_cents >= 100000) return true;
  if (has("mason-buyer") && has("gravel-buyer")) return true;
  return false;
}

async function main() {
  console.log(`\n=== Contractor tag backfill (${APPLY ? "APPLY" : "DRY RUN"}) ===\n`);

  // Page through all customers
  let all: any[] = [];
  let from = 0;
  const size = 1000;
  while (true) {
    const { data, error } = await sb
      .from("customers")
      .select("id, first_name, last_name, company_name, is_charge_account, tags, total_orders, total_spent_cents")
      .range(from, from + size - 1);
    if (error) throw error;
    all = all.concat(data ?? []);
    if (!data || data.length < size) break;
    from += size;
  }

  console.log(`Scanned ${all.length} customers`);

  const toAdd = all.filter((c) => isContractor(c) && !(c.tags || []).includes("contractor"));
  const alreadyTagged = all.filter((c) => (c.tags || []).includes("contractor")).length;

  console.log(`Already tagged contractor: ${alreadyTagged}`);
  console.log(`Would ADD contractor tag to: ${toAdd.length}\n`);

  // Show a sample so the change is reviewable before applying
  console.log("Sample of customers gaining the tag:");
  for (const c of toAdd.slice(0, 15)) {
    const name = [c.first_name, c.last_name].filter(Boolean).join(" ") || "(no name)";
    console.log(
      `  ${name.padEnd(28)} orders=${String(c.total_orders).padStart(3)} spent=$${(c.total_spent_cents / 100).toFixed(0).padStart(6)} ${c.company_name ? "[" + c.company_name + "]" : ""}`
    );
  }
  if (toAdd.length > 15) console.log(`  ...and ${toAdd.length - 15} more`);

  if (!APPLY) {
    console.log("\nDry run — no writes. Re-run with --apply to commit.\n");
    return;
  }

  let updated = 0;
  for (const c of toAdd) {
    const newTags = [...new Set([...(c.tags || []), "contractor"])];
    const { error } = await sb.from("customers").update({ tags: newTags }).eq("id", c.id);
    if (error) console.error(`  FAILED ${c.id}: ${error.message}`);
    else updated++;
  }
  console.log(`\nDone. Added contractor tag to ${updated} customers.\n`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
