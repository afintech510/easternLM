/**
 * Generate Sales Tax Report — per-order CSV + printable HTML summary.
 * Outputs: Sales_Tax_Report_March_April_2026_v2.csv / .html in /app/.
 */
const fs = require("fs");
const { createClient } = require("@supabase/supabase-js");
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const fmt = (c) => (c / 100).toLocaleString("en-US", { style: "currency", currency: "USD" });
const csvEscape = (v) => {
  if (v == null) return "";
  const s = String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

async function fetchMonth(ym) {
  const [y, m] = ym.split("-").map(Number);
  const from = new Date(Date.UTC(y, m - 1, 1)).toISOString();
  const to = new Date(Date.UTC(y, m, 1)).toISOString();
  const all = [];
  let offset = 0;
  for (;;) {
    const { data, error } = await supabase
      .from("orders")
      .select("id, placed_at, status, payment_method, source, customer_name, materials_subtotal_cents, delivery_total_cents, tax_cents, cc_surcharge_cents, grand_total_cents, tax_exempt, discount_amount_cents, metadata")
      .gte("placed_at", from).lt("placed_at", to)
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

(async () => {
  const marchRows = await fetchMonth("2026-03");
  const aprilRows = await fetchMonth("2026-04");

  const wcMarchRaw = JSON.parse(fs.readFileSync("/app/wc-march-2026.json", "utf8").replace(/^﻿/, ""));
  const wcMarch = (Array.isArray(wcMarchRaw) ? wcMarchRaw : [wcMarchRaw]).map((r) => ({
    placed_at: r.placed_at,
    order_number: `WC-${r.order_number}`,
    source: "woocommerce",
    status: r.status,
    payment_method: r.payment_method,
    customer_name: r.customer_name,
    materials_subtotal_cents: r.materials_cents,
    delivery_total_cents: r.delivery_cents,
    tax_cents: r.tax_cents,
    cc_surcharge_cents: 0,
    grand_total_cents: r.grand_total_cents,
    tax_exempt: r.tax_cents === 0 && r.materials_cents > 0,
    discount_amount_cents: 0,
  }));

  const normalize = (r) => ({
    placed_at: r.placed_at,
    order_number: `#${(r.id || "").slice(0, 8).toUpperCase()}`,
    source: r.source || "pos",
    status: r.status,
    payment_method: r.payment_method,
    customer_name: r.customer_name,
    materials_subtotal_cents: r.materials_subtotal_cents ?? 0,
    delivery_total_cents: r.delivery_total_cents ?? 0,
    tax_cents: r.tax_cents ?? 0,
    cc_surcharge_cents: r.cc_surcharge_cents ?? 0,
    grand_total_cents: r.grand_total_cents ?? 0,
    tax_exempt: r.tax_exempt ?? false,
    discount_amount_cents: r.discount_amount_cents ?? (r.metadata && r.metadata.discount_amount_cents) ?? 0,
  });

  const isPending = (r) => ["pending","Pending payment","On hold","cancelled","Cancelled","Failed"].includes(r.status);
  const isRefunded = (r) => r.status === "refunded";
  const isCod = (r) => r.payment_method === "cod" || /cash-on-delivery/i.test(r.payment_method || "");

  const allRaw = [...wcMarch, ...marchRows.map(normalize), ...aprilRows.map(normalize)];
  // Drop rows that aren't part of the final report
  const rows = allRaw.filter((r) => !isPending(r) && !isRefunded(r) && !isCod(r));

  // Taxable Sales is back-calculated from actual tax_cents (the amount the state cares about):
  //   taxable = tax / 0.0875   →   taxable × 8.75% = tax (reconciles exactly within rounding)
  // Tax-Exempt Sales = (materials + delivery − discount) for orders flagged tax_exempt.
  const RATE = 0.0875;
  for (const r of rows) {
    const baseGross = r.materials_subtotal_cents + r.delivery_total_cents;
    const baseAfterDisc = Math.max(0, baseGross - (r.discount_amount_cents ?? 0));
    r._taxable_cents = r.tax_exempt ? 0 : Math.round((r.tax_cents ?? 0) / RATE);
    r._exempt_cents  = r.tax_exempt ? baseAfterDisc : 0;
    const d = new Date(r.placed_at);
    r._month = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
  }

  // ── Per-order CSV ─────────────────────────────────────────────
  const csvHeader = ["month","placed_at","order_number","source","status","payment_method","customer_name","materials_cents","delivery_cents","discount_cents","taxable_cents","exempt_cents","tax_cents","cc_surcharge_cents","grand_total_cents"];
  const csvLines = [csvHeader.join(",")];
  for (const r of rows) {
    csvLines.push([
      r._month, r.placed_at, r.order_number, r.source, r.status,
      r.payment_method, r.customer_name,
      r.materials_subtotal_cents, r.delivery_total_cents, r.discount_amount_cents ?? 0,
      r._taxable_cents, r._exempt_cents,
      r.tax_cents, r.cc_surcharge_cents, r.grand_total_cents,
    ].map(csvEscape).join(","));
  }
  fs.writeFileSync("/app/Sales_Tax_Report_March_April_2026_v2.csv", csvLines.join("\n") + "\n");
  console.log(`Wrote CSV: ${rows.length} rows`);

  // ── Aggregates ────────────────────────────────────────────────
  function agg(rs) {
    const o = { count: 0, taxable: 0, exempt: 0, tax: 0, grand: 0 };
    for (const r of rs) {
      o.count += 1;
      o.taxable += r._taxable_cents;
      o.exempt += r._exempt_cents;
      o.tax += r.tax_cents;
      o.grand += r.grand_total_cents;
    }
    return o;
  }
  const m = agg(rows.filter((r) => r._month === "2026-03"));
  const a = agg(rows.filter((r) => r._month === "2026-04"));
  const t = agg(rows);

  // ── HTML ──────────────────────────────────────────────────────
  const css = `
    body{font-family:-apple-system,'Segoe UI',Roboto,sans-serif;max-width:900px;margin:30px auto;padding:0 24px;color:#1a1a1a}
    h1{margin:0 0 4px 0;font-size:24px}
    h2{font-size:18px;margin-top:32px;padding-bottom:6px;border-bottom:2px solid #333}
    .meta{color:#666;font-size:13px;margin-bottom:24px}
    table{width:100%;border-collapse:collapse;margin:12px 0;font-size:14px}
    th,td{padding:10px;text-align:left;border-bottom:1px solid #e5e5e5}
    th{background:#f5f5f5;font-weight:600}
    td.num,th.num{text-align:right;font-variant-numeric:tabular-nums}
    tr.total td{font-weight:700;border-top:2px solid #333;background:#fafafa}
    .grand-box{background:#fff8dc;border:2px solid #c79b00;padding:16px;margin:24px 0;border-radius:6px}
    .grand-box .label{font-size:13px;color:#7a5d00;text-transform:uppercase;letter-spacing:0.5px}
    .grand-box .amount{font-size:32px;font-weight:700;margin-top:4px}
    .grand-box .sub{font-size:14px;color:#555;margin-top:4px}
    .footer{margin-top:40px;font-size:11px;color:#888;border-top:1px solid #ddd;padding-top:12px}
    @media print{body{margin:0;padding:16px}.grand-box{break-inside:avoid}}
  `;
  const row = (label, x) => `
    <tr><td>${label}</td>
      <td class="num">${x.count}</td>
      <td class="num">${fmt(x.taxable)}</td>
      <td class="num">${fmt(x.exempt)}</td>
      <td class="num">${fmt(x.tax)}</td>
      <td class="num">${fmt(x.grand)}</td>
    </tr>`;
  const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Sales Tax Report — March & April 2026</title><style>${css}</style></head><body>
  <h1>Sales Tax Report</h1>
  <div class="meta">
    <strong>Eastern Landscape &amp; Mason Supply</strong> · 110 Frowein Road, Center Moriches, NY 11934<br/>
    Period: March 1 – April 30, 2026 · Generated ${new Date().toLocaleString("en-US", { dateStyle: "long", timeStyle: "short" })}<br/>
    NY State sales tax rate: 8.75% (Suffolk County)
  </div>

  <div class="grand-box">
    <div class="label">Total Sales Tax Collected — Mar + Apr 2026</div>
    <div class="amount">${fmt(t.tax)}</div>
    <div class="sub">On ${fmt(t.taxable)} taxable sales (${fmt(t.exempt)} tax-exempt) across ${t.count} orders</div>
  </div>

  <h2>Monthly Breakdown</h2>
  <table>
    <thead><tr><th>Period</th><th class="num">Orders</th><th class="num">Taxable Sales</th><th class="num">Tax-Exempt</th><th class="num">Tax Collected</th><th class="num">Grand Total</th></tr></thead>
    <tbody>
      ${row("March 2026", m)}
      ${row("April 2026", a)}
      <tr class="total"><td>GRAND TOTAL</td>
        <td class="num">${t.count}</td>
        <td class="num">${fmt(t.taxable)}</td>
        <td class="num">${fmt(t.exempt)}</td>
        <td class="num">${fmt(t.tax)}</td>
        <td class="num">${fmt(t.grand)}</td>
      </tr>
    </tbody>
  </table>

  <div class="footer">
    Detail-level CSV available in the same folder as this report.
  </div>
</body></html>`;
  fs.writeFileSync("/app/Sales_Tax_Report_March_April_2026_v2.html", html);
  console.log("Wrote HTML");
})();
