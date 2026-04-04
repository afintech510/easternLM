"use client";

import { useEffect, useState } from "react";
import { Settings, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const API = process.env.NEXT_PUBLIC_MARKETING_API_URL || "http://localhost:3200";

interface HealthData {
  status: string;
  agents: Record<string, string>;
  pending: number;
  daily_spend_cents: number;
}

export default function SettingsPage() {
  const [health, setHealth] = useState<HealthData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API}/health`).then(r => r.json()).then(d => {
      setHealth(d); setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold">Marketing Settings</h1>
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin" /></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Marketing Settings</h1>

      {/* Agent Liveness */}
      <div className="rounded-lg border bg-card p-4">
        <h2 className="text-sm font-medium mb-3">Agent Status</h2>
        {health?.agents ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {Object.entries(health.agents).map(([agent, status]) => (
              <div key={agent} className="flex items-center gap-3 rounded-md border p-3">
                <div className={`h-3 w-3 rounded-full ${
                  status === "busy" ? "bg-amber-400 animate-pulse" :
                  status === "idle" ? "bg-green-400" : "bg-red-400"
                }`} />
                <div>
                  <p className="text-sm font-medium capitalize">{agent}</p>
                  <p className="text-xs text-muted-foreground">{status}</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Unable to reach orchestrator.</p>
        )}
      </div>

      {/* Budget */}
      <div className="rounded-lg border bg-card p-4">
        <h2 className="text-sm font-medium mb-3">Daily Token Budget</h2>
        <div className="flex items-center gap-4">
          <div>
            <p className="text-2xl font-semibold">${((health?.daily_spend_cents ?? 0) / 100).toFixed(2)}</p>
            <p className="text-xs text-muted-foreground">spent today</p>
          </div>
          <div className="flex-1">
            <div className="h-2 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full rounded-full bg-primary transition-all"
                style={{ width: `${Math.min(100, ((health?.daily_spend_cents ?? 0) / 700) * 100)}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground mt-1">$7.00/day limit</p>
          </div>
        </div>
      </div>

      {/* Publish Mode */}
      <div className="rounded-lg border bg-card p-4">
        <h2 className="text-sm font-medium mb-3">Publish Mode</h2>
        <div className="flex items-center gap-3">
          <Badge className="bg-amber-100 text-amber-700">Draft Only</Badge>
          <p className="text-sm text-muted-foreground">
            Content is generated and queued but not auto-published.
            Switch to Live when Meta API app review is approved.
          </p>
        </div>
      </div>

      {/* Posting Schedule */}
      <div className="rounded-lg border bg-card p-4">
        <h2 className="text-sm font-medium mb-3">Posting Schedule</h2>
        <div className="grid gap-2 text-sm">
          <div className="flex justify-between border-b pb-2">
            <span className="text-muted-foreground">Instagram Feed</span>
            <span>Mon, Wed, Fri — 10:00 AM, 2:00 PM</span>
          </div>
          <div className="flex justify-between border-b pb-2">
            <span className="text-muted-foreground">Facebook Page</span>
            <span>Tue, Thu — 9:00 AM, 12:00 PM</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Google Business Profile</span>
            <span>Mon — 8:00 AM</span>
          </div>
        </div>
      </div>
    </div>
  );
}
