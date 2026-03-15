"use client";

import { useCallback, useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type FollowUp = {
  id: string;
  customer_name: string | null;
  phone: string | null;
  email: string | null;
  template_slug: string;
  channel: string;
  status: string;
  scheduled_at: string;
  sent_at: string | null;
  link_clicked: boolean;
  error_message: string | null;
  created_at: string;
};

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-blue-100 text-blue-800",
  sent: "bg-green-100 text-green-800",
  delivered: "bg-green-200 text-green-900",
  failed: "bg-red-100 text-red-800",
  cancelled: "bg-gray-100 text-gray-600",
  opted_out: "bg-yellow-100 text-yellow-800",
};

export default function AdminFollowUpsPage() {
  const [followUps, setFollowUps] = useState<FollowUp[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");

  const fetchData = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (filter !== "all") params.set("status", filter);
    const res = await fetch(`/api/admin/follow-ups?${params}`);
    if (res.ok) {
      const data = await res.json();
      setFollowUps(data.followUps || []);
    }
    setLoading(false);
  }, [filter]);

  useEffect(() => { fetchData(); }, [fetchData]);

  async function cancelFollowUp(id: string) {
    await fetch(`/api/admin/follow-ups/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: "cancelled" }) });
    fetchData();
  }

  // Stats
  const pending = followUps.filter((f) => f.status === "pending").length;
  const sent = followUps.filter((f) => f.status === "sent" || f.status === "delivered").length;
  const clicked = followUps.filter((f) => f.link_clicked).length;
  const failed = followUps.filter((f) => f.status === "failed").length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Follow-Ups</h1>
          <p className="text-sm text-muted-foreground">Automated post-delivery review requests</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3">
        <div className="rounded-lg border bg-card p-3 text-center">
          <p className="text-2xl font-bold text-blue-600">{pending}</p>
          <p className="text-xs text-muted-foreground">Pending</p>
        </div>
        <div className="rounded-lg border bg-card p-3 text-center">
          <p className="text-2xl font-bold text-green-600">{sent}</p>
          <p className="text-xs text-muted-foreground">Sent</p>
        </div>
        <div className="rounded-lg border bg-card p-3 text-center">
          <p className="text-2xl font-bold text-accent">{clicked}</p>
          <p className="text-xs text-muted-foreground">Clicked</p>
        </div>
        <div className="rounded-lg border bg-card p-3 text-center">
          <p className="text-2xl font-bold text-red-600">{failed}</p>
          <p className="text-xs text-muted-foreground">Failed</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        {["all", "pending", "sent", "failed", "cancelled"].map((s) => (
          <Button key={s} size="sm" variant={filter === s ? "default" : "outline"} onClick={() => setFilter(s)}>
            {s.charAt(0).toUpperCase() + s.slice(1)}
          </Button>
        ))}
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead><tr className="border-b bg-muted/50 text-left">
            <th className="px-4 py-3 font-medium">Customer</th>
            <th className="px-4 py-3 font-medium">Channel</th>
            <th className="px-4 py-3 font-medium">Template</th>
            <th className="px-4 py-3 font-medium">Status</th>
            <th className="px-4 py-3 font-medium">Scheduled</th>
            <th className="px-4 py-3 font-medium">Clicked</th>
            <th className="px-4 py-3 font-medium">Actions</th>
          </tr></thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">Loading...</td></tr>
            ) : followUps.length === 0 ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">No follow-ups yet</td></tr>
            ) : followUps.map((f) => (
              <tr key={f.id} className="border-b">
                <td className="px-4 py-3">
                  <p className="font-medium">{f.customer_name || "—"}</p>
                  <p className="text-xs text-muted-foreground">{f.phone || f.email || "—"}</p>
                </td>
                <td className="px-4 py-3">{f.channel}</td>
                <td className="px-4 py-3 text-xs">{f.template_slug}</td>
                <td className="px-4 py-3"><Badge className={STATUS_COLORS[f.status] || ""}>{f.status}</Badge></td>
                <td className="px-4 py-3 text-xs text-muted-foreground">{new Date(f.scheduled_at).toLocaleString()}</td>
                <td className="px-4 py-3">{f.link_clicked ? "Yes" : "—"}</td>
                <td className="px-4 py-3">
                  {f.status === "pending" && (
                    <Button size="sm" variant="ghost" className="text-red-500" onClick={() => cancelFollowUp(f.id)}>Cancel</Button>
                  )}
                  {f.error_message && <p className="text-xs text-red-500">{f.error_message}</p>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
