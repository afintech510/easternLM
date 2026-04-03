"use client";

import { useState, useEffect } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid } from "recharts";

type Period = "daily" | "weekly" | "monthly";

interface TimeSeriesEntry {
  date: string;
  total_cents: number;
  order_count: number;
  by_method: Record<string, { total_cents: number; count: number }>;
}

interface RevenueData {
  period: string;
  data: TimeSeriesEntry[];
  summary: {
    total_cents: number;
    order_count: number;
    by_method: Record<string, { total_cents: number; count: number }>;
    pending_count: number;
  };
}

const METHOD_CONFIG: Record<string, { label: string; color: string }> = {
  card_online: { label: "Web Card", color: "#3b82f6" },
  card_terminal: { label: "POS Card", color: "#8b5cf6" },
  cash: { label: "Cash", color: "#22c55e" },
  cod: { label: "COD", color: "#f59e0b" },
  account: { label: "Account", color: "#6366f1" },
  split: { label: "Split", color: "#14b8a6" },
  store_credit: { label: "Store Credit", color: "#10b981" },
  paylink: { label: "Pay Link", color: "#f97316" },
  unknown: { label: "Other", color: "#9ca3af" },
};

const PERIOD_LABELS: Record<Period, string> = {
  daily: "Last 30 Days",
  weekly: "Last 12 Weeks",
  monthly: "Last 12 Months",
};

function fmt(cents: number) {
  return "$" + (cents / 100).toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function formatDateLabel(dateStr: string, period: Period): string {
  const date = new Date(dateStr + "T12:00:00");
  switch (period) {
    case "daily": return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    case "weekly": {
      const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
      d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
      const ys = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
      const wk = Math.ceil(((d.getTime() - ys.getTime()) / 86400000 + 1) / 7);
      return `Wk ${wk}`;
    }
    case "monthly": return date.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
    default: return dateStr;
  }
}

export function RevenueSection() {
  const [period, setPeriod] = useState<Period>("weekly");
  const [revenue, setRevenue] = useState<RevenueData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/admin/revenue?period=${period}`)
      .then((r) => r.json())
      .then((d) => { setRevenue(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [period]);

  const totalRevenue = revenue?.summary.total_cents ?? 0;
  const totalOrders = revenue?.summary.order_count ?? 0;
  const avgOrder = totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0;
  const pendingCount = revenue?.summary.pending_count ?? 0;

  // Chart data
  const methodsInData = new Set<string>();
  for (const entry of revenue?.data ?? []) {
    for (const m of Object.keys(entry.by_method)) methodsInData.add(m);
  }
  const sortedMethods = Array.from(methodsInData).sort((a, b) => {
    const ta = (revenue?.data ?? []).reduce((s, e) => s + (e.by_method[a]?.total_cents ?? 0), 0);
    const tb = (revenue?.data ?? []).reduce((s, e) => s + (e.by_method[b]?.total_cents ?? 0), 0);
    return tb - ta;
  });
  const chartData = (revenue?.data ?? []).map((entry) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const row: Record<string, any> = { date: formatDateLabel(entry.date, period), total: entry.total_cents / 100 };
    for (const m of methodsInData) row[m] = (entry.by_method[m]?.total_cents ?? 0) / 100;
    return row;
  });

  // Payment method breakdown
  const byMethod = Object.entries(revenue?.summary.by_method ?? {})
    .filter(([, v]) => v.total_cents > 0)
    .sort((a, b) => b[1].total_cents - a[1].total_cents);

  return (
    <div className="space-y-4">
      {/* Period toggle */}
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold">Revenue</h2>
        <div className="flex rounded-lg border overflow-hidden">
          {(["daily", "weekly", "monthly"] as Period[]).map((p) => (
            <button key={p} onClick={() => setPeriod(p)} className={`px-3 py-1 text-xs font-medium capitalize ${period === p ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground hover:bg-muted"}`}>{p}</button>
          ))}
        </div>
      </div>

      {/* Summary row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <MiniCard title="Orders" value={loading ? "—" : String(totalOrders)} sub={PERIOD_LABELS[period]} />
        <MiniCard title="Revenue" value={loading ? "—" : fmt(totalRevenue)} sub={PERIOD_LABELS[period]} />
        <MiniCard title="Pending" value={loading ? "—" : String(pendingCount)} sub="orders" highlight={pendingCount > 0} />
        <MiniCard title="Avg Order" value={loading ? "—" : (avgOrder > 0 ? fmt(avgOrder) : "—")} sub={PERIOD_LABELS[period]} />
      </div>

      {/* Chart */}
      <div className="rounded-lg border bg-card p-4">
        <p className="text-xs font-semibold text-muted-foreground mb-3">Revenue by Payment Method</p>
        {loading ? (
          <div className="h-72 flex items-center justify-center text-muted-foreground text-sm">Loading...</div>
        ) : chartData.length === 0 ? (
          <div className="h-72 flex items-center justify-center text-muted-foreground text-sm">No revenue data</div>
        ) : (
          <ResponsiveContainer width="100%" height={288}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} />
              <YAxis tickFormatter={(v) => v >= 1000 ? `$${(v / 1000).toFixed(0)}k` : `$${v}`} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} />
              <Tooltip
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                formatter={((value: number, name: string) => [`$${value.toLocaleString("en-US", { minimumFractionDigits: 2 })}`, METHOD_CONFIG[name]?.label ?? name]) as any}
                contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "12px" }}
              />
              <Legend formatter={(v: string) => METHOD_CONFIG[v]?.label ?? v} wrapperStyle={{ fontSize: "11px" }} />
              {sortedMethods.map((m, i) => (
                <Bar key={m} dataKey={m} stackId="revenue" fill={METHOD_CONFIG[m]?.color ?? "#9ca3af"} radius={i === 0 ? [3, 3, 0, 0] : undefined} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Payment method cards */}
      {!loading && byMethod.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          {byMethod.map(([method, data]) => {
            const cfg = METHOD_CONFIG[method] ?? METHOD_CONFIG.unknown;
            const pct = totalRevenue > 0 ? ((data.total_cents / totalRevenue) * 100).toFixed(1) : "0";
            return (
              <div key={method} className="rounded-lg border p-3" style={{ borderLeftColor: cfg.color, borderLeftWidth: "3px" }}>
                <p className="text-xs font-medium text-muted-foreground">{cfg.label}</p>
                <p className="text-lg font-bold mt-1">{fmt(data.total_cents)}</p>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-[10px] text-muted-foreground">{data.count} order{data.count !== 1 ? "s" : ""}</span>
                  <span className="text-[10px] font-semibold" style={{ color: cfg.color }}>{pct}%</span>
                </div>
                <div className="h-1 bg-muted rounded-full mt-1.5 overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${Math.min(parseFloat(pct), 100)}%`, backgroundColor: cfg.color }} />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function MiniCard({ title, value, sub, highlight }: { title: string; value: string; sub: string; highlight?: boolean }) {
  return (
    <div className={`rounded-lg border p-3 ${highlight ? "border-accent/50 bg-accent/5" : "bg-card"}`}>
      <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">{title}</p>
      <p className={`text-xl font-bold mt-0.5 ${highlight ? "text-accent" : ""}`}>{value}</p>
      <p className="text-[10px] text-muted-foreground">{sub}</p>
    </div>
  );
}
