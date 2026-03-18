/**
 * ESC/POS Thermal Receipt Printer (Netum NT-8360 80mm)
 * Supports WebUSB (Chrome) with browser print fallback.
 */

// WebUSB types (browser API, not available in Node)
declare global {
  interface Navigator { usb: any; }
}
type USBDevice = any;

const ESC = 0x1b;
const GS = 0x1d;
const LF = 0x0a;
const WIDTH = 48; // chars per line at Font A

function pad(label: string, value: string, width = WIDTH): string {
  const gap = width - label.length - value.length;
  return label + " ".repeat(Math.max(1, gap)) + value;
}

function center(text: string, width = WIDTH): string {
  const gap = Math.max(0, Math.floor((width - text.length) / 2));
  return " ".repeat(gap) + text;
}

function divider(char = "-", width = WIDTH): string {
  return char.repeat(width);
}

function fmtUsd(cents: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);
}

function fmtDate(d: string | Date): string {
  return new Date(d).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });
}

export type ReceiptOrder = {
  id: string;
  orderNumber?: string;
  staffName?: string;
  placedAt: string | Date;
  items: Array<{
    productName: string;
    quantity: number;
    unit: string;
    unitPriceCents: number;
    lineSubtotalCents: number;
  }>;
  materialsSubtotalCents: number;
  deliveryTotalCents: number;
  taxCents: number;
  ccSurchargeCents: number;
  discountAmountCents?: number;
  discountReason?: string;
  grandTotalCents: number;
  taxExempt?: boolean;
  paymentMethod: string;
  payments?: Array<{ method: string; amount_cents: number; stripe_id?: string }>;
  cashTendered?: number;
  changeDue?: number;
  customerName?: string;
  customerPhone?: string;
  deliveryMethod?: string;
  deliveryAddress?: string;
  deliveryNotes?: string;
  accountBalance?: number;
};

export class ThermalPrinter {
  private device: USBDevice | null = null;
  private endpointOut = 1;

  static VENDOR_FILTERS = [
    { vendorId: 0x0416 }, // Netum / WinBond
    { vendorId: 0x0483 }, // STMicroelectronics
    { vendorId: 0x1fc9 }, // NXP
    { vendorId: 0x04b8 }, // Epson
    { vendorId: 0x0519 }, // Star
    { vendorId: 0x0dd4 }, // Custom
  ];

  get isConnected(): boolean {
    return !!this.device?.opened;
  }

  async connect(): Promise<boolean> {
    try {
      this.device = await navigator.usb.requestDevice({ filters: ThermalPrinter.VENDOR_FILTERS });
      await this.device.open();
      await this.device.selectConfiguration(1);
      await this.device.claimInterface(0);
      const ep = this.device.configuration?.interfaces[0]?.alternate.endpoints.find((e: any) => e.direction === "out");
      this.endpointOut = ep?.endpointNumber ?? 1;
      return true;
    } catch {
      return false;
    }
  }

  async autoReconnect(): Promise<boolean> {
    try {
      const devices = await navigator.usb.getDevices();
      if (devices.length > 0) {
        this.device = devices[0];
        await this.device.open();
        await this.device.selectConfiguration(1);
        await this.device.claimInterface(0);
        const ep = this.device.configuration?.interfaces[0]?.alternate.endpoints.find((e: any) => e.direction === "out");
        this.endpointOut = ep?.endpointNumber ?? 1;
        return true;
      }
    } catch { /* no previously paired device */ }
    return false;
  }

  private async send(data: Uint8Array): Promise<void> {
    if (!this.device?.opened) throw new Error("Printer not connected");
    const CHUNK = 64;
    for (let i = 0; i < data.length; i += CHUNK) {
      await this.device.transferOut(this.endpointOut, data.slice(i, i + CHUNK));
    }
  }

  async printReceipt(order: ReceiptOrder): Promise<void> {
    const buf = this.buildReceipt(order);
    await this.send(buf);
  }

  async openCashDrawer(): Promise<void> {
    await this.send(new Uint8Array([ESC, 0x70, 0x00, 0x19, 0xfa]));
  }

