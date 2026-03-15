/**
 * Receipt Printer — ESC/POS via WebUSB with HTML fallback.
 * Also handles cash drawer kick via the printer's DK port.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
// WebUSB types (not in standard lib)
declare global {
  interface Navigator { usb: any; }
}
type USBDevice = any;

type ReceiptOrder = {
  orderNumber?: string;
  staffName?: string;
  createdAt: string;
  items: Array<{
    productName: string;
    quantity: number;
    unit: string;
    unitPriceCents: number;
    lineTotalCents: number;
  }>;
  subtotalCents: number;
  taxCents: number;
  deliveryFeeCents: number;
  ccSurchargeCents: number;
  totalCents: number;
  paymentMethod: string;
  cashTenderedCents?: number;
  changeDueCents?: number;
  customerName?: string;
  deliveryAddress?: string;
  notes?: string;
};

function formatMoney(cents: number): string {
  return "$" + (cents / 100).toFixed(2);
}

function padRight(str: string, len: number): string {
  return str.substring(0, len).padEnd(len);
}

function padLeft(str: string, len: number): string {
  return str.substring(0, len).padStart(len);
}

const ESC = 0x1b;
const GS = 0x1d;

export class ReceiptPrinter {
  private device: USBDevice | null = null;
  private _connected = false;

  get connected() {
    return this._connected;
  }

  /** Connect to a receipt printer via WebUSB */
  async connect(): Promise<boolean> {
    if (!("usb" in navigator)) return false;

    try {
      this.device = await navigator.usb.requestDevice({
        filters: [
          { vendorId: 0x0519 }, // Star Micronics
          { vendorId: 0x04b8 }, // Epson
          { vendorId: 0x0416 }, // Winbond (some Star models)
          { vendorId: 0x0dd4 }, // Custom Engineering
        ],
      });
      await this.device.open();
      if (this.device.configuration === null) {
        await this.device.selectConfiguration(1);
      }
      await this.device.claimInterface(0);
      this._connected = true;
      return true;
    } catch {
      this._connected = false;
      return false;
    }
  }

  disconnect() {
    this.device?.close();
    this.device = null;
    this._connected = false;
  }

  /** Print a receipt via ESC/POS */
  async printReceipt(order: ReceiptOrder): Promise<boolean> {
    if (this.device && this._connected) {
      return this.printEscPos(order);
    }
    // Fallback: HTML print
    this.printHtml(order);
    return true;
  }

  /** Open the cash drawer via ESC/POS DK command */
  async openCashDrawer(): Promise<boolean> {
    if (!this.device || !this._connected) return false;
    try {
      const cmd = new Uint8Array([ESC, 0x70, 0x00, 0x19, 0xfa]);
      await this.device.transferOut(1, cmd);
      return true;
    } catch {
      return false;
    }
  }

  // ── ESC/POS receipt ──────────────────────────────────────────

  private async printEscPos(order: ReceiptOrder): Promise<boolean> {
    try {
      const data = this.buildEscPosReceipt(order);
      await this.device!.transferOut(1, new Uint8Array(data));
      return true;
    } catch {
      // Fallback to HTML
      this.printHtml(order);
      return true;
    }
  }

  private buildEscPosReceipt(order: ReceiptOrder): number[] {
    const cmd: number[] = [];
    const W = 32; // receipt width in chars (80mm paper)

    // Initialize
    cmd.push(ESC, 0x40);

    // Center
    cmd.push(ESC, 0x61, 0x01);
    // Bold
    cmd.push(ESC, 0x45, 0x01);
    this.text(cmd, "EASTERN LANDSCAPE");
    this.text(cmd, "& MASON SUPPLY");
    cmd.push(ESC, 0x45, 0x00);
    this.text(cmd, "110 Frowein Road");
    this.text(cmd, "Center Moriches, NY 11934");
    this.text(cmd, "(631) 874-6244");
    this.text(cmd, "");

    // Left align
    cmd.push(ESC, 0x61, 0x00);

    const date = new Date(order.createdAt).toLocaleString("en-US", { dateStyle: "short", timeStyle: "short" });
    this.text(cmd, `Date: ${date}`);
    if (order.orderNumber) this.text(cmd, `Order: #${order.orderNumber}`);
    if (order.staffName) this.text(cmd, `Staff: ${order.staffName}`);
    if (order.customerName && order.customerName !== "Walk-in") this.text(cmd, `Customer: ${order.customerName}`);
    this.text(cmd, "-".repeat(W));

    // Items
    for (const item of order.items) {
      const qty = `${item.quantity} ${item.unit}`;
      const name = item.productName.substring(0, W - 12);
      const price = formatMoney(item.lineTotalCents);
      this.text(cmd, `${padRight(qty + " " + name, W - price.length)}${price}`);
    }

    this.text(cmd, "-".repeat(W));

    // Totals
    this.line(cmd, "Subtotal:", formatMoney(order.subtotalCents), W);
    if (order.deliveryFeeCents > 0) this.line(cmd, "Delivery:", formatMoney(order.deliveryFeeCents), W);
    this.line(cmd, "Tax (8.75%):", formatMoney(order.taxCents), W);
    if (order.ccSurchargeCents > 0) this.line(cmd, "CC Fee (3%):", formatMoney(order.ccSurchargeCents), W);

    cmd.push(ESC, 0x45, 0x01); // Bold
    this.line(cmd, "TOTAL:", formatMoney(order.totalCents), W);
    cmd.push(ESC, 0x45, 0x00);

    this.text(cmd, "");
    const methodLabel = order.paymentMethod === "card_terminal" ? "Card" : order.paymentMethod === "cash" ? "Cash" : order.paymentMethod;
    this.text(cmd, `Payment: ${methodLabel}`);
    if (order.paymentMethod === "cash" && order.cashTenderedCents) {
      this.text(cmd, `Tendered: ${formatMoney(order.cashTenderedCents)}`);
      this.text(cmd, `Change:   ${formatMoney(order.changeDueCents || 0)}`);
    }

    if (order.deliveryAddress) {
      this.text(cmd, "");
      this.text(cmd, `Deliver to: ${order.deliveryAddress}`);
    }
    if (order.notes) {
      this.text(cmd, `Notes: ${order.notes}`);
    }

    this.text(cmd, "");
    cmd.push(ESC, 0x61, 0x01); // Center
    this.text(cmd, "Thank you!");
    this.text(cmd, "easternlm.com");
    this.text(cmd, "");
    this.text(cmd, "");

    // Cut paper
    cmd.push(GS, 0x56, 0x00);

    return cmd;
  }

  private text(cmd: number[], str: string) {
    for (let i = 0; i < str.length; i++) {
      cmd.push(str.charCodeAt(i));
    }
    cmd.push(0x0a); // newline
  }

  private line(cmd: number[], label: string, value: string, width: number) {
    this.text(cmd, padRight(label, width - value.length) + value);
  }

  // ── HTML fallback receipt ────────────────────────────────────

  private printHtml(order: ReceiptOrder) {
    const items = order.items
      .map((i) => `<tr><td>${i.quantity} ${i.unit} ${i.productName}</td><td style="text-align:right">${formatMoney(i.lineTotalCents)}</td></tr>`)
      .join("");

    const html = `<!DOCTYPE html><html><head><style>
      @page { size: 80mm auto; margin: 4mm; }
      body { font-family: monospace; font-size: 12px; width: 72mm; margin: 0 auto; }
      h1 { font-size: 14px; text-align: center; margin: 0; }
      .center { text-align: center; }
      .line { border-top: 1px dashed #000; margin: 4px 0; }
      table { width: 100%; border-collapse: collapse; }
      td { padding: 1px 0; vertical-align: top; }
      .total { font-weight: bold; font-size: 14px; }
    </style></head><body>
      <h1>EASTERN LANDSCAPE<br>& MASON SUPPLY</h1>
      <div class="center">110 Frowein Road<br>Center Moriches, NY 11934<br>(631) 874-6244</div>
      <br>
      <div>Date: ${new Date(order.createdAt).toLocaleString()}</div>
      ${order.orderNumber ? `<div>Order: #${order.orderNumber}</div>` : ""}
      ${order.customerName && order.customerName !== "Walk-in" ? `<div>Customer: ${order.customerName}</div>` : ""}
      <div class="line"></div>
      <table>${items}</table>
      <div class="line"></div>
      <table>
        <tr><td>Subtotal:</td><td style="text-align:right">${formatMoney(order.subtotalCents)}</td></tr>
        ${order.deliveryFeeCents > 0 ? `<tr><td>Delivery:</td><td style="text-align:right">${formatMoney(order.deliveryFeeCents)}</td></tr>` : ""}
        <tr><td>Tax (8.75%):</td><td style="text-align:right">${formatMoney(order.taxCents)}</td></tr>
        ${order.ccSurchargeCents > 0 ? `<tr><td>CC Fee (3%):</td><td style="text-align:right">${formatMoney(order.ccSurchargeCents)}</td></tr>` : ""}
        <tr class="total"><td>TOTAL:</td><td style="text-align:right">${formatMoney(order.totalCents)}</td></tr>
      </table>
      <br>
      <div>Payment: ${order.paymentMethod === "card_terminal" ? "Card" : order.paymentMethod}</div>
      ${order.paymentMethod === "cash" && order.cashTenderedCents ? `<div>Tendered: ${formatMoney(order.cashTenderedCents)}<br>Change: ${formatMoney(order.changeDueCents || 0)}</div>` : ""}
      ${order.deliveryAddress ? `<br><div>Deliver to: ${order.deliveryAddress}</div>` : ""}
      ${order.notes ? `<div>Notes: ${order.notes}</div>` : ""}
      <br>
      <div class="center">Thank you!<br>easternlm.com</div>
    </body></html>`;

    const win = window.open("", "_blank", "width=300,height=600");
    if (win) {
      win.document.write(html);
      win.document.close();
      win.print();
      setTimeout(() => win.close(), 2000);
    }
  }
}
