"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";

export function FeedSyncButton() {
  const [syncing, setSyncing] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  async function handleSync() {
    setSyncing(true);
    setResult(null);
    try {
      const res = await fetch("/api/admin/marketing/google-ads/sync-feed", {
        method: "POST",
      });
      const data = await res.json();
      if (res.ok) {
        setResult(`Synced ${data.synced} products`);
        setTimeout(() => window.location.reload(), 1000);
      } else {
        setResult(`Error: ${data.error || "Unknown"}`);
      }
    } catch (err: any) {
      setResult(`Error: ${err.message}`);
    } finally {
      setSyncing(false);
    }
  }

  return (
    <div className="flex items-center gap-3">
      {result && (
        <span className="text-sm text-muted-foreground">{result}</span>
      )}
      <Button variant="outline" size="sm" onClick={handleSync} disabled={syncing}>
        <RefreshCw className={`size-4 mr-1.5 ${syncing ? "animate-spin" : ""}`} />
        {syncing ? "Syncing..." : "Sync from GMC"}
      </Button>
    </div>
  );
}
