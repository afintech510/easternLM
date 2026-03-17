"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Loader2, Plus, Building2, AlertTriangle } from "lucide-react";
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

export default function AccountsPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [genResult, setGenResult] = useState<string>("");
  const [periodStart, setPeriodStart] = useState("");
  const [periodEnd, setPeriodEnd] = useState("");

  useEffect(() => {
    // Default to previous month
    const now = new Date();
    const firstOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastOfPrevMonth = new Date(firstOfThisMonth.getTime() - 1);
    const firstOfPrevMonth = new Date(lastOfPrevMonth.getFullYear(), lastOfPrevMonth.getMonth(), 1);
    setPeriodStart(firstOfPrevMonth.toISOString().slice(0, 10));
    setPeriodEnd(lastOfPrevMonth.toISOString().slice(0, 10));

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
        {genResult && (
          <p className="text-sm text-muted-foreground">{genResult}</p>
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
                return (
                  <tr key={acct.id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-medium">{acct.charge_account_name ?? [acct.first_name, acct.last_name].filter(Boolean).join(" ")}</p>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">
                      {acct.phone && <p>{acct.phone}</p>}
                      {(acct.billing_email || acct.email) && <p>{acct.billing_email || acct.email}</p>}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className={overLimit ? "text-red-600 font-semibold" : "font-medium"}>
                        {formatUsd(acct.current_balance_cents)}
                      </span>
                      {overLimit && <AlertTriangle className="inline ml-1 size-3 text-red-500" />}
                    </td>
                    <td className="px-4 py-3 text-right text-muted-foreground">
                      {acct.credit_limit_cents ? formatUsd(acct.credit_limit_cents) : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant="outline">{acct.payment_terms ?? "Net 30"}</Badge>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">
                      {acct.last_statement_date ?? "Never"}
                    </td>
                    <td className="px-4 py-3">
                      <Link href={`/admin/statements?customer_id=${acct.id}`}>
                        <Button variant="ghost" size="sm">Statements →</Button>
                      </Link>
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
