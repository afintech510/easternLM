"use client";

import { useEffect, useState, useCallback } from "react";
import { Loader2, Search, DollarSign, Users, TrendingUp, TrendingDown, ChevronLeft, ChevronRight, Copy, ExternalLink } from "lucide-react";
import { formatUsd } from "@/lib/format";
import { AddCreditModal } from "./add-credit-modal";
import { ManualCreditModal } from "./manual-credit-modal";

interface Summary {
  total_outstanding_credit_cents: number;
  customers_with_credit: number;
  total_credit_issued_30d_cents: number;
  total_credit_redeemed_30d_cents: number;
}

interface CreditCustomer {
  id: string;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  email: string | null;
  credit_balance_cents: number;
  total_credited_cents: number;
  total_redeemed_cents: number;
  last_activity: string;
}

interface LedgerRow {
  id: string;
  customer_id: string;
  order_id: string | null;
  type: string;
  amount_cents: number;
  balance_after_cents: number;
  note: string | null;
  stripe_payment_intent_id: string | null;
  created_by: string;
  created_at: string;
}

const TYPE_BADGES: Record<string, { label: string; className: string }> = {
  prepayment: { label: "Prepayment", className: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300" },
  return_credit: { label: "Return", className: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300" },
  redemption: { label: "Redemption", className: "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300" },
  manual_adjustment: { label: "Adjustment", className: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400" },
  refund_to_credit: { label: "Refund", className: "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300" },
};

export default function StoreCreditPage() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [customers, setCustomers] = useState<CreditCustomer[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("balance");
  const [loading, setLoading] = useState(true);

  // Detail view
  const [selectedCustomer, setSelectedCustomer] = useState<CreditCustomer | null>(null);
  const [ledger, setLedger] = useState<LedgerRow[]>([]);
  const [ledgerTotal, setLedgerTotal] = useState(0);
  const [ledgerPage, setLedgerPage] = useState(1);
  const [ledgerLoading, setLedgerLoading] = useState(false);
  const [customerBalance, setCustomerBalance] = useState(0);

  // Modals
  const [showChargeModal, setShowChargeModal] = useState(false);
  const [showManualModal, setShowManualModal] = useState(false);
  // For inline "Add Credit" from table (no detail view needed)
  const [inlineAddCustomer, setInlineAddCustomer] = useState<CreditCustomer | null>(null);

  const fetchSummary = useCallback(async () => {
    const res = await fetch("/api/admin/credit/summary");
    if (res.ok) setSummary(await res.json());
  }, []);

  const fetchCustomers = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), sort });
    if (search) params.set("q", search);
    const res = await fetch(`/api/admin/credit/customers?${params}`);
    if (res.ok) {
      const data = await res.json();
      setCustomers(data.customers);
      setTotal(data.total);
    }
    setLoading(false);
  }, [page, sort, search]);

  const fetchLedger = useCallback(async (customerId: string, p = 1) => {
    setLedgerLoading(true);
    const res = await fetch(`/api/admin/credit/ledger?customer_id=${customerId}&page=${p}&limit=25`);
    if (res.ok) {
      const data = await res.json();
      setLedger(data.ledger);
      setLedgerTotal(data.total);
      setLedgerPage(p);
    }
    setLedgerLoading(false);
  }, []);

  useEffect(() => { fetchSummary(); }, [fetchSummary]);
  useEffect(() => { fetchCustomers(); }, [fetchCustomers]);

  function openDetail(cust: CreditCustomer) {
    setSelectedCustomer(cust);
    setCustomerBalance(cust.credit_balance_cents);
    fetchLedger(cust.id, 1);
  }

  function refreshAfterCredit() {
    if (selectedCustomer) {
      // Refresh balance
      fetch(`/api/pos/credit/balance?customer_id=${selectedCustomer.id}`)
        .then(r => r.json())
        .then(d => setCustomerBalance(d.balance_cents))
        .catch(() => {});
      fetchLedger(selectedCustomer.id, ledgerPage);
    }
    fetchSummary();
    fetchCustomers();
  }

  const customerName = (c: { first_name: string | null; last_name: string | null }) =>
    [c.first_name, c.last_name].filter(Boolean).join(" ") || "—";

  // ── Detail View ──
  if (selectedCustomer) {
    return (
      <div className="space-y-6">
        <button onClick={() => setSelectedCustomer(null)} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ChevronLeft className="size-4" /> Back to Store Credit
        </button>

        {/* Header */}
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">{customerName(selectedCustomer)}</h1>
            {selectedCustomer.phone && <p className="text-sm text-muted-foreground">{selectedCustomer.phone}</p>}
            {selectedCustomer.email && <p className="text-sm text-muted-foreground">{selectedCustomer.email}</p>}
          </div>
          <div className="text-right">
            <p className="text-sm text-muted-foreground">Current Balance</p>
            <p className={`text-3xl font-bold ${customerBalance > 0 ? "text-emerald-500" : "text-muted-foreground"}`}>
              {formatUsd(customerBalance)}
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button onClick={() => setShowChargeModal(true)}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500">
            Charge Card & Add Credit
          </button>
          <button onClick={() => setShowManualModal(true)}
            className="rounded-lg bg-zinc-200 px-4 py-2 text-sm font-semibold text-zinc-800 hover:bg-zinc-300 dark:bg-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-600">
            Post Manual Credit / Return
          </button>
        </div>

        {/* Ledger table */}
        <div className="rounded-lg border">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50 text-left text-xs text-muted-foreground">
                  <th className="px-3 py-2">Date</th>
                  <th className="px-3 py-2">Type</th>
                  <th className="px-3 py-2 text-right">Amount</th>
                  <th className="px-3 py-2 text-right">Balance After</th>
                  <th className="px-3 py-2">Note</th>
                  <th className="px-3 py-2">By</th>
                  <th className="px-3 py-2">Order</th>
                  <th className="px-3 py-2">Stripe PI</th>
                </tr>
              </thead>
              <tbody>
                {ledgerLoading ? (
                  <tr><td colSpan={8} className="py-8 text-center"><Loader2 className="inline size-5 animate-spin" /></td></tr>
                ) : ledger.length === 0 ? (
                  <tr><td colSpan={8} className="py-8 text-center text-muted-foreground">No ledger entries</td></tr>
                ) : ledger.map((row) => (
                  <tr key={row.id} className="border-b last:border-0 hover:bg-muted/30">
                    <td className="px-3 py-2 whitespace-nowrap">{new Date(row.created_at).toLocaleString()}</td>
                    <td className="px-3 py-2">
                      <span className={`rounded px-2 py-0.5 text-xs font-medium ${TYPE_BADGES[row.type]?.className || "bg-zinc-100"}`}>
                        {TYPE_BADGES[row.type]?.label || row.type}
                      </span>
                    </td>
                    <td className={`px-3 py-2 text-right font-mono font-medium ${row.amount_cents > 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
                      {row.amount_cents > 0 ? "+" : ""}{formatUsd(row.amount_cents)}
                    </td>
                    <td className="px-3 py-2 text-right font-mono">{formatUsd(row.balance_after_cents)}</td>
                    <td className="px-3 py-2 max-w-[200px] truncate text-muted-foreground">{row.note || "—"}</td>
                    <td className="px-3 py-2 text-muted-foreground">{row.created_by}</td>
                    <td className="px-3 py-2">
                      {row.order_id ? (
                        <a href={`/admin/operations?id=${row.order_id}`} className="text-blue-500 hover:underline flex items-center gap-1">
                          <ExternalLink className="size-3" /> {row.order_id.slice(0, 8)}
                        </a>
                      ) : "—"}
                    </td>
                    <td className="px-3 py-2">
                      {row.stripe_payment_intent_id ? (
                        <button onClick={() => navigator.clipboard.writeText(row.stripe_payment_intent_id!)}
                          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground" title={row.stripe_payment_intent_id}>
                          <Copy className="size-3" /> {row.stripe_payment_intent_id.slice(0, 12)}...
                        </button>
                      ) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {ledgerTotal > 25 && (
            <div className="flex items-center justify-between border-t px-3 py-2 text-xs text-muted-foreground">
              <span>{ledgerTotal} entries</span>
              <div className="flex gap-2">
                <button disabled={ledgerPage <= 1} onClick={() => fetchLedger(selectedCustomer.id, ledgerPage - 1)} className="rounded border px-2 py-1 hover:bg-muted disabled:opacity-30"><ChevronLeft className="size-3" /></button>
                <span>Page {ledgerPage} of {Math.ceil(ledgerTotal / 25)}</span>
                <button disabled={ledgerPage >= Math.ceil(ledgerTotal / 25)} onClick={() => fetchLedger(selectedCustomer.id, ledgerPage + 1)} className="rounded border px-2 py-1 hover:bg-muted disabled:opacity-30"><ChevronRight className="size-3" /></button>
              </div>
            </div>
          )}
        </div>

        {/* Charge Card Modal */}
        {showChargeModal && (
          <AddCreditModal
            customerId={selectedCustomer.id}
            customerName={customerName(selectedCustomer)}
            currentBalance={customerBalance}
            onClose={() => setShowChargeModal(false)}
            onSuccess={refreshAfterCredit}
          />
        )}

        {/* Manual Credit Modal */}
        {showManualModal && (
          <ManualCreditModal
            customerId={selectedCustomer.id}
            customerName={customerName(selectedCustomer)}
            currentBalance={customerBalance}
            onClose={() => setShowManualModal(false)}
            onSuccess={refreshAfterCredit}
          />
        )}
      </div>
    );
  }

  // ── List View ──
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Store Credit</h1>

      {/* Summary cards */}
      {summary && (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <SummaryCard icon={DollarSign} label="Total Outstanding" value={formatUsd(summary.total_outstanding_credit_cents)} color="text-emerald-500" />
          <SummaryCard icon={Users} label="Customers with Credit" value={String(summary.customers_with_credit)} color="text-blue-500" />
          <SummaryCard icon={TrendingUp} label="Issued (30 Days)" value={formatUsd(summary.total_credit_issued_30d_cents)} color="text-green-500" />
          <SummaryCard icon={TrendingDown} label="Redeemed (30 Days)" value={formatUsd(summary.total_credit_redeemed_30d_cents)} color="text-orange-500" />
        </div>
      )}

      {/* Search + sort */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search by name or phone..."
            className="w-full rounded-lg border bg-background py-2 pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <select value={sort} onChange={(e) => { setSort(e.target.value); setPage(1); }}
          className="rounded-lg border bg-background px-3 py-2 text-sm">
          <option value="balance">Sort: Balance (High to Low)</option>
          <option value="activity">Sort: Last Activity</option>
          <option value="name">Sort: Name</option>
        </select>
      </div>

      {/* Customer table */}
      <div className="rounded-lg border">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50 text-left text-xs text-muted-foreground">
                <th className="px-3 py-2">Customer</th>
                <th className="px-3 py-2">Phone</th>
                <th className="px-3 py-2 text-right">Balance</th>
                <th className="px-3 py-2">Last Activity</th>
                <th className="px-3 py-2 text-right">Total Credited</th>
                <th className="px-3 py-2 text-right">Total Redeemed</th>
                <th className="px-3 py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="py-8 text-center"><Loader2 className="inline size-5 animate-spin" /></td></tr>
              ) : customers.length === 0 ? (
                <tr><td colSpan={7} className="py-8 text-center text-muted-foreground">No customers with credit activity</td></tr>
              ) : customers.map((c) => (
                <tr key={c.id} className="border-b last:border-0 hover:bg-muted/30">
                  <td className="px-3 py-2 font-medium">{customerName(c)}</td>
                  <td className="px-3 py-2 text-muted-foreground">{c.phone || "—"}</td>
                  <td className={`px-3 py-2 text-right font-mono font-medium ${c.credit_balance_cents > 0 ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground"}`}>
                    {formatUsd(c.credit_balance_cents)}
                  </td>
                  <td className="px-3 py-2 text-muted-foreground whitespace-nowrap">
                    {c.last_activity ? new Date(c.last_activity).toLocaleDateString() : "—"}
                  </td>
                  <td className="px-3 py-2 text-right font-mono text-emerald-600 dark:text-emerald-400">{formatUsd(c.total_credited_cents)}</td>
                  <td className="px-3 py-2 text-right font-mono text-red-500">{formatUsd(c.total_redeemed_cents)}</td>
                  <td className="px-3 py-2">
                    <div className="flex gap-2">
                      <button onClick={() => openDetail(c)}
                        className="rounded border px-2 py-1 text-xs hover:bg-muted">View Ledger</button>
                      <button onClick={() => setInlineAddCustomer(c)}
                        className="rounded border px-2 py-1 text-xs hover:bg-muted">Add Credit</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {total > 25 && (
          <div className="flex items-center justify-between border-t px-3 py-2 text-xs text-muted-foreground">
            <span>{total} customers</span>
            <div className="flex gap-2">
              <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="rounded border px-2 py-1 hover:bg-muted disabled:opacity-30"><ChevronLeft className="size-3" /></button>
              <span>Page {page} of {Math.ceil(total / 25)}</span>
              <button disabled={page >= Math.ceil(total / 25)} onClick={() => setPage(p => p + 1)} className="rounded border px-2 py-1 hover:bg-muted disabled:opacity-30"><ChevronRight className="size-3" /></button>
            </div>
          </div>
        )}
      </div>

      {/* Inline Add Credit modal from table */}
      {inlineAddCustomer && (
        <ManualCreditModal
          customerId={inlineAddCustomer.id}
          customerName={customerName(inlineAddCustomer)}
          currentBalance={inlineAddCustomer.credit_balance_cents}
          onClose={() => setInlineAddCustomer(null)}
          onSuccess={() => { setInlineAddCustomer(null); fetchSummary(); fetchCustomers(); }}
        />
      )}
    </div>
  );
}

function SummaryCard({ icon: Icon, label, value, color }: { icon: React.ElementType; label: string; value: string; color: string }) {
  return (
    <div className="rounded-lg border p-4">
      <div className="flex items-center gap-2">
        <Icon className={`size-5 ${color}`} />
        <span className="text-xs text-muted-foreground">{label}</span>
      </div>
      <p className="mt-2 text-2xl font-bold">{value}</p>
    </div>
  );
}
