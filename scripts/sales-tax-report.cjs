// Sales tax report — runs against the new POS/web orders table.
// Excludes pending+cancelled, nets out refunded orders, and breaks COD into its own bucket.
const { createClient } = require("@supabase/supabase-js");

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) { console.error("Missing Supabase env"); process.exit(1); }
const supabase = createClient(url, key);

const fmt = (c) => (c / 100).toLocaleString("en-US", { style: "currency", currency: "USD" });

async function fetchOrders(fromIso, toIso) {
  const all = [];
  let offset = 0;
  for (;;) {
    const { data, error } = await supabase
      .from("orders")
      .select(
        "id, placed_at, status, payment_method, source, materials_subtotal_cents, delivery_total_cents, tax_cents, cc_surcharge_cents, grand_total_cents, tax_exempt",
      )
      .gte("placed_at", fromIso)
      .lt("placed_at", toIso)
      .order("placed_at", { ascending: true })
      .range(offset, offset + 999);
    if (error) throw error;
    if (!data?.length) break;
    all.push(...data);
    if (data.length < 1000) break;
    offset += 1000;
  }
  return all;
}

function monthRange(ym) {
  const [y, m] = ym.split("-").map(Number);
  const from = new Date(Date.UTC(y, m - 1, 1));
  const to = new Date(Date.UTC(y, m, 1));
  return {
    from: from.toISOString(),
    to: to.toISOString(),
    label: from.toLocaleString("en-US", { month: "long", year: "numeric", timeZone: "UTC" }),
  };
}

function bucketize(rows) {
  // Exclude pending and cancelled outright
  const excluded = new Set(["pending", "cancelled"]);
  const liveAll = rows.filter((r) => !excluded.has(r.status));
  const refunded = liveAll.filter((r) => r.status === "refunded");
  const nonCod = liveAll.filter((r) => r.payment_method !== "cod" && r.status !== "refunded");
  const cod    = liveAll.filter((r) => r.payment_method === "cod" && r.status !== "refunded");
  return { liveAll, refunded, nonCod, cod, excludedCount: rows.length - liveAll.length };
}

function totals(rows) {
  const t = { mat: 0, del: 0, tax: 0, cc: 0, grand: 0, taxable: 0, exempt: 0, count: rows.length };
  for (const r of rows) {
    const mat = r.materials_subtotal_cents ?? 0;
    const del = r.delivery_total_cents ?? 0;
    t.mat += mat; t.del += del;
    t.tax += r.tax_cents ?? 0;
    t.cc  += r.cc_surcharge_cents ?? 0;
    t.grand += r.grand_total_cents ?? 0;
    if (r.tax_exempt) t.exempt += mat + del; else t.taxable += mat + del;
  }
  return t;
}

function net(a, b) {
  const o = {};
  for (const k of Object.keys(a)) o[k] = a[k] - (b[k] ?? 0);
  return o;
}

function printBucket(label, t) {
  console.log(`  ${label}:`);
  console.log(`    Orders:               ${t.count}`);
  console.log(`    Taxable sales:        ${fmt(t.taxable)}`);
  console.log(`    Tax-exempt sales:     ${fmt(t.exempt)}`);
  console.log(`    Tax collected:        ${fmt(t.tax)}`);
  console.log(`    Grand total:          ${fmt(t.grand)}`);
}

function summarize(label, rows) {
  const { refunded, nonCod, cod, excludedCount } = bucketize(rows);
  const tNonCod = totals(nonCod);
  const tCod = totals(cod);
  const tRef = totals(refunded);
  const tLive = totals([...nonCod, ...cod]);

  console.log(`\n=== ${label} ===`);
  console.log(`Pending/cancelled excluded: ${excludedCount}`);
  console.log(`Refunded excluded:          ${tRef.count} (gross ${fmt(tRef.grand)}, tax ${fmt(tRef.tax)})`);
  console.log("");
  console.log("Non-COD (paid: cash / card / account / split / store_credit):");
  printBucket("Subtotal", tNonCod);
  console.log("");
  console.log("COD (collected on delivery):");
  printBucket("Subtotal", tCod);
  console.log("");
  console.log("─────────── COMBINED (excl pending/cancelled/refunded) ───────────");
  printBucket("Total", tLive);
  return { tNonCod, tCod, tLive, tRef };
}

async function main() {
  const args = process.argv.slice(2);
  if (!args.length) { console.error("Usage: node sales-tax-report.cjs YYYY-MM ..."); process.exit(1); }

  const grand = { tNonCod: null, tCod: null, tLive: null, tRef: null };
  for (const ym of args) {
    const { from, to, label } = monthRange(ym);
    const rows = await fetchOrders(from, to);
    const s = summarize(label, rows);
    for (const k of Object.keys(s)) {
      grand[k] = grand[k] ? net(s[k], net({...grand[k]}, s[k])) : null; // placeholder
    }
    // simpler: accumulate manually
  }

  // Re-accumulate cleanly
  if (args.length > 1) {
    const acc = { nonCod: { mat:0,del:0,tax:0,cc:0,grand:0,taxable:0,exempt:0,count:0 },
                  cod:    { mat:0,del:0,tax:0,cc:0,grand:0,taxable:0,exempt:0,count:0 },
                  ref:    { mat:0,del:0,tax:0,cc:0,grand:0,taxable:0,exempt:0,count:0 } };
    for (const ym of args) {
      const { from, to } = monthRange(ym);
      const rows = await fetchOrders(from, to);
      const { refunded, nonCod, cod } = bucketize(rows);
      const tN = totals(nonCod), tC = totals(cod), tR = totals(refunded);
      for (const k of Object.keys(acc.nonCod)) { acc.nonCod[k] += tN[k]; acc.cod[k] += tC[k]; acc.ref[k] += tR[k]; }
    }
    const tLive = { mat: acc.nonCod.mat + acc.cod.mat, del: acc.nonCod.del + acc.cod.del,
                    tax: acc.nonCod.tax + acc.cod.tax, cc: acc.nonCod.cc + acc.cod.cc,
                    grand: acc.nonCod.grand + acc.cod.grand,
                    taxable: acc.nonCod.taxable + acc.cod.taxable, exempt: acc.nonCod.exempt + acc.cod.exempt,
                    count: acc.nonCod.count + acc.cod.count };
    console.log(`\n=== COMBINED ${args.join(" + ")} ===`);
    console.log(`Refunded excluded total:  ${acc.ref.count} (gross ${fmt(acc.ref.grand)}, tax ${fmt(acc.ref.tax)})`);
    console.log("");
    console.log("Non-COD:");      printBucket("Subtotal", acc.nonCod);
    console.log("");
    console.log("COD:");          printBucket("Subtotal", acc.cod);
    console.log("");
    console.log("─────────── COMBINED TOTAL ───────────");
    printBucket("Total", tLive);
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
