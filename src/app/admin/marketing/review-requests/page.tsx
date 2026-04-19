"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Star,
  Send,
  Loader2,
  CheckCircle,
  Clock,
  Mail,
  MessageSquare,
  MousePointerClick,
  X,
  Search,
  ExternalLink,
  MoreHorizontal,
  Truck,
  Ban,
  HardHat,
  Home,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

// ─── Types ────────────────────────────────────────────────────────

interface OrderItem {
  product_name: string;
  quantity: number;
  unit: string;
}

interface OutreachRecord {
  id: string;
  channel: string;
  template_slug: string;
  status: string;
  sent_at: string | null;
  link_clicked: boolean;
}

interface Order {
  id: string;
  customer_name: string;
  customer_phone: string | null;
  customer_email: string | null;
  customer_id: string | null;
  status: string;
  delivery_method: string;
  delivery_address: string | null;
  delivery_zip: string | null;
  materials_subtotal_cents: number;
  delivery_total_cents: number;
  grand_total_cents: number;
  placed_at: string;
  updated_at: string;
  source: string;
  sms_opt_in: boolean;
  items: OrderItem[];
  outreach: OutreachRecord[];
  customer_type: string | null;
}

interface Stats {
  deliveries_this_month: number;
  reviews_sent: number;
  clicks: number;
  click_rate: number;
}

interface Settings {
  follow_up_enabled: boolean;
  google_review_url: string | null;
  yelp_review_url: string | null;
}

// ─── Helpers ──────────────────────────────────────────────────────

function formatUsd(cents: number) {
  return `$${(cents / 100).toFixed(0)}`;
}

function formatPhone(phone: string | null) {
  if (!phone) return "";
  const d = phone.replace(/\D/g, "");
  if (d.length === 10) return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
  if (d.length === 11) return `(${d.slice(1, 4)}) ${d.slice(4, 7)}-${d.slice(7)}`;
  return phone;
}

function extractTown(address: string | null): string {
  if (!address) return "—";
  // Try "Street, Town, NY ZIP" or "Street, Town, State ZIP"
  const parts = address.split(",").map((s) => s.trim());
  if (parts.length >= 2) {
    // Town is typically the second-to-last part (before state/zip)
    const townPart = parts.length >= 3 ? parts[parts.length - 2] : parts[1];
    // Remove state and zip if present
    return townPart.replace(/\s+(NY|New York)\s*\d{5}(-\d{4})?$/i, "").trim() || townPart.trim();
  }
  return "—";
}

function formatDate(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const sameYear = d.getFullYear() === now.getFullYear();
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    ...(sameYear ? {} : { year: "2-digit" }),
  });
}

function compactItems(items: OrderItem[]): string {
  if (!items.length) return "—";
  return items
    .map((i) => {
      const name = i.product_name
        .replace(/^(Premium|Natural|Standard|Double Ground|Triple Ground)\s*/i, "")
        .replace(/\s*\(.*\)$/, "");
      const short = name.length > 18 ? name.slice(0, 16) + "…" : name;
      return `${i.quantity} ${short}`;
    })
    .join(" · ");
}

const STATUS_BADGE: Record<string, { label: string; className: string }> = {
  pending: { label: "Pending", className: "bg-yellow-100 text-yellow-800" },
  paid: { label: "Paid", className: "bg-blue-100 text-blue-800" },
  processing: { label: "Processing", className: "bg-indigo-100 text-indigo-800" },
  scheduled: { label: "Scheduled", className: "bg-purple-100 text-purple-800" },
  delivered: { label: "Delivered", className: "bg-green-100 text-green-800" },
  cancelled: { label: "Cancelled", className: "bg-red-100 text-red-800" },
  refunded: { label: "Refunded", className: "bg-gray-100 text-gray-600" },
};

// ─── Component ────────────────────────────────────────────────────

