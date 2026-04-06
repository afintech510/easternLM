"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Loader2, Plus, Building2, AlertTriangle, ChevronDown, ChevronUp, X } from "lucide-react";
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

interface UnpaidOrder {
  id: string;
  placed_at: string;
  grand_total_cents: number;
  status: string;
  delivery_method: string | null;
  order_items: Array<{ product_name: string; quantity: number; unit_price_cents: number }>;
}

export default function AccountsPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [genResult, setGenResult] = useState<string>("");
  const [periodStart, setPeriodStart] = useState("");
  const [periodEnd, setPeriodEnd] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [unpaidOrders, setUnpaidOrders] = useState<UnpaidOrder[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);

  const toggleExpand = useCallback(async (acctId: string) => {
    if (expandedId === acctId) { setExpandedId(null); return; }
    setExpandedId(acctId);
    setLoadingOrders(true);
    setUnpaidOrders([]);
    try {
      const res = await fetch(`/api/admin/customers/${acctId}/orders`);
      if (res.ok) {
        const data = await res.json();
        // Filter to account-paid orders (unpaid receipts)
        const accountOrders = (data.orders ?? []).filter(
          (o: any) => o.source === "platform"
        );
        setUnpaidOrders(accountOrders);
      }
    } finally {
      setLoadingOrders(false);
    }
  }, [expandedId]);

  useEffect(() => {
    // Default to current month (1st through today)
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
    setGenResult(`Generated ${count} statement${count !== 1 ? "s" : ""}${errCount ? ` (${errCount} errors: ${d.errors.join(", ")})` : ""}`);
    setGenerating(false);
  }

  const totalBalance = accounts.reduce((s, a) => s + (a.current_balance_cents ?? 0), 0);

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Charge Accounts</h1>
        <div className="flex gap-2">
          <Link href="/admin/statements">
            <Button variant="outline" size="sm">View All Statements</Button>
          </Link>
        </div>
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
        {genResult && (
          <p className="text-sm font-medium">{genResult}</p>
        )}
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
          <p className="text-xs text-muted-foreground">Enable charge accounts on a customer profile in /admin/customers</p>
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
                  <tr key={acct.id} className={`transition-colors ${isExpanded ? "" : "hover:bg-muted/20"}`}>
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

                      {/* Expanded: unpaid orders */}
                      {isExpanded && (
                        <div className="bg-muted/30 px-6 py-4">
                          <div className="flex items-center justify-between mb-3">
                            <h3 className="text-sm font-semibold">Orders — {acctName}</h3>
                            <Link href={`/admin/customers`}>
                              <Button variant="outline" size="sm">View Full Profile</Button>
                            </Link>
                          </div>
                          {loadingOrders ? (
                            <div className="flex justify-center py-4"><Loader2 className="size-4 animate-spin" /></div>
                          ) : unpaidOrders.length === 0 ? (
                            <p className="text-sm text-muted-foreground py-2">No orders found for this customer.</p>
                          ) : (
                            <div className="overflow-hidden rounded-md border bg-card">
                              <table className="w-full text-sm">
                                <thead className="bg-muted/50">
                                  <tr>
                                    <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">Date</th>
                                    <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">Order</th>
                                    <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">Items</th>
                                    <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">Status</th>
                                    <th className="px-3 py-2 text-right text-xs font-medium text-muted-foreground">Amount</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y">
                                  {unpaidOrders.map((order: any) => (
                                    <tr key={order.id} className="hover:bg-muted/20">
                                      <td className="px-3 py-2 text-xs">
                                        {new Date(order.placed_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                                      </td>
                                      <td className="px-3 py-2 text-xs font-mono">
                                        {order.id?.slice(0, 8)}
                                      </td>
                                      <td className="px-3 py-2 text-xs text-muted-foreground max-w-[200px] truncate">
                                        {(order.order_items ?? []).map((i: any) => `${i.product_name} ×${i.quantity}`).join(", ") || "—"}
                                      </td>
                                      <td className="px-3 py-2">
                                        <Badge variant="outline" className="text-[10px]">{order.status}</Badge>
                                      </td>
                                      <td className="px-3 py-2 text-right font-medium">
                                        {formatUsd(order.grand_total_cents)}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
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
    </div>
  );
}
