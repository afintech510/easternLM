/**
 * Unified print system — single source of truth for ALL receipt and delivery ticket printing.
 *
 * Used by:
 * - POS auto-print (thermal ESC/POS via adapter, HTML fallback)
 * - POS transaction history (reprint buttons)
 * - Admin operations (print buttons)
 *
 * Templates:
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

// ─── Canonical Print Type ─────────────────────────────────────
// Every print path maps its source data to this ONE interface.

export interface PrintableOrder {
  // Order
  id?: string;
  orderNumber?: string;
  created_at: string;
  source?: string;
  staffName?: string;

  // Customer
  customer_name: string | null;
  customer_phone: string | null;
  customer_email: string | null;

  // Items
  items: PrintableItem[];

  // Delivery
  delivery_method: string;
  delivery_address: string | null;
  delivery_date: string | null;
  delivery_time_window: string | null;
  delivery_notes: string | null;
  access_constraints: Record<string, unknown> | null;

  // Totals
  materials_subtotal_cents: number;
  delivery_total_cents: number;
  tax_cents: number;
  cc_surcharge_cents: number;
  grand_total_cents: number;
  discount_amount_cents?: number;
  discount_reason?: string | null;
  tax_exempt?: boolean;

  // Payment
  payment_method: string;
  cash_tendered_cents?: number;
  change_due_cents?: number;
  card_brand?: string;
  card_last4?: string;
  account_name?: string | null;
  payments?: Array<{ method: string; amount_cents: number; stripe_id?: string; card_last4?: string; card_brand?: string }> | null;
}

export interface PrintableItem {
  product_name: string;
  quantity: number;
  unit: string;
  unit_price_cents: number;
  line_total_cents: number;
  delivery_type?: string;
}

// ─── Mappers ──────────────────────────────────────────────────
// Convert from various source formats to the canonical PrintableOrder.

/**
 * Map a database order (from API /api/admin/operations/[id]) to PrintableOrder.
 * Used by: POS transaction history reprint, Admin operations print buttons.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function mapDatabaseOrderToUnified(order: Record<string, any>): PrintableOrder {
  const deliveryDate =
    order.delivery_date ||
    order.metadata?.deliveryDate ||
    null;

  return {
    id: order.id,
    orderNumber: order.order_number || `#${(order.id || "").slice(0, 8).toUpperCase()}`,
    created_at: order.placed_at || order.created_at,
    source: order.source || "web",
    staffName: order.staff_name || null,
    customer_name: order.customer_name || null,
    customer_phone: order.customer_phone || null,
    customer_email: order.customer_email || null,
    items: ((order.order_items ?? order.items) || []).map(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (i: any) => ({
        product_name: i.product_name || "Unknown",
        quantity: i.quantity || 0,
        unit: i.unit || (i.delivery_type === "bulk" ? "cu. yard" : "ea"),
        unit_price_cents: i.unit_price_cents || 0,
        line_total_cents: i.line_subtotal_cents ?? i.line_total_cents ?? i.quantity * (i.unit_price_cents || 0),
        delivery_type: i.delivery_type || null,
      }),
    ),
    delivery_method: order.delivery_method || "pickup",
    delivery_address: order.delivery_address || order.customer_address || null,
    delivery_date: deliveryDate ? String(deliveryDate) : null,
    delivery_time_window: order.delivery_time_window || order.metadata?.deliveryTimeWindow as string || null,
    delivery_notes: order.delivery_notes || order.metadata?.notes as string || null,
    access_constraints: order.access_constraints || null,
    materials_subtotal_cents: order.materials_subtotal_cents ?? 0,
    delivery_total_cents: order.delivery_total_cents ?? 0,
    tax_cents: order.tax_cents ?? 0,
    cc_surcharge_cents: order.cc_surcharge_cents ?? 0,
    grand_total_cents: order.grand_total_cents ?? 0,
    discount_amount_cents: order.discount_amount_cents ?? order.metadata?.discount_amount_cents ?? 0,
    discount_reason: order.discount_reason ?? order.metadata?.discount_reason ?? null,
    tax_exempt: order.tax_exempt ?? false,
    payment_method: order.payment_method || "unknown",
    card_brand: order.metadata?.card_brand ?? null,
    card_last4: order.metadata?.card_last4 ?? null,
    cash_tendered_cents: order.metadata?.cash_tendered_cents ?? undefined,
    change_due_cents: order.metadata?.change_due_cents ?? undefined,
    account_name: order.metadata?.account_name ?? null,
    payments: order.payments ?? null,
  };
}

// ─── Adapter: PrintableOrder → ReceiptOrder (for thermal printer) ──

/**
 * Convert PrintableOrder to the ReceiptOrder type expected by the thermal ReceiptPrinter class.
 * This keeps the thermal printer code untouched while feeding it unified data.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function toReceiptOrder(po: PrintableOrder): any {
  return {
    orderNumber: po.orderNumber,
    staffName: po.staffName,
    createdAt: po.created_at,
    items: filterRealItems(po.items).map((i) => ({
      productName: i.product_name,
      quantity: i.quantity,
      unit: i.delivery_type === "bulk" ? "cu. yards" : i.unit || "ea",
      unitPriceCents: i.unit_price_cents,
      lineTotalCents: i.line_total_cents,
      deliveryType: i.delivery_type,
    })),
    subtotalCents: po.materials_subtotal_cents,
    taxCents: po.tax_cents,
    taxExempt: po.tax_exempt,
    deliveryFeeCents: po.delivery_total_cents,
    ccSurchargeCents: po.cc_surcharge_cents,
    totalCents: po.grand_total_cents,
    discountAmountCents: po.discount_amount_cents,
    discountReason: po.discount_reason,
    paymentMethod: po.payment_method,
    cashTenderedCents: po.cash_tendered_cents,
    changeDueCents: po.change_due_cents,
    cardLast4: po.card_last4,
    cardBrand: po.card_brand,
    customerName: po.customer_name || undefined,
    customerPhone: po.customer_phone || undefined,
    customerEmail: po.customer_email || undefined,
    deliveryMethod: po.delivery_method,
    deliveryAddress: po.delivery_address || undefined,
    deliveryDate: po.delivery_date || undefined,
    deliveryTimeWindow: po.delivery_time_window || undefined,
    deliveryNotes: po.delivery_notes || undefined,
    accessConstraints: po.access_constraints as Record<string, boolean> | undefined,
    accountName: po.account_name || undefined,
    payments: po.payments || undefined,
  };
}

// ─── Shared Styles ────────────────────────────────────────────

const PRINT_STYLES = `
body { font-family: monospace; max-width: 380px; margin: 0 auto; padding: 20px; font-size: 14px; line-height: 1.4; }
.center { text-align: center; }
.bold { font-weight: bold; }
.line { border-top: 1px dashed #000; margin: 8px 0; }
.solid-line { border-top: 2px solid #000; margin: 8px 0; }
.row { display: flex; justify-content: space-between; }
.mt { margin-top: 6px; }
.big { font-size: 18px; }
.warn { background: #fff3cd; padding: 8px; border: 1px solid #ffc107; margin: 6px 0; font-size: 14px; }
.cod-banner {
  text-align: center; font-weight: bold; font-size: 26px;
  border: 3px solid #000; padding: 14px 4px; margin: 10px 0;
  background: #000; color: #fff; letter-spacing: 2px;
  width: 100%; box-sizing: border-box;
}
.cod-amount { font-size: 22px; }
.paid-banner { text-align: center; font-weight: bold; font-size: 18px; margin: 8px 0; }
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

function isBulkItem(item: PrintableItem): boolean {
  return item.delivery_type === "bulk" || item.unit === "cu. yard" || item.unit === "cu. yards";
}

function formatItemUnit(item: PrintableItem): { unitSingular: string; unitPlural: string } {
  if (isBulkItem(item)) return { unitSingular: "cu yd", unitPlural: "cu yds" };
  return { unitSingular: item.unit || "ea", unitPlural: item.unit || "ea" };
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
  return `<div class="cod-banner">CASH ON DELIVERY<br/><span class="cod-amount">COLLECT: ${formatUsd(totalCents)}</span></div>`;
}

function paidBannerHtml(method: string, opts?: { card_brand?: string | null; card_last4?: string | null; cash_tendered?: number; change_due?: number }): string {
  let detail = formatPaymentMethod(method);
  if (opts?.card_brand || opts?.card_last4) {
    detail += ` ${opts.card_brand || ""} ****${opts.card_last4 || ""}`.trim();
  }
  let extra = "";
  if (opts?.cash_tendered) {
    extra = `<div class="row mt"><span>Tendered:</span><span>${formatUsd(opts.cash_tendered)}</span></div><div class="row"><span>Change:</span><span>${formatUsd(opts.change_due ?? 0)}</span></div>`;
  }
  return `<div class="mt">Payment: ${detail}</div>${extra}`;
}

// ─── Receipt Template ─────────────────────────────────────────

export function buildReceiptHtml(order: PrintableOrder): string {
  const items = filterRealItems(order.items);
  const isCod = order.payment_method === "cod";

  const itemsHtml = items
    .map((i) => {
      const { unitSingular, unitPlural } = formatItemUnit(i);
      const bulk = isBulkItem(i);
      return `<div class="mt">
        <div style="font-size:16px;font-weight:bold;">${i.quantity} ${unitPlural} ${bulk ? "of " : ""}${i.product_name}</div>
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
      ? `<div class="row"><span>Discount${order.discount_reason ? ` (${order.discount_reason})` : ""}</span><span>-${formatUsd(order.discount_amount_cents!)}</span></div>`
      : "";

  const deliveryFeeLine =
    (order.delivery_total_cents ?? 0) > 0
      ? `<div class="row"><span>Delivery</span><span>${formatUsd(order.delivery_total_cents)}</span></div>`
      : "";

  const taxLine = order.tax_exempt
    ? `<div class="row"><span>Tax</span><span>EXEMPT</span></div>`
    : `<div class="row"><span>Tax (8.75%)</span><span>${formatUsd(order.tax_cents ?? 0)}</span></div>`;

  const ccFeeLine =
    (order.cc_surcharge_cents ?? 0) > 0
      ? `<div class="row"><span>CC Fee (3%)</span><span>${formatUsd(order.cc_surcharge_cents)}</span></div>`
      : "";

  const paymentHtml = isCod
    ? codBannerHtml(order.grand_total_cents)
    : paidBannerHtml(order.payment_method, {
        card_brand: order.card_brand,
        card_last4: order.card_last4,
        cash_tendered: order.cash_tendered_cents,
        change_due: order.change_due_cents,
      });

  // Split payment display
  const splitHtml =
    order.payments && order.payments.length > 1
      ? `<div class="mt bold">Split Payment:</div>${order.payments.map((p) => `<div class="row"><span>${formatPaymentMethod(p.method)}${p.card_last4 ? ` ****${p.card_last4}` : ""}</span><span>${formatUsd(p.amount_cents)}</span></div>`).join("")}`
      : "";

  const orderRef = order.orderNumber
    ? `<div class="row"><span>Order:</span><span>${order.orderNumber}</span></div>`
    : "";

  const staffLine = order.staffName
    ? `<div class="row"><span>Staff:</span><span>${order.staffName}</span></div>`
    : "";

  return `<!DOCTYPE html><html><head><title>Receipt</title>
    <style>${PRINT_STYLES}</style></head><body>
    <div class="center bold" style="font-size:16px;">EASTERN LANDSCAPE<br/>& MASON SUPPLY</div>
    <div class="center" style="font-size:13px;">110 Frowein Road<br/>Center Moriches, NY 11934<br/>(631) 874-6244</div>
    <div class="line"></div>
    ${orderRef}
    <div class="row"><span>Date:</span><span>${formatOrderDateTime(order.created_at)}</span></div>
    ${order.source ? `<div class="row"><span>Source:</span><span>${order.source.toUpperCase()}</span></div>` : ""}
    ${staffLine}
    <div class="line"></div>
    <div class="bold">CUSTOMER</div>
    <div>${order.customer_name || "Walk-in"}</div>
    ${order.customer_phone ? `<div>Phone: ${formatPhone(order.customer_phone)}</div>` : ""}
    ${!order.delivery_address && order.customer_email ? `<div>Email: ${order.customer_email}</div>` : ""}
    ${order.account_name ? `<div>Account: ${order.account_name}</div>` : ""}
    <div class="line"></div>
    <div class="bold">ITEMS</div>
    ${itemsHtml}
    ${deliveryHtml}
    <div class="line"></div>
    <div class="row"><span>Materials</span><span>${formatUsd(order.materials_subtotal_cents ?? 0)}</span></div>
    ${discountLine}
    ${deliveryFeeLine}
    ${taxLine}
    ${ccFeeLine}
    <div class="line"></div>
    <div class="row bold" style="font-size:18px;"><span>TOTAL</span><span>${formatUsd(order.grand_total_cents)}</span></div>
    ${paymentHtml}
    ${splitHtml}
    <div class="line"></div>
    <div class="center mt">Thank you for your business!<br/>easternlm.com</div>
    <div class="line"></div>
    <div style="font-size:11px;color:#222;line-height:1.4;margin-top:8px;">
    <p><strong>PICKUP:</strong> All bulk and hard materials are loaded into customer vehicles at the customer's own risk. Eastern Landscape &amp; Mason Supply is not responsible for any damage to vehicles, trailers, or property resulting from loading.</p>
    <p style="margin-top:6px;"><strong>DELIVERY:</strong> Delivery trucks may travel over sidewalks, curbs, lawns, and driveways to access the drop site. The customer assumes all risk of damage to property, landscaping, sprinkler systems, septic systems, and underground utilities resulting from delivery access. By accepting delivery, the customer acknowledges and accepts these terms.</p>
    <p style="margin-top:6px;">&bull; All discrepancies in material, quantity, or order accuracy must be reported within 24 hours of receipt. &bull; No returns on loose bulk materials, special-order items, or cement/masonry products. &bull; We are not responsible for color washout of dyed mulch due to heavy rain or prolonged sun exposure.</p>
    </div>
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
      return `<div class="mt bold" style="font-size:18px;">${i.quantity} ${unitPlural}<br/>${i.product_name}</div>`;
    })
    .join('<div style="border-top:1px dashed #000;margin:8px 0;"></div>');

  // COD banner appears BEFORE materials on delivery ticket so driver sees it first
  const paymentBlock = isCod
    ? codBannerHtml(order.grand_total_cents)
    : `<div class="paid-banner">PAID</div>`;

  // QR code placeholder — will be replaced with data URL by printDeliveryTicketWindow
  const qrPlaceholder = order.id
    ? `<div class="center" style="margin:8px 0;">
      <p style="font-size:10px;margin-bottom:4px;">Scan to confirm delivery:</p>
      <img id="qr" style="width:150px;height:150px;margin:0 auto;" />
    </div>
    <div class="solid-line"></div>`
    : "";

  return `<!DOCTYPE html><html><head><title>Delivery Ticket</title>
    <style>${PRINT_STYLES}</style></head><body>
    <div class="solid-line"></div>
    <div class="center bold big">DELIVERY TICKET</div>
    <div class="center">EASTERN LANDSCAPE & MASON SUPPLY</div>
    <div class="solid-line"></div>
    ${order.orderNumber ? `<div class="row"><span>Order:</span><span>${order.orderNumber}</span></div>` : ""}
    <div class="row"><span>Date:</span><span>${formatShortDeliveryDate(order.created_at)}</span></div>
    ${order.source ? `<div class="row"><span>Source:</span><span>${order.source.toUpperCase()} ORDER</span></div>` : ""}
    <div style="border-top:1px dashed #000;margin:8px 0;"></div>
    <div class="bold">CUSTOMER: ${order.customer_name || "Walk-in"}</div>
    ${order.customer_phone ? `<div>Phone: ${formatPhone(order.customer_phone)}</div>` : ""}
    <div class="solid-line"></div>
    <div class="bold big">DELIVER TO:</div>
    <div class="bold" style="font-size:18px;">${cleanAddress(addr)}</div>
    ${zip ? `<div class="bold" style="font-size:18px;">ZIP: ${zip}</div>` : ""}
    ${order.delivery_date ? `<div class="mt bold">DATE: ${formatDeliveryDate(order.delivery_date)}</div>` : ""}
    ${order.delivery_time_window ? `<div class="bold">TIME: ${formatTimeWindow(order.delivery_time_window)}</div>` : ""}
    ${flags.length > 0 || constraintNotes ? `<div class="warn"><strong>ACCESS:</strong> ${[...flags, constraintNotes].filter(Boolean).join(" · ")}</div>` : ""}
    ${order.delivery_notes ? `<div class="mt">NOTES: ${order.delivery_notes}</div>` : ""}
    <div class="solid-line"></div>
    ${paymentBlock}
    <div class="solid-line"></div>
    <div class="bold big">MATERIAL TO LOAD:</div>
    ${materialsHtml}
    <div class="solid-line"></div>
    <div class="row bold"><span>ORDER TOTAL:</span><span>${formatUsd(order.grand_total_cents)}</span></div>
    <div class="solid-line"></div>
    ${qrPlaceholder}
    <div style="font-size:11px;color:#222;line-height:1.4;margin-top:8px;">
    <p><strong>PICKUP:</strong> All bulk and hard materials are loaded into customer vehicles at the customer's own risk. Eastern Landscape &amp; Mason Supply is not responsible for any damage to vehicles, trailers, or property resulting from loading.</p>
    <p style="margin-top:6px;"><strong>DELIVERY:</strong> Delivery trucks may travel over sidewalks, curbs, lawns, and driveways to access the drop site. The customer assumes all risk of damage to property, landscaping, sprinkler systems, septic systems, and underground utilities resulting from delivery access. By accepting delivery, the customer acknowledges and accepts these terms.</p>
    <p style="margin-top:6px;">&bull; All discrepancies in material, quantity, or order accuracy must be reported within 24 hours of receipt. &bull; No returns on loose bulk materials, special-order items, or cement/masonry products. &bull; We are not responsible for color washout of dyed mulch due to heavy rain or prolonged sun exposure.</p>
    </div>
    </body></html>`;
}

// ─── Print Window Helpers ─────────────────────────────────────

export function printReceiptWindow(order: PrintableOrder) {
  const w = window.open("", "_blank", "width=400,height=700");
  if (!w) return;
  w.document.write(buildReceiptHtml(order));
  w.document.close();
  setTimeout(() => { w.print(); }, 500);
}

export async function printDeliveryTicketWindow(order: PrintableOrder) {
  const html = buildDeliveryTicketHtml(order);
  const w = window.open("", "_blank", "width=400,height=700");
  if (!w) return;
  w.document.write(html);
  w.document.close();

  // Generate QR code and inject into the img element
  if (order.id) {
    try {
      const QRCode = await import("qrcode");
      const origin = typeof window !== "undefined" ? window.location.origin : "https://easternlm.com";
      const url = await QRCode.toDataURL(`${origin}/delivery/confirm/${order.id}`, { width: 150, margin: 1 });
      const img = w.document.getElementById("qr") as HTMLImageElement | null;
      if (img) img.src = url;
    } catch {
      // QR generation failed — ticket still prints without it
    }
  }

  setTimeout(() => { w.print(); }, 1200);
}
