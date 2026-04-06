"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  Loader2, Building2, AlertTriangle, ChevronDown, ChevronUp,
  CheckCircle, Circle, DollarSign
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { formatUsd } from "@/lib/format";

interface Account {
  id: string;
  first_name: string | null;
  last_name: string | null;
  charge_account_name: string | null;
  phone: string | null;
  email: string | null;
  billing_email: string | null;
  credit_limit_cents: number | null;
  current_balance_cents: number;
  payment_terms: string | null;
  last_statement_date: string | null;
  total_orders: number;
}

interface AccountOrder {
  id: string;
  placed_at: string;
  grand_total_cents: number;
  status: string;
  payment_method: string;
  account_paid_at: string | null;
  account_payment_method: string | null;
  account_payment_note: string | null;
  order_items: Array<{ product_name: string; quantity: number; unit_price_cents: number }>;
}

export default function AccountsPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [genResult, setGenResult] = useState<string>("");
  const [periodStart, setPeriodStart] = useState("");
  const [periodEnd, setPeriodEnd] = useState("");

  // Expanded customer state
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [orders, setOrders] = useState<AccountOrder[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);

  // Multi-select + payment modal
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showPayModal, setShowPayModal] = useState(false);
  const [payMethod, setPayMethod] = useState("check");
  const [payNote, setPayNote] = useState("");
  const [payDate, setPayDate] = useState(new Date().toISOString().slice(0, 10));
  const [marking, setMarking] = useState(false);

  const refreshAccounts = useCallback(() => {
    fetch("/api/admin/accounts")
      .then((r) => r.json())
      .then((d) => setAccounts(d.accounts ?? []));
  }, []);

  const loadOrders = useCallback(async (acctId: string) => {
    setLoadingOrders(true);
    setOrders([]);
    setSelectedIds(new Set());
    try {
      const res = await fetch(`/api/admin/customers/${acctId}/orders`);
      if (res.ok) {
        const data = await res.json();
        // Only show account-method orders
        const acctOrders = (data.orders ?? []).filter(
          (o: AccountOrder) => o.payment_method === "account"
        );
        setOrders(acctOrders);
      }
    } finally {
      setLoadingOrders(false);
    }
  }, []);

  const toggleExpand = useCallback(async (acctId: string) => {
    if (expandedId === acctId) {
      setExpandedId(null);
      return;
    }
    setExpandedId(acctId);
    await loadOrders(acctId);
  }, [expandedId, loadOrders]);

  useEffect(() => {
    const now = new Date();
    const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    setPeriodStart(firstOfMonth.toISOString().slice(0, 10));
    setPeriodEnd(now.toISOString().slice(0, 10));

    fetch("/api/admin/accounts")
      .then((r) => r.json())
      .then((d) => setAccounts(d.accounts ?? []))
      .finally(() => setLoading(false));
  }, []);

  async function generateStatements() {
    if (!periodStart || !periodEnd) return;
    setGenerating(true);
    setGenResult("");
    const r = await fetch("/api/admin/statements/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ period_start: periodStart, period_end: periodEnd }),
    });
    const d = await r.json();
    const count = d.generated?.length ?? 0;
    const errCount = d.errors?.length ?? 0;
    setGenResult(`Generated ${count} statement${count !== 1 ? "s" : ""}${errCount ? ` (${errCount} errors)` : ""}`);
    setGenerating(false);
  }

  // Toggle individual order selection
  function toggleSelect(orderId: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(orderId)) next.delete(orderId);
      else next.add(orderId);
      return next;
    });
  }

  // Select/deselect all unpaid
  function toggleSelectAllUnpaid() {
    const unpaid = orders.filter((o) => !o.account_paid_at);
    if (unpaid.every((o) => selectedIds.has(o.id))) {
      // Deselect all
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(unpaid.map((o) => o.id)));
    }
  }

  // Mark selected orders as paid
  async function markPaid() {
    if (!expandedId || selectedIds.size === 0) return;
    setMarking(true);
    try {
      const res = await fetch("/api/admin/accounts/mark-paid", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          order_ids: Array.from(selectedIds),
          payment_method: payMethod,
          payment_note: payNote || undefined,
          paid_date: payDate,
          customer_id: expandedId,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setShowPayModal(false);
        setSelectedIds(new Set());
        setPayNote("");
        // Refresh orders and accounts
        await loadOrders(expandedId);
        refreshAccounts();
      }
    } finally {
      setMarking(false);
    }
  }

  const totalBalance = accounts.reduce((s, a) => s + (a.current_balance_cents ?? 0), 0);
  const selectedTotal = orders
    .filter((o) => selectedIds.has(o.id))
    .reduce((sum, o) => sum + o.grand_total_cents, 0);
  const unpaidOrders = orders.filter((o) => !o.account_paid_at);
  const paidOrders = orders.filter((o) => o.account_paid_at);

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Charge Accounts</h1>
        <Link href="/admin/statements">
          <Button variant="outline" size="sm">View All Statements</Button>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-lg border bg-card p-4">
          <p className="text-xs text-muted-foreground">Active Accounts</p>
          <p className="text-2xl font-semibold">{accounts.length}</p>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <p className="text-xs text-muted-foreground">Total Outstanding</p>
          <p className="text-2xl font-semibold">{formatUsd(totalBalance)}</p>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <p className="text-xs text-muted-foreground">Over Limit</p>
          <p className="text-2xl font-semibold text-amber-600">
            {accounts.filter((a) => a.credit_limit_cents && a.current_balance_cents > a.credit_limit_cents).length}
          </p>
        </div>
      </div>

      {/* Generate Statements */}
      <div className="rounded-lg border bg-card p-5 space-y-3">
        <h2 className="font-semibold">Generate Statements</h2>
        <div className="flex flex-wrap items-end gap-3">
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Period Start</label>
            <Input type="date" value={periodStart} onChange={(e) => setPeriodStart(e.target.value)} className="w-40" />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Period End</label>
            <Input type="date" value={periodEnd} onChange={(e) => setPeriodEnd(e.target.value)} className="w-40" />
          </div>
          <Button onClick={generateStatements} disabled={generating || !periodStart || !periodEnd}>
            {generating ? <><Loader2 className="mr-2 size-4 animate-spin" />Generating…</> : "Generate Statements"}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Generates draft statements for all charge accounts with orders (payment method: &quot;account&quot;) in the selected period.
        </p>
        {genResult && <p className="text-sm font-medium">{genResult}</p>}
      </div>

      {/* Accounts table */}
      {loading ? (
        <div className="flex h-40 items-center justify-center">
          <Loader2 className="size-5 animate-spin text-muted-foreground" />
        </div>
      ) : accounts.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-16 text-center">
          <Building2 className="size-10 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">No charge accounts yet</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border">
          <table className="w-full text-sm">
            <thead className="bg-muted/30">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Account</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Contact</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">Balance</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">Credit Limit</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Terms</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Last Statement</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {accounts.map((acct) => {
                const overLimit = acct.credit_limit_cents && acct.current_balance_cents > acct.credit_limit_cents;
                const isExpanded = expandedId === acct.id;
                const acctName = acct.charge_account_name ?? [acct.first_name, acct.last_name].filter(Boolean).join(" ");
                return (
                  <tr key={acct.id}>
                    <td colSpan={7} className="p-0">
                      {/* Main row */}
                      <button onClick={() => toggleExpand(acct.id)} className={`flex w-full items-center px-4 py-3 text-left text-sm ${isExpanded ? "bg-accent/5 border-b" : "hover:bg-muted/20"}`}>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium">{acctName}</p>
                        </div>
                        <div className="w-28 text-xs text-muted-foreground shrink-0">
                          {acct.phone && <p>{acct.phone}</p>}
                        </div>
                        <div className="w-28 text-right shrink-0">
                          <span className={overLimit ? "text-red-600 font-semibold" : "font-medium"}>
                            {formatUsd(acct.current_balance_cents)}
                          </span>
                          {overLimit && <AlertTriangle className="inline ml-1 size-3 text-red-500" />}
                        </div>
                        <div className="w-28 text-right text-muted-foreground shrink-0">
                          {acct.credit_limit_cents ? formatUsd(acct.credit_limit_cents) : "—"}
                        </div>
                        <div className="w-20 shrink-0 px-2">
                          <Badge variant="outline">{acct.payment_terms ?? "Net 30"}</Badge>
                        </div>
                        <div className="w-24 text-xs text-muted-foreground shrink-0">
                          {acct.last_statement_date ?? "Never"}
                        </div>
                        <div className="w-28 shrink-0 flex items-center gap-1">
                          <Link href={`/admin/statements?customer_id=${acct.id}`} onClick={e => e.stopPropagation()}>
                            <Button variant="ghost" size="sm">Stmts</Button>
                          </Link>
                          {isExpanded ? <ChevronUp className="size-4 text-muted-foreground" /> : <ChevronDown className="size-4 text-muted-foreground" />}
                        </div>
                      </button>

                      {/* Expanded: order list with payment tracking */}
                      {isExpanded && (
                        <div className="bg-muted/20 px-6 py-4 space-y-4">
                          {loadingOrders ? (
                            <div className="flex justify-center py-6"><Loader2 className="size-5 animate-spin" /></div>
                          ) : orders.length === 0 ? (
                            <p className="text-sm text-muted-foreground py-2">No charge account orders found.</p>
                          ) : (
                            <>
                              {/* Unpaid orders */}
                              {unpaidOrders.length > 0 && (
                                <div>
                                  <div className="flex items-center justify-between mb-2">
                                    <h3 className="text-sm font-semibold text-red-700 flex items-center gap-1.5">
                                      <Circle className="size-3 fill-red-400 text-red-400" />
                                      Unpaid ({unpaidOrders.length})
                                      <span className="font-normal text-muted-foreground ml-1">
                                        — {formatUsd(unpaidOrders.reduce((s, o) => s + o.grand_total_cents, 0))}
                                      </span>
                                    </h3>
                                    <div className="flex items-center gap-2">
                                      <button onClick={toggleSelectAllUnpaid} className="text-xs text-primary hover:underline">
                                        {unpaidOrders.every((o) => selectedIds.has(o.id)) ? "Deselect all" : "Select all"}
                                      </button>
                                      {selectedIds.size > 0 && (
                                        <Button
                                          size="sm"
                                          onClick={() => { setShowPayModal(true); setPayDate(new Date().toISOString().slice(0, 10)); setPayNote(""); setPayMethod("check"); }}
                                          className="bg-green-600 hover:bg-green-700 text-white"
                                        >
                                          <DollarSign className="mr-1 size-3.5" />
                                          Mark Paid ({selectedIds.size}) — {formatUsd(selectedTotal)}
                                        </Button>
                                      )}
                                    </div>
                                  </div>
                                  <div className="rounded-md border bg-card overflow-hidden">
                                    <table className="w-full text-sm">
                                      <thead className="bg-muted/50">
                                        <tr>
                                          <th className="w-8 px-2 py-2"></th>
                                          <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">Date</th>
                                          <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">Order</th>
                                          <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">Items</th>
                                          <th className="px-3 py-2 text-right text-xs font-medium text-muted-foreground">Amount</th>
                                        </tr>
                                      </thead>
                                      <tbody className="divide-y">
                                        {unpaidOrders.map((order) => (
                                          <tr
                                            key={order.id}
                                            onClick={() => toggleSelect(order.id)}
                                            className={`cursor-pointer transition-colors ${selectedIds.has(order.id) ? "bg-green-50" : "hover:bg-muted/20"}`}
                                          >
                                            <td className="px-2 py-2 text-center">
                                              <input
                                                type="checkbox"
                                                checked={selectedIds.has(order.id)}
                                                onChange={() => toggleSelect(order.id)}
                                                onClick={e => e.stopPropagation()}
                                                className="rounded"
                                              />
                                            </td>
                                            <td className="px-3 py-2 text-xs">
                                              {new Date(order.placed_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                                            </td>
                                            <td className="px-3 py-2 text-xs font-mono">
                                              {order.id?.slice(0, 8)}
                                            </td>
                                            <td className="px-3 py-2 text-xs text-muted-foreground max-w-[250px] truncate">
                                              {order.order_items?.map((i) => `${i.product_name} ×${i.quantity}`).join(", ") || "—"}
                                            </td>
                                            <td className="px-3 py-2 text-right font-medium">
                                              {formatUsd(order.grand_total_cents)}
                                            </td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>
                                </div>
                              )}

                              {/* Paid orders */}
                              {paidOrders.length > 0 && (
                                <div>
                                  <h3 className="text-sm font-semibold text-green-700 flex items-center gap-1.5 mb-2">
                                    <CheckCircle className="size-3" />
                                    Paid ({paidOrders.length})
                                  </h3>
                                  <div className="rounded-md border bg-card overflow-hidden">
                                    <table className="w-full text-sm">
                                      <thead className="bg-muted/50">
                                        <tr>
                                          <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">Date</th>
                                          <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">Order</th>
                                          <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">Items</th>
                                          <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">Paid</th>
                                          <th className="px-3 py-2 text-right text-xs font-medium text-muted-foreground">Amount</th>
                                        </tr>
                                      </thead>
                                      <tbody className="divide-y">
                                        {paidOrders.map((order) => (
                                          <tr key={order.id} className="text-muted-foreground">
                                            <td className="px-3 py-2 text-xs">
                                              {new Date(order.placed_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                                            </td>
                                            <td className="px-3 py-2 text-xs font-mono">
                                              {order.id?.slice(0, 8)}
                                            </td>
                                            <td className="px-3 py-2 text-xs max-w-[200px] truncate">
                                              {order.order_items?.map((i) => `${i.product_name} ×${i.quantity}`).join(", ") || "—"}
                                            </td>
                                            <td className="px-3 py-2 text-xs">
                                              <span className="text-green-600">
                                                {order.account_payment_method ?? "—"}
                                              </span>
                                              {order.account_payment_note && (
                                                <span className="ml-1 text-muted-foreground">({order.account_payment_note})</span>
                                              )}
                                              {order.account_paid_at && (
                                                <span className="block text-[10px]">
                                                  {new Date(order.account_paid_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                                                </span>
                                              )}
                                            </td>
                                            <td className="px-3 py-2 text-right font-medium line-through">
                                              {formatUsd(order.grand_total_cents)}
                                            </td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Mark Paid Modal */}
      {showPayModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setShowPayModal(false)}>
          <div className="w-full max-w-md rounded-lg bg-card p-6 shadow-lg space-y-4" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-semibold">Record Payment</h3>
            <p className="text-sm text-muted-foreground">
              Marking {selectedIds.size} order{selectedIds.size !== 1 ? "s" : ""} as paid — <strong>{formatUsd(selectedTotal)}</strong>
            </p>

            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Payment Method</label>
                <select
                  value={payMethod}
                  onChange={(e) => setPayMethod(e.target.value)}
                  className="w-full rounded-md border px-3 py-2 text-sm bg-background"
                >
                  <option value="check">Check</option>
                  <option value="cash">Cash</option>
                  <option value="ach">Bank Transfer / ACH</option>
                  <option value="card">Credit Card</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">
                  Note <span className="text-muted-foreground font-normal">(check #, transaction ID, etc.)</span>
                </label>
                <Input
                  value={payNote}
                  onChange={(e) => setPayNote(e.target.value)}
                  placeholder="Check #1234"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Payment Date</label>
                <Input
                  type="date"
                  value={payDate}
                  onChange={(e) => setPayDate(e.target.value)}
                  className="w-40"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setShowPayModal(false)}>Cancel</Button>
              <Button
                onClick={markPaid}
                disabled={marking}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                {marking ? <><Loader2 className="mr-2 size-4 animate-spin" />Processing…</> : `Record Payment — ${formatUsd(selectedTotal)}`}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
