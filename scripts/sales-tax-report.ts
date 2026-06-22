/**
 * Sales tax report for a given month range.
 * Usage on VPS: tsx scripts/sales-tax-report.ts 2026-03 2026-04
 *
 * Sums orders by month: gross, taxable, exempt, tax collected, refunds, by status.
 * Only counts orders with terminal/paid status (excludes pending/cancelled).
 */
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}
const supabase = createClient(url, key);

const fmt = (cents: number) =>
  (cents / 100).toLocaleString("en-US", { style: "currency", currency: "USD" });

type Row = {
  id: string;
  placed_at: string;
  status: string;
  payment_method: string | null;
  source: string | null;
  materials_subtotal_cents: number | null;
  delivery_total_cents: number | null;
  tax_cents: number | null;
  cc_surcharge_cents: number | null;
  grand_total_cents: number | null;
  tax_exempt: boolean | null;
  metadata: Record<string, unknown> | null;
};

async function fetchOrders(fromIso: string, toIso: string): Promise<Row[]> {
  const all: Row[] = [];
  const PAGE = 1000;
  let offset = 0;
  for (;;) {
    const { data, error } = await supabase
      .from("orders")
      .select(
        "id, placed_at, status, payment_method, source, materials_subtotal_cents, delivery_total_cents, tax_cents, cc_surcharge_cents, grand_total_cents, tax_exempt, metadata",
      )
      .gte("placed_at", fromIso)
      .lt("placed_at", toIso)
      .order("placed_at", { ascending: true })
      .range(offset, offset + PAGE - 1);
    if (error) throw error;
    if (!data || data.length === 0) break;
    all.push(...(data as Row[]));
    if (data.length < PAGE) break;
    offset += PAGE;
  }
  return all;
}

function monthRange(ym: string): { from: string; to: string; label: string } {
  const [yStr, mStr] = ym.split("-");
  const y = parseInt(yStr, 10);
  const m = parseInt(mStr, 10);
  const from = new Date(Date.UTC(y, m - 1, 1));
  const to = new Date(Date.UTC(y, m, 1));
  return {
    from: from.toISOString(),
    to: to.toISOString(),
    label: `${from.toLocaleString("en-US", { month: "long", year: "numeric", timeZone: "UTC" })}`,
  };
}

function summarize(label: string, rows: Row[]) {
  // Exclude pending and cancelled — only count completed sales
  const excluded = new Set(["pending", "cancelled"]);
  const live = rows.filter((r) => !excluded.has(r.status));

  let materials = 0;
  let delivery = 0;
  let tax = 0;
  let ccFee = 0;
  let grand = 0;
  let taxableSales = 0; // materials + delivery for non-exempt
  let exemptSales = 0; // materials + delivery for exempt
  const byMethod: Record<string, { count: number; grand: number; tax: number }> = {};
  const bySource: Record<string, { count: number; grand: number }> = {};

  for (const r of live) {
    const mat = r.materials_subtotal_cents ?? 0;
    const del = r.delivery_total_cents ?? 0;
    const tx = r.tax_cents ?? 0;
    const cc = r.cc_surcharge_cents ?? 0;
    const gt = r.grand_total_cents ?? 0;

    materials += mat;
    delivery += del;
    tax += tx;
    ccFee += cc;
    grand += gt;

    if (r.tax_exempt) exemptSales += mat + del;
    else taxableSales += mat + del;

    const m = r.payment_method ?? "unknown";
    byMethod[m] ??= { count: 0, grand: 0, tax: 0 };
    byMethod[m].count += 1;
    byMethod[m].grand += gt;
    byMethod[m].tax += tx;

    const s = r.source ?? "unknown";
    bySource[s] ??= { count: 0, grand: 0 };
    bySource[s].count += 1;
    bySource[s].grand += gt;
  }

  const excludedRows = rows.filter((r) => excluded.has(r.status));

  console.log(`\n=== ${label} ===`);
  console.log(`Orders counted:           ${live.length}`);
  console.log(`Orders excluded:          ${excludedRows.length} (pending/cancelled)`);
  console.log("");
  console.log(`Materials subtotal:       ${fmt(materials)}`);
  console.log(`Delivery fees:            ${fmt(delivery)}`);
  console.log(`  ─ Gross sales (pre-tax): ${fmt(materials + delivery)}`);
  console.log("");
  console.log(`Taxable sales:            ${fmt(taxableSales)}`);
  console.log(`Tax-exempt sales:         ${fmt(exemptSales)}`);
  console.log(`Sales tax collected:      ${fmt(tax)}  (NY 8.75%)`);
  console.log(`CC surcharge collected:   ${fmt(ccFee)}`);
  console.log(`Grand total (incl tax):   ${fmt(grand)}`);
  console.log("");
  console.log("By payment method:");
  for (const [m, v] of Object.entries(byMethod).sort((a, b) => b[1].grand - a[1].grand)) {
    console.log(`  ${m.padEnd(20)} ${String(v.count).padStart(5)} orders   ${fmt(v.grand).padStart(14)}   tax ${fmt(v.tax)}`);
  }
  console.log("");
  console.log("By source:");
  for (const [s, v] of Object.entries(bySource).sort((a, b) => b[1].grand - a[1].grand)) {
    console.log(`  ${s.padEnd(20)} ${String(v.count).padStart(5)} orders   ${fmt(v.grand).padStart(14)}`);
  }

  return { taxableSales, exemptSales, tax, grand, count: live.length };
}

async function main() {
  const args = process.argv.slice(2);
  if (args.length === 0) {
    console.error("Usage: tsx scripts/sales-tax-report.ts YYYY-MM [YYYY-MM ...]");
    process.exit(1);
  }

  const totals = { taxableSales: 0, exemptSales: 0, tax: 0, grand: 0, count: 0 };
  for (const ym of args) {
    const { from, to, label } = monthRange(ym);
    const rows = await fetchOrders(from, to);
    const s = summarize(label, rows);
    totals.taxableSales += s.taxableSales;
    totals.exemptSales += s.exemptSales;
    totals.tax += s.tax;
    totals.grand += s.grand;
    totals.count += s.count;
  }

  if (args.length > 1) {
    console.log(`\n=== COMBINED TOTAL (${args.join(", ")}) ===`);
    console.log(`Orders:                 ${totals.count}`);
    console.log(`Taxable sales:          ${fmt(totals.taxableSales)}`);
    console.log(`Tax-exempt sales:       ${fmt(totals.exemptSales)}`);
    console.log(`Sales tax collected:    ${fmt(totals.tax)}`);
    console.log(`Grand total (incl tax): ${fmt(totals.grand)}`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
