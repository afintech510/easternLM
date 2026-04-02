"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { formatUsd } from "@/lib/format";

interface Props {
  customerId: string;
  customerName: string;
  currentBalance: number;
  onClose: () => void;
  onSuccess: () => void;
}

export function ManualCreditModal({ customerId, customerName, currentBalance, onClose, onSuccess }: Props) {
  const [type, setType] = useState<"return_credit" | "manual_adjustment">("return_credit");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const amountCents = Math.round(parseFloat(amount) * 100) || 0;
  const noteValid = note.trim().length >= 5;

  async function handleSubmit() {
    if (!amountCents || !noteValid) return;
    setLoading(true);
    setError("");

    const res = await fetch("/api/admin/credit/manual-adjust", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        customer_id: customerId,
        amount_cents: amountCents,
        type,
        note: note.trim(),
        created_by: "admin",
      }),
    });

    if (res.ok) {
      onSuccess();
    } else {
      const data = await res.json();
      setError(data.error || "Failed");
    }
    setLoading(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div className="w-full max-w-md rounded-lg border bg-background p-6 shadow-lg space-y-4" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-lg font-bold">Post Manual Credit / Return</h3>
        <p className="text-sm text-muted-foreground">{customerName} — Balance: {formatUsd(currentBalance)}</p>

        {/* Type */}
        <div className="flex gap-2">
          <button onClick={() => setType("return_credit")}
            className={`flex-1 rounded-lg py-2 text-sm font-semibold transition-colors ${type === "return_credit" ? "bg-green-600 text-white" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}>
            Return Credit
          </button>
          <button onClick={() => setType("manual_adjustment")}
            className={`flex-1 rounded-lg py-2 text-sm font-semibold transition-colors ${type === "manual_adjustment" ? "bg-zinc-600 text-white" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}>
            Manual Adjustment
          </button>
        </div>

        {/* Amount */}
        <div>
          <label className="text-xs text-muted-foreground">
            Amount ($) {type === "manual_adjustment" && <span className="text-orange-500">— use negative to deduct</span>}
          </label>
          <input type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)}
            className="mt-1 w-full rounded-lg border bg-background px-4 py-3 text-xl font-mono text-center focus:outline-none focus:ring-2 focus:ring-ring" />
        </div>

        {/* Note */}
        <div>
          <label className="text-xs text-muted-foreground">Note (required, min 5 chars)</label>
          <input type="text" value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g., Returned 3 yds topsoil"
            className="mt-1 w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
          {note.length > 0 && !noteValid && <p className="mt-1 text-xs text-red-500">Minimum 5 characters</p>}
        </div>

        {error && <p className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-600 dark:bg-red-900/20 dark:border-red-800 dark:text-red-400">{error}</p>}

        <div className="flex gap-3">
          <button onClick={handleSubmit} disabled={loading || !amountCents || !noteValid}
            className="flex-1 rounded-lg bg-primary py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-30 flex items-center justify-center gap-2">
            {loading && <Loader2 className="size-4 animate-spin" />}
            Post Credit
          </button>
          <button onClick={onClose} disabled={loading} className="rounded-lg border px-4 py-2.5 text-sm hover:bg-muted">Cancel</button>
        </div>
      </div>
    </div>
  );
}