  async testPrint(): Promise<void> {
    const enc = new TextEncoder();
    const buf: number[] = [];
    buf.push(ESC, 0x40); // init
    buf.push(ESC, 0x61, 0x01); // center
    buf.push(...enc.encode("EASTERN LANDSCAPE & MASON SUPPLY\n"));
    buf.push(...enc.encode("Printer Test OK\n\n\n"));
    buf.push(GS, 0x56, 0x01); // cut
    await this.send(new Uint8Array(buf));
  }

  private buildReceipt(order: ReceiptOrder): Uint8Array {
    const enc = new TextEncoder();
    const buf: number[] = [];

    // Init
    buf.push(ESC, 0x40);

    // Header (centered, bold, double-height)
    buf.push(ESC, 0x61, 0x01);
    buf.push(ESC, 0x45, 0x01);
    buf.push(GS, 0x21, 0x01);
    this.line(buf, enc, "EASTERN LANDSCAPE");
    this.line(buf, enc, "& MASON SUPPLY");
    buf.push(GS, 0x21, 0x00);
    buf.push(ESC, 0x45, 0x00);
    this.line(buf, enc, "110 Frowein Road");
    this.line(buf, enc, "Center Moriches, NY 11934");
    this.line(buf, enc, "(631) 874-6244");
    this.line(buf, enc, "");

    // Left align
    buf.push(ESC, 0x61, 0x00);
    this.line(buf, enc, `Date: ${fmtDate(order.placedAt)}`);
    this.line(buf, enc, `Order: #${order.orderNumber ?? order.id.slice(0, 8)}`);
    if (order.staffName) this.line(buf, enc, `Staff: ${order.staffName}`);
    this.line(buf, enc, divider());

    // Items
    for (const item of order.items) {
      this.line(buf, enc, `${item.quantity} ${item.unit}  ${item.productName.slice(0, 30)}`);
      this.line(buf, enc, fmtUsd(item.lineSubtotalCents).padStart(WIDTH));
    }
    this.line(buf, enc, divider());

    // Totals
    this.line(buf, enc, pad("Subtotal:", fmtUsd(order.materialsSubtotalCents)));
    if (order.discountAmountCents && order.discountAmountCents > 0) {
      this.line(buf, enc, pad(`Discount${order.discountReason ? ` (${order.discountReason})` : ""}:`, `-${fmtUsd(order.discountAmountCents)}`));
    }
    if (order.deliveryTotalCents > 0) {
      this.line(buf, enc, pad("Delivery:", fmtUsd(order.deliveryTotalCents)));
    }
    this.line(buf, enc, pad(order.taxExempt ? "Tax:" : "Tax (8.75%):", order.taxExempt ? "EXEMPT" : fmtUsd(order.taxCents)));
    if (order.ccSurchargeCents > 0) {
      this.line(buf, enc, pad("CC Fee (3%):", fmtUsd(order.ccSurchargeCents)));
    }
    this.line(buf, enc, divider("="));

    // Grand total (bold, double)
    buf.push(ESC, 0x45, 0x01);
    buf.push(GS, 0x21, 0x01);
    this.line(buf, enc, pad("TOTAL:", fmtUsd(order.grandTotalCents)));
    buf.push(GS, 0x21, 0x00);
    buf.push(ESC, 0x45, 0x00);
    this.line(buf, enc, "");

    // Payment
    if (order.paymentMethod === "split" && order.payments?.length) {
      for (const p of order.payments) {
        this.line(buf, enc, `Payment: ${p.method} — ${fmtUsd(p.amount_cents)}`);
      }
    } else {
      this.line(buf, enc, `Payment: ${order.paymentMethod.toUpperCase()}`);
      if (order.paymentMethod === "cash" && order.cashTendered) {
        this.line(buf, enc, pad("Tendered:", fmtUsd(order.cashTendered)));
        this.line(buf, enc, pad("Change:", fmtUsd(order.changeDue ?? 0)));
      }
      if (order.paymentMethod === "cod") {
        buf.push(ESC, 0x45, 0x01);
        this.line(buf, enc, "AMOUNT DUE ON DELIVERY:");
        this.line(buf, enc, fmtUsd(order.grandTotalCents).padStart(WIDTH));
        buf.push(ESC, 0x45, 0x00);
      }
      if (order.paymentMethod === "account") {
        this.line(buf, enc, `Charged to: ${order.customerName ?? "Account"}`);
      }
    }

    // Customer + delivery
    this.line(buf, enc, "");
    if (order.customerName && order.customerName !== "Walk-in") {
      this.line(buf, enc, `Customer: ${order.customerName}`);
    }
    if (order.customerPhone) this.line(buf, enc, `Phone: ${order.customerPhone}`);
    if (order.deliveryMethod === "delivery" && order.deliveryAddress) {
      this.line(buf, enc, `Deliver to: ${order.deliveryAddress}`);
    }

    // Footer
    this.line(buf, enc, "");
    buf.push(ESC, 0x61, 0x01);
    this.line(buf, enc, "Thank you for your business!");
    this.line(buf, enc, "easternlm.com");
    this.line(buf, enc, "");
    this.line(buf, enc, "");

    // Cut
    buf.push(GS, 0x56, 0x01);

    return new Uint8Array(buf);
  }

