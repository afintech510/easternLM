// April charge-account sales by customer, with their current balance.
const { createClient } = require("@supabase/supabase-js");
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const fmt = (c) => (c / 100).toLocaleString("en-US", { style: "currency", currency: "USD" });

(async () => {
  const ym = process.argv[2] || "2026-04";
  const [y, m] = ym.split("-").map(Number);
  const from = new Date(Date.UTC(y, m - 1, 1)).toISOString();
  const to = new Date(Date.UTC(y, m, 1)).toISOString();

  const all = [];
  let offset = 0;
  for (;;) {
    const { data, error } = await supabase
      .from("orders")
      .select("id, placed_at, status, payment_method, customer_id, customer_name, materials_subtotal_cents, delivery_total_cents, tax_cents, grand_total_cents, tax_exempt")
      .gte("placed_at", from).lt("placed_at", to)
      .eq("payment_method", "account")
      .order("placed_at", { ascending: true })
      .range(offset, offset + 999);
    if (error) { console.error(error); process.exit(1); }
    if (!data?.length) break;
    all.push(...data);
    if (data.length < 1000) break;
    offset += 1000;
  }

  // Exclude pending/cancelled/refunded
  const dropped = all.filter(r => ["pending","cancelled","refunded"].includes(r.status));
  const live = all.filter(r => !["pending","cancelled","refunded"].includes(r.status));

  // Group by customer_id (fallback to customer_name when null)
  const byCust = {};
  for (const r of live) {
    const k = r.customer_id || `__nameonly:${r.customer_name || "Unknown"}`;
    byCust[k] ??= { customer_id: r.customer_id, name: r.customer_name, count: 0,
                    taxable: 0, exempt: 0, tax: 0, grand: 0 };
    const taxable = (r.materials_subtotal_cents ?? 0) + (r.delivery_total_cents ?? 0);
    if (r.tax_exempt) byCust[k].exempt += taxable; else byCust[k].taxable += taxable;
    byCust[k].tax += r.tax_cents ?? 0;
    byCust[k].grand += r.grand_total_cents ?? 0;
    byCust[k].count += 1;
  }

  // Pull current balance for these customers
  const ids = Object.values(byCust).map(c => c.customer_id).filter(Boolean);
  let balByCust = {};
  if (ids.length) {
    const { data: custs, error } = await supabase
      .from("customers")
      .select("id, company_name, first_name, last_name, is_charge_account, current_balance_cents")
      .in("id", ids);
    if (error) { console.error(error); process.exit(1); }
    for (const c of custs) {
      const name = c.company_name || `${c.first_name ?? ""} ${c.last_name ?? ""}`.trim() || "(unnamed)";
      balByCust[c.id] = { name, is_charge: c.is_charge_account, balance: c.current_balance_cents ?? 0 };
    }
  }

  console.log(`\n=== Charge-account (payment_method='account') orders for ${ym} ===`);
  console.log(`Live orders:    ${live.length}`);
  console.log(`Dropped (pend/cancel/refund): ${dropped.length}`);
  console.log("");
  const rows = Object.entries(byCust)
    .map(([k, v]) => ({ k, ...v, ...(balByCust[v.customer_id] || { name: v.name, is_charge: null, balance: null }) }))
    .sort((a, b) => b.grand - a.grand);

  console.log("Customer                              Chg  Orders  Taxable        Tax          Grand           CurBal");
  console.log("─".repeat(110));
  let totTaxable = 0, totExempt = 0, totTax = 0, totGrand = 0;
  for (const r of rows) {
    const name = (r.name || "Unknown").slice(0, 36).padEnd(36);
    const chg = r.is_charge === true ? " Y " : r.is_charge === false ? " N " : " ? ";
    const bal = r.balance == null ? "       —" : fmt(r.balance).padStart(12);
    console.log(`${name}  ${chg}  ${String(r.count).padStart(5)}  ${fmt(r.taxable).padStart(12)}  ${fmt(r.tax).padStart(10)}  ${fmt(r.grand).padStart(12)}  ${bal}`);
    totTaxable += r.taxable; totExempt += r.exempt; totTax += r.tax; totGrand += r.grand;
  }
  console.log("─".repeat(110));
  console.log(`TOTAL                                          ${rows.reduce((s,r)=>s+r.count,0).toString().padStart(5)}  ${fmt(totTaxable).padStart(12)}  ${fmt(totTax).padStart(10)}  ${fmt(totGrand).padStart(12)}`);
  if (totExempt > 0) console.log(`(of which exempt: ${fmt(totExempt)})`);
})();
