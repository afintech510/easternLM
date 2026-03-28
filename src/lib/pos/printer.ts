/**
 * Receipt Printer — ESC/POS via WebUSB with HTML fallback.
 * Prints: customer receipt (cut) → delivery ticket (cut) for delivery orders.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
declare global {
  interface Navigator { usb: any; }
}
type USBDevice = any;

export type ReceiptOrder = {
  orderNumber?: string;
  staffName?: string;
  createdAt: string;
  items: Array<{
    productName: string;
    quantity: number;
    unit: string;
    unitPriceCents: number;
    lineTotalCents: number;
    deliveryType?: string;
    materialClass?: string;
  }>;
  subtotalCents: number;
  taxCents: number;
  taxExempt?: boolean;
  taxExemptCertificate?: string;
  deliveryFeeCents: number;
  ccSurchargeCents: number;
  totalCents: number;
  discountAmountCents?: number;
  discountType?: string;
  discountReason?: string;
  paymentMethod: string;
  cashTenderedCents?: number;
  changeDueCents?: number;
  cardLast4?: string;
  cardBrand?: string;
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string;
  deliveryMethod?: string;
  deliveryAddress?: string;
  deliveryDate?: string;
  deliveryTimeWindow?: string;
  deliveryNotes?: string;
  siteContactPhone?: string;
  accessConstraints?: Record<string, boolean>;
  notes?: string;
  deliveryLoads?: Array<{
    loadNumber: number;
    materialName: string;
    yards: number;
    truckType: string;
    feeCents: number;
  }>;
  payments?: Array<{ method: string; amount_cents: number; stripe_id?: string; card_last4?: string; card_brand?: string }>;
  accountName?: string;
  accountBalance?: number;
  hasSpreading?: boolean;
  spreadingYards?: number;
};

const W = 48; // 80mm paper, Font A = 48 chars
const ESC = 0x1b;
const GS = 0x1d;

function fmt(cents: number): string { return "$" + (cents / 100).toFixed(2); }
function line(left: string, right: string): string {
  const sp = W - left.length - right.length;
  return sp < 1 ? left.substring(0, W - right.length - 1) + " " + right : left + " ".repeat(sp) + right;
}
function div(): string { return "-".repeat(W); }
function ddiv(): string { return "=".repeat(W); }
function center(s: string): string {
  const pad = Math.max(0, Math.floor((W - s.length) / 2));
  return " ".repeat(pad) + s;
}

const CONSTRAINT_LABELS: Record<string, string> = {
  low_wires: "LOW WIRES", narrow_driveway: "NARROW DRIVEWAY",
  soft_ground: "SOFT GROUND", gated: "GATED",
  steep: "STEEP APPROACH", backyard: "BACKYARD ACCESS",
  lowWires: "LOW WIRES", narrowDriveway: "NARROW DRIVEWAY",
  softGround: "SOFT GROUND", steepApproach: "STEEP APPROACH",
  backyardAccess: "BACKYARD ACCESS",
};

export class ReceiptPrinter {
  private device: USBDevice | null = null;
  private _connected = false;

  get connected() { return this._connected; }

  async connect(): Promise<boolean> {
    if (!("usb" in navigator)) return false;
    try {
      this.device = await navigator.usb.requestDevice({
        filters: [
          { vendorId: 0x0519 }, { vendorId: 0x04b8 },
          { vendorId: 0x0416 }, { vendorId: 0x0dd4 },
          { vendorId: 0x0483 }, { vendorId: 0x1fc9 },
        ],
      });
      await this.device.open();
      if (this.device.configuration === null) await this.device.selectConfiguration(1);
      await this.device.claimInterface(0);
      this._connected = true;
      return true;
    } catch { this._connected = false; return false; }
  }

  disconnect() { this.device?.close(); this.device = null; this._connected = false; }

  /** Print customer receipt + delivery ticket (if delivery). Auto-cuts between them. */
  async printOrderDocuments(order: ReceiptOrder): Promise<boolean> {
    if (this.device && this._connected) {
      const ok = await this.sendBytes(this.buildReceipt(order));
      if (ok && order.deliveryMethod === "delivery" && order.deliveryAddress) {
        await new Promise((r) => setTimeout(r, 500));
        await this.sendBytes(this.buildDeliveryTicket(order));
      }
      return ok;
    }
    this.printHtml(order);
    return true;
  }

  async printReceipt(order: ReceiptOrder): Promise<boolean> {
    return this.printOrderDocuments(order);
  }

  async openCashDrawer(): Promise<boolean> {
    if (!this.device || !this._connected) return false;
    try { await this.device.transferOut(1, new Uint8Array([ESC, 0x70, 0x00, 0x19, 0xfa])); return true; } catch { return false; }
  }

  private async sendBytes(data: number[]): Promise<boolean> {
    try {
      const bytes = new Uint8Array(data);
      const CHUNK = 64;
      for (let i = 0; i < bytes.length; i += CHUNK) {
        await this.device!.transferOut(1, bytes.slice(i, i + CHUNK));
      }
      return true;
    } catch { return false; }
  }

  // ── ESC/POS helpers ─────────────────────────────────────

  private txt(cmd: number[], s: string) { for (let i = 0; i < s.length; i++) cmd.push(s.charCodeAt(i)); cmd.push(0x0a); }
  private bold(cmd: number[], on: boolean) { cmd.push(ESC, 0x45, on ? 0x01 : 0x00); }
  private dblH(cmd: number[], on: boolean) { cmd.push(GS, 0x21, on ? 0x01 : 0x00); }
  private align(cmd: number[], a: "L" | "C" | "R") { cmd.push(ESC, 0x61, a === "L" ? 0 : a === "C" ? 1 : 2); }
  private cut(cmd: number[]) { cmd.push(GS, 0x56, 0x01); }

  // ── CUSTOMER RECEIPT ────────────────────────────────────

  private buildReceipt(o: ReceiptOrder): number[] {
    const c: number[] = [];
    c.push(ESC, 0x40); // init

    // Header
    this.align(c, "C"); this.bold(c, true);
    this.txt(c, "EASTERN LANDSCAPE");
    this.txt(c, "& MASON SUPPLY");
    this.bold(c, false);
    this.txt(c, "110 Frowein Road");
    this.txt(c, "Center Moriches, NY 11934");
    this.txt(c, "(631) 874-6244");
    this.txt(c, ddiv());

    // Order info
    this.align(c, "L");
    if (o.orderNumber) this.txt(c, `Order: #${o.orderNumber}`);
    const dt = new Date(o.createdAt);
    this.txt(c, `Date:  ${dt.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" })} ${dt.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}`);
    if (o.staffName) this.txt(c, `Staff: ${o.staffName}`);
    this.txt(c, "");
    // Customer name — clean up raw phone / SMS prefix
    const cleanName = (o.customerName ?? "Walk-in")
      .replace(/^SMS:\s*/i, "").replace(/^\+1/, "").trim();
    if (cleanName && cleanName !== "Walk-in") this.txt(c, `Customer: ${cleanName}`);
    if (o.customerPhone) {
      const ph = o.customerPhone.replace(/\D/g, "").slice(-10);
      const fmtPhone = ph.length === 10 ? `(${ph.slice(0,3)}) ${ph.slice(3,6)}-${ph.slice(6)}` : o.customerPhone;
      this.txt(c, `Phone:    ${fmtPhone}`);
    }
    if (o.customerEmail) this.txt(c, `Email:    ${o.customerEmail}`);
    this.txt(c, div());

    // Items — proper unit formatting
    this.bold(c, true); this.txt(c, "ITEMS"); this.bold(c, false);
    this.txt(c, div());
    for (const item of o.items) {
      const isBulk = item.deliveryType === "bulk";
      if (isBulk) {
        this.txt(c, `${item.quantity} cu. yards of ${item.productName.substring(0, W - 18)}`);
        this.txt(c, line(`  @ ${fmt(item.unitPriceCents)} per cu. yard`, fmt(item.lineTotalCents)));
      } else {
        const unitLabel = item.unit === "yard" ? "cu. yards" : item.unit === "each" ? "" : ` ${item.unit}`;
        this.txt(c, `${item.quantity}${unitLabel} ${item.productName.substring(0, W - 10)}`);
        this.txt(c, line(`  @ ${fmt(item.unitPriceCents)} each`, fmt(item.lineTotalCents)));
      }
    }
    this.txt(c, div());

    // Totals
    this.txt(c, line("Subtotal:", fmt(o.subtotalCents)));
    if (o.discountAmountCents && o.discountAmountCents > 0) {
      this.txt(c, line(`Discount${o.discountReason ? ` (${o.discountReason})` : ""}:`, `-${fmt(o.discountAmountCents)}`));
    }
    if (o.deliveryFeeCents > 0) this.txt(c, line("Delivery:", fmt(o.deliveryFeeCents)));
    if (o.taxExempt) {
      this.txt(c, line("Tax:", "EXEMPT"));
      if (o.taxExemptCertificate) this.txt(c, line("Cert:", o.taxExemptCertificate));
    } else {
      this.txt(c, line("Tax (8.75%):", fmt(o.taxCents)));
    }
    if (o.ccSurchargeCents > 0) this.txt(c, line("CC Fee (3%):", fmt(o.ccSurchargeCents)));

    this.txt(c, ddiv());
    this.bold(c, true); this.dblH(c, true);
    this.txt(c, line("TOTAL:", fmt(o.totalCents)));
    this.dblH(c, false); this.bold(c, false);
    this.txt(c, "");

    // Payment
    this.printPaymentSection(c, o);

    // Delivery info (summary on receipt)
    if (o.deliveryMethod === "delivery" && o.deliveryAddress) {
      this.txt(c, div());
      this.bold(c, true); this.txt(c, "DELIVERY"); this.bold(c, false);
      this.txt(c, div());
      const cleanAddr = o.deliveryAddress.replace(/,?\s*(USA|US|United States)\s*$/i, "").replace(/,?\s*NY\s*,?/i, " ");
      this.txt(c, cleanAddr.substring(0, W));
      if (o.deliveryDate) {
        const dd = new Date(o.deliveryDate + (o.deliveryDate.includes("T") ? "" : "T12:00:00"));
        this.txt(c, `Date:    ${dd.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" })}`);
      }
      const twMap: Record<string, string> = { morning: "Morning (7 AM-10 AM)", midday: "Midday (10 AM-1 PM)", afternoon: "Afternoon (1 PM-5 PM)", flexible: "Flexible (7 AM-5 PM)" };
      if (o.deliveryTimeWindow) this.txt(c, `Time:    ${twMap[o.deliveryTimeWindow] ?? o.deliveryTimeWindow}`);
      const ac = this.getActiveConstraints(o);
      if (ac.length > 0) this.txt(c, `Access:  ${ac.join(", ")}`);
      if (o.deliveryNotes) this.txt(c, `Notes:   ${o.deliveryNotes.substring(0, W - 9)}`);
      if (o.deliveryLoads && o.deliveryLoads.length > 0) {
        this.txt(c, "");
        for (const load of o.deliveryLoads) {
          this.txt(c, `Delivery ${load.loadNumber}: ${load.materialName} - ${load.yards} yd`);
          this.txt(c, line("  Fee:", fmt(load.feeCents)));
        }
      }
    }

    // Footer
    this.txt(c, ""); this.txt(c, "");
    this.align(c, "C");
    this.txt(c, "Thank you for your business!");
    this.txt(c, "easternlm.com");
    this.txt(c, ""); this.txt(c, "");
    this.cut(c);
    return c;
  }

  private printPaymentSection(c: number[], o: ReceiptOrder) {
    if (o.paymentMethod === "split" && o.payments?.length) {
      this.bold(c, true); this.txt(c, "Payment: Split"); this.bold(c, false);
      for (const p of o.payments) {
        const label = p.method === "card_terminal" ? `Card${p.card_brand ? ` ${p.card_brand}` : ""}${p.card_last4 ? ` ****${p.card_last4}` : ""}` :
          p.method === "cash" ? "Cash" : p.method === "cod" ? "COD" : p.method === "account" ? "Account" : p.method;
        this.txt(c, line(`  ${label}:`, fmt(p.amount_cents)));
      }
    } else if (o.paymentMethod === "card_terminal" || o.paymentMethod === "card_online") {
      this.txt(c, "Payment: Card");
      if (o.cardBrand || o.cardLast4) this.txt(c, `Card:    ${o.cardBrand ?? ""} ****${o.cardLast4 ?? ""}`);
    } else if (o.paymentMethod === "cash") {
      this.txt(c, "Payment: Cash");
      if (o.cashTenderedCents) this.txt(c, line("Tendered:", fmt(o.cashTenderedCents)));
      if (o.changeDueCents != null) this.txt(c, line("Change:", fmt(o.changeDueCents)));
    } else if (o.paymentMethod === "cod") {
      this.txt(c, ddiv());
      this.bold(c, true); this.dblH(c, true);
      this.align(c, "C");
      this.txt(c, "CASH ON DELIVERY");
      this.txt(c, `COLLECT: ${fmt(o.totalCents)}`);
      this.align(c, "L");
      this.dblH(c, false); this.bold(c, false);
      this.txt(c, ddiv());
    } else if (o.paymentMethod === "account") {
      this.txt(c, "Payment: Charge Account");
      if (o.accountName) this.txt(c, `Account: ${o.accountName}`);
      this.txt(c, line("Charged:", fmt(o.totalCents)));
      if (o.accountBalance != null) this.txt(c, line("Balance:", fmt(o.accountBalance)));
    } else {
      this.txt(c, `Payment: ${o.paymentMethod}`);
    }
  }

  // ── DELIVERY TICKET ─────────────────────────────────────

  private buildDeliveryTicket(o: ReceiptOrder): number[] {
    const c: number[] = [];
    c.push(ESC, 0x40);

    this.align(c, "C"); this.bold(c, true); this.dblH(c, true);
    this.txt(c, "DELIVERY TICKET");
    this.dblH(c, false); this.bold(c, false);
    this.txt(c, "EASTERN LANDSCAPE & MASON SUPPLY");
    this.txt(c, ddiv());

    this.align(c, "L");
    if (o.orderNumber) this.txt(c, `Order: #${o.orderNumber}`);
    this.txt(c, `Date:  ${new Date(o.createdAt).toLocaleDateString()}`);
    this.txt(c, "");

    // Customer
    this.bold(c, true); this.txt(c, "CUSTOMER:"); this.bold(c, false);
    if (o.customerName) this.txt(c, `  ${o.customerName}`);
    if (o.customerPhone) this.txt(c, `  Phone: ${o.customerPhone}`);
    if (o.siteContactPhone && o.siteContactPhone !== o.customerPhone) {
      this.txt(c, `  Site:  ${o.siteContactPhone}`);
    }
    this.txt(c, ddiv());

    // Delivery address
    this.bold(c, true); this.txt(c, "DELIVER TO:"); this.bold(c, false);
    if (o.deliveryAddress) {
      const addr = o.deliveryAddress;
      for (let i = 0; i < addr.length; i += W - 2) this.txt(c, `  ${addr.substring(i, i + W - 2)}`);
    }
    this.txt(c, "");
    if (o.deliveryDate) this.txt(c, `DATE:   ${o.deliveryDate}`);
    if (o.deliveryTimeWindow) this.txt(c, `WINDOW: ${o.deliveryTimeWindow}`);
    this.txt(c, ddiv());

    // Access warnings
    const ac = this.getActiveConstraints(o);
    if (ac.length > 0) {
      this.bold(c, true); this.txt(c, "!! ACCESS WARNINGS !!"); this.bold(c, false);
      for (const a of ac) this.txt(c, `  * ${a}`);
      this.txt(c, "");
    }

    // Notes
    if (o.deliveryNotes) {
      this.bold(c, true); this.txt(c, "NOTES:"); this.bold(c, false);
      const n = o.deliveryNotes;
      for (let i = 0; i < n.length; i += W - 2) this.txt(c, `  ${n.substring(i, i + W - 2)}`);
      this.txt(c, "");
    }

    this.txt(c, ddiv());
    this.bold(c, true); this.txt(c, "MATERIAL TO LOAD:"); this.bold(c, false);
    this.txt(c, ddiv());

    // Delivery loads
    if (o.deliveryLoads && o.deliveryLoads.length > 0) {
      for (const load of o.deliveryLoads) {
        this.txt(c, "");
        this.bold(c, true);
        this.txt(c, `DELIVERY ${load.loadNumber}${o.deliveryLoads.length > 1 ? ` of ${o.deliveryLoads.length}` : ""}:`);
        this.bold(c, false);
        this.txt(c, `  Product:  ${load.materialName}`);
        this.txt(c, `  Quantity: ${load.yards} cubic yards`);
        this.txt(c, `  Truck:    ${load.truckType}`);
        this.txt(c, `  Fee:      ${fmt(load.feeCents)}`);
        this.txt(c, "");
        this.txt(c, "  [ ] LOADED    [ ] DELIVERED");
      }
    } else {
      // Fallback: list bulk items
      const bulk = o.items.filter((i) => i.deliveryType === "bulk");
      for (const item of bulk) {
        this.txt(c, `  ${item.quantity} ${item.unit} ${item.productName}`);
      }
      this.txt(c, "");
      this.txt(c, "  [ ] LOADED    [ ] DELIVERED");
    }

    // Non-bulk items
    const nonBulk = o.items.filter((i) => i.deliveryType !== "bulk");
    if (nonBulk.length > 0) {
      this.txt(c, ""); this.txt(c, ddiv());
      this.txt(c, "ADDITIONAL ITEMS (ride with delivery):");
      for (const item of nonBulk) {
        this.txt(c, `  ${item.quantity}x ${item.productName}`);
      }
      this.txt(c, "");
      this.txt(c, "  [ ] LOADED    [ ] DELIVERED");
    }

    this.txt(c, ddiv());

    // Payment status for driver
    if (o.paymentMethod === "cod") {
      this.bold(c, true); this.dblH(c, true);
      this.align(c, "C");
      this.txt(c, ddiv());
      this.txt(c, "CASH ON DELIVERY");
      this.txt(c, `COLLECT: ${fmt(o.totalCents)}`);
      this.txt(c, ddiv());
      this.align(c, "L");
      this.dblH(c, false); this.bold(c, false);
      this.txt(c, "  [ ] CASH  [ ] CHECK  Amount: ________");
    } else {
      this.txt(c, `PAYMENT: ${o.paymentMethod === "cash" ? "PAID (Cash)" : o.paymentMethod === "card_terminal" ? "PAID (Card)" : o.paymentMethod === "account" ? `CHARGE ACCOUNT: ${o.accountName ?? ""}` : "PAID"}`);
      this.txt(c, line("TOTAL:", fmt(o.totalCents)));
    }

    // Spreading
    if (o.hasSpreading) {
      this.txt(c, ""); this.txt(c, ddiv());
      this.bold(c, true); this.txt(c, "SPREADING SERVICE: YES"); this.bold(c, false);
      if (o.spreadingYards) this.txt(c, `  Quantity: ${o.spreadingYards} cubic yards`);
      this.txt(c, "  [ ] SPREAD COMPLETE");
    }

    this.txt(c, ""); this.txt(c, ddiv());
    this.txt(c, "Driver signature: ___________________");
    this.txt(c, "Date completed:   ___________________");
    this.txt(c, ""); this.txt(c, "");
    this.align(c, "C");
    this.txt(c, "Eastern Landscape & Mason Supply");
    this.txt(c, "(631) 874-6244");
    this.txt(c, ""); this.txt(c, "");
    this.cut(c);
    return c;
  }

  private getActiveConstraints(o: ReceiptOrder): string[] {
    if (!o.accessConstraints) return [];
    return Object.entries(o.accessConstraints)
      .filter(([, v]) => v)
      .map(([k]) => CONSTRAINT_LABELS[k] || k.toUpperCase());
  }

  // ── HTML FALLBACK ───────────────────────────────────────

  private printHtml(o: ReceiptOrder) {
    const html = this.buildReceiptHtml(o) +
      (o.deliveryMethod === "delivery" && o.deliveryAddress
        ? '<div style="page-break-before:always"></div>' + this.buildDeliveryTicketHtml(o)
        : "");

    const iframe = document.createElement("iframe");
    iframe.style.display = "none";
    document.body.appendChild(iframe);
    const doc = iframe.contentDocument!;
    doc.write(`<!DOCTYPE html><html><head><style>
      @page { size: 80mm auto; margin: 4mm; }
      body { font-family: 'Courier New', monospace; font-size: 11px; width: 72mm; margin: 0 auto; }
      .c { text-align: center; } .b { font-weight: bold; }
      .big { font-size: 14px; font-weight: bold; }
      .hr { border-top: 1px dashed #000; margin: 4px 0; }
      .hr2 { border-top: 2px solid #000; margin: 6px 0; }
      .row { display: flex; justify-content: space-between; }
      .warn { border: 2px solid #000; padding: 6px; text-align: center; font-weight: bold; font-size: 13px; margin: 6px 0; }
      table { width: 100%; border-collapse: collapse; }
      td { padding: 1px 0; vertical-align: top; }
    </style></head><body>${html}</body></html>`);
    doc.close();
    iframe.contentWindow!.print();
    setTimeout(() => document.body.removeChild(iframe), 3000);
  }

  private buildReceiptHtml(o: ReceiptOrder): string {
    const f = fmt;
    const cleanName = (o.customerName ?? "Walk-in").replace(/^SMS:\s*/i, "").replace(/^\+1/, "").trim();
    const items = o.items.map((i) => {
      const isBulk = i.deliveryType === "bulk";
      const desc = isBulk ? `${i.quantity} cu. yards of ${i.productName}` : `${i.quantity} ${i.productName}`;
      const rate = isBulk ? `@ ${f(i.unitPriceCents)} per cu. yard` : `@ ${f(i.unitPriceCents)} each`;
      return `<div class="row"><span>${desc}</span><span>${f(i.lineTotalCents)}</span></div>
              <div style="color:#666;margin-left:12px;">${rate}</div>`;
    }).join("");

    let payment = "";
    if (o.paymentMethod === "cash") {
      payment = `<div>Payment: Cash</div>${o.cashTenderedCents ? `<div class="row"><span>Tendered:</span><span>${f(o.cashTenderedCents)}</span></div><div class="row"><span>Change:</span><span>${f(o.changeDueCents ?? 0)}</span></div>` : ""}`;
    } else if (o.paymentMethod === "cod") {
      payment = `<div style="text-align:center;font-weight:bold;font-size:22px;border:3px solid #000;padding:10px;margin:8px 0;background:#000;color:#fff;letter-spacing:2px;">CASH ON DELIVERY<br><span style="font-size:18px;">COLLECT: ${f(o.totalCents)}</span></div>`;
    } else if (o.paymentMethod === "card_terminal" || o.paymentMethod === "card_online") {
      payment = `<div>Payment: Card${o.cardBrand ? ` ${o.cardBrand}` : ""} ${o.cardLast4 ? `****${o.cardLast4}` : ""}</div>`;
    } else if (o.paymentMethod === "account") {
      payment = `<div>Payment: Charge Account</div>${o.accountName ? `<div>Account: ${o.accountName}</div>` : ""}`;
    } else if (o.paymentMethod === "split" && o.payments) {
      payment = `<div>Payment: Split</div>` + o.payments.map((p) => `<div class="row"><span>  ${p.method}:</span><span>${f(p.amount_cents)}</span></div>`).join("");
    } else {
      payment = `<div>Payment: ${o.paymentMethod}</div>`;
    }

    return `
      <div class="c b">EASTERN LANDSCAPE<br>& MASON SUPPLY</div>
      <div class="c">110 Frowein Road<br>Center Moriches, NY 11934<br>(631) 874-6244</div>
      <div class="hr2"></div>
      ${o.orderNumber ? `<div>Order: #${o.orderNumber}</div>` : ""}
      <div>Date: ${new Date(o.createdAt).toLocaleString()}</div>
      ${o.staffName ? `<div>Staff: ${o.staffName}</div>` : ""}
      ${cleanName && cleanName !== "Walk-in" ? `<div>Customer: ${cleanName}</div>` : ""}
      ${o.customerPhone ? `<div>Phone: ${o.customerPhone}</div>` : ""}
      <div class="hr"></div>
      ${items}
      <div class="hr"></div>
      <div class="row"><span>Subtotal:</span><span>${f(o.subtotalCents)}</span></div>
      ${o.discountAmountCents ? `<div class="row"><span>Discount:</span><span>-${f(o.discountAmountCents)}</span></div>` : ""}
      ${o.deliveryFeeCents > 0 ? `<div class="row"><span>Delivery:</span><span>${f(o.deliveryFeeCents)}</span></div>` : ""}
      <div class="row"><span>Tax (8.75%):</span><span>${o.taxExempt ? "EXEMPT" : f(o.taxCents)}</span></div>
      ${o.ccSurchargeCents > 0 ? `<div class="row"><span>CC Fee (3%):</span><span>${f(o.ccSurchargeCents)}</span></div>` : ""}
      <div class="hr2"></div>
      <div class="row big"><span>TOTAL:</span><span>${f(o.totalCents)}</span></div>
      <br>${payment}
      ${o.deliveryMethod === "delivery" && o.deliveryAddress ? `<div class="hr"></div><div class="b">DELIVERY</div><div>Address: ${o.deliveryAddress}</div>${o.deliveryDate ? `<div>Date: ${o.deliveryDate}</div>` : ""}` : ""}
      <br><div class="c">Thank you for your business!<br>easternlm.com</div>`;
  }

  private buildDeliveryTicketHtml(o: ReceiptOrder): string {
    const f = fmt;
    const ac = this.getActiveConstraints(o);
    const loads = o.deliveryLoads ?? o.items.filter((i) => i.deliveryType === "bulk").map((i, idx) => ({
      loadNumber: idx + 1, materialName: i.productName, yards: i.quantity, truckType: "Dump", feeCents: 0,
    }));

    return `
      <div class="c big">DELIVERY TICKET</div>
      <div class="c">EASTERN LANDSCAPE & MASON SUPPLY</div>
      <div class="hr2"></div>
      ${o.orderNumber ? `<div>Order: #${o.orderNumber}</div>` : ""}
      <div>Date: ${new Date(o.createdAt).toLocaleDateString()}</div>
      <br>
      <div class="b">CUSTOMER:</div>
      ${o.customerName ? `<div>${o.customerName}</div>` : ""}
      ${o.customerPhone ? `<div>Phone: ${o.customerPhone}</div>` : ""}
      <div class="hr2"></div>
      <div class="b">DELIVER TO:</div>
      <div>${o.deliveryAddress}</div>
      ${o.deliveryDate ? `<div>DATE: ${o.deliveryDate}</div>` : ""}
      ${o.deliveryTimeWindow ? `<div>WINDOW: ${o.deliveryTimeWindow}</div>` : ""}
      <div class="hr2"></div>
      ${ac.length > 0 ? `<div class="b">ACCESS WARNINGS:</div>${ac.map((a) => `<div>* ${a}</div>`).join("")}<br>` : ""}
      ${o.deliveryNotes ? `<div class="b">NOTES:</div><div>${o.deliveryNotes}</div><br>` : ""}
      <div class="hr2"></div>
      <div class="b">MATERIAL TO LOAD:</div>
      ${loads.map((l) => `
        <div class="hr"></div>
        <div class="b">DELIVERY ${l.loadNumber}${loads.length > 1 ? ` of ${loads.length}` : ""}:</div>
        <div>Product: ${l.materialName}</div>
        <div>Quantity: ${l.yards} cubic yards</div>
        <div>Truck: ${l.truckType}</div>
        ${l.feeCents > 0 ? `<div>Fee: ${f(l.feeCents)}</div>` : ""}
        <div>[ ] LOADED &nbsp;&nbsp; [ ] DELIVERED</div>
      `).join("")}
      <div class="hr2"></div>
      ${o.paymentMethod === "cod" ? `<div style="text-align:center;font-weight:bold;font-size:22px;border:3px solid #000;padding:10px;margin:8px 0;background:#000;color:#fff;letter-spacing:2px;">CASH ON DELIVERY<br><span style="font-size:18px;">COLLECT: ${f(o.totalCents)}</span></div>` : `<div>PAYMENT: PAID — ${f(o.totalCents)}</div>`}
      <br>
      <div>Driver signature: ___________________</div>
      <div>Date completed: ___________________</div>
      <br>
      <div class="c">Eastern Landscape & Mason Supply<br>(631) 874-6244</div>`;
  }
}
