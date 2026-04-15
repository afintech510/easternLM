"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Star, Send, Loader2, CheckCircle, Clock, XCircle, MessageSquare, Mail, Link2, MousePointerClick, Settings as SettingsIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

interface Settings {
  follow_up_enabled: boolean;
  google_review_url: string | null;
  yelp_review_url: string | null;
  follow_up_timezone: string | null;
}

interface Template {
  id: string;
  slug: string;
  name: string;
  channel: string;
  trigger_event: string;
  delay_minutes: number;
  sms_body: string | null;
  email_subject: string | null;
  email_body_html: string | null;
  is_active: boolean;
  max_sends_per_customer: number;
  cooldown_days: number;
}

interface FollowUp {
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
  review_submitted: boolean;
  order_id: string | null;
  error_message: string | null;
}

interface Metrics {
  total: number;
  sent: number;
  pending: number;
  failed: number;
  clicked: number;
  reviews_submitted: number;
  by_channel: { sms: number; email: number };
}

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-blue-100 text-blue-800",
  sent: "bg-green-100 text-green-800",
  delivered: "bg-green-200 text-green-900",
  failed: "bg-red-100 text-red-800",
  cancelled: "bg-gray-100 text-gray-600",
  opted_out: "bg-yellow-100 text-yellow-800",
};

function formatDelay(mins: number): string {
  if (mins < 60) return `${mins} min`;
  if (mins < 1440) return `${Math.round(mins / 60)} hr`;
  return `${Math.round(mins / 1440)} day${mins >= 2880 ? "s" : ""}`;
}

