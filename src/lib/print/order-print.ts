/**
 * Unified print templates for receipts and delivery tickets.
 * Used by POS (auto-print fallback + transaction history) and Admin operations.
 *
 * There are two templates:
 * 1. Receipt — customer-facing with items, totals, payment, delivery info
 * 2. Delivery Ticket — driver-facing with delivery address, materials, COD info, QR code
 */

import { formatUsd } from "@/lib/format";
import {
  formatOrderDateTime,
  formatDeliveryDate,
  formatShortDeliveryDate,
  formatTimeWindow,
  formatPhone,
  formatPaymentMethod,
} from "@/lib/format-date";

// ─── Types ────────────────────────────────────────────────────

export interface PrintableOrder {
  id?: string;
  created_at: string;
  source?: string;
  customer_name: string | null;
  customer_phone: string | null;
  customer_email: string | null;
  items: PrintableItem[];
  materials_subtotal_cents: number;
  delivery_total_cents: number;
  tax_cents: number;
  cc_surcharge_cents: number;
  grand_total_cents: number;
  discount_amount_cents?: number;
  payment_method: string;
  delivery_method: string;
  delivery_address: string | null;
  delivery_date: string | null;
  delivery_time_window: string | null;
  delivery_notes: string | null;
  access_constraints: Record<string, unknown> | null;
  cash_tendered_cents?: number;
  change_due_cents?: number;
}

export interface PrintableItem {
  product_name: string;
  quantity: number;
  unit: string;
  unit_price_cents: number;
  line_total_cents: number;
  delivery_type?: string;
}

// ─── Shared Styles ────────────────────────────────────────────

const PRINT_STYLES = `
body { font-family: monospace; max-width: 380px; margin: 0 auto; padding: 20px; font-size: 12px; }
.center { text-align: center; }
.bold { font-weight: bold; }
.line { border-top: 1px dashed #000; margin: 8px 0; }
.solid-line { border-top: 2px solid #000; margin: 8px 0; }
.row { display: flex; justify-content: space-between; }
.mt { margin-top: 6px; }
.big { font-size: 16px; }
.warn { background: #fff3cd; padding: 6px; border: 1px solid #ffc107; margin: 4px 0; }
.cod-banner {
  text-align: center; font-weight: bold; font-size: 24px;
  border: 3px solid #000; padding: 12px 4px; margin: 10px 0;
  background: #000; color: #fff; letter-spacing: 2px;
  width: 100%; box-sizing: border-box;
}
.cod-amount { font-size: 20px; }
@media print { body { width: 80mm; } }
`;

const CONSTRAINT_LABELS: Record<string, string> = {
  lowWires: "Low wires",
  narrowDriveway: "Narrow driveway",
  softGround: "Soft ground",
  gated: "Gated",
  steep: "Steep grade",
  backyard: "Backyard access",
};

// ─── Helpers ──────────────────────────────────────────────────

function filterRealItems(items: PrintableItem[]): PrintableItem[] {
  return items.filter(
    (i) =>
      !i.product_name?.startsWith("Delivery Load") &&
      !i.product_name?.startsWith("Sales Tax") &&
      !i.product_name?.startsWith("Credit Card"),
  );
}

function formatItemUnit(item: PrintableItem): { unitSingular: string; unitPlural: string } {
  const isBulk = item.delivery_type === "bulk" || item.unit === "unit" || item.unit === "cu. yard" || !item.unit;
  return {
    unitSingular: isBulk ? "cu yd" : (item.unit || "ea"),
    unitPlural: isBulk ? "cu yds" : (item.unit || "ea"),
  };
}

function getConstraints(c: Record<string, unknown> | null): { flags: string[]; notes: string | null } {
  if (!c) return { flags: [], notes: null };
  const flags = Object.entries(c)
    .filter(([k, v]) => v === true && k !== "notes")
    .map(([k]) => CONSTRAINT_LABELS[k] || k);
  const notes = typeof c.notes === "string" && c.notes.trim() ? c.notes.trim() : null;
  return { flags, notes };
}

