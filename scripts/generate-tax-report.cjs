/**
 * Generate Sales Tax Report — per-order CSV + printable HTML summary.
 *
 * Run on VPS inside prod container:
 *   docker cp wc-march-2026.json easternlm-prod:/app/
 *   docker cp generate-tax-report.cjs easternlm-prod:/app/
 *   docker exec easternlm-prod node /app/generate-tax-report.cjs
 *
 * Outputs:
 *   /app/Sales_Tax_Report_March_April_2026.csv
 *   /app/Sales_Tax_Report_March_April_2026.html
 */
const fs = require("fs");
const path = require("path");
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
      .select("id, placed_at, status, payment_method, source, customer_name, materials_subtotal_cents, delivery_total_cents, tax_cents, cc_surcharge_cents, grand_total_cents, tax_exempt")
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
  // ── Fetch Supabase data ────────────────────────────────────────
  const marchRows = await fetchMonth("2026-03");
  const aprilRows = await fetchMonth("2026-04");

  // ── Read WC March JSON ─────────────────────────────────────────
  const wcMarchRaw = JSON.parse(fs.readFileSync("/app/wc-march-2026.json", "utf8").replace(/^﻿/, ""));
  const wcMarch = (Array.isArray(wcMarchRaw) ? wcMarchRaw : [wcMarchRaw]).map((r) => ({
    placed_at: r.placed_at,
    order_id: `WC-${r.order_number}`,
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
    refund_cents: r.refund_cents || 0,
  }));

  // ── Normalize Supabase rows ────────────────────────────────────
  const normalize = (r) => ({
    placed_at: r.placed_at,
    order_id: r.id,
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
    refund_cents: 0,
  });

  const allRows = [
    ...wcMarch,
    ...marchRows.map(normalize),
    ...aprilRows.map(normalize),
  ];

  // ── Classify each row ─────────────────────────────────────────
  const isPending = (r) => r.status === "pending" || r.status === "Pending payment" || r.status === "On hold" || r.status === "cancelled" || r.status === "Cancelled" || r.status === "Failed";
  const isRefunded = (r) => r.status === "refunded";
  const isCod = (r) => r.payment_method === "cod" || /cash-on-delivery/i.test(r.payment_method || "");

  for (const r of allRows) {
    if (isPending(r)) r._bucket = "Excluded (pending/cancelled)";
    else if (isRefunded(r)) r._bucket = "Excluded (refunded)";
    else if (isCod(r)) r._bucket = "COD";
    else r._bucket = "Non-COD";
    r._taxable_cents = r.tax_exempt ? 0 : (r.materials_subtotal_cents + r.delivery_total_cents);
    r._exempt_cents  = r.tax_exempt ? (r.materials_subtotal_cents + r.delivery_total_cents) : 0;
    const d = new Date(r.placed_at);
    r._month = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
  }

  // ── Write per-order CSV ────────────────────────────────────────
  const csvHeader = ["month","placed_at","order_number","source","status","bucket","payment_method","customer_name","materials_cents","delivery_cents","taxable_cents","exempt_cents","tax_cents","cc_surcharge_cents","grand_total_cents"];
  const csvLines = [csvHeader.join(",")];
  for (const r of allRows) {
    csvLines.push([
      r._month, r.placed_at, r.order_number, r.source, r.status, r._bucket,
      r.payment_method, r.customer_name,
      r.materials_subtotal_cents, r.delivery_total_cents,
      r._taxable_cents, r._exempt_cents,
      r.tax_cents, r.cc_surcharge_cents, r.grand_total_cents,
    ].map(csvEscape).join(","));
  }
  const csvPath = "/app/Sales_Tax_Report_March_April_2026.csv";
  fs.writeFileSync(csvPath, csvLines.join("\n") + "\n");
  console.log(`Wrote CSV: ${csvPath} (${allRows.length} rows)`);

  // ── Build summary aggregates ──────────────────────────────────
  function agg(rows) {
    const out = { count: 0, taxable: 0, exempt: 0, tax: 0, grand: 0 };
    for (const r of rows) {
      out.count += 1;
      out.taxable += r._taxable_cents;
      out.exempt += r._exempt_cents;
      out.tax += r.tax_cents;
      out.grand += r.grand_total_cents;
    }
    return out;
  }
  const buckets = {};
  for (const month of ["2026-03", "2026-04"]) {
    const monthRows = allRows.filter((r) => r._month === month);
    buckets[month] = {
      excluded_pending: agg(monthRows.filter((r) => r._bucket === "Excluded (pending/cancelled)")),
      excluded_refunded: agg(monthRows.filter((r) => r._bucket === "Excluded (refunded)")),
      nonCod: agg(monthRows.filter((r) => r._bucket === "Non-COD")),
      cod:    agg(monthRows.filter((r) => r._bucket === "COD")),
    };
  }
  const live = allRows.filter((r) => r._bucket === "Non-COD" || r._bucket === "COD");
  const total = agg(live);

  // ── Write HTML summary ────────────────────────────────────────
  const css = `
    body{font-family:-apple-system,'Segoe UI',Roboto,sans-serif;max-width:900px;margin:30px auto;padding:0 24px;color:#1a1a1a}
    h1{margin:0 0 4px 0;font-size:24px}
    h2{font-size:18px;margin-top:32px;padding-bottom:6px;border-bottom:2px solid #333}
    .meta{color:#666;font-size:13px;margin-bottom:24px}
    table{width:100%;border-collapse:collapse;margin:12px 0;font-size:14px}
    th,td{padding:8px 10px;text-align:left;border-bottom:1px solid #e5e5e5}
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
  const sectionTable = (label, b) => `
    <h2>${label}</h2>
    <table>
      <thead><tr><th>Bucket</th><th class="num">Orders</th><th class="num">Taxable Sales</th><th class="num">Tax-Exempt</th><th class="num">Tax Collected</th><th class="num">Grand Total</th></tr></thead>
      <tbody>
        <tr><td>Non-COD (cash / card / account / split / store_credit)</td>
          <td class="num">${b.nonCod.count}</td>
          <td class="num">${fmt(b.nonCod.taxable)}</td>
          <td class="num">${fmt(b.nonCod.exempt)}</td>
          <td class="num">${fmt(b.nonCod.tax)}</td>
          <td class="num">${fmt(b.nonCod.grand)}</td>
        </tr>
        <tr><td>COD (Cash on Delivery)</td>
          <td class="num">${b.cod.count}</td>
          <td class="num">${fmt(b.cod.taxable)}</td>
          <td class="num">${fmt(b.cod.exempt)}</td>
          <td class="num">${fmt(b.cod.tax)}</td>
          <td class="num">${fmt(b.cod.grand)}</td>
        </tr>
        <tr class="total"><td>Total</td>
          <td class="num">${b.nonCod.count + b.cod.count}</td>
          <td class="num">${fmt(b.nonCod.taxable + b.cod.taxable)}</td>
          <td class="num">${fmt(b.nonCod.exempt + b.cod.exempt)}</td>
          <td class="num">${fmt(b.nonCod.tax + b.cod.tax)}</td>
          <td class="num">${fmt(b.nonCod.grand + b.cod.grand)}</td>
        </tr>
      </tbody>
    </table>
    <div style="font-size:12px;color:#666;margin-top:-4px">
      Excluded: ${b.excluded_pending.count} pending/cancelled, ${b.excluded_refunded.count} refunded (gross ${fmt(b.excluded_refunded.grand)}, tax ${fmt(b.excluded_refunded.tax)})
    </div>`;

  const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Sales Tax Report — March & April 2026</title><style>${css}</style></head><body>
  <h1>Sales Tax Report</h1>
  <div class="meta">
    <strong>Eastern Landscape &amp; Mason Supply</strong> · 110 Frowein Road, Center Moriches, NY 11934<br/>
    Period: March 1 – April 30, 2026 · Generated ${new Date().toLocaleString("en-US", { dateStyle: "long", timeStyle: "short" })}<br/>
    NY State sales tax rate: 8.75% (Suffolk County) · Filing basis: accrual
  </div>

  <div class="grand-box">
    <div class="label">Total Sales Tax Collected — Mar + Apr 2026</div>
    <div class="amount">${fmt(total.tax)}</div>
    <div class="sub">On ${fmt(total.taxable)} taxable sales (${fmt(total.exempt)} tax-exempt) across ${total.count} orders</div>
  </div>

  ${sectionTable("March 2026 (WooCommerce Mar 1–13 + New POS/Web Mar 14–31)", buckets["2026-03"])}
  ${sectionTable("April 2026 (New POS/Web only)", buckets["2026-04"])}

  <h2>Combined Total — March + April</h2>
  <table>
    <thead><tr><th>Bucket</th><th class="num">Orders</th><th class="num">Taxable Sales</th><th class="num">Tax-Exempt</th><th class="num">Tax Collected</th><th class="num">Grand Total</th></tr></thead>
    <tbody>
      <tr><td>Non-COD</td>
        <td class="num">${buckets["2026-03"].nonCod.count + buckets["2026-04"].nonCod.count}</td>
        <td class="num">${fmt(buckets["2026-03"].nonCod.taxable + buckets["2026-04"].nonCod.taxable)}</td>
        <td class="num">${fmt(buckets["2026-03"].nonCod.exempt + buckets["2026-04"].nonCod.exempt)}</td>
        <td class="num">${fmt(buckets["2026-03"].nonCod.tax + buckets["2026-04"].nonCod.tax)}</td>
        <td class="num">${fmt(buckets["2026-03"].nonCod.grand + buckets["2026-04"].nonCod.grand)}</td>
      </tr>
      <tr><td>COD</td>
        <td class="num">${buckets["2026-03"].cod.count + buckets["2026-04"].cod.count}</td>
        <td class="num">${fmt(buckets["2026-03"].cod.taxable + buckets["2026-04"].cod.taxable)}</td>
        <td class="num">${fmt(buckets["2026-03"].cod.exempt + buckets["2026-04"].cod.exempt)}</td>
        <td class="num">${fmt(buckets["2026-03"].cod.tax + buckets["2026-04"].cod.tax)}</td>
        <td class="num">${fmt(buckets["2026-03"].cod.grand + buckets["2026-04"].cod.grand)}</td>
      </tr>
      <tr class="total"><td>GRAND TOTAL</td>
        <td class="num">${total.count}</td>
        <td class="num">${fmt(total.taxable)}</td>
        <td class="num">${fmt(total.exempt)}</td>
        <td class="num">${fmt(total.tax)}</td>
        <td class="num">${fmt(total.grand)}</td>
      </tr>
    </tbody>
  </table>

  <div class="footer">
    Pending/cancelled orders excluded. Refunded orders netted out. COD orders included on accrual basis (tax owed at time of sale).
    Detail-level CSV available in the same folder as this report.
  </div>
</body></html>`;
  const htmlPath = "/app/Sales_Tax_Report_March_April_2026.html";
  fs.writeFileSync(htmlPath, html);
  console.log(`Wrote HTML: ${htmlPath}`);
})();
