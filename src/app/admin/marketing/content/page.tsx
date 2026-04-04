"use client";

import { useEffect, useState, useCallback } from "react";
import {
  CheckCircle, XCircle, Pencil, Copy, Download, Upload,
  Loader2, AlertTriangle, ChevronLeft, ChevronRight
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const API = process.env.NEXT_PUBLIC_MARKETING_API_URL || "http://localhost:3200";

interface ContentItem {
  id: string;
  platform: string;
  pillar: string;
  body: string;
  hashtags: string[];
  cta_url: string | null;
  status: string;
  scheduled_for: string | null;
  created_at: string;
  image_asset_ids: string[];
}

const PLATFORM_BADGE: Record<string, string> = {
  instagram_feed: "bg-pink-100 text-pink-700",
  instagram_story: "bg-pink-100 text-pink-700",
  facebook_page: "bg-blue-100 text-blue-700",
  google_business_profile: "bg-green-100 text-green-700",
};

const PILLAR_BADGE: Record<string, string> = {
  product_showcase: "bg-amber-100 text-amber-700",
  delivery_action: "bg-sky-100 text-sky-700",
  seasonal_tips: "bg-emerald-100 text-emerald-700",
  before_after: "bg-purple-100 text-purple-700",
  local_community: "bg-rose-100 text-rose-700",
  promotions: "bg-orange-100 text-orange-700",
  behind_scenes: "bg-gray-100 text-gray-700",
};

export default function ContentQueuePage() {
  const [items, setItems] = useState<ContentItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [publishMode, setPublishMode] = useState<string>("draft_only");
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const fetchContent = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/content/pending?page=${page}`);
      if (res.ok) {
        const data = await res.json();
        setItems(data.items ?? []);
        setTotal(data.total ?? 0);
      }
      // Check publish mode
      const healthRes = await fetch(`${API}/health`);
      if (healthRes.ok) {
        const health = await healthRes.json();
        // We'll get publish_mode from the brand check later
      }
    } catch { /* offline */ }
    setLoading(false);
  }, [page]);

  useEffect(() => { fetchContent(); }, [fetchContent]);

  const approve = async (id: string) => {
    await fetch(`${API}/api/content/${id}/approve`, { method: "POST" });
    setItems(prev => prev.filter(i => i.id !== id));
  };

  const reject = async () => {
    if (!rejectId || !rejectReason) return;
    await fetch(`${API}/api/content/${rejectId}/reject`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason: rejectReason }),
    });
    setItems(prev => prev.filter(i => i.id !== rejectId));
    setRejectId(null);
    setRejectReason("");
  };

  const copyCaption = async (id: string) => {
    const res = await fetch(`${API}/api/content/${id}/copy-caption`, { method: "POST" });
    if (res.ok) {
      const { caption } = await res.json();
      await navigator.clipboard.writeText(caption);
    }
  };

  const markPublished = async (id: string) => {
    await fetch(`${API}/api/content/${id}/mark-published-manually`, { method: "POST" });
    setItems(prev => prev.filter(i => i.id !== id));
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold">Content Queue</h1>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Content Queue</h1>
          <p className="text-sm text-muted-foreground">
            {total} items pending approval
          </p>
        </div>
        <Button onClick={fetchContent} variant="outline" size="sm">Refresh</Button>
      </div>

      {/* Draft-only banner */}
      {publishMode === "draft_only" && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            <p className="text-sm text-amber-800">
              <strong>Auto-publishing paused</strong> — Meta API review pending.
              Approved content must be published manually.
            </p>
          </div>
        </div>
      )}

      {items.length === 0 ? (
        <div className="rounded-lg border bg-muted/50 p-8 text-center">
          <p className="text-muted-foreground">No content pending approval.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map(item => (
            <div key={item.id} className="rounded-lg border bg-card p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge className={PLATFORM_BADGE[item.platform] ?? "bg-gray-100"}>
                      {item.platform.replace(/_/g, " ")}
                    </Badge>
                    <Badge className={PILLAR_BADGE[item.pillar] ?? "bg-gray-100"}>
                      {item.pillar.replace(/_/g, " ")}
                    </Badge>
                    {item.scheduled_for && (
                      <span className="text-xs text-muted-foreground">
                        {new Date(item.scheduled_for).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                      </span>
                    )}
                  </div>
                  <p className="text-sm line-clamp-3 whitespace-pre-wrap">{item.body}</p>
                  {item.hashtags?.length > 0 && (
                    <p className="text-xs text-muted-foreground mt-1 truncate">
                      {item.hashtags.slice(0, 8).map(h => `#${h}`).join(" ")}
                      {item.hashtags.length > 8 && ` +${item.hashtags.length - 8} more`}
                    </p>
                  )}
                </div>
                <div className="flex flex-col gap-1.5 shrink-0">
                  <Button size="sm" onClick={() => approve(item.id)} className="bg-green-600 hover:bg-green-700 text-white">
                    <CheckCircle className="mr-1 h-3.5 w-3.5" /> Approve
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => { setRejectId(item.id); }}>
                    <XCircle className="mr-1 h-3.5 w-3.5 text-red-500" /> Reject
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => copyCaption(item.id)}>
                    <Copy className="mr-1 h-3.5 w-3.5" /> Copy
                  </Button>
                  {publishMode === "draft_only" && (
                    <Button size="sm" variant="ghost" onClick={() => markPublished(item.id)}>
                      <Upload className="mr-1 h-3.5 w-3.5" /> Published
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {total > 20 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {(page - 1) * 20 + 1}-{Math.min(page * 20, total)} of {total}
          </p>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button size="sm" variant="outline" disabled={page * 20 >= total} onClick={() => setPage(p => p + 1)}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Reject modal */}
      {rejectId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-md rounded-lg bg-card p-6 shadow-lg">
            <h3 className="text-lg font-semibold mb-3">Rejection Reason</h3>
            <textarea
              className="w-full rounded-md border p-2 text-sm"
              rows={3}
              placeholder="Why is this content being rejected? This feedback improves future content."
              value={rejectReason}
              onChange={e => setRejectReason(e.target.value)}
            />
            <div className="flex justify-end gap-2 mt-3">
              <Button variant="outline" onClick={() => { setRejectId(null); setRejectReason(""); }}>Cancel</Button>
              <Button onClick={reject} disabled={!rejectReason} className="bg-red-600 hover:bg-red-700 text-white">Reject</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
