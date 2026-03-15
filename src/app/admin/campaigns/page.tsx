"use client";

import { useCallback, useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Plus, Send, Users, BarChart3 } from "lucide-react";

type Campaign = {
  id: string;
  slug: string;
  name: string;
  channel: string;
  status: string;
  total_recipients: number;
  total_sent: number;
  total_failed: number;
  total_clicked: number;
  scheduled_at: string | null;
  created_at: string;
};

const STATUS_STYLES: Record<string, string> = {
  draft: "bg-gray-100 text-gray-700",
  scheduled: "bg-blue-100 text-blue-700",
  sending: "bg-amber-100 text-amber-700",
  sent: "bg-green-100 text-green-700",
  paused: "bg-yellow-100 text-yellow-700",
  cancelled: "bg-red-100 text-red-700",
};

export default function AdminCampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCampaigns = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/admin/campaigns");
    if (res.ok) {
      const data = await res.json();
      setCampaigns(data.campaigns || []);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchCampaigns(); }, [fetchCampaigns]);

  async function updateStatus(id: string, status: string) {
    await fetch(`/api/admin/campaigns/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    fetchCampaigns();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Campaigns</h1>
          <p className="text-sm text-muted-foreground">SMS & email marketing campaigns</p>
        </div>
        <Link href="/admin/campaigns/new">
          <Button><Plus className="mr-2 h-4 w-4" /> New Campaign</Button>
        </Link>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-4 gap-3">
        <div className="rounded-lg border bg-card p-3 text-center">
          <p className="text-2xl font-bold">{campaigns.length}</p>
          <p className="text-xs text-muted-foreground">Total</p>
        </div>
        <div className="rounded-lg border bg-card p-3 text-center">
          <p className="text-2xl font-bold text-green-600">{campaigns.filter(c => c.status === "sent").length}</p>
          <p className="text-xs text-muted-foreground">Sent</p>
        </div>
        <div className="rounded-lg border bg-card p-3 text-center">
          <p className="text-2xl font-bold text-blue-600">{campaigns.reduce((s, c) => s + c.total_sent, 0)}</p>
          <p className="text-xs text-muted-foreground">Messages Sent</p>
        </div>
        <div className="rounded-lg border bg-card p-3 text-center">
          <p className="text-2xl font-bold text-accent">{campaigns.reduce((s, c) => s + c.total_clicked, 0)}</p>
          <p className="text-xs text-muted-foreground">Link Clicks</p>
        </div>
      </div>

      {/* Campaign list */}
      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead><tr className="border-b bg-muted/50 text-left">
            <th className="px-4 py-3 font-medium">Campaign</th>
            <th className="px-4 py-3 font-medium">Channel</th>
            <th className="px-4 py-3 font-medium">Status</th>
            <th className="px-4 py-3 font-medium">Recipients</th>
            <th className="px-4 py-3 font-medium">Sent</th>
            <th className="px-4 py-3 font-medium">Clicks</th>
            <th className="px-4 py-3 font-medium">Actions</th>
          </tr></thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">Loading...</td></tr>
            ) : campaigns.length === 0 ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">No campaigns yet</td></tr>
            ) : campaigns.map((c) => (
              <tr key={c.id} className="border-b hover:bg-muted/25">
                <td className="px-4 py-3">
                  <p className="font-medium">{c.name}</p>
                  <p className="text-xs text-muted-foreground">{c.slug}</p>
                </td>
                <td className="px-4 py-3">
                  <Badge variant="outline" className="text-xs">{c.channel.toUpperCase()}</Badge>
                </td>
                <td className="px-4 py-3">
                  <Badge className={STATUS_STYLES[c.status] || ""}>{c.status}</Badge>
                </td>
                <td className="px-4 py-3 flex items-center gap-1">
                  <Users className="h-3.5 w-3.5 text-muted-foreground" />
                  {c.total_recipients}
                </td>
                <td className="px-4 py-3">
                  <span className="flex items-center gap-1">
                    <Send className="h-3.5 w-3.5 text-muted-foreground" />
                    {c.total_sent}
                    {c.total_failed > 0 && <span className="text-xs text-red-500">({c.total_failed} failed)</span>}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className="flex items-center gap-1">
                    <BarChart3 className="h-3.5 w-3.5 text-muted-foreground" />
                    {c.total_clicked}
                    {c.total_sent > 0 && (
                      <span className="text-xs text-muted-foreground">
                        ({Math.round((c.total_clicked / c.total_sent) * 100)}%)
                      </span>
                    )}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-1">
                    {c.status === "draft" && (
                      <Button size="sm" variant="outline" onClick={() => updateStatus(c.id, "sending")}>
                        Send Now
                      </Button>
                    )}
                    {c.status === "sending" && (
                      <Button size="sm" variant="outline" onClick={() => updateStatus(c.id, "paused")}>
                        Pause
                      </Button>
                    )}
                    {c.status === "paused" && (
                      <Button size="sm" variant="outline" onClick={() => updateStatus(c.id, "sending")}>
                        Resume
                      </Button>
                    )}
                    {(c.status === "draft" || c.status === "scheduled") && (
                      <Button size="sm" variant="ghost" className="text-red-500" onClick={() => updateStatus(c.id, "cancelled")}>
                        Cancel
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
