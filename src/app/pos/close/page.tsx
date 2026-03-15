"use client";

import { useEffect, useState } from "react";
import { ArrowLeft, Check, Printer } from "lucide-react";
import { formatUsd } from "@/lib/format";

type DayStats = {
  date: string;
  totalSalesCents: number;
  totalTransactions: number;
  cardTotalCents: number;
  cardCount: number;
  cashTotalCents: number;
  cashCount: number;
  deliveryCount: number;
  pickupCount: number;
  refundCount: number;
  refundTotalCents: number;
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

  const countedCents = countedCash ? Math.round(parseFloat(countedCash) * 100) : 0;
  const variance = stats ? countedCents - stats.cashTotalCents : 0;

  if (!stats) return <div className="flex h-full items-center justify-center text-zinc-500">Loading...</div>;

  return (
    <div className="flex h-full items-center justify-center">
      <div className="w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-900 p-6 space-y-5">
        <div className="flex items-center gap-3">
          <a href="/pos" className="text-zinc-400 hover:text-zinc-200"><ArrowLeft className="h-5 w-5" /></a>
          <h1 className="text-xl font-bold">End of Day</h1>
          <span className="ml-auto text-sm text-zinc-400">{stats.date}</span>
        </div>

        {closed ? (
          <div className="py-8 text-center">
            <Check className="mx-auto h-12 w-12 text-green-500" />
            <p className="mt-3 text-lg font-bold">Day Closed</p>
            <p className="text-sm text-zinc-400">Report saved. See you tomorrow!</p>
            <a href="/pos" className="mt-4 inline-block rounded-lg bg-amber-600 px-6 py-2 font-semibold text-white hover:bg-amber-500">Back to Register</a>
          </div>
        ) : (
          <>
            {/* Sales summary */}
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-zinc-400">Total sales:</span><span className="font-bold text-amber-400">{formatUsd(stats.totalSalesCents)}</span></div>
              <div className="flex justify-between"><span className="text-zinc-400">Transactions:</span><span>{stats.totalTransactions}</span></div>
              <div className="border-t border-zinc-800 pt-2 flex justify-between"><span className="text-zinc-400">Card payments:</span><span>{formatUsd(stats.cardTotalCents)} ({stats.cardCount})</span></div>
              <div className="flex justify-between"><span className="text-zinc-400">Cash payments:</span><span>{formatUsd(stats.cashTotalCents)} ({stats.cashCount})</span></div>
              <div className="border-t border-zinc-800 pt-2 flex justify-between"><span className="text-zinc-400">Deliveries:</span><span>{stats.deliveryCount}</span></div>
              <div className="flex justify-between"><span className="text-zinc-400">Pickups:</span><span>{stats.pickupCount}</span></div>
              {stats.refundCount > 0 && (
                <div className="flex justify-between text-red-400"><span>Refunds:</span><span>{stats.refundCount} ({formatUsd(stats.refundTotalCents)})</span></div>
              )}
            </div>

            {/* Cash reconciliation */}
            <div className="rounded-lg border border-zinc-700 bg-zinc-800 p-4 space-y-3">
              <p className="text-sm font-semibold">Cash Reconciliation</p>
              <div className="flex justify-between text-sm"><span className="text-zinc-400">Expected cash:</span><span>{formatUsd(stats.cashTotalCents)}</span></div>
              <div>
                <label className="text-xs text-zinc-500">Counted cash:</label>
                <input
                  type="number"
                  value={countedCash}
                  onChange={(e) => setCountedCash(e.target.value)}
                  placeholder="0.00"
                  step="0.01"
                  className="mt-1 w-full rounded border border-zinc-600 bg-zinc-700 px-3 py-2 text-lg font-mono focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>
              {countedCash && (
                <div className={`flex justify-between text-sm font-semibold ${variance === 0 ? "text-green-400" : variance > 0 ? "text-blue-400" : "text-red-400"}`}>
                  <span>Variance:</span>
                  <span>{variance >= 0 ? "+" : ""}{formatUsd(variance)}</span>
                </div>
              )}
            </div>

            {/* Notes */}
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Notes (optional)"
              rows={2}
              className="w-full rounded border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm focus:outline-none"
            />

            {/* Actions */}
            <div className="flex gap-2">
              <button className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-zinc-800 py-3 text-sm hover:bg-zinc-700">
                <Printer className="h-4 w-4" /> Print Report
              </button>
              <button
                onClick={closeDay}
                disabled={closing}
                className="flex-1 rounded-lg bg-amber-600 py-3 font-bold text-white hover:bg-amber-500 disabled:opacity-50"
              >
                {closing ? "Closing..." : "Close Day"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
