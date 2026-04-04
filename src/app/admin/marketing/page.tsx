"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Share2, FileText, CheckCircle, TrendingUp, AlertTriangle,
  RefreshCw, Loader2
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface HealthData {
  status: string;
  agents: Record<string, string>;
  pending: number;
  daily_spend_cents: number;
  ws_clients: number;
}

interface AnalyticsSummary {
  summary?: string;
  message?: string;
  data?: { social?: { total_posts?: number; total_likes?: number; total_reach?: number } };
}

const API_URL = process.env.NEXT_PUBLIC_MARKETING_API_URL || "http://localhost:3200";

async function apiFetch<T>(path: string): Promise<T | null> {
  try {
    const res = await fetch(`${API_URL}${path}`, { cache: "no-store" });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export default function MarketingDashboard() {
  const [health, setHealth] = useState<HealthData | null>(null);
  const [analytics, setAnalytics] = useState<AnalyticsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(false);
    const [h, a] = await Promise.all([
      apiFetch<HealthData>("/health"),
      apiFetch<AnalyticsSummary>("/api/analytics/summary"),
    ]);
    if (!h) setError(true);
    setHealth(h);
    setAnalytics(a);
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold">Marketing Engine</h1>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[1,2,3,4].map(i => (
            <div key={i} className="h-24 rounded-lg border bg-card animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold">Marketing Engine</h1>
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-6 text-center">
          <AlertTriangle className="mx-auto mb-2 h-8 w-8 text-amber-500" />
          <p className="font-medium text-amber-800">Marketing engine unreachable</p>
          <p className="text-sm text-amber-600 mt-1">
            The orchestrator at {API_URL} is not responding.
          </p>
          <Button onClick={fetchData} variant="outline" className="mt-4">
            <RefreshCw className="mr-2 h-4 w-4" /> Retry
          </Button>
        </div>
      </div>
    );
  }

  const social = analytics?.data?.social;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Marketing Engine</h1>
          <p className="text-sm text-muted-foreground">
            AI-powered social media for Eastern LM
          </p>
        </div>
        <Button onClick={fetchData} variant="outline" size="sm">
          <RefreshCw className="mr-2 h-4 w-4" /> Refresh
        </Button>
      </div>

      {/* Stat cards */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Posts This Week"
          value={social?.total_posts ?? 0}
          icon={Share2}
        />
        <StatCard
          label="Pending Approval"
          value={health?.pending ?? 0}
          icon={FileText}
          highlight={health?.pending ? health.pending > 0 : false}
        />
        <StatCard
          label="Total Engagement"
          value={(social?.total_likes ?? 0) + (social?.total_reach ?? 0)}
          icon={TrendingUp}
        />
        <StatCard
          label="Daily Spend"
          value={`${((health?.daily_spend_cents ?? 0) / 100).toFixed(2)}`}
          icon={CheckCircle}
          prefix="$"
        />
      </div>

      {/* Agent status */}
      <div className="rounded-lg border bg-card p-4">
        <h2 className="text-sm font-medium mb-3">Agent Status</h2>
        <div className="flex flex-wrap gap-3">
          {health?.agents && Object.entries(health.agents).map(([agent, status]) => (
            <div key={agent} className="flex items-center gap-2">
              <div className={`h-2.5 w-2.5 rounded-full ${
                status === "busy" ? "bg-amber-400 animate-pulse" : "bg-green-400"
              }`} />
              <span className="text-sm capitalize">{agent}</span>
              <Badge variant="outline" className="text-xs">{status}</Badge>
            </div>
          ))}
        </div>
      </div>

      {/* Latest report summary */}
      {analytics?.summary ? (
        <div className="rounded-lg border bg-card p-4">
          <h2 className="text-sm font-medium mb-2">Latest Analytics Summary</h2>
          <div className="prose prose-sm max-w-none text-muted-foreground whitespace-pre-wrap">
            {analytics.summary}
          </div>
        </div>
      ) : (
        <div className="rounded-lg border bg-muted/50 p-6 text-center">
          <p className="text-sm text-muted-foreground">
            No content generated yet — the first batch will arrive Monday at 6 AM.
            Make sure to upload some yard photos first!
          </p>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, icon: Icon, highlight, prefix }: {
  label: string; value: number | string; icon: React.ElementType; highlight?: boolean; prefix?: string
}) {
  return (
    <div className={`rounded-lg border p-4 ${highlight ? "border-amber-300 bg-amber-50" : "bg-card"}`}>
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{label}</p>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </div>
      <p className="mt-1 text-2xl font-semibold">{prefix}{value}</p>
    </div>
  );
}
