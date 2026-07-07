#!/usr/bin/env node
/**
 * Partial refund for order 499b206c — refund Gravel Install + Steppers,
 * keep Bluestone + delivery + proportional tax/CC.
 *
 * Run on VPS:  cd /opt/easternlm-web && node scripts/refund-499b206c.mjs
 *              (reads .env.local for STRIPE_SECRET_KEY, RESEND_API_KEY, SUPABASE_SERVICE_ROLE_KEY)
 */
import Stripe from "stripe";
import { Resend } from "resend";
import { readFileSync } from "fs";

// ── Load env from .env.local if not already set ──
try {
  const envFile = readFileSync(".env.local", "utf8");
  for (const line of envFile.split("\n")) {
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq < 0) continue;
    const key = line.slice(0, eq).trim();
    const val = line.slice(eq + 1).trim();
    if (!process.env[key]) process.env[key] = val;
  }
} catch { /* ok if missing */ }

const SUPABASE_URL = "https://qnwevkgrhdrjqvvabcit.supabase.co";
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const STRIPE_KEY = process.env.STRIPE_SECRET_KEY;
const RESEND_KEY = process.env.RESEND_API_KEY;
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || "orders@easternlm.com";

if (!SUPABASE_KEY || !STRIPE_KEY || !RESEND_KEY) {
  console.error("Missing env vars. Run from VPS with .env.local present.");
  process.exit(1);
}

const ORDER_ID = "499b206c-1c62-4a4c-bcd9-7f3313018d1c";
const STRIPE_PI = "pi_3TpTs0CXlyLj1gLG1KjgAiXZ";
const REFUND_CENTS = 78902; // $789.02
const REASON = "Partial refund — removed Gravel Install and Antique Black Steppers";

// ── Supabase helpers ──
async function sbFetch(path, opts = {}) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1${path}`, {
    ...opts,
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      "Content-Type": "application/json",
      Prefer: opts.prefer || "return=representation",
      ...opts.headers,
    },
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`Supabase ${res.status}: ${text}`);
  return JSON.parse(text);
}

async function main() {
  console.log("=== Partial Refund: Order 499b206c ===\n");

  // 1. Fetch the order
  const [order] = await sbFetch(`/orders?id=eq.${ORDER_ID}&select=*`);
  if (!order) throw new Error("Order not found");
  console.log(`Order: ${order.customer_name}, grand total: $${(order.grand_total_cents / 100).toFixed(2)}`);
  console.log(`Status: ${order.status}, payment: ${order.payment_method}`);

  // 2. Process Stripe refund
  console.log(`\nProcessing Stripe refund of $${(REFUND_CENTS / 100).toFixed(2)}...`);
  const stripe = new Stripe(STRIPE_KEY);
  const stripeRefund = await stripe.refunds.create({
    payment_intent: STRIPE_PI,
    amount: REFUND_CENTS,
    reason: "requested_by_customer",
  });
  console.log(`Stripe refund created: ${stripeRefund.id}`);

  // 3. Update order in Supabase
  const refundRecord = {
    id: crypto.randomUUID(),
    amount_cents: REFUND_CENTS,
    reason: REASON,
    type: "partial",
    processed_by: "admin-script",
    processed_at: new Date().toISOString(),
    stripe_refund_id: stripeRefund.id,
  };

  const existingRefunds = order.refunds || [];
  const newGrandTotal = order.grand_total_cents - REFUND_CENTS; // 144447 - 78902 = 65545

  await sbFetch(`/orders?id=eq.${ORDER_ID}`, {
    method: "PATCH",
    body: JSON.stringify({
      status: "partially_refunded",
      refunds: [...existingRefunds, refundRecord],
      materials_subtotal_cents: 47500, // just bluestone
      tax_cents: 4979,
      cc_surcharge_cents: 2166,
      grand_total_cents: newGrandTotal,
      updated_at: new Date().toISOString(),
    }),
  });
  console.log("Order updated in Supabase (partially_refunded)");

  // 4. Send updated receipt email
  console.log(`\nSending updated receipt to ${order.customer_email}...`);

  const YARD_ADDRESS = "110 Frowein Road, Center Moriches, NY 11934";
  const orderNumber = `#${ORDER_ID.slice(0, 8).toUpperCase()}`;
  const orderDate = new Date(order.placed_at).toLocaleDateString("en-US", {
    weekday: "short", month: "short", day: "numeric", year: "numeric",
  });

  const fmtUsd = (c) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(c / 100);

  // Fetch updated items (only the bluestone remains relevant)
  const items = await sbFetch(`/order_items?order_id=eq.${ORDER_ID}&select=*&order=created_at.asc`);
  const materialItems = items.filter(
    (i) => !i.product_name?.startsWith("Delivery Load"),
  );

  // Build refunded items list for the email
  const refundedItems = materialItems.filter(
    (i) => i.product_name === "Gravel Install — 5 yds" ||
           i.product_name.includes("Antique Black Stepper"),
  );
  const keptItems = materialItems.filter(
    (i) => i.product_name !== "Gravel Install — 5 yds" &&
           !i.product_name.includes("Antique Black Stepper"),
  );

  const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

  const itemRow = (item, strikethrough = false) => {
    const unit = item.delivery_type === "bulk" ? "cu. yd" : item.unit || "ea";
    const style = strikethrough
      ? "text-decoration:line-through;color:#9ca3af;"
      : "";
    return `<tr>
      <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;${style}">${esc(item.product_name)}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;text-align:center;${style}">${item.quantity} ${esc(unit)}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;text-align:right;${style}">${fmtUsd(item.unit_price_cents)}/${unit}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;text-align:right;${style}">${fmtUsd(item.line_subtotal_cents)}</td>
    </tr>`;
  };

  const keptRows = keptItems.map((i) => itemRow(i, false)).join("");
  const refundedRows = refundedItems.map((i) => itemRow(i, true)).join("");

  const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"/></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:Arial,Helvetica,sans-serif;">