  private line(buf: number[], enc: TextEncoder, text: string) {
    buf.push(...enc.encode(text), LF);
  }
}

/**
 * Browser print fallback for when WebUSB is unavailable.
 */
export function printReceiptFallback(order: ReceiptOrder): void {
  const iframe = document.createElement("iframe");
  iframe.style.display = "none";
  document.body.appendChild(iframe);
  const doc = iframe.contentDocument!;

  const lines: string[] = [];
  lines.push("<div class='center bold big'>EASTERN LANDSCAPE<br>& MASON SUPPLY</div>");
  lines.push("<div class='center'>110 Frowein Road<br>Center Moriches, NY 11934<br>(631) 874-6244</div>");
  lines.push("<br>");
  lines.push(`<div>Date: ${fmtDate(order.placedAt)}</div>`);
  lines.push(`<div>Order: #${order.orderNumber ?? order.id.slice(0, 8)}</div>`);
  if (order.staffName) lines.push(`<div>Staff: ${order.staffName}</div>`);
  lines.push("<div class='divider'></div>");

  for (const item of order.items) {
    lines.push(`<div>${item.quantity} ${item.unit} ${item.productName}</div>`);
    lines.push(`<div style='text-align:right'>${fmtUsd(item.lineSubtotalCents)}</div>`);
  }
  lines.push("<div class='divider'></div>");
  lines.push(`<div class='row'><span>Subtotal:</span><span>${fmtUsd(order.materialsSubtotalCents)}</span></div>`);
  if (order.deliveryTotalCents > 0) lines.push(`<div class='row'><span>Delivery:</span><span>${fmtUsd(order.deliveryTotalCents)}</span></div>`);
  lines.push(`<div class='row'><span>Tax:</span><span>${order.taxExempt ? "EXEMPT" : fmtUsd(order.taxCents)}</span></div>`);
  if (order.ccSurchargeCents > 0) lines.push(`<div class='row'><span>CC Fee:</span><span>${fmtUsd(order.ccSurchargeCents)}</span></div>`);
  lines.push(`<div class='row bold big'><span>TOTAL:</span><span>${fmtUsd(order.grandTotalCents)}</span></div>`);
  lines.push("<br>");
  lines.push(`<div>Payment: ${order.paymentMethod.toUpperCase()}</div>`);
  lines.push("<br>");
  lines.push("<div class='center'>Thank you for your business!<br>easternlm.com</div>");

  doc.write(`<html><head><style>
    @page{size:80mm auto;margin:0}
    @media print{body{font-family:'Courier New',monospace;font-size:11px;width:72mm;margin:0;padding:4mm}}
    .center{text-align:center}.bold{font-weight:bold}.big{font-size:14px}
    .divider{border-top:1px dashed #000;margin:4px 0}
    .row{display:flex;justify-content:space-between}
  </style></head><body>${lines.join("\n")}</body></html>`);
  doc.close();
  iframe.contentWindow!.print();
  setTimeout(() => document.body.removeChild(iframe), 3000);
}

// Singleton
let _printer: ThermalPrinter | null = null;
export function getPrinter(): ThermalPrinter {
  if (!_printer) _printer = new ThermalPrinter();
  return _printer;
}
