// Estimate WC sales tax for a month by aggregating items vs order_total.
// total = items_subtotal + tax + shipping/delivery
// We don't know shipping vs tax split, so we report:
//   - items_subtotal (what we know was the pre-tax line-item total)
//   - total - items_subtotal = "tax + shipping bucket"
//   - estimated tax assuming 8.75% on items_subtotal (no exempt detection)
const { createClient } = require("@supabase/supabase-js");
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const fmt = (c) => (c / 100).toLocaleString("en-US", { style: "currency", currency: "USD" });

(async () => {
  const args = process.argv.slice(2);
  for (const ym of args) {
    const [y, m] = ym.split("-").map(Number);
    const from = new Date(Date.UTC(y, m - 1, 1)).toISOString();
    const to = new Date(Date.UTC(y, m, 1)).toISOString();

    const all = [];
    let offset = 0;
    for (;;) {
      const { data, error } = await supabase
        .from("order_history")
        .select("wc_order_id, order_date, status, payment_method, order_total_cents, items, raw_notes")
        .gte("order_date", from)
        .lt("order_date", to)
        .order("order_date", { ascending: true })
        .range(offset, offset + 999);
      if (error) { console.error(error); process.exit(1); }
      if (!data?.length) break;
      all.push(...data);
      if (data.length < 1000) break;
      offset += 1000;
    }

    const live = all.filter((r) => r.status !== "Pending payment" && r.status !== "Cancelled" && r.status !== "Failed");
    const refunded = all.filter((r) => r.status === "Refunded");
    let total = 0, itemsSubtotal = 0;
    const byMethod = {};
    const byStatus = {};
    const perOrderDiff = []; // total - items (tax + shipping bucket)
    for (const r of all) byStatus[r.status] = (byStatus[r.status] ?? 0) + 1;
    for (const r of live) {
      const t = r.order_total_cents ?? 0;
      const isum = (r.items || []).reduce((s, it) => s + (it.costCents ?? 0) * (it.quantity ?? 1), 0);
      total += t;
      itemsSubtotal += isum;
      perOrderDiff.push({ total: t, items: isum, diff: t - isum });
      const pm = r.payment_method ?? "unknown";
      byMethod[pm] ??= { count: 0, total: 0 };
      byMethod[pm].count += 1;
      byMethod[pm].total += t;
    }
    const taxPlusShipping = total - itemsSubtotal;
    // Estimate tax assuming 8.75% applied to items_subtotal (Suffolk NY rate);
    // remainder = shipping/delivery (or rounding noise / pre-2026 8.625% gap).
    const RATE_NEW = 0.08750;
    const RATE_OLD = 0.08625; // Suffolk pre-2026
    const estTax_new = Math.round(itemsSubtotal * RATE_NEW);
    const estTax_old = Math.round(itemsSubtotal * RATE_OLD);

    console.log(`\n=== WC order_history — ${ym} ===`);
    console.log(`Total rows:                   ${all.length}`);
    console.log(`Status:                       ${Object.entries(byStatus).map(([k, v]) => `${k}=${v}`).join(", ")}`);
    console.log(`Live rows counted:            ${live.length} (excludes Pending payment / Cancelled / Failed)`);
    console.log(`  ─ Refunded included:        ${refunded.length}`);
    console.log("");
    console.log(`Gross order totals:           ${fmt(total)}`);
    console.log(`Sum of line-item costs:       ${fmt(itemsSubtotal)}  (pre-tax, pre-shipping)`);
    console.log(`Tax + shipping bucket:        ${fmt(taxPlusShipping)}  (total - items)`);
    console.log("");
    console.log(`Estimated tax @ 8.75%:        ${fmt(estTax_new)}`);
    console.log(`Estimated tax @ 8.625% (old): ${fmt(estTax_old)}`);
    console.log(`Implied shipping/delivery:    ${fmt(taxPlusShipping - estTax_new)} (using 8.75%)`);
    console.log("");
    console.log("By payment method:");
    for (const [pm, v] of Object.entries(byMethod).sort((a, b) => b[1].total - a[1].total)) {
      console.log(`  ${pm.padEnd(20)} ${String(v.count).padStart(4)} orders   ${fmt(v.total).padStart(14)}`);
    }
  }
})();
