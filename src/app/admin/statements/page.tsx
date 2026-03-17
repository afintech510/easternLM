"use client";

import { Suspense } from "react";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Loader2, CheckCircle, Clock, AlertCircle, XCircle, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatUsd } from "@/lib/format";

interface Statement {
  id: string;
  statement_number: string;
  public_token: string;
  customer_id: string;
  period_start: string;
  period_end: string;
  balance_due_cents: number;
  charges_cents: number;
  amount_paid_cents: number;
  status: string;
  due_date: string;
  sent_at: string | null;
  paid_at: string | null;
  customers: { charge_account_name: string | null; first_name: string | null; last_name: string | null } | null;
}

const STATUS_CFG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  draft: { label: "Draft", color: "text-gray-500", icon: <Clock className="size-3" /> },
  sent: { label: "Sent", color: "text-blue-600", icon: <Send className="size-3" /> },
  viewed: { label: "Viewed", color: "text-purple-600", icon: <Send className="size-3" /> },
  partial_paid: { label: "Partial", color: "text-amber-600", icon: <AlertCircle className="size-3" /> },
  paid: { label: "Paid ✓", color: "text-green-600", icon: <CheckCircle className="size-3" /> },
  overdue: { label: "Overdue", color: "text-red-600", icon: <AlertCircle className="size-3" /> },
  disputed: { label: "Disputed", color: "text-red-700", icon: <XCircle className="size-3" /> },
};

function StatementsInner() {
  const searchParams = useSearchParams();
  const customerIdFilter = searchParams.get("customer_id");

  const [statements, setStatements] = useState<Statement[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");

  async function load() {
    setLoading(true);
    const params = new URLSearchParams();
    if (statusFilter) params.set("status", statusFilter);
    if (customerIdFilter) params.set("customer_id", customerIdFilter);
    const r = await fetch(`/api/admin/statements?${params}`);
    const d = await r.json();
    setStatements(d.statements ?? []);
    setLoading(false);
  }

  useEffect(() => { load(); }, [statusFilter, customerIdFilter]);

  const totalOutstanding = statements
    .filter((s) => s.status !== "paid")
    .reduce((sum, s) => sum + s.balance_due_cents, 0);

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Statements</h1>
        <Link href="/admin/accounts">
          <Button variant="outline" size="sm">← Charge Accounts</Button>
        </Link>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-lg border bg-card p-4">
          <p className="text-xs text-muted-foreground">Total Statements</p>
          <p className="text-2xl font-semibold">{statements.length}</p>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <p className="text-xs text-muted-foreground">Outstanding</p>
          <p className="text-2xl font-semibold">{formatUsd(totalOutstanding)}</p>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <p className="text-xs text-muted-foreground">Paid</p>
          <p className="text-2xl font-semibold">{statements.filter((s) => s.status === "paid").length}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-1">
        {["", "draft", "sent", "partial_paid", "paid", "overdue"].map((s) => (
          <Button
            key={s}
            variant={statusFilter === s ? "default" : "outline"}
            size="sm"
            onClick={() => setStatusFilter(s)}
          >
            {s === "" ? "All" : STATUS_CFG[s]?.label ?? s}
          </Button>
        ))}
      </div>

      {loading ? (
        <div className="flex h-40 items-center justify-center"><Loader2 className="size-5 animate-spin text-muted-foreground" /></div>
      ) : statements.length === 0 ? (
        <p className="py-12 text-center text-sm text-muted-foreground">No statements found. Generate them from the Charge Accounts page.</p>
      ) : (
        <div className="overflow-hidden rounded-lg border">
          <table className="w-full text-sm">
            <thead className="bg-muted/30">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Statement</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Account</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Period</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">Charges</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">Balance Due</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Due</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {statements.map((s) => {
                const cfg = STATUS_CFG[s.status] ?? STATUS_CFG.draft;
                const cName = s.customers?.charge_account_name ?? [s.customers?.first_name, s.customers?.last_name].filter(Boolean).join(" ") ?? "—";
                return (
                  <tr key={s.id} className="hover:bg-muted/20 transition-colors cursor-pointer" onClick={() => window.location.href = `/admin/statements/${s.id}`}>
                    <td className="px-4 py-3 font-mono text-xs font-medium text-accent">{s.statement_number}</td>
                    <td className="px-4 py-3 font-medium">{cName}</td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">{s.period_start} – {s.period_end}</td>
                    <td className="px-4 py-3 text-right">{formatUsd(s.charges_cents)}</td>
                    <td className="px-4 py-3 text-right font-semibold">{formatUsd(s.balance_due_cents)}</td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">{s.due_date}</td>
                    <td className="px-4 py-3">
                      <span className={`flex items-center gap-1 text-xs font-medium ${cfg.color}`}>
                        {cfg.icon}{cfg.label}
                      </span>
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

export default function StatementsPage() {
  return (
    <Suspense fallback={<div className="flex h-40 items-center justify-center text-muted-foreground">Loading…</div>}>
      <StatementsInner />
    </Suspense>
  );
}
