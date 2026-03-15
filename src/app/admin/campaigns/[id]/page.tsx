"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, BarChart3, CheckCircle2, Send, Users, XCircle } from "lucide-react";

type Campaign = {
  id: string;
  name: string;
  slug: string;
  channel: string;
  status: string;
  sms_body: string | null;
  email_subject: string | null;
  total_recipients: number;
  total_sent: number;
  total_delivered: number;
  total_failed: number;
  total_clicked: number;
  total_opted_out: number;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
};

type CampaignSend = {
  id: string;
  channel: string;
  phone: string | null;
  email: string | null;
  status: string;
  sent_at: string | null;
  link_clicked: boolean;
  error_message: string | null;
};

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-gray-100 text-gray-700",
  sent: "bg-green-100 text-green-700",
  delivered: "bg-green-200 text-green-800",
  failed: "bg-red-100 text-red-700",
  skipped: "bg-gray-100 text-gray-500",
  opted_out: "bg-yellow-100 text-yellow-700",
};

export default function CampaignDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [sends, setSends] = useState<CampaignSend[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");

  const fetchData = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/admin/campaigns/${params.id}`);
    if (res.ok) {
      const data = await res.json();
      setCampaign(data.campaign);
      setSends(data.sends || []);
    }
    setLoading(false);
  }, [params.id]);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (loading || !campaign) {
    return <div className="py-12 text-center text-muted-foreground">Loading...</div>;
  }

  const pctSent = campaign.total_recipients > 0 ? Math.round((campaign.total_sent / campaign.total_recipients) * 100) : 0;
  const pctClicked = campaign.total_sent > 0 ? Math.round((campaign.total_clicked / campaign.total_sent) * 100) : 0;
  const pctFailed = campaign.total_sent > 0 ? Math.round((campaign.total_failed / campaign.total_recipients) * 100) : 0;

  const filteredSends = statusFilter === "all" ? sends : sends.filter((s) => s.status === statusFilter);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => router.push("/admin/campaigns")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-semibold">{campaign.name}</h1>
          <p className="text-sm text-muted-foreground">
            {campaign.channel.toUpperCase()} · Created {new Date(campaign.created_at).toLocaleDateString()}
          </p>
        </div>
        <Badge className={STATUS_STYLES[campaign.status] || ""} >{campaign.status}</Badge>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-lg border bg-card p-4 text-center">
          <Users className="mx-auto mb-1 h-5 w-5 text-muted-foreground" />
          <p className="text-2xl font-bold">{campaign.total_recipients}</p>
          <p className="text-xs text-muted-foreground">Recipients</p>
        </div>
        <div className="rounded-lg border bg-card p-4 text-center">
          <Send className="mx-auto mb-1 h-5 w-5 text-green-600" />
          <p className="text-2xl font-bold text-green-600">{campaign.total_sent}</p>
          <p className="text-xs text-muted-foreground">Sent ({pctSent}%)</p>
        </div>
        <div className="rounded-lg border bg-card p-4 text-center">
          <BarChart3 className="mx-auto mb-1 h-5 w-5 text-blue-600" />
          <p className="text-2xl font-bold text-blue-600">{campaign.total_clicked}</p>
          <p className="text-xs text-muted-foreground">Clicked ({pctClicked}%)</p>
        </div>
        <div className="rounded-lg border bg-card p-4 text-center">
          <XCircle className="mx-auto mb-1 h-5 w-5 text-red-500" />
          <p className="text-2xl font-bold text-red-500">{campaign.total_failed}</p>
          <p className="text-xs text-muted-foreground">Failed ({pctFailed}%)</p>
        </div>
      </div>

      {/* Message preview */}
      {campaign.sms_body && (
        <div className="rounded-lg border bg-muted/30 p-4">
          <p className="mb-1 text-xs font-medium text-muted-foreground">SMS Message:</p>
          <p className="text-sm">{campaign.sms_body}</p>
        </div>
      )}

      {/* Send log */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-semibold">Send Log</h2>
          <div className="flex gap-1">
            {["all", "sent", "failed", "pending"].map((s) => (
              <Button key={s} size="sm" variant={statusFilter === s ? "default" : "outline"} onClick={() => setStatusFilter(s)}>
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </Button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead><tr className="border-b bg-muted/50 text-left">
              <th className="px-4 py-2 font-medium">Recipient</th>
              <th className="px-4 py-2 font-medium">Channel</th>
              <th className="px-4 py-2 font-medium">Status</th>
              <th className="px-4 py-2 font-medium">Sent</th>
              <th className="px-4 py-2 font-medium">Clicked</th>
              <th className="px-4 py-2 font-medium">Error</th>
            </tr></thead>
            <tbody>
              {filteredSends.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-6 text-center text-muted-foreground">No sends</td></tr>
              ) : filteredSends.map((s) => (
                <tr key={s.id} className="border-b">
                  <td className="px-4 py-2 text-xs">{s.phone || s.email || "—"}</td>
                  <td className="px-4 py-2">{s.channel}</td>
                  <td className="px-4 py-2"><Badge className={STATUS_STYLES[s.status] || ""}>{s.status}</Badge></td>
                  <td className="px-4 py-2 text-xs text-muted-foreground">{s.sent_at ? new Date(s.sent_at).toLocaleString() : "—"}</td>
                  <td className="px-4 py-2">{s.link_clicked ? <CheckCircle2 className="h-4 w-4 text-green-600" /> : "—"}</td>
                  <td className="px-4 py-2 text-xs text-red-500">{s.error_message || ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