export default function ReviewRequestsPage() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [recent, setRecent] = useState<FollowUp[]>([]);
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
  const [manualOrderId, setManualOrderId] = useState("");
  const [manualResult, setManualResult] = useState("");

  const fetchData = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/admin/review-requests");
    if (res.ok) {
      const data = await res.json();
      setSettings(data.settings);
      setTemplates(data.templates ?? []);
      setRecent(data.recent ?? []);
      setMetrics(data.metrics);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  async function saveSettings(patch: Partial<Settings>) {
    setSaving(true);
    await fetch("/api/admin/review-requests", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ settings: { ...settings, ...patch } }),
    });
    await fetchData();
    setSaving(false);
  }

  async function saveTemplate() {
    if (!editingTemplate) return;
    setSaving(true);
    await fetch("/api/admin/review-requests", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ template: editingTemplate }),
    });
    setEditingTemplate(null);
    await fetchData();
    setSaving(false);
  }

  async function toggleTemplate(t: Template) {
    await fetch("/api/admin/review-requests", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ template: { id: t.id, is_active: !t.is_active } }),
    });
    await fetchData();
  }

  async function manualTrigger() {
    if (!manualOrderId.trim()) return;
    setManualResult("");
    const res = await fetch("/api/admin/review-requests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ order_id: manualOrderId.trim() }),
    });
    const data = await res.json();
    if (res.ok) {
      setManualResult(`Scheduled ${data.scheduled} follow-up${data.scheduled !== 1 ? "s" : ""}${data.skipped ? ` (${data.skipped} skipped)` : ""}`);
      setManualOrderId("");
      await fetchData();
    } else {
      setManualResult(data.error || "Failed");
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold">Review Requests</h1>
        <div className="flex justify-center py-12"><Loader2 className="size-6 animate-spin text-muted-foreground" /></div>
      </div>
    );
  }

  const enabled = settings?.follow_up_enabled ?? false;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Review Requests</h1>
        <p className="text-sm text-muted-foreground">Automated Google &amp; Yelp review solicitation after delivery</p>
      </div>

      {/* Master switch + review URLs */}
      <div className="rounded-lg border bg-card p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-semibold flex items-center gap-2"><SettingsIcon className="size-4" /> Settings</h2>
            <p className="text-xs text-muted-foreground">Review solicitation runs on the every-30-minute cron after delivery</p>
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={enabled}
              onChange={(e) => saveSettings({ follow_up_enabled: e.target.checked })}
              disabled={saving}
              className="size-5 rounded"
            />
            <span className={`text-sm font-semibold ${enabled ? "text-green-700" : "text-muted-foreground"}`}>
              {enabled ? "Enabled" : "Disabled"}
            </span>
          </label>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Google Review URL</label>
            <Input
              defaultValue={settings?.google_review_url ?? ""}
              onBlur={(e) => { if (e.target.value !== settings?.google_review_url) saveSettings({ google_review_url: e.target.value || null }); }}
              placeholder="https://maps.app.goo.gl/..."
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Yelp Review URL (optional)</label>
            <Input
              defaultValue={settings?.yelp_review_url ?? ""}
              onBlur={(e) => { if (e.target.value !== settings?.yelp_review_url) saveSettings({ yelp_review_url: e.target.value || null }); }}
              placeholder="https://www.yelp.com/writeareview/biz/..."
            />
          </div>
        </div>
      </div>

      {/* Metrics */}
      {metrics && (
        <div className="grid gap-3 grid-cols-2 sm:grid-cols-4 lg:grid-cols-6">
          <MetricCard label="Total (30d)" value={metrics.total} icon={<Send className="size-4" />} />
          <MetricCard label="Sent" value={metrics.sent} icon={<CheckCircle className="size-4 text-green-600" />} />
          <MetricCard label="Pending" value={metrics.pending} icon={<Clock className="size-4 text-blue-600" />} />
          <MetricCard label="Failed" value={metrics.failed} icon={<XCircle className="size-4 text-red-600" />} />
          <MetricCard label="Link Clicks" value={metrics.clicked} icon={<MousePointerClick className="size-4 text-purple-600" />} />
          <MetricCard label="Reviews Left" value={metrics.reviews_submitted} icon={<Star className="size-4 fill-amber-400 text-amber-400" />} />
        </div>
      )}

      {/* Templates */}
      <div className="rounded-lg border bg-card">
        <div className="border-b px-5 py-3">
          <h2 className="font-semibold">Templates</h2>
          <p className="text-xs text-muted-foreground">Customize the message copy sent to customers after delivery</p>
        </div>
        <div className="divide-y">
          {templates.map((t) => (
            <div key={t.id} className="px-5 py-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    {t.channel === "sms" ? <MessageSquare className="size-4 text-blue-600" /> : <Mail className="size-4 text-purple-600" />}
                    <span className="font-medium text-sm">{t.name}</span>
                    <Badge variant="outline" className="text-[10px]">{formatDelay(t.delay_minutes)} after delivery</Badge>
                    {!t.is_active && <Badge className="bg-gray-200 text-gray-700 text-[10px]">Disabled</Badge>}
                  </div>
                  {t.sms_body && (
                    <p className="mt-1.5 text-xs text-muted-foreground whitespace-pre-wrap line-clamp-2">
                      {t.sms_body}
                    </p>
                  )}
                  {t.email_subject && (
                    <p className="mt-1.5 text-xs">
                      <span className="text-muted-foreground">Subject:</span> <span className="font-medium">{t.email_subject}</span>
                    </p>
                  )}
                </div>
                <div className="flex gap-2 shrink-0">
                  <Button size="sm" variant="outline" onClick={() => setEditingTemplate(t)}>Edit</Button>
                  <Button size="sm" variant="ghost" onClick={() => toggleTemplate(t)}>
                    {t.is_active ? "Disable" : "Enable"}
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Manual trigger */}
      <div className="rounded-lg border bg-muted/30 p-5 space-y-3">
        <div>
          <h2 className="font-semibold text-sm">Manually Trigger for Order</h2>
          <p className="text-xs text-muted-foreground">Schedule review requests for a specific order (for testing or if delivery wasn&apos;t marked complete)</p>
        </div>
        <div className="flex gap-2">
          <Input
            value={manualOrderId}
            onChange={(e) => setManualOrderId(e.target.value)}
            placeholder="Order ID (full UUID or first 8 chars)"
            className="flex-1"
          />
          <Button onClick={manualTrigger} disabled={!manualOrderId.trim()}>Trigger</Button>
        </div>
        {manualResult && <p className="text-sm font-medium">{manualResult}</p>}
      </div>

      {/* Recent follow-ups */}
      <div className="rounded-lg border bg-card">
        <div className="border-b px-5 py-3 flex items-center justify-between">
          <div>
            <h2 className="font-semibold">Recent Solicitations</h2>
            <p className="text-xs text-muted-foreground">Last 90 days of review requests</p>
          </div>
          <Link href="/admin/follow-ups">
            <Button variant="ghost" size="sm">View All Follow-ups →</Button>
          </Link>
        </div>
        {recent.length === 0 ? (
          <p className="p-8 text-center text-sm text-muted-foreground">No review requests yet. They will appear here after your first delivery.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/30">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground">Customer</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground">Template</th>
                  <th className="px-4 py-2 text-center text-xs font-medium text-muted-foreground">Channel</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground">Status</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground">Scheduled</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground">Sent</th>
                  <th className="px-4 py-2 text-center text-xs font-medium text-muted-foreground">Clicked</th>
                  <th className="px-4 py-2 text-center text-xs font-medium text-muted-foreground">Review?</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {recent.map((f) => (
                  <tr key={f.id} className="hover:bg-muted/20">
                    <td className="px-4 py-2">
                      <div className="text-xs">{f.customer_name || "Unknown"}</div>
                      <div className="text-[10px] text-muted-foreground">{f.phone || f.email}</div>
                    </td>
                    <td className="px-4 py-2 text-xs">{f.template_slug.replace("review-", "")}</td>
                    <td className="px-4 py-2 text-center">
                      {f.channel === "sms" ? <MessageSquare className="size-3.5 inline text-blue-600" /> : <Mail className="size-3.5 inline text-purple-600" />}
                    </td>
                    <td className="px-4 py-2">
                      <Badge className={`text-[10px] ${STATUS_COLORS[f.status] || ""}`}>{f.status}</Badge>
                      {f.error_message && <p className="text-[10px] text-red-600 mt-0.5 max-w-[200px] truncate">{f.error_message}</p>}
                    </td>
                    <td className="px-4 py-2 text-xs text-muted-foreground">
                      {new Date(f.scheduled_at).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                    </td>
                    <td className="px-4 py-2 text-xs text-muted-foreground">
                      {f.sent_at ? new Date(f.sent_at).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) : "—"}
                    </td>
                    <td className="px-4 py-2 text-center">
                      {f.link_clicked ? <MousePointerClick className="size-3.5 inline text-purple-600" /> : <span className="text-muted-foreground text-xs">—</span>}
                    </td>
                    <td className="px-4 py-2 text-center">
                      {f.review_submitted ? <Star className="size-3.5 inline fill-amber-400 text-amber-400" /> : <span className="text-muted-foreground text-xs">—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Template Edit Modal */}
      {editingTemplate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setEditingTemplate(null)}>
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-lg bg-card p-6 shadow-lg space-y-4" onClick={e => e.stopPropagation()}>
            <div>
              <h3 className="text-lg font-semibold">{editingTemplate.name}</h3>
              <p className="text-xs text-muted-foreground">Variables available: <code className="bg-muted px-1 rounded">{"{{customer_name}}"}</code>, <code className="bg-muted px-1 rounded">{"{{review_url}}"}</code>, <code className="bg-muted px-1 rounded">{"{{product_summary}}"}</code>, <code className="bg-muted px-1 rounded">{"{{unsubscribe_url}}"}</code></p>
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium">Delay (minutes after delivery)</label>
              <Input
                type="number"
                value={editingTemplate.delay_minutes}
                onChange={(e) => setEditingTemplate({ ...editingTemplate, delay_minutes: parseInt(e.target.value) || 0 })}
              />
              <p className="text-xs text-muted-foreground">{formatDelay(editingTemplate.delay_minutes)}</p>
            </div>

            {editingTemplate.channel === "sms" && (
              <div className="space-y-1">
                <label className="text-sm font-medium">SMS Body</label>
                <textarea
                  value={editingTemplate.sms_body ?? ""}
                  onChange={(e) => setEditingTemplate({ ...editingTemplate, sms_body: e.target.value })}
                  className="w-full rounded-md border p-2 text-sm min-h-[120px]"
                />
              </div>
            )}

            {editingTemplate.channel === "email" && (
              <>
                <div className="space-y-1">
                  <label className="text-sm font-medium">Email Subject</label>
                  <Input
                    value={editingTemplate.email_subject ?? ""}
                    onChange={(e) => setEditingTemplate({ ...editingTemplate, email_subject: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium">Email Body (HTML)</label>
                  <textarea
                    value={editingTemplate.email_body_html ?? ""}
                    onChange={(e) => setEditingTemplate({ ...editingTemplate, email_body_html: e.target.value })}
                    className="w-full rounded-md border p-2 text-xs font-mono min-h-[200px]"
                  />
                </div>
              </>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setEditingTemplate(null)}>Cancel</Button>
              <Button onClick={saveTemplate} disabled={saving}>
                {saving ? <><Loader2 className="mr-2 size-4 animate-spin" />Saving…</> : "Save"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function MetricCard({ label, value, icon }: { label: string; value: number; icon: React.ReactNode }) {
  return (
    <div className="rounded-lg border bg-card p-3">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">{label}</p>
        {icon}
      </div>
      <p className="mt-1 text-2xl font-semibold">{value}</p>
    </div>
  );
}