<div style="max-width:600px;margin:0 auto;padding:20px;">
  <div style="background:#1a2332;padding:24px;border-radius:12px 12px 0 0;text-align:center;">
    <h1 style="margin:0;color:#fff;font-size:20px;letter-spacing:1px;">EASTERN LANDSCAPE<br/>&amp; MASON SUPPLY</h1>
    <p style="margin:6px 0 0;color:#94a3b8;font-size:13px;">${YARD_ADDRESS}<br/>(631) 874-6244</p>
  </div>

  <div style="background:#fff;padding:24px;border:1px solid #e5e7eb;border-top:none;">
    <div style="display:flex;justify-content:space-between;margin-bottom:16px;">
      <div>
        <p style="margin:0 0 4px;font-size:13px;color:#6b7280;">Order</p>
        <p style="margin:0;font-size:16px;font-weight:bold;color:#111827;">${orderNumber}</p>
      </div>
      <div style="text-align:right;">
        <p style="margin:0 0 4px;font-size:13px;color:#6b7280;">Date</p>
        <p style="margin:0;font-size:14px;color:#111827;">${orderDate}</p>
      </div>
    </div>

    <div style="margin-bottom:16px;padding:12px;background:#fef3c7;border-radius:8px;border:1px solid #fbbf24;">
      <p style="margin:0;font-size:14px;color:#92400e;font-weight:bold;">
        Updated Receipt &mdash; Partial Refund Applied
      </p>
      <p style="margin:4px 0 0;font-size:13px;color:#92400e;">
        A refund of ${fmtUsd(REFUND_CENTS)} has been issued to your card. Please allow 5–10 business days for it to appear.
      </p>
    </div>

    <table style="width:100%;border-collapse:collapse;font-size:14px;margin-bottom:4px;">
      <thead>
        <tr style="background:#f9fafb;">
          <th style="text-align:left;padding:8px 12px;border-bottom:2px solid #d1d5db;">Item</th>
          <th style="text-align:center;padding:8px 12px;border-bottom:2px solid #d1d5db;">Qty</th>
          <th style="text-align:right;padding:8px 12px;border-bottom:2px solid #d1d5db;">Price</th>
          <th style="text-align:right;padding:8px 12px;border-bottom:2px solid #d1d5db;">Total</th>
        </tr>
      </thead>
      <tbody>
        ${keptRows}
        ${refundedRows}
      </tbody>
    </table>

    <table style="width:100%;border-collapse:collapse;font-size:14px;border-top:2px solid #d1d5db;">
      <tr><td style="padding:6px 12px;text-align:right;" colspan="3">Materials</td><td style="padding:6px 12px;text-align:right;">${fmtUsd(47500)}</td></tr>
      <tr><td style="padding:4px 12px;text-align:right;" colspan="3">Delivery</td><td style="padding:4px 12px;text-align:right;">${fmtUsd(9400 + 1500)}</td></tr>
      <tr><td style="padding:4px 12px;text-align:right;" colspan="3">Tax (8.75%)</td><td style="padding:4px 12px;text-align:right;">${fmtUsd(4979)}</td></tr>
      <tr><td style="padding:4px 12px;text-align:right;" colspan="3">CC Fee (3.5%)</td><td style="padding:4px 12px;text-align:right;">${fmtUsd(2166)}</td></tr>
      <tr style="border-top:1px solid #e5e7eb;">
        <td style="padding:6px 12px;text-align:right;color:#9ca3af;text-decoration:line-through;" colspan="3">Original Total</td>
        <td style="padding:6px 12px;text-align:right;color:#9ca3af;text-decoration:line-through;">${fmtUsd(order.grand_total_cents)}</td>
      </tr>
      <tr>
        <td style="padding:4px 12px;text-align:right;color:#dc2626;" colspan="3">Refund</td>
        <td style="padding:4px 12px;text-align:right;color:#dc2626;">-${fmtUsd(REFUND_CENTS)}</td>
      </tr>
      <tr style="border-top:2px solid #111827;">
        <td style="padding:10px 12px;text-align:right;font-size:16px;font-weight:bold;" colspan="3">New Total</td>
        <td style="padding:10px 12px;text-align:right;font-size:16px;font-weight:bold;">${fmtUsd(newGrandTotal)}</td>
      </tr>
    </table>

    <div style="margin:20px 0;padding:16px;background:#f9fafb;border-radius:8px;border:1px solid #e5e7eb;">
      <h3 style="margin:0 0 8px;font-size:15px;color:#374151;">Delivery Details</h3>
      <p style="margin:0 0 4px;font-size:14px;"><strong>42 Peacock Path, East Quogue, NY</strong></p>
      ${order.delivery_date ? `<p style="margin:0 0 4px;font-size:14px;">Date: ${new Date(order.delivery_date).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" })}</p>` : ""}
      ${order.delivery_time_window ? `<p style="margin:0;font-size:14px;">Time: ${order.delivery_time_window}</p>` : ""}
    </div>
  </div>

  <div style="background:#f9fafb;padding:16px 24px;border-radius:0 0 12px 12px;border:1px solid #e5e7eb;border-top:none;text-align:center;">
    <p style="margin:0 0 4px;font-size:13px;color:#6b7280;">Thank you for your business!</p>
    <p style="margin:0;font-size:13px;color:#6b7280;">easternlm.com &bull; (631) 874-6244</p>
  </div>
</div>
</body></html>`;

  const resend = new Resend(RESEND_KEY);
  await resend.emails.send({
    from: `Eastern LM <${FROM_EMAIL}>`,
    to: order.customer_email,
    subject: `Updated Receipt — Order ${orderNumber} (Partial Refund) — Eastern LM`,
    html,
  });
  console.log(`Email sent to ${order.customer_email}`);

  console.log("\n=== DONE ===");
  console.log(`Refunded: $${(REFUND_CENTS / 100).toFixed(2)}`);
  console.log(`New total: $${(newGrandTotal / 100).toFixed(2)}`);
  console.log(`Stripe refund: ${stripeRefund.id}`);
}

main().catch((err) => {
  console.error("FAILED:", err.message || err);
  process.exit(1);
});