export default function ReviewRequestsPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [total, setTotal] = useState(0);
  const [stats, setStats] = useState<Stats | null>(null);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  // Filters
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [customerTypeFilter, setCustomerTypeFilter] = useState("");
  const [reviewStatusFilter, setReviewStatusFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const searchTimeout = useRef<ReturnType<typeof setTimeout>>(null);

  // Selection
  const [selected, setSelected] = useState<Set<string>>(new Set());

  // Modal
  const [sendModal, setSendModal] = useState<{
    orderIds: string[];
    channel: "sms" | "email";
    messageType: "review_request" | "review_reminder" | "marketing";
  } | null>(null);
  const [customMessage, setCustomMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState<{
    sent: number;
    skipped: number;
    errors: string[];
    skippedReasons: string[];
  } | null>(null);

  // Action menu
  const [actionMenuId, setActionMenuId] = useState<string | null>(null);

  // Bulk action loading
  const [bulkLoading, setBulkLoading] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: "50" });
    if (search) params.set("search", search);
    if (statusFilter) params.set("status", statusFilter);
    if (customerTypeFilter) params.set("customer_type", customerTypeFilter);
    if (reviewStatusFilter) params.set("review_status", reviewStatusFilter);
    if (dateFrom) params.set("date_from", dateFrom);
    if (dateTo) params.set("date_to", dateTo);

    const res = await fetch(`/api/admin/review-requests?${params}`);
    if (res.ok) {
      const data = await res.json();
      setOrders(data.orders);
      setTotal(data.total);
      setStats(data.stats);
      setSettings(data.settings);
    }
    setLoading(false);
  }, [page, search, statusFilter, customerTypeFilter, reviewStatusFilter, dateFrom, dateTo]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    setSelected(new Set());
  }, [page, statusFilter, customerTypeFilter, reviewStatusFilter]);

  function debouncedSearch(val: string) {
    setSearch(val);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => setPage(1), 300);
  }

  // ─── Bulk actions ───────────────────────────────────────────────

  async function bulkStatus(status: string) {
    if (!selected.size) return;
    setBulkLoading(true);
    await fetch("/api/admin/review-requests/bulk-status", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ order_ids: [...selected], status }),
    });
    setSelected(new Set());
    await fetchData();
    setBulkLoading(false);
  }

  async function bulkCustomerType(type: string) {
    if (!selected.size) return;
    setBulkLoading(true);
    await fetch("/api/admin/review-requests/bulk-customer-type", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ order_ids: [...selected], customer_type: type }),
    });
    setSelected(new Set());
    await fetchData();
    setBulkLoading(false);
  }

  async function toggleAutoSend(enabled: boolean) {
    await fetch("/api/admin/review-requests", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ settings: { follow_up_enabled: enabled } }),
    });
    setSettings((s) => (s ? { ...s, follow_up_enabled: enabled } : s));
  }

  async function toggleCustomerType(order: Order) {
    const cycle: (string | null)[] = [null, "homeowner", "contractor"];
    const idx = cycle.indexOf(order.customer_type);
    const next = cycle[(idx + 1) % cycle.length];
    if (!order.customer_id) return;

    await fetch("/api/admin/review-requests/bulk-customer-type", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ order_ids: [order.id], customer_type: next || "homeowner" }),
    });
    setOrders((prev) =>
      prev.map((o) => (o.id === order.id ? { ...o, customer_type: next || "homeowner" } : o))
    );
  }

  // ─── Send modal ─────────────────────────────────────────────────

  function openSendModal(
    orderIds: string[],
    channel: "sms" | "email",
    messageType: "review_request" | "review_reminder" | "marketing"
  ) {
    setSendModal({ orderIds, channel, messageType });
    setCustomMessage("");
    setSendResult(null);
    setActionMenuId(null);
  }

  async function executeSend() {
    if (!sendModal) return;
    setSending(true);
    setSendResult(null);

    const res = await fetch("/api/admin/review-requests/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        order_ids: sendModal.orderIds,
        channel: sendModal.channel,
        message_type: sendModal.messageType,
        ...(customMessage ? { custom_message: customMessage } : {}),
      }),
    });

    const data = await res.json();
    if (res.ok) {
      setSendResult(data);
      await fetchData();
    } else {
      setSendResult({ sent: 0, skipped: 0, errors: [data.error || "Failed"], skippedReasons: [] });
    }
    setSending(false);
  }

  const modalOrders = sendModal
    ? orders.filter((o) => sendModal.orderIds.includes(o.id))
    : [];

  function getDefaultMessage(): string {
    if (!sendModal) return "";
    if (sendModal.messageType === "review_request") {
      return `Hi {name}! Thanks for choosing Eastern Landscape & Mason Supply for your recent delivery. We'd love to hear about your experience! {review_link} - Reply STOP to opt out`;
    }
    if (sendModal.messageType === "review_reminder") {
      return `Hi {name}, just a friendly reminder — if you enjoyed your recent delivery from Eastern LM, we'd really appreciate a quick review! {review_link} - Reply STOP to opt out`;
    }
    return "";
  }

  // ─── Select all ─────────────────────────────────────────────────

  const allSelected = orders.length > 0 && orders.every((o) => selected.has(o.id));

  function toggleAll() {
    if (allSelected) {
      setSelected(new Set());
    } else {
      setSelected(new Set(orders.map((o) => o.id)));
    }
  }

  function toggleOne(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  // ─── Render ─────────────────────────────────────────────────────

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Review Requests</h1>
          <p className="text-sm text-muted-foreground">
            Manage deliveries, send review requests &amp; marketing texts
          </p>
        </div>
        <label className="flex items-center gap-2 cursor-pointer">
          <span className="text-xs text-muted-foreground">Auto-send</span>
          <button
            onClick={() => toggleAutoSend(!settings?.follow_up_enabled)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              settings?.follow_up_enabled ? "bg-green-600" : "bg-gray-300"
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                settings?.follow_up_enabled ? "translate-x-6" : "translate-x-1"
              }`}
            />
          </button>
        </label>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid gap-3 grid-cols-2 sm:grid-cols-4">
          <StatCard label="Deliveries (30d)" value={stats.deliveries_this_month} icon={<Truck className="size-4 text-blue-600" />} />
          <StatCard label="Reviews Sent" value={stats.reviews_sent} icon={<Send className="size-4 text-green-600" />} />
          <StatCard label="Clicks" value={stats.clicks} icon={<MousePointerClick className="size-4 text-purple-600" />} />
          <StatCard label="Click Rate" value={`${stats.click_rate}%`} icon={<Star className="size-4 fill-amber-400 text-amber-400" />} />
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
          <Input
            placeholder="Search name, phone, address..."
            value={search}
            onChange={(e) => debouncedSearch(e.target.value)}
            className="pl-8"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="h-9 rounded-md border bg-background px-3 text-sm"
        >
          <option value="">All statuses</option>
          <option value="pending">Pending</option>
          <option value="paid">Paid</option>
          <option value="processing">Processing</option>
          <option value="scheduled">Scheduled</option>
          <option value="delivered">Delivered</option>
          <option value="cancelled">Cancelled</option>
        </select>
        <select
          value={customerTypeFilter}
          onChange={(e) => { setCustomerTypeFilter(e.target.value); setPage(1); }}
          className="h-9 rounded-md border bg-background px-3 text-sm"
        >
          <option value="">All types</option>
          <option value="homeowner">Homeowner</option>
          <option value="contractor">Contractor</option>
          <option value="untagged">Untagged</option>
        </select>
        <select
          value={reviewStatusFilter}
          onChange={(e) => { setReviewStatusFilter(e.target.value); setPage(1); }}
          className="h-9 rounded-md border bg-background px-3 text-sm"
        >
          <option value="">Review: All</option>
          <option value="sent">Review Sent</option>
          <option value="not_sent">No Review Sent</option>
        </select>
        <Input
          type="date"
          value={dateFrom}
          onChange={(e) => { setDateFrom(e.target.value); setPage(1); }}
          className="w-[140px] h-9"
          placeholder="From"
        />
        <Input
          type="date"
          value={dateTo}
          onChange={(e) => { setDateTo(e.target.value); setPage(1); }}
          className="w-[140px] h-9"
          placeholder="To"
        />
      </div>

      {/* Bulk action bar */}
      {selected.size > 0 && (
        <div className="sticky top-0 z-20 flex flex-wrap items-center gap-2 rounded-lg border bg-card p-3 shadow-sm">
          <span className="text-sm font-medium mr-1">{selected.size} selected</span>
          <Button size="sm" variant="outline" onClick={() => bulkStatus("delivered")} disabled={bulkLoading}>
            <CheckCircle className="size-3.5 mr-1 text-green-600" /> Delivered
          </Button>
          <Button size="sm" variant="outline" onClick={() => bulkStatus("cancelled")} disabled={bulkLoading}>
            <Ban className="size-3.5 mr-1 text-red-500" /> Cancelled
          </Button>
          <div className="w-px h-6 bg-border" />
          <Button size="sm" variant="outline" onClick={() => bulkCustomerType("homeowner")} disabled={bulkLoading}>
            <Home className="size-3.5 mr-1" /> Homeowner
          </Button>
          <Button size="sm" variant="outline" onClick={() => bulkCustomerType("contractor")} disabled={bulkLoading}>
            <HardHat className="size-3.5 mr-1" /> Contractor
          </Button>
          <div className="w-px h-6 bg-border" />
          <Button
            size="sm"
            onClick={() => openSendModal([...selected], "sms", "review_request")}
          >
            <MessageSquare className="size-3.5 mr-1" /> Review SMS
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => openSendModal([...selected], "email", "review_request")}
          >
            <Mail className="size-3.5 mr-1" /> Review Email
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => openSendModal([...selected], "sms", "marketing")}
          >
            <Send className="size-3.5 mr-1" /> Marketing SMS
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => openSendModal([...selected], "sms", "review_reminder")}
          >
            <Clock className="size-3.5 mr-1" /> Reminder
          </Button>
          <button onClick={() => setSelected(new Set())} className="ml-auto p-1 text-muted-foreground hover:text-foreground">
            <X className="size-4" />
          </button>
        </div>
      )}

      {/* Table */}
      <div className="rounded-lg border bg-card overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="size-6 animate-spin text-muted-foreground" />
          </div>
        ) : orders.length === 0 ? (
          <p className="py-16 text-center text-sm text-muted-foreground">
            No orders found matching your filters.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-xs text-muted-foreground">
                <tr>
                  <th className="w-10 px-3 py-2.5">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      onChange={toggleAll}
                      className="size-4 rounded"
                    />
                  </th>
                  <th className="px-3 py-2.5 text-left font-medium">Order</th>
                  <th className="px-3 py-2.5 text-left font-medium">Date</th>
                  <th className="px-3 py-2.5 text-left font-medium">Customer</th>
                  <th className="px-3 py-2.5 text-left font-medium hidden sm:table-cell">Phone</th>
                  <th className="px-3 py-2.5 text-left font-medium">Town</th>
                  <th className="px-3 py-2.5 text-left font-medium hidden md:table-cell">Materials</th>
                  <th className="px-3 py-2.5 text-right font-medium">Total</th>
                  <th className="px-3 py-2.5 text-center font-medium">Type</th>
                  <th className="px-3 py-2.5 text-center font-medium">Status</th>
                  <th className="px-3 py-2.5 text-center font-medium">Review</th>
                  <th className="px-3 py-2.5 w-10"></th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {orders.map((order) => (
                  <OrderRow
                    key={order.id}
                    order={order}
                    isSelected={selected.has(order.id)}
                    onToggle={() => toggleOne(order.id)}
                    onToggleType={() => toggleCustomerType(order)}
                    actionMenuOpen={actionMenuId === order.id}
                    onActionMenu={() => setActionMenuId(actionMenuId === order.id ? null : order.id)}
                    onSend={(channel, type) => openSendModal([order.id], channel, type)}
                    onStatus={(status) => {
                      fetch("/api/admin/review-requests/bulk-status", {
                        method: "PATCH",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ order_ids: [order.id], status }),
                      }).then(() => fetchData());
                      setActionMenuId(null);
                    }}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {total > 50 && (
          <div className="flex items-center justify-between border-t px-4 py-3">
            <p className="text-xs text-muted-foreground">
              Showing {(page - 1) * 50 + 1}–{Math.min(page * 50, total)} of {total}
            </p>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                disabled={page === 1}
                onClick={() => setPage(page - 1)}
              >
                Previous
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={page * 50 >= total}
                onClick={() => setPage(page + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Send Modal */}
      {sendModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => !sending && setSendModal(null)}
        >
          <div
            className="w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-lg bg-card p-6 shadow-lg space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">
                {sendModal.messageType === "review_request" && "Send Review Request"}
                {sendModal.messageType === "review_reminder" && "Send Reminder"}
                {sendModal.messageType === "marketing" && "Send Marketing Text"}
              </h3>
              <button onClick={() => setSendModal(null)} disabled={sending}>
                <X className="size-5 text-muted-foreground" />
              </button>
            </div>

            {/* Channel */}
            <div className="flex gap-2">
              <button
                onClick={() => setSendModal({ ...sendModal, channel: "sms" })}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  sendModal.channel === "sms" ? "bg-blue-100 text-blue-800" : "bg-muted text-muted-foreground"
                }`}
              >
                <MessageSquare className="size-3.5" /> SMS
              </button>
              <button
                onClick={() => setSendModal({ ...sendModal, channel: "email" })}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  sendModal.channel === "email" ? "bg-purple-100 text-purple-800" : "bg-muted text-muted-foreground"
                }`}
              >
                <Mail className="size-3.5" /> Email
              </button>
            </div>

            {/* Recipients */}
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground">
                Recipients ({modalOrders.length})
              </p>
              <div className="max-h-32 overflow-y-auto rounded border p-2 space-y-1">
                {modalOrders.map((o) => {
                  const contact = sendModal.channel === "sms" ? o.customer_phone : o.customer_email;
                  const hasContact = !!contact;
                  const optedOut = sendModal.channel === "sms" && o.sms_opt_in === false;
                  return (
                    <div key={o.id} className="flex items-center justify-between text-xs">
                      <span>{o.customer_name}</span>
                      <span className={!hasContact || optedOut ? "text-red-500" : "text-muted-foreground"}>
                        {!hasContact ? `No ${sendModal.channel === "sms" ? "phone" : "email"}` : optedOut ? "Opted out" : (sendModal.channel === "sms" ? formatPhone(contact) : contact)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* From number */}
            {sendModal.channel === "sms" && (
              <p className="text-xs text-muted-foreground">
                From: {sendModal.messageType === "marketing" ? "(631) 366-8524 (marketing)" : "(631) 874-6244 (transactional)"}
              </p>
            )}

            {/* Message */}
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground">Message</p>
              <textarea
                value={customMessage || getDefaultMessage()}
                onChange={(e) => setCustomMessage(e.target.value)}
                className="w-full rounded-md border p-3 text-sm min-h-[100px]"
                placeholder={sendModal.messageType === "marketing" ? "Type your marketing message..." : undefined}
              />
              {sendModal.channel === "sms" && (
                <p className="text-xs text-muted-foreground">
                  {(customMessage || getDefaultMessage()).length} chars · {Math.ceil((customMessage || getDefaultMessage()).length / 160)} segment{Math.ceil((customMessage || getDefaultMessage()).length / 160) !== 1 ? "s" : ""}
                </p>
              )}
            </div>

            {/* Result */}
            {sendResult && (
              <div className="rounded-md border p-3 space-y-1">
                {sendResult.sent > 0 && (
                  <p className="text-sm text-green-700 font-medium">
                    <CheckCircle className="size-3.5 inline mr-1" />
                    Sent to {sendResult.sent} recipient{sendResult.sent !== 1 ? "s" : ""}
                  </p>
                )}
                {sendResult.skipped > 0 && (
                  <p className="text-sm text-yellow-700">
                    Skipped {sendResult.skipped}: {sendResult.skippedReasons?.join(", ")}
                  </p>
                )}
                {sendResult.errors.length > 0 && (
                  <p className="text-sm text-red-600">
                    Errors: {sendResult.errors.join(", ")}
                  </p>
                )}
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setSendModal(null)} disabled={sending}>
                {sendResult ? "Close" : "Cancel"}
              </Button>
              {!sendResult && (
                <Button onClick={executeSend} disabled={sending}>
                  {sending ? (
                    <><Loader2 className="mr-2 size-4 animate-spin" />Sending…</>
                  ) : (
                    `Send to ${modalOrders.length} recipient${modalOrders.length !== 1 ? "s" : ""}`
                  )}
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Click outside to close action menu */}
      {actionMenuId && (
        <div className="fixed inset-0 z-10" onClick={() => setActionMenuId(null)} />
      )}
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────

function OrderRow({
  order,
  isSelected,
  onToggle,
  onToggleType,
  actionMenuOpen,
  onActionMenu,
  onSend,
  onStatus,
}: {
  order: Order;
  isSelected: boolean;
  onToggle: () => void;
  onToggleType: () => void;
  actionMenuOpen: boolean;
  onActionMenu: () => void;
  onSend: (channel: "sms" | "email", type: "review_request" | "review_reminder" | "marketing") => void;
  onStatus: (status: string) => void;
}) {
  const badge = STATUS_BADGE[order.status] ?? { label: order.status, className: "bg-gray-100 text-gray-600" };
  const town = extractTown(order.delivery_address);

  // Review status
  const sentOutreach = order.outreach.filter((o) => o.status === "sent" || o.status === "delivered");
  const anyClicked = sentOutreach.some((o) => o.link_clicked);
  const sentCount = sentOutreach.length;

  return (
    <tr className={`hover:bg-muted/20 ${isSelected ? "bg-blue-50/50" : ""}`}>
      <td className="px-3 py-2.5">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={onToggle}
          className="size-4 rounded"
        />
      </td>
      <td className="px-3 py-2.5 text-xs font-mono text-muted-foreground">
        #{order.id.slice(0, 8)}
      </td>
      <td className="px-3 py-2.5 text-xs whitespace-nowrap">
        {formatDate(order.placed_at)}
      </td>
      <td className="px-3 py-2.5">
        <div className="text-sm font-medium truncate max-w-[140px]" title={order.customer_name}>
          {order.customer_name}
        </div>
        {order.customer_email && (
          <div className="text-[10px] text-muted-foreground truncate max-w-[140px]">
            {order.customer_email}
          </div>
        )}
      </td>
      <td className="px-3 py-2.5 hidden sm:table-cell">
        {order.customer_phone ? (
          <a
            href={`tel:${order.customer_phone}`}
            className="text-xs text-blue-600 hover:underline whitespace-nowrap"
          >
            {formatPhone(order.customer_phone)}
          </a>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        )}
      </td>
      <td className="px-3 py-2.5 text-xs whitespace-nowrap">{town}</td>
      <td className="px-3 py-2.5 hidden md:table-cell">
        <span className="text-xs text-muted-foreground truncate max-w-[200px] block">
          {compactItems(order.items)}
        </span>
      </td>
      <td className="px-3 py-2.5 text-right text-sm font-medium whitespace-nowrap">
        {formatUsd(order.grand_total_cents)}
      </td>
      <td className="px-3 py-2.5 text-center">
        <button onClick={onToggleType} className="inline-block" title="Click to change type">
          {order.customer_type === "contractor" ? (
            <Badge className="bg-blue-100 text-blue-800 text-[10px] cursor-pointer hover:bg-blue-200">CO</Badge>
          ) : order.customer_type === "homeowner" ? (
            <Badge className="bg-green-100 text-green-800 text-[10px] cursor-pointer hover:bg-green-200">HO</Badge>
          ) : order.customer_type === "business" ? (
            <Badge className="bg-orange-100 text-orange-800 text-[10px] cursor-pointer hover:bg-orange-200">BIZ</Badge>
          ) : (
            <span className="text-muted-foreground text-xs">—</span>
          )}
        </button>
      </td>
      <td className="px-3 py-2.5 text-center">
        <Badge className={`text-[10px] ${badge.className}`}>{badge.label}</Badge>
      </td>
      <td className="px-3 py-2.5 text-center">
        {sentCount === 0 ? (
          <span className="text-muted-foreground text-xs">—</span>
        ) : anyClicked ? (
          <span title={`Clicked! Sent ${sentCount}x`}>
            <CheckCircle className="size-4 inline text-green-600" />
          </span>
        ) : (
          <span
            title={`Sent ${sentCount}x — ${sentOutreach.map((o) => formatDate(o.sent_at!)).join(", ")}`}
          >
            <Mail className="size-4 inline text-yellow-500" />
            {sentCount > 1 && <span className="text-[10px] text-muted-foreground ml-0.5">{sentCount}x</span>}
          </span>
        )}
      </td>
      <td className="px-3 py-2.5 relative">
        <button onClick={onActionMenu} className="p-1 rounded hover:bg-muted">
          <MoreHorizontal className="size-4" />
        </button>
        {actionMenuOpen && (
          <div className="absolute right-0 top-full z-30 w-48 rounded-md border bg-card py-1 shadow-lg">
            <MenuItem onClick={() => onSend("sms", "review_request")} icon={<MessageSquare className="size-3.5" />} label="Send Review SMS" />
            <MenuItem onClick={() => onSend("email", "review_request")} icon={<Mail className="size-3.5" />} label="Send Review Email" />
            <MenuItem onClick={() => onSend("sms", "review_reminder")} icon={<Clock className="size-3.5" />} label="Send Reminder" />
            <MenuItem onClick={() => onSend("sms", "marketing")} icon={<Send className="size-3.5" />} label="Send Marketing Text" />
            <div className="my-1 border-t" />
            <MenuItem onClick={() => onStatus("delivered")} icon={<CheckCircle className="size-3.5 text-green-600" />} label="Mark Delivered" />
            <MenuItem onClick={() => onStatus("cancelled")} icon={<Ban className="size-3.5 text-red-500" />} label="Mark Cancelled" />
            <div className="my-1 border-t" />
            <a
              href={`/admin/operations?order=${order.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-3 py-1.5 text-sm hover:bg-muted cursor-pointer"
            >
              <ExternalLink className="size-3.5" /> View Order
            </a>
          </div>
        )}
      </td>
    </tr>
  );
}

function MenuItem({ onClick, icon, label }: { onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button
      onClick={onClick}
      className="flex w-full items-center gap-2 px-3 py-1.5 text-sm text-left hover:bg-muted"
    >
      {icon} {label}
    </button>
  );
}

function StatCard({ label, value, icon }: { label: string; value: number | string; icon: React.ReactNode }) {
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
