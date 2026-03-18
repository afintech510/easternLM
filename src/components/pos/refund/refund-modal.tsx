"use client";

import { useState } from "react";
import { Loader2, X } from "lucide-react";
import { formatUsd } from "@/lib/format";

const REASONS = [
  "Wrong material delivered",
  "Customer changed mind",
  "Damaged/defective",
  "Overcharge correction",
  "Order cancelled",
  "Other",
];

interface OrderForRefund {
  id: string;
  grand_total_cents: number;
  payment_method: string;
  payments: any[] | null;
  status: string;
}

interface Props {
  order: OrderForRefund;
  onClose: () => void;
  onRefund: () => void;
}

export function RefundModal({ order, onClose, onRefund }: Props) {
  const [type, setType] = useState<"full" | "partial">("full");
  const [partialAmount, setPartialAmount] = useState("");
  const [reason, setReason] = useState(REASONS[0]);
  const [otherReason, setOtherReason] = useState("");
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState("");

  const refundCents = type === "full" ? order.grand_total_cents : Math.round((parseFloat(partialAmount) || 0) * 100);
  const effectiveReason = reason === "Other" ? otherReason : reason;

  async function handleRefund() {
    if (refundCents <= 0 || !effectiveReason) return;
    setProcessing(true);
    setError("");
    try {
      const res = await fetch("/api/pos/refund", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: order.id,
          type,
          totalRefundCents: refundCents,
          reason: effectiveReason,
        }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error ?? "Refund failed");
      onRefund();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Refund failed");
    }
    setProcessing(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl bg-zinc-900 border border-zinc-700 p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-white">Refund — #{order.id.slice(0, 8)}</h2>
          <button onClick={onClose} className="text-zinc-500 hover:text-zinc-300"><X className="size-5" /></button>
        </div>

        <div className="rounded-lg bg-zinc-800 p-3 text-sm space-y-1">
          <p className="text-zinc-400">Original total: <span className="text-white font-bold">{formatUsd(order.grand_total_cents)}</span></p>
          <p className="text-zinc-400">Payment: <span className="text-white">{order.payment_method}</span></p>
        </div>

        {/* Refund type */}
        <div className="space-y-2">
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="radio" checked={type === "full"} onChange={() => setType("full")} className="accent-amber-500" />
            <span className="text-sm text-white">Full refund — {formatUsd(order.grand_total_cents)}</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="radio" checked={type === "partial"} onChange={() => setType("partial")} className="accent-amber-500" />
            <span className="text-sm text-white">Partial refund</span>
          </label>
          {type === "partial" && (
            <input type="number" step="0.01" value={partialAmount} onChange={(e) => setPartialAmount(e.target.value)}
              placeholder="Amount" autoFocus
              className="w-full rounded-lg bg-zinc-800 border border-zinc-700 px-3 py-2 text-lg font-mono text-white text-center focus:outline-none focus:border-amber-500" />
          )}
        </div>

        {/* Reason */}
        <div className="space-y-1">
          <label className="text-xs text-zinc-500">Reason (required)</label>
          <select value={reason} onChange={(e) => setReason(e.target.value)}
            className="w-full rounded-lg bg-zinc-800 border border-zinc-700 px-3 py-2 text-sm text-white">
            {REASONS.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
          {reason === "Other" && (
            <input type="text" value={otherReason} onChange={(e) => setOtherReason(e.target.value)}
              placeholder="Describe reason" className="w-full rounded-lg bg-zinc-800 border border-zinc-700 px-3 py-2 text-sm text-white" />
          )}
        </div>

        {error && <p className="rounded-lg bg-red-900/30 border border-red-800 px-3 py-2 text-sm text-red-300">{error}</p>}

        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 rounded-xl bg-zinc-800 py-2.5 text-sm text-zinc-400 hover:bg-zinc-700">Cancel</button>
          <button onClick={handleRefund} disabled={processing || refundCents <= 0 || !effectiveReason}
            className="flex-1 rounded-xl bg-red-600 py-2.5 text-sm font-bold text-white hover:bg-red-500 disabled:opacity-30">
            {processing ? <Loader2 className="inline size-4 animate-spin mr-1" /> : null}
            Refund {formatUsd(refundCents)}
          </button>
        </div>
      </div>
    </div>
  );
}
