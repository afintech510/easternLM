"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, CheckCircle, Clock, Eye, Send, XCircle, AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatUsd } from "@/lib/format";

interface Quote {
  id: string;
  quote_number: string;
  customer_name: string;
  customer_phone: string | null;
  title: string;
  total_cents: number;
  deposit_required_cents: number;
  deposit_paid_cents: number;
  status: string;
  sent_at: string | null;
  accepted_at: string | null;
  created_at: string;
}

const STATUS_CONFIG: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  draft: { label: "Draft", icon: <Clock className="size-3" />, color: "bg-gray-100 text-gray-700" },
  sent: { label: "Sent", icon: <Send className="size-3" />, color: "bg-blue-100 text-blue-700" },
  viewed: { label: "Viewed", icon: <Eye className="size-3" />, color: "bg-purple-100 text-purple-700" },
  accepted: { label: "Accepted", icon: <CheckCircle className="size-3" />, color: "bg-green-100 text-green-700" },
  declined: { label: "Declined", icon: <XCircle className="size-3" />, color: "bg-red-100 text-red-700" },
  expired: { label: "Expired", icon: <AlertCircle className="size-3" />, color: "bg-amber-100 text-amber-700" },
  converted: { label: "Converted", icon: <CheckCircle className="size-3" />, color: "bg-teal-100 text-teal-700" },
};

const FILTERS = [
  { value: "", label: "All" },
  { value: "draft", label: "Draft" },
  { value: "sent", label: "Sent" },
  { value: "viewed", label: "Viewed" },
  { value: "accepted", label: "Accepted" },
  { value: "declined", label: "Declined" },
];

function formatDate(s: string) {
  return new Date(s).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function QuotesPage() {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");

  async function load() {
    setLoading(true);
    const params = filter ? `?status=${filter}` : "";
    const r = await fetch(`/api/admin/quotes${params}`);
    const d = await r.json();
    setQuotes(d.quotes ?? []);
    setLoading(false);
  }

  useEffect(() => { load(); }, [filter]);

  const thisWeek = quotes.filter((q) => {
    const d = new Date(q.created_at);
    const now = new Date();
    return now.getTime() - d.getTime() < 7 * 24 * 60 * 60 * 1000;
  });
  const acceptedThisWeek = thisWeek.filter((q) => q.status === "accepted");
  const acceptedTotal = acceptedThisWeek.reduce((s, q) => s + q.total_cents, 0);

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Quotes</h1>
        <Link href="/admin/quotes/new">
          <Button size="sm"><Plus className="mr-1.5 size-4" />New Quote</Button>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-lg border bg-card p-4">
          <p className="text-xs text-muted-foreground">This Week (sent)</p>
          <p className="text-2xl font-semibold">{thisWeek.length}</p>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <p className="text-xs text-muted-foreground">Accepted</p>
          <p className="text-2xl font-semibold">{acceptedThisWeek.length}</p>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <p className="text-xs text-muted-foreground">Accepted Value</p>
          <p className="text-2xl font-semibold">{formatUsd(acceptedTotal)}</p>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1">
        {FILTERS.map((f) => (
          <Button
            key={f.value}
            variant={filter === f.value ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter(f.value)}
          >
            {f.label}
          </Button>
        ))}
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex h-40 items-center justify-center">
          <Loader2 className="size-5 animate-spin text-muted-foreground" />
        </div>
      ) : quotes.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-16 text-center">
          <p className="text-sm text-muted-foreground">No quotes found</p>
          <Link href="/admin/quotes/new">
            <Button variant="outline" size="sm">Create First Quote</Button>
          </Link>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border">
          <table className="w-full text-sm">
            <thead className="bg-muted/30">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">#</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Date</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Customer</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Job</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">Total</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">Deposit</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {quotes.map((q) => {
                const cfg = STATUS_CONFIG[q.status] ?? STATUS_CONFIG.draft;
                return (
                  <tr key={q.id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3">
                      <Link href={`/admin/quotes/${q.id}`} className="font-mono text-xs font-medium text-accent hover:underline">
                        {q.quote_number}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{formatDate(q.created_at)}</td>
                    <td className="px-4 py-3">
                      <div className="font-medium">{q.customer_name}</div>
                      {q.customer_phone && <div className="text-xs text-muted-foreground">{q.customer_phone}</div>}
                    </td>
                    <td className="px-4 py-3 max-w-[200px] truncate">{q.title}</td>
                    <td className="px-4 py-3 text-right font-medium">{formatUsd(q.total_cents)}</td>
                    <td className="px-4 py-3 text-right">
                      <span className={q.deposit_paid_cents > 0 ? "text-green-600 font-medium" : ""}>
                        {formatUsd(q.deposit_required_cents)}
                      </span>
                      {q.deposit_paid_cents > 0 && (
                        <span className="ml-1 text-xs text-green-600">✓</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${cfg.color}`}>
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
