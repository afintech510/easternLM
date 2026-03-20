"use client";

import { useEffect, useState } from "react";
import { ArrowLeft, Check, Printer, DollarSign, CreditCard, Banknote, Truck, Building2, ShoppingCart, Globe } from "lucide-react";
import { formatUsd } from "@/lib/format";

type DayStats = {
  date: string;
  totalSalesCents: number;
  totalTransactions: number;
  cardTotalCents: number;
  cardCount: number;
  cashTotalCents: number;
  cashCount: number;
  codTotalCents: number;
  codCount: number;
  accountTotalCents: number;
  accountCount: number;
  webTotalCents: number;
  webCount: number;
  deliveryCount: number;
  pickupCount: number;
  refundCount: number;
  refundTotalCents: number;
  splitCount: number;
  avgOrderCents: number;
  topProducts: Array<{ name: string; qty: number; totalCents: number }>;
};

export default function PosCloseDayPage() {
  const [stats, setStats] = useState<DayStats | null>(null);
  const [countedCash, setCountedCash] = useState("");
  const [notes, setNotes] = useState("");
  const [closing, setClosing] = useState(false);
  const [closed, setClosed] = useState(false);

  useEffect(() => {
    fetch("/api/pos/close-day").then((r) => r.json()).then(setStats);
  }, []);

  async function closeDay() {
    if (!stats) return;
    setClosing(true);
    await fetch("/api/pos/close-day", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...stats,
        expectedCashCents: stats.cashTotalCents,
        countedCash,
        notes,
      }),
    });
    setClosed(true);
    setClosing(false);
  }

  function printReport() {
    window.print();
  }

  const countedCents = countedCash ? Math.round(parseFloat(countedCash) * 100) : 0;
  const variance = stats ? countedCents - stats.cashTotalCents : 0;

  if (!stats) return <div className="flex h-full items-center justify-center text-zinc-500">Loading...</div>;

  return (
    <>
      <style>{`@media print { .no-print { display: none !important; } body { background: white; color: black; } }`}</style>
      <div className="flex h-full items-center justify-center p-4">
        <div className="w-full max-w-lg rounded-2xl border border-zinc-800 bg-zinc-900 p-6 space-y-5 print:border-black print:bg-white print:text-black">
          <div className="flex items-center gap-3 no-print">
            <a href="/yard/register" className="text-zinc-400 hover:text-zinc-200"><ArrowLeft className="h-5 w-5" /></a>
            <h1 className="text-xl font-bold">End of Day Report</h1>
            <span className="ml-auto text-sm text-zinc-400">{stats.date}</span>
          </div>
          <div className="hidden print:block text-center">
            <h1 className="text-xl font-bold">EASTERN LANDSCAPE & MASON SUPPLY</h1>
            <p className="text-sm">End of Day Report — {stats.date}</p>
          </div>

          {closed ? (
            <div className="py-8 text-center">
              <Check className="mx-auto h-12 w-12 text-green-500" />
              <p className="mt-3 text-lg font-bold">Day Closed</p>
              <p className="text-sm text-zinc-400">Report saved. See you tomorrow!</p>
              <a href="/yard/register" className="mt-4 inline-block rounded-lg bg-amber-600 px-6 py-2 font-semibold text-white hover:bg-amber-500">Back to Register</a>
            </div>
          ) : (
            <>
              {/* Revenue summary */}
              <div className="rounded-lg border border-amber-600/30 bg-amber-900/10 p-4 text-center">
                <p className="text-xs text-zinc-400 uppercase tracking-wider">Total Revenue</p>
                <p className="text-3xl font-bold text-amber-400">{formatUsd(stats.totalSalesCents)}</p>
                <p className="text-sm text-zinc-400">{stats.totalTransactions} transactions · Avg {formatUsd(stats.avgOrderCents || 0)}</p>
              </div>

              {/* Payment breakdown */}
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Payment Breakdown</p>
                <div className="grid grid-cols-2 gap-2">
                  <div className="rounded-lg border border-zinc-800 bg-zinc-800/50 p-3 flex items-center gap-3">
                    <CreditCard className="size-5 text-blue-400 shrink-0" />
                    <div>
                      <p className="text-sm font-bold">{formatUsd(stats.cardTotalCents)}</p>
                      <p className="text-[10px] text-zinc-500">{stats.cardCount} card payments</p>
                    </div>
                  </div>
                  <div className="rounded-lg border border-zinc-800 bg-zinc-800/50 p-3 flex items-center gap-3">
                    <Banknote className="size-5 text-green-400 shrink-0" />
                    <div>
                      <p className="text-sm font-bold">{formatUsd(stats.cashTotalCents)}</p>
                      <p className="text-[10px] text-zinc-500">{stats.cashCount} cash payments</p>
                    </div>
                  </div>
                  <div className="rounded-lg border border-zinc-800 bg-zinc-800/50 p-3 flex items-center gap-3">
                    <Truck className="size-5 text-orange-400 shrink-0" />
                    <div>
                      <p className="text-sm font-bold">{formatUsd(stats.codTotalCents || 0)}</p>
                      <p className="text-[10px] text-zinc-500">{stats.codCount || 0} COD orders</p>
                    </div>
                  </div>
                  <div className="rounded-lg border border-zinc-800 bg-zinc-800/50 p-3 flex items-center gap-3">
                    <Building2 className="size-5 text-indigo-400 shrink-0" />
                    <div>
                      <p className="text-sm font-bold">{formatUsd(stats.accountTotalCents || 0)}</p>
                      <p className="text-[10px] text-zinc-500">{stats.accountCount || 0} account charges</p>
                    </div>
                  </div>
                </div>
                {(stats.webCount ?? 0) > 0 && (
                  <div className="rounded-lg border border-zinc-800 bg-zinc-800/50 p-3 flex items-center gap-3">
                    <Globe className="size-5 text-cyan-400 shrink-0" />
                    <div>
                      <p className="text-sm font-bold">{formatUsd(stats.webTotalCents || 0)}</p>
                      <p className="text-[10px] text-zinc-500">{stats.webCount || 0} web orders</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Order type */}
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="flex justify-between border-b border-zinc-800 pb-1">
                  <span className="text-zinc-400">Deliveries:</span>
                  <span className="font-semibold">{stats.deliveryCount}</span>
                </div>
                <div className="flex justify-between border-b border-zinc-800 pb-1">
                  <span className="text-zinc-400">Pickups:</span>
                  <span className="font-semibold">{stats.pickupCount}</span>
                </div>
                {stats.refundCount > 0 && (
                  <div className="col-span-2 flex justify-between text-red-400 border-b border-zinc-800 pb-1">
                    <span>Refunds:</span>
                    <span>{stats.refundCount} — {formatUsd(stats.refundTotalCents)}</span>
                  </div>
                )}
              </div>

              {/* Top products */}
              {stats.topProducts && stats.topProducts.length > 0 && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-2">Top Products</p>
                  <div className="space-y-1">
                    {stats.topProducts.slice(0, 5).map((p, i) => (
                      <div key={i} className="flex justify-between text-sm">
                        <span className="text-zinc-300 truncate">{p.qty} × {p.name}</span>
                        <span className="text-zinc-400 shrink-0 ml-2">{formatUsd(p.totalCents)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Cash reconciliation */}
              <div className="rounded-lg border border-zinc-700 bg-zinc-800 p-4 space-y-3 no-print">
                <p className="text-sm font-semibold">Cash Reconciliation</p>
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-400">Expected cash in drawer:</span>
                  <span className="font-bold">{formatUsd(stats.cashTotalCents)}</span>
                </div>
                <div>
                  <label className="text-xs text-zinc-500">Count the cash drawer and enter total:</label>
                  <input
                    type="number"
                    value={countedCash}
                    onChange={(e) => setCountedCash(e.target.value)}
                    placeholder="0.00"
                    step="0.01"
                    className="mt-1 w-full rounded-lg border border-zinc-600 bg-zinc-700 px-4 py-3 text-xl font-mono text-center focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
                {countedCash && (
                  <div className={`flex justify-between text-sm font-bold rounded-lg px-3 py-2 ${variance === 0 ? "bg-green-900/30 text-green-400" : variance > 0 ? "bg-blue-900/30 text-blue-400" : "bg-red-900/30 text-red-400"}`}>
                    <span>Variance:</span>
                    <span>{variance >= 0 ? "+" : ""}{formatUsd(variance)} {variance === 0 ? "✓ Perfect" : variance > 0 ? "(over)" : "(short)"}</span>
                  </div>
                )}
              </div>

              {/* Notes */}
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Notes (unusual events, discrepancies, etc.)"
                rows={2}
                className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm focus:outline-none no-print"
              />

              {/* Actions */}
              <div className="flex gap-2 no-print">
                <button onClick={printReport} className="flex-1 flex items-center justify-center gap-2 rounded-lg border border-zinc-700 bg-zinc-800 py-3 text-sm hover:bg-zinc-700">
                  <Printer className="h-4 w-4" /> Print Report
                </button>
                <button
                  onClick={closeDay}
                  disabled={closing || !countedCash}
                  className="flex-1 rounded-lg bg-amber-600 py-3 font-bold text-white hover:bg-amber-500 disabled:opacity-40"
                >
                  {closing ? "Closing..." : "Close Day & Save"}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