function cleanAddress(addr: string): string {
  return addr
    .replace(/,?\s*(USA|US|United States)\s*$/i, "")
    .replace(/,?\s*NY\s*,?/i, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function extractZip(addr: string): string {
  return addr.match(/\b(\d{5})\b/)?.[1] || "";
}

function codBannerHtml(totalCents: number): string {
  return `<div class="cod-banner">COD<br/><span class="cod-amount">${formatUsd(totalCents)}</span></div>`;
}

// ─── Receipt Template ─────────────────────────────────────────

export function buildReceiptHtml(order: PrintableOrder): string {
  const items = filterRealItems(order.items);
  const isCod = order.payment_method === "cod";

  const itemsHtml = items
    .map((i) => {
      const { unitSingular, unitPlural } = formatItemUnit(i);
      const isBulk = i.delivery_type === "bulk" || i.unit === "unit" || i.unit === "cu. yard" || !i.unit;
      return `<div class="mt">
        <div style="font-size:14px;font-weight:bold;">${i.quantity} ${unitPlural} ${isBulk ? "of " : ""}${i.product_name}</div>
        <div class="row"><span>@ ${formatUsd(i.unit_price_cents)} per ${unitSingular}</span><span>${formatUsd(i.line_total_cents)}</span></div>
      </div>`;
    })
    .join("");

  const deliveryHtml =
    order.delivery_method === "delivery" && order.delivery_address
      ? `<div class="line"></div>
      <div class="bold">DELIVERY</div>
      ${order.customer_phone ? `<div>Phone: ${formatPhone(order.customer_phone)}</div>` : ""}
      ${order.customer_email ? `<div>Email: ${order.customer_email}</div>` : ""}
      <div class="mt" style="font-size:14px;font-weight:bold;">${cleanAddress(order.delivery_address)}</div>
      ${order.delivery_date ? `<div>Date: ${formatShortDeliveryDate(order.delivery_date)}</div>` : ""}
      ${order.delivery_time_window ? `<div>Time: ${formatTimeWindow(order.delivery_time_window)}</div>` : ""}
      ${order.delivery_notes ? `<div>Notes: ${order.delivery_notes}</div>` : ""}`
      : "";

  const discountLine =
    (order.discount_amount_cents ?? 0) > 0
      ? `<div class="row"><span>Discount</span><span>-${formatUsd(order.discount_amount_cents!)}</span></div>`
      : "";

  const deliveryFeeLine =
    (order.delivery_total_cents ?? 0) > 0
      ? `<div class="row"><span>Delivery</span><span>${formatUsd(order.delivery_total_cents)}</span></div>`
      : "";

  const ccFeeLine =
    (order.cc_surcharge_cents ?? 0) > 0
      ? `<div class="row"><span>CC Fee (3%)</span><span>${formatUsd(order.cc_surcharge_cents)}</span></div>`
      : "";

  const paymentHtml = isCod
    ? codBannerHtml(order.grand_total_cents)
    : `<div class="mt">Payment: ${formatPaymentMethod(order.payment_method)}${
        order.cash_tendered_cents
          ? `<br/>Tendered: ${formatUsd(order.cash_tendered_cents)}<br/>Change: ${formatUsd(order.change_due_cents ?? 0)}`
          : ""
      }</div>`;

  return `<!DOCTYPE html><html><head><title>Receipt</title>
    <style>${PRINT_STYLES}</style></head><body>
    <div class="center bold" style="font-size:14px;">EASTERN LANDSCAPE<br/>& MASON SUPPLY</div>
    <div class="center" style="font-size:11px;">110 Frowein Road<br/>Center Moriches, NY 11934<br/>(631) 874-6244</div>
    <div class="line"></div>
    <div class="row"><span>Date:</span><span>${formatOrderDateTime(order.created_at)}</span></div>
    ${order.source ? `<div class="row"><span>Source:</span><span>${order.source.toUpperCase()}</span></div>` : ""}
    <div class="line"></div>
    <div class="bold">CUSTOMER</div>
    <div>${order.customer_name || "Walk-in"}</div>
    ${order.customer_phone ? `<div>Phone: ${formatPhone(order.customer_phone)}</div>` : ""}
    ${!order.delivery_address && order.customer_email ? `<div>Email: ${order.customer_email}</div>` : ""}
    <div class="line"></div>
    <div class="bold">ITEMS</div>
    ${itemsHtml}
    ${deliveryHtml}
    <div class="line"></div>
    <div class="row"><span>Materials</span><span>${formatUsd(order.materials_subtotal_cents ?? 0)}</span></div>
    ${discountLine}
    ${deliveryFeeLine}
    <div class="row"><span>Tax (8.75%)</span><span>${formatUsd(order.tax_cents ?? 0)}</span></div>
    ${ccFeeLine}
    <div class="line"></div>
    <div class="row bold" style="font-size:14px;"><span>TOTAL</span><span>${formatUsd(order.grand_total_cents)}</span></div>
    ${paymentHtml}
    <div class="line"></div>
    <div class="center mt">Thank you for your business!<br/>easternlm.com</div>
    </body></html>`;
}

// ─── Delivery Ticket Template ─────────────────────────────────

export function buildDeliveryTicketHtml(order: PrintableOrder): string {
  const items = filterRealItems(order.items);
  const isCod = order.payment_method === "cod";
  const { flags, notes: constraintNotes } = getConstraints(order.access_constraints);
  const addr = order.delivery_address || "NO ADDRESS";
  const zip = extractZip(addr);

  const materialsHtml = items
    .map((i) => {
      const { unitPlural } = formatItemUnit(i);
      return `<div class="mt bold" style="font-size:16px;">${i.quantity} ${unitPlural}<br/>${i.product_name}</div>`;
    })
    .join('<div style="border-top:1px dashed #000;margin:8px 0;"></div>');

  const qrScript = order.id
    ? `<div class="center" style="margin:8px 0;">
      <p style="font-size:10px;margin-bottom:4px;">Scan to confirm delivery:</p>
      <img id="qr" style="width:150px;height:150px;margin:0 auto;" />
    </div>
    <div class="solid-line"></div>
    <script src="https://cdn.jsdelivr.net/npm/qrcode@1.5.4/build/qrcode.min.js"><\/script>
    <script>
      QRCode.toDataURL('${typeof window !== "undefined" ? window.location.origin : "https://easternlm.com"}/delivery/confirm/${order.id}', {width:150,margin:1}, function(err,url){
        if(url) document.getElementById('qr').src = url;
      });
    <\/script>`
    : "";

  return `<!DOCTYPE html><html><head><title>Delivery Ticket</title>
    <style>${PRINT_STYLES}</style></head><body>
    <div class="solid-line"></div>
    <div class="center bold big">DELIVERY TICKET</div>
    <div class="center">EASTERN LANDSCAPE & MASON SUPPLY</div>
    <div class="solid-line"></div>
    <div class="row"><span>Date:</span><span>${formatShortDeliveryDate(order.created_at)}</span></div>
    ${order.source ? `<div class="row"><span>Source:</span><span>${order.source.toUpperCase()} ORDER</span></div>` : ""}
    <div style="border-top:1px dashed #000;margin:8px 0;"></div>
    <div class="bold">CUSTOMER: ${order.customer_name || "Walk-in"}</div>
    ${order.customer_phone ? `<div>Phone: ${formatPhone(order.customer_phone)}</div>` : ""}
    <div class="solid-line"></div>
    <div class="bold big">DELIVER TO:</div>
    <div class="bold" style="font-size:16px;">${cleanAddress(addr)}</div>
    ${zip ? `<div class="bold" style="font-size:16px;">ZIP: ${zip}</div>` : ""}
    ${order.delivery_date ? `<div class="mt bold">DATE: ${formatDeliveryDate(order.delivery_date)}</div>` : ""}
    ${order.delivery_time_window ? `<div class="bold">TIME: ${formatTimeWindow(order.delivery_time_window)}</div>` : ""}
    ${flags.length > 0 || constraintNotes ? `<div class="warn"><strong>ACCESS:</strong> ${[...flags, constraintNotes].filter(Boolean).join(" · ")}</div>` : ""}
    ${order.delivery_notes ? `<div class="mt">NOTES: ${order.delivery_notes}</div>` : ""}
    <div class="solid-line"></div>
    <div class="bold big">MATERIAL TO LOAD:</div>
    ${materialsHtml}
    <div class="solid-line"></div>
    <div class="row bold"><span>ORDER TOTAL:</span><span>${formatUsd(order.grand_total_cents)}</span></div>
    ${isCod ? codBannerHtml(order.grand_total_cents) : `<div class="bold big center">PAID</div>`}
    <div class="solid-line"></div>
    ${qrScript}
    </body></html>`;
}

// ─── Print Helpers ────────────────────────────────────────────

export function printReceiptWindow(order: PrintableOrder) {
  const w = window.open("", "_blank", "width=400,height=700");
  if (!w) return;
  w.document.write(buildReceiptHtml(order));
  w.document.close();
  setTimeout(() => { w.print(); }, 500);
}

export function printDeliveryTicketWindow(order: PrintableOrder) {
  const w = window.open("", "_blank", "width=400,height=700");
  if (!w) return;
  w.document.write(buildDeliveryTicketHtml(order));
  w.document.close();
  setTimeout(() => { w.print(); }, 1000);
}
