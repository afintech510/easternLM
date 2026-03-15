"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Calendar, Clock, Package, Truck } from "lucide-react";
import { formatUsd } from "@/lib/format";

type Briefing = {
  date: string;
  deliveries: { total: number; byTruck: Record<string, { count: number; towns: string[] }> };
  materials: Array<{ name: string; yards: number; orderCount: number }>;
  spreadingJobs: Array<{ material: string; yards: number; town: string; time: string }>;
  revenue: { deliveryCents: number; spreadingCents: number; totalCents: number };
  alerts: string[];
  unscheduled: number;
  pickups: number;
};

const TRUCK_LABELS: Record<string, string> = { small: "Small Dump", medium: "Medium Dump", "tri-axle": "Tri-Axle" };

export default function BriefingPage() {
  const [briefing, setBriefing] = useState<Briefing | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/operations/briefing")
      .then((r) => r.json())
      .then((d) => { setBriefing(d.briefing); setLoading(false); });
  }, []);

  if (loading) return <div className="py-20 text-center text-muted-foreground">Generating briefing...</div>;
  if (!briefing) return <div className="py-20 text-center text-muted-foreground">No data</div>;

  const totalYards = briefing.materials.reduce((s, m) => s + m.yards, 0);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center gap-3">
        <Calendar className="h-6 w-6 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">Morning Briefing</h1>
          <p className="text-sm text-muted-foreground">{new Date(briefing.date + "T12:00:00").toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}</p>
        </div>
      </div>

      {/* Alerts */}
      {briefing.alerts.length > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-950">
          <h2 className="flex items-center gap-2 font-semibold text-amber-800 dark:text-amber-200"><AlertTriangle className="h-4 w-4" /> Alerts</h2>
          <ul className="mt-2 space-y-1 text-sm text-amber-700 dark:text-amber-300">
            {briefing.alerts.map((a, i) => <li key={i}>{a}</li>)}
          </ul>
        </div>
      )}

      {/* Deliveries by truck */}
      <div className="rounded-xl border bg-card p-5">
        <h2 className="flex items-center gap-2 font-semibold mb-3"><Truck className="h-5 w-5" /> Deliveries: {briefing.deliveries.total} loads</h2>
        <div className="grid gap-3 sm:grid-cols-3">
          {Object.entries(briefing.deliveries.byTruck).map(([type, info]) => (
            <div key={type} className="rounded-lg border p-3">
              <p className="font-medium text-sm">{TRUCK_LABELS[type] || type}</p>
              <p className="text-2xl font-bold">{info.count}</p>
              <p className="text-xs text-muted-foreground">{info.towns.join(", ")}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Materials to load */}
      <div className="rounded-xl border bg-card p-5">
        <h2 className="flex items-center gap-2 font-semibold mb-3"><Package className="h-5 w-5" /> Materials: {totalYards} yards total</h2>
        <table className="w-full text-sm">
          <thead><tr className="border-b text-muted-foreground text-left">
            <th className="pb-2">Material</th><th className="pb-2 text-right">Yards</th><th className="pb-2 text-right">Orders</th>
          </tr></thead>
          <tbody>
            {briefing.materials.map((m) => (
              <tr key={m.name} className="border-b border-muted/30">
                <td className="py-1.5">{m.name}</td>
                <td className="py-1.5 text-right font-mono">{m.yards}</td>
                <td className="py-1.5 text-right text-muted-foreground">{m.orderCount}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Spreading jobs */}
      {briefing.spreadingJobs.length > 0 && (
        <div className="rounded-xl border bg-card p-5">
          <h2 className="font-semibold mb-3">Spreading Jobs: {briefing.spreadingJobs.length}</h2>
          {briefing.spreadingJobs.map((j, i) => (
            <div key={i} className="flex items-center justify-between border-b border-muted/30 py-2 text-sm">
              <span>{j.material} → {j.town}</span>
              <Badge variant="outline"><Clock className="mr-1 h-3 w-3" /> {j.time}</Badge>
            </div>
          ))}
        </div>
      )}

      {/* Revenue + Pickups */}
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border bg-card p-5">
          <h2 className="font-semibold mb-2">Estimated Revenue</h2>
          <p className="text-3xl font-bold text-primary">{formatUsd(briefing.revenue.totalCents)}</p>
        </div>
        <div className="rounded-xl border bg-card p-5">
          <h2 className="font-semibold mb-2">Pickups Expected</h2>
          <p className="text-3xl font-bold">{briefing.pickups}</p>
        </div>
      </div>
    </div>
  );
}
