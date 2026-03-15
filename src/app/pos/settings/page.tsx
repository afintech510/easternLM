"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Printer, CreditCard, Wifi, WifiOff } from "lucide-react";
import { PosTerminal, type StripeReader } from "@/lib/pos/terminal";
import { ReceiptPrinter } from "@/lib/pos/printer";

export default function PosSettingsPage() {
  const [readers, setReaders] = useState<StripeReader[]>([]);
  const [selectedReader, setSelectedReader] = useState<string>("simulated");
  const [printerConnected, setPrinterConnected] = useState(false);
  const [autoPrint, setAutoPrint] = useState(true);
  const [autoDrawer, setAutoDrawer] = useState(true);
  const [testPrinting, setTestPrinting] = useState(false);

  const terminalRef = useRef(new PosTerminal());
  const printerRef = useRef(new ReceiptPrinter());

  useEffect(() => {
    // Load readers
    terminalRef.current.getReaders().then(setReaders);
  }, []);

  async function connectPrinter() {
    const ok = await printerRef.current.connect();
    setPrinterConnected(ok);
  }

  async function testPrint() {
    setTestPrinting(true);
    await printerRef.current.printReceipt({
      createdAt: new Date().toISOString(),
      orderNumber: "TEST-001",
      staffName: "Test",
      items: [
        { productName: "5yd Black Mulch", quantity: 5, unit: "yd", unitPriceCents: 3000, lineTotalCents: 15000 },
        { productName: "Portland Cement", quantity: 2, unit: "bag", unitPriceCents: 1800, lineTotalCents: 3600 },
      ],
      subtotalCents: 18600,
      taxCents: 1628,
      deliveryFeeCents: 6500,
      ccSurchargeCents: 0,
      totalCents: 26728,
      paymentMethod: "cash",
      cashTenderedCents: 28000,
      changeDueCents: 1272,
      customerName: "Test Customer",
    });
    setTestPrinting(false);
  }

  async function testDrawer() {
    await printerRef.current.openCashDrawer();
  }

  return (
    <div className="mx-auto max-w-lg p-6 space-y-8">
      <div className="flex items-center gap-3">
        <a href="/pos" className="text-zinc-400 hover:text-zinc-200"><ArrowLeft className="h-5 w-5" /></a>
        <h1 className="text-xl font-bold">POS Settings</h1>
      </div>

      {/* Card Reader */}
      <section className="rounded-xl border border-zinc-800 bg-zinc-900 p-5 space-y-4">
        <h2 className="flex items-center gap-2 font-semibold"><CreditCard className="h-5 w-5" /> Card Reader</h2>
        <div className="space-y-2">
          <label className="flex items-center gap-3 rounded-lg border border-zinc-700 p-3 cursor-pointer hover:bg-zinc-800">
            <input type="radio" name="reader" value="simulated" checked={selectedReader === "simulated"} onChange={() => setSelectedReader("simulated")} />
            <div>
              <p className="text-sm font-medium">Simulated Reader</p>
              <p className="text-xs text-zinc-500">For testing — auto-approves all payments</p>
            </div>
          </label>
          {readers.map((r) => (
            <label key={r.id} className="flex items-center gap-3 rounded-lg border border-zinc-700 p-3 cursor-pointer hover:bg-zinc-800">
              <input type="radio" name="reader" value={r.id} checked={selectedReader === r.id} onChange={() => setSelectedReader(r.id)} />
              <div className="flex-1">
                <p className="text-sm font-medium">{r.label || r.device_type}</p>
                <p className="text-xs text-zinc-500">{r.serial_number} · {r.ip_address}</p>
              </div>
              {r.status === "online" ? <Wifi className="h-4 w-4 text-green-500" /> : <WifiOff className="h-4 w-4 text-red-500" />}
            </label>
          ))}
          {readers.length === 0 && (
            <p className="text-xs text-zinc-500">No physical readers registered. Use Stripe Dashboard to add one.</p>
          )}
        </div>
      </section>

      {/* Receipt Printer */}
      <section className="rounded-xl border border-zinc-800 bg-zinc-900 p-5 space-y-4">
        <h2 className="flex items-center gap-2 font-semibold"><Printer className="h-5 w-5" /> Receipt Printer</h2>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm">{printerConnected ? "Printer connected (USB)" : "No printer connected"}</p>
            <p className="text-xs text-zinc-500">Uses WebUSB — Chrome required for USB printing</p>
          </div>
          <button
            onClick={connectPrinter}
            className="rounded-lg bg-zinc-800 px-4 py-2 text-sm hover:bg-zinc-700"
          >
            {printerConnected ? "Reconnect" : "Connect Printer"}
          </button>
        </div>

        <div className="flex gap-2">
          <button onClick={testPrint} disabled={testPrinting} className="rounded-lg bg-zinc-800 px-4 py-2 text-sm hover:bg-zinc-700 disabled:opacity-50">
            {testPrinting ? "Printing..." : "Test Print"}
          </button>
          <button onClick={testDrawer} className="rounded-lg bg-zinc-800 px-4 py-2 text-sm hover:bg-zinc-700">
            Open Drawer
          </button>
        </div>

        <div className="space-y-3 border-t border-zinc-800 pt-3">
          <label className="flex items-center justify-between cursor-pointer">
            <span className="text-sm">Auto-print receipt after sale</span>
            <input type="checkbox" checked={autoPrint} onChange={(e) => setAutoPrint(e.target.checked)} className="h-5 w-5 rounded" />
          </label>
          <label className="flex items-center justify-between cursor-pointer">
            <span className="text-sm">Auto-open drawer on cash sale</span>
            <input type="checkbox" checked={autoDrawer} onChange={(e) => setAutoDrawer(e.target.checked)} className="h-5 w-5 rounded" />
          </label>
        </div>
      </section>

      <div className="text-center">
        <a href="/pos" className="rounded-lg bg-amber-600 px-6 py-3 font-semibold text-white hover:bg-amber-500 inline-block">
          Back to Register
        </a>
      </div>
    </div>
  );
}
