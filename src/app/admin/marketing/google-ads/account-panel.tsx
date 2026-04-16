"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { CheckCircle2, ExternalLink, Unplug } from "lucide-react";

type Props = {
  isConnected: boolean;
  email?: string;
  connectedAt?: string;
  publishMode: string;
  budgetCap: number;
  brandId: string;
};

export function GoogleAdsAccountPanel({
  isConnected,
  email,
  connectedAt,
  publishMode,
  budgetCap,
  brandId,
}: Props) {
  const [disconnecting, setDisconnecting] = useState(false);

  async function handleDisconnect() {
    if (!confirm("Disconnect Google Ads? You can reconnect later.")) return;
    setDisconnecting(true);
    try {
      await fetch("/api/marketing/google/oauth/revoke", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ brand_id: brandId }),
      });
      window.location.reload();
    } catch {
      setDisconnecting(false);
    }
  }

  if (!isConnected) {
    return (
      <div className="rounded-xl border bg-card p-8 text-center space-y-4">
        <div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center">
          <ExternalLink className="size-5 text-muted-foreground" />
        </div>
        <div>
          <p className="font-semibold">Not Connected</p>
          <p className="text-sm text-muted-foreground mt-1">
            Connect your Google Ads and Merchant Center accounts to enable
            campaign management and product feed sync.
          </p>
        </div>
        <Button asChild>
          <a href={`/api/marketing/google/oauth/start?brand_id=${brandId}`}>
            Connect Google
          </a>
        </Button>
      </div>
    );
  }

  return (
    <div className="rounded-xl border bg-card p-6 space-y-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center">
          <CheckCircle2 className="size-5 text-green-600" />
        </div>
        <div>
          <p className="font-semibold">Connected</p>
          <p className="text-sm text-muted-foreground">{email}</p>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3 text-sm">
        <div className="rounded-lg border p-3">
          <p className="text-muted-foreground text-xs">Connected</p>
          <p className="font-medium mt-0.5">
            {connectedAt ? new Date(connectedAt).toLocaleDateString() : "—"}
          </p>
        </div>
        <div className="rounded-lg border p-3">
          <p className="text-muted-foreground text-xs">Mode</p>
          <p className="font-medium mt-0.5 capitalize">{publishMode}</p>
        </div>
        <div className="rounded-lg border p-3">
          <p className="text-muted-foreground text-xs">Monthly Budget Cap</p>
          <p className="font-medium mt-0.5">${(budgetCap / 100).toLocaleString()}</p>
        </div>
      </div>

      <Button
        variant="outline"
        size="sm"
        onClick={handleDisconnect}
        disabled={disconnecting}
        className="text-destructive hover:text-destructive"
      >
        <Unplug className="size-4 mr-1.5" />
        {disconnecting ? "Disconnecting..." : "Disconnect"}
      </Button>
    </div>
  );
}
