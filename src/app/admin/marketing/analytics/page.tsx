"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

const API = process.env.NEXT_PUBLIC_MARKETING_API_URL || "http://localhost:3200";

export default function AnalyticsPage() {
  const [report, setReport] = useState<{ summary?: string; data?: Record<string, unknown>; message?: string } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API}/api/analytics/summary`).then(r => r.json()).then(d => {
      setReport(d); setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold">Analytics</h1>
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin" /></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Analytics</h1>

      {report?.summary ? (
        <div className="rounded-lg border bg-card p-6">
          <h2 className="text-sm font-medium mb-3">Weekly Performance Report</h2>
          <div className="prose prose-sm max-w-none text-muted-foreground whitespace-pre-wrap">
            {report.summary}
          </div>
        </div>
      ) : (
        <div className="rounded-lg border bg-muted/50 p-8 text-center">
          <p className="text-muted-foreground">
            {report?.message ?? "First analytics report generates Friday at 4 PM."}
          </p>
        </div>
      )}
    </div>
  );
}
