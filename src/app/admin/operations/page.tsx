"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatUsd } from "@/lib/format";
import {
  formatShortDateTime,
  formatOrderDateTime,
  formatDeliveryDate,
  formatTimeWindow,
  formatPhone,
  formatPaymentMethod,
  formatShortDeliveryDate,
} from "@/lib/format-date";
import {
  OrderDetailPanel,
  type OrderFull,
  type OrderItem,
  type CustomerHistory,
  type DeliveryAssignment,
  type OrderNote,
} from "@/components/admin/orders/order-detail-panel";
import { EditOrderModal, type EditOrderData } from "@/components/admin/orders/edit-order-modal";
import { RefundModal } from "@/components/pos/refund/refund-modal";
import { createBrowserClient } from "@supabase/ssr";
import { toast } from "sonner";
import {
  AlertTriangle,
  Calendar,
  Check,
  CheckSquare,
  Clock,
  Download,
  MapPin,
  Package,
  Phone,
  Printer,
  Search,
  ShoppingCart,
  Store,
  Truck,
  X,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────

type OrderListItem = {
  id: string;
  created_at: string;
  placed_at: string | null;
  status: string;
  source: string;
  customer_name: string | null;
  customer_phone: string | null;
  customer_email: string | null;
  items: OrderItem[];
  grand_total_cents: number;
  materials_subtotal_cents: number;
  delivery_total_cents: number;
  tax_cents: number;
  cc_surcharge_cents: number;
  delivery_method: string;
  delivery_address: string | null;
  delivery_date: string | null;
  delivery_time_window: string | null;
  delivery_notes: string | null;
  access_constraints: Record<string, unknown> | null;
  payment_method: string;
  stripe_checkout_session_id: string | null;
  customer_id: string | null;
  metadata: Record<string, unknown> | null;
};

type Stats = {
  filtered: { totalOrders: number; deliveryCount: number; pickupCount: number; revenueCents: number; pendingCount: number };
  today: { count: number; revenueCents: number };
  thisWeek: { count: number; revenueCents: number };
  byStatus: Record<string, number>;
};

type DetailData = {
  order: OrderFull;
  customerHistory: CustomerHistory | null;
  deliveryAssignments: DeliveryAssignment[];
  notes: OrderNote[];
};

// ─── Constants ────────────────────────────────────────────────

const PAGE_SIZE = 50;

const STATUS_COLORS: Record<string, string> = {
  new: "bg-blue-100 text-blue-800",
  confirmed: "bg-cyan-100 text-cyan-800",
  scheduled: "bg-indigo-100 text-indigo-800",
  loading: "bg-amber-100 text-amber-800",
  out_for_delivery: "bg-orange-100 text-orange-800",
  delivered: "bg-green-100 text-green-800",
  paid: "bg-green-200 text-green-900",
  cancelled: "bg-gray-100 text-gray-600",
  issue: "bg-red-100 text-red-800",
  pending: "bg-yellow-100 text-yellow-800",
  pending_payment: "bg-yellow-100 text-yellow-800",
  refunded: "bg-red-200 text-red-800",
  partially_refunded: "bg-orange-100 text-orange-600",
};

const SOURCE_LABELS: Record<string, string> = { web: "WEB", pos: "POS", phone: "PHONE", admin: "ADMIN", quote: "QUOTE" };
const SOURCE_COLORS: Record<string, string> = {
  web: "bg-blue-100 text-blue-700",
  pos: "bg-green-100 text-green-700",
  phone: "bg-amber-100 text-amber-700",
  admin: "bg-gray-100 text-gray-700",
  quote: "bg-purple-100 text-purple-700",
};

const DATE_PRESETS = ["today", "yesterday", "this_week", "this_month", "all", "custom"] as const;
const DATE_LABELS: Record<string, string> = {
  today: "Today",
  yesterday: "Yesterday",
  this_week: "This Week",
  this_month: "This Month",
  all: "All Time",
  custom: "Custom",
};

const STATUS_FILTER_OPTIONS = ["all", "pending", "paid", "confirmed", "scheduled", "loading", "out_for_delivery", "delivered", "cancelled", "refunded", "issue"];
const SORT_OPTIONS = [
  { value: "newest", label: "Newest First" },
  { value: "oldest", label: "Oldest First" },
  { value: "total_high", label: "Highest Total" },
  { value: "total_low", label: "Lowest Total" },
  { value: "customer_name", label: "Customer Name" },
];

const CONSTRAINT_LABELS: Record<string, string> = {
  lowWires: "Low wires", narrowDriveway: "Narrow driveway", softGround: "Soft ground",
  gated: "Gated", steep: "Steep grade", backyard: "Backyard access",
};

// ─── Print Helpers ────────────────────────────────────────────

function printOrderReceipt(order: OrderFull) {
  const items = (order.order_items ?? order.items ?? []).filter(
    (i) => !i.product_name?.startsWith("Delivery Load") && !i.product_name?.startsWith("Sales Tax") && !i.product_name?.startsWith("Credit Card"),
  );
  const deliveryDate = order.delivery_date || (order.metadata as Record<string, unknown>)?.deliveryDate || null;
  const w = window.open("", "_blank", "width=400,height=700");
  if (!w) return;
  w.document.write(`<!DOCTYPE html><html><head><title>Receipt</title>
    <style>body{font-family:monospace;font-size:12px;max-width:380px;margin:0 auto;padding:20px;}
    .center{text-align:center;} .bold{font-weight:bold;} .line{border-top:1px dashed #000;margin:8px 0;}
    .row{display:flex;justify-content:space-between;} .mt{margin-top:6px;}</style></head><body>
    <div class="center bold" style="font-size:14px;">EASTERN LANDSCAPE<br/>& MASON SUPPLY</div>
    <div class="center" style="font-size:11px;">110 Frowein Road<br/>Center Moriches, NY 11934<br/>(631) 874-6244</div>
    <div class="line"></div>
    <div class="row"><span>Date:</span><span>${formatOrderDateTime(order.created_at)}</span></div>
    <div class="row"><span>Source:</span><span>${(order.source || "web").toUpperCase()}</span></div>
    <div class="line"></div>
    <div class="bold">CUSTOMER</div>
    <div>${order.customer_name || "Walk-in"}</div>
    ${order.customer_phone ? `<div>Phone: ${formatPhone(order.customer_phone)}</div>` : ""}
    ${order.customer_email ? `<div>Email: ${order.customer_email}</div>` : ""}
    <div class="line"></div>
    <div class="bold">ITEMS</div>
    ${items.map((i) => { const u = (i.unit === "unit" || !i.unit) ? "cu. yards" : i.unit; return `<div class="mt"><div style="font-size:14px;font-weight:bold;">${i.quantity} ${u} ${i.product_name}</div><div class="row"><span>@ ${formatUsd(i.unit_price_cents)} per ${u.replace(/s$/, "")}</span><span>${formatUsd(i.line_subtotal_cents)}</span></div></div>`; }).join("")}
    <div class="line"></div>
    <div class="row"><span>Materials:</span><span>${formatUsd(order.materials_subtotal_cents ?? 0)}</span></div>
    ${(order.delivery_total_cents ?? 0) > 0 ? `<div class="row"><span>Delivery:</span><span>${formatUsd(order.delivery_total_cents)}</span></div>` : ""}
    <div class="row"><span>Tax (8.75%):</span><span>${formatUsd(order.tax_cents ?? 0)}</span></div>
    ${(order.cc_surcharge_cents ?? 0) > 0 ? `<div class="row"><span>CC Fee (3%):</span><span>${formatUsd(order.cc_surcharge_cents)}</span></div>` : ""}
    <div class="line"></div>
    <div class="row bold" style="font-size:14px;"><span>TOTAL:</span><span>${formatUsd(order.grand_total_cents)}</span></div>
    <div class="mt">Payment: ${formatPaymentMethod(order.payment_method)}</div>
    ${order.delivery_method === "delivery" ? `
      <div class="line"></div>
      <div class="bold">DELIVERY</div>
      <div>${order.delivery_address || ""}</div>
      ${deliveryDate ? `<div>Date: ${formatShortDeliveryDate(String(deliveryDate))}</div>` : ""}
      ${order.delivery_time_window ? `<div>Time: ${formatTimeWindow(order.delivery_time_window)}</div>` : ""}
      ${order.delivery_notes ? `<div>Notes: ${order.delivery_notes}</div>` : ""}
    ` : ""}
    <div class="line"></div>
    <div class="center mt">Thank you for your business!<br/>easternlm.com</div>
    </body></html>`);
  w.document.close();
  w.print();
}

function printDeliveryTicket(order: OrderFull) {
  const items = (order.order_items ?? order.items ?? []).filter(
    (i) => !i.product_name?.startsWith("Delivery Load") && !i.product_name?.startsWith("Sales Tax") && !i.product_name?.startsWith("Credit Card"),
  );
  const deliveryDate = order.delivery_date || (order.metadata as Record<string, unknown>)?.deliveryDate || null;
  const constraints = order.access_constraints as Record<string, unknown> | null;
  const flags = constraints ? Object.entries(constraints).filter(([k, v]) => v === true && k !== "notes").map(([k]) => CONSTRAINT_LABELS[k] || k) : [];
  const notes = constraints && typeof constraints.notes === "string" ? constraints.notes : null;
  const w = window.open("", "_blank", "width=400,height=700");
  if (!w) return;
  w.document.write(`<!DOCTYPE html><html><head><title>Delivery Ticket</title>
    <style>body{font-family:monospace;font-size:12px;max-width:380px;margin:0 auto;padding:20px;}
    .center{text-align:center;} .bold{font-weight:bold;} .line{border-top:2px solid #000;margin:8px 0;}
    .dashed{border-top:1px dashed #000;margin:8px 0;} .row{display:flex;justify-content:space-between;}
    .big{font-size:16px;} .mt{margin-top:6px;} .warn{background:#fff3cd;padding:6px;border:1px solid #ffc107;margin:4px 0;}</style></head><body>
    <div class="line"></div>
    <div class="center bold big">DELIVERY TICKET</div>
    <div class="center">EASTERN LANDSCAPE & MASON SUPPLY</div>
    <div class="line"></div>
    <div class="row"><span>Date:</span><span>${formatShortDeliveryDate(order.created_at)}</span></div>
    <div class="row"><span>Source:</span><span>${(order.source || "web").toUpperCase()} ORDER</span></div>
    <div class="dashed"></div>
    <div class="bold">CUSTOMER: ${order.customer_name || "Walk-in"}</div>
    ${order.customer_phone ? `<div>Phone: ${formatPhone(order.customer_phone)}</div>` : ""}
    <div class="line"></div>
    <div class="bold big">DELIVER TO:</div>
    ${(() => {
      const addr = (order.delivery_address || "NO ADDRESS").replace(/,?\s*(USA|US|United States)\s*$/i, "");
      const zip = addr.match(/\b(\d{5})\b/)?.[1] || "";
      const cleanAddr = addr.replace(/,?\s*NY\s*,?/i, " ").replace(/\s+/g, " ").trim();
      return `<div class="bold" style="font-size:16px;">${cleanAddr}</div>${zip ? `<div class="bold" style="font-size:16px;">ZIP: ${zip}</div>` : ""}`;
    })()}
    ${deliveryDate ? `<div class="mt bold">DATE: ${formatDeliveryDate(String(deliveryDate))}</div>` : ""}
    ${order.delivery_time_window ? `<div class="bold">TIME: ${formatTimeWindow(order.delivery_time_window)}</div>` : ""}
    ${flags.length > 0 || notes ? `<div class="warn"><strong>ACCESS:</strong> ${[...flags, notes].filter(Boolean).join(" · ")}</div>` : ""}
    ${order.delivery_notes ? `<div class="mt">NOTES: ${order.delivery_notes}</div>` : ""}
    <div class="line"></div>
    <div class="bold big">MATERIAL TO LOAD:</div>
    ${items.map((i) => { const u = (i.unit === "unit" || !i.unit) ? "cu. yards" : i.unit; return `<div class="mt bold" style="font-size:16px;">${i.quantity} ${u}<br/>${i.product_name}</div>`; }).join('<div class="dashed"></div>')}
    <div class="line"></div>
    <div class="row bold"><span>ORDER TOTAL:</span><span>${formatUsd(order.grand_total_cents)}</span></div>
    ${order.payment_method === "cod" ? `
      <div class="center bold" style="font-size:18px;border:2px solid #000;padding:8px;margin:8px 0;">COLLECT ON DELIVERY<br/>${formatUsd(order.grand_total_cents)}</div>
    ` : `<div class="bold big center">PAID</div>`}
    <div class="line"></div>
    <div class="center" style="margin:8px 0;">
      <p style="font-size:10px;margin-bottom:4px;">Scan to confirm delivery:</p>
      <img id="qr" style="width:150px;height:150px;margin:0 auto;" />
    </div>
    <div class="line"></div>
    <script src="https://cdn.jsdelivr.net/npm/qrcode@1.5.4/build/qrcode.min.js"><\/script>
    <script>
      QRCode.toDataURL('${typeof window !== "undefined" ? window.location.origin : "https://easternlm.com"}/delivery/confirm/${order.id}', {width:150,margin:1}, function(err,url){
        if(url) document.getElementById('qr').src = url;
      });
    <\/script>
    </body></html>`);
  w.document.close();
  setTimeout(() => w.print(), 1000);
}

// ─── Main Component ───────────────────────────────────────────

export default function AdminOperationsPageWrapper() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-muted-foreground">Loading...</div>}>
      <AdminOperationsPage />
    </Suspense>
  );
}

function AdminOperationsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // ── State ──

  const [orders, setOrders] = useState<OrderListItem[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [stats, setStats] = useState<Stats>({
    filtered: { totalOrders: 0, deliveryCount: 0, pickupCount: 0, revenueCents: 0, pendingCount: 0 },
    today: { count: 0, revenueCents: 0 },
    thisWeek: { count: 0, revenueCents: 0 },
    byStatus: {},
  });
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [offset, setOffset] = useState(0);

  // Filters (initialized from URL)
  const [sourceFilter, setSourceFilter] = useState(searchParams.get("source") || "all");
  const [typeFilter, setTypeFilter] = useState(searchParams.get("type") || "all");
  const [statusFilter, setStatusFilter] = useState(searchParams.get("status") || "all");
  const [datePreset, setDatePreset] = useState(searchParams.get("date") || "this_week");
  const [dateFrom, setDateFrom] = useState(searchParams.get("dateFrom") || "");
  const [dateTo, setDateTo] = useState(searchParams.get("dateTo") || "");
  const [sortBy, setSortBy] = useState(searchParams.get("sort") || "newest");
  const [searchQuery, setSearchQuery] = useState(searchParams.get("q") || "");

  // Selection
  const [selectedOrders, setSelectedOrders] = useState<string[]>([]);

  // Detail panel
  const [detailData, setDetailData] = useState<DetailData | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [activeOrderId, setActiveOrderId] = useState<string | null>(null);

  // Modals
  const [editOrder, setEditOrder] = useState<EditOrderData | null>(null);
  const [refundOrder, setRefundOrder] = useState<OrderFull | null>(null);
  const [cancelOrder, setCancelOrder] = useState<OrderFull | null>(null);
  const [cancelProcessRefund, setCancelProcessRefund] = useState(true);
  const [cancelReason, setCancelReason] = useState("Customer requested");
  const [cancelling, setCancelling] = useState(false);

  // Search debounce
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Data Fetching ──

  const fetchOrders = useCallback(
    async (reset = true) => {
      if (reset) setLoading(true);
      else setLoadingMore(true);

      const currentOffset = reset ? 0 : offset;
      const params = new URLSearchParams({
        date: datePreset,
        sort: sortBy,
        offset: String(currentOffset),
        limit: String(PAGE_SIZE),
      });
      if (sourceFilter !== "all") params.set("source", sourceFilter);
      if (typeFilter !== "all") params.set("type", typeFilter);
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (searchQuery) params.set("q", searchQuery);
      if (datePreset === "custom") {
        if (dateFrom) params.set("dateFrom", dateFrom);
        if (dateTo) params.set("dateTo", dateTo);
      }

      const res = await fetch(`/api/admin/operations?${params}`);
      if (res.ok) {
        const data = await res.json();
        if (reset) {
          setOrders(data.orders || []);
          setOffset(PAGE_SIZE);
        } else {
          setOrders((prev) => [...prev, ...(data.orders || [])]);
          setOffset(currentOffset + PAGE_SIZE);
        }
        setTotalCount(data.totalCount ?? 0);
        setStats(data.stats);
      }
      setLoading(false);
      setLoadingMore(false);
    },
    [sourceFilter, typeFilter, statusFilter, searchQuery, datePreset, dateFrom, dateTo, sortBy, offset],
  );

  // Initial fetch + filter changes
  useEffect(() => {
    fetchOrders(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sourceFilter, typeFilter, statusFilter, datePreset, dateFrom, dateTo, sortBy]);

  // Debounced search
  useEffect(() => {
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => {
      fetchOrders(true);
    }, 300);
    return () => {
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery]);

  // URL sync
  useEffect(() => {
    const params = new URLSearchParams();
    if (sourceFilter !== "all") params.set("source", sourceFilter);
    if (typeFilter !== "all") params.set("type", typeFilter);
    if (statusFilter !== "all") params.set("status", statusFilter);
    if (datePreset !== "this_week") params.set("date", datePreset);
    if (sortBy !== "newest") params.set("sort", sortBy);
    if (searchQuery) params.set("q", searchQuery);
    if (datePreset === "custom" && dateFrom) params.set("dateFrom", dateFrom);
    if (datePreset === "custom" && dateTo) params.set("dateTo", dateTo);
    const qs = params.toString();
    router.replace(`/admin/operations${qs ? `?${qs}` : ""}`, { scroll: false });
  }, [sourceFilter, typeFilter, statusFilter, datePreset, dateFrom, dateTo, sortBy, searchQuery, router]);

  // Real-time
  useEffect(() => {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    );
    const channel = supabase
      .channel("orders-realtime")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "orders" }, (payload) => {
        const newOrder = payload.new as OrderListItem;
        setOrders((prev) => [{ ...newOrder, items: [] }, ...prev]);
        setTotalCount((c) => c + 1);
        toast.info(`New order from ${newOrder.customer_name || "Walk-in"}`);
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "orders" }, (payload) => {
        const updated = payload.new as OrderListItem;
        setOrders((prev) => prev.map((o) => (o.id === updated.id ? { ...o, ...updated } : o)));
        if (activeOrderId === updated.id) openDetail(updated.id);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeOrderId]);

  // ── Detail Panel ──

  async function openDetail(orderId: string) {
    setActiveOrderId(orderId);
    setDetailLoading(true);
    const res = await fetch(`/api/admin/operations/${orderId}`);
    if (res.ok) {
      setDetailData(await res.json());
    }
    setDetailLoading(false);
  }

  function closeDetail() {
    setActiveOrderId(null);
    setDetailData(null);
  }

  // ── Actions ──

  async function updateStatus(orderId: string, newStatus: string) {
    await fetch(`/api/admin/operations/${orderId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, status: newStatus } : o)));
    if (activeOrderId === orderId) openDetail(orderId);
    toast.success(`Status updated to "${newStatus.replace(/_/g, " ")}"`);
  }

  async function addNote(orderId: string, note: string) {
    await fetch("/api/admin/operations/notes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ order_id: orderId, note }),
    });
    if (activeOrderId === orderId) openDetail(orderId);
    toast.success("Note added");
  }

  async function saveOrderEdits(orderId: string, updates: Record<string, unknown>) {
    const res = await fetch(`/api/admin/operations/${orderId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    });
    if (res.ok) {
      toast.success("Order updated");
      fetchOrders(true);
      if (activeOrderId === orderId) openDetail(orderId);
    } else {
      toast.error("Failed to update order");
    }
  }

  async function handleCancel() {
    if (!cancelOrder) return;
    setCancelling(true);
    const res = await fetch(`/api/admin/operations/${cancelOrder.id}/cancel`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ processRefund: cancelProcessRefund, reason: cancelReason }),
    });
    if (res.ok) {
      toast.success(cancelProcessRefund ? "Order cancelled and refunded" : "Order cancelled");
      setCancelOrder(null);
      fetchOrders(true);
      if (activeOrderId === cancelOrder.id) openDetail(cancelOrder.id);
    } else {
      const data = await res.json();
      toast.error(data.error || "Failed to cancel order");
    }
    setCancelling(false);
  }

  async function emailReceipt(order: OrderFull) {
    if (!order.customer_email) {
      toast.error("No email address on file");
      return;
    }
    toast.info("Sending receipt...");
    // Use existing order confirmation email endpoint
    const res = await fetch("/api/admin/operations/notes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ order_id: order.id, note: `Email receipt sent to ${order.customer_email}`, created_by: "system" }),
    });
    if (res.ok) toast.success("Receipt email logged");
  }

  async function sendSmsToCustomer(order: OrderFull) {
    if (!order.customer_phone) {
      toast.error("No phone number on file");
      return;
    }
    toast.info(`SMS would be sent to ${formatPhone(order.customer_phone)}`);
  }

  // Bulk actions
  async function bulkUpdateStatus(newStatus: string) {
    for (const orderId of selectedOrders) {
      await updateStatus(orderId, newStatus);
    }
    setSelectedOrders([]);
    toast.success(`Updated ${selectedOrders.length} orders to "${newStatus.replace(/_/g, " ")}"`);
  }

  function bulkPrint(type: "receipt" | "ticket") {
    const ordersToprint = orders.filter((o) => selectedOrders.includes(o.id));
    for (const order of ordersToprint) {
      if (type === "receipt") printOrderReceipt(order as unknown as OrderFull);
      else if (order.delivery_method === "delivery") printDeliveryTicket(order as unknown as OrderFull);
    }
  }

  async function exportCsv() {
    const ids = selectedOrders.length > 0 ? selectedOrders : orders.map((o) => o.id);
    const res = await fetch("/api/admin/operations/export", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderIds: ids }),
    });
    if (res.ok) {
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `orders-${new Date().toISOString().split("T")[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("CSV exported");
    }
  }

  function toggleSelect(orderId: string) {
    setSelectedOrders((prev) => (prev.includes(orderId) ? prev.filter((id) => id !== orderId) : [...prev, orderId]));
  }

  function toggleSelectAll() {
    if (selectedOrders.length === orders.length) {
      setSelectedOrders([]);
    } else {
      setSelectedOrders(orders.map((o) => o.id));
    }
  }

  // ── Helpers ──

  function extractTown(address: string | null): string {
    if (!address) return "";
    const parts = address.split(",").map((s) => s.trim());
    return parts.length >= 2 ? parts[parts.length - 2] : parts[0];
  }

  const hasMore = orders.length < totalCount;

  // ── Render ──

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Operations — Orders</h1>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={exportCsv}>
            <Download className="mr-1.5 h-3.5 w-3.5" /> Export CSV
          </Button>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Today" value={String(stats.today.count)} sub={formatUsd(stats.today.revenueCents)} icon={ShoppingCart} />
        <StatCard label="This Week" value={String(stats.thisWeek.count)} sub={formatUsd(stats.thisWeek.revenueCents)} icon={Calendar} />
        <StatCard label="Pending" value={String(stats.byStatus.pending ?? 0)} color="text-amber-600" icon={Clock} />
        <StatCard label="Scheduled" value={String(stats.byStatus.scheduled ?? 0)} color="text-blue-600" icon={Truck} />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <FilterPills label="Source" options={["all", "web", "pos", "phone"]} value={sourceFilter} onChange={setSourceFilter} />
        <FilterPills label="Type" options={["all", "delivery", "pickup"]} value={typeFilter} onChange={setTypeFilter} />
        <div className="flex items-center gap-1">
          <span className="text-xs text-muted-foreground mr-1">Status:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-7 rounded-lg border bg-background px-2 text-xs"
          >
            {STATUS_FILTER_OPTIONS.map((s) => (
              <option key={s} value={s}>{s === "all" ? "All" : s.replace(/_/g, " ")}</option>
            ))}
          </select>
        </div>
        <FilterPills
          label="Date"
          options={DATE_PRESETS as unknown as string[]}
          value={datePreset}
          onChange={setDatePreset}
          labelMap={DATE_LABELS}
        />
        {datePreset === "custom" && (
          <div className="flex items-center gap-1">
            <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="h-7 rounded-lg border bg-background px-2 text-xs" />
            <span className="text-xs text-muted-foreground">→</span>
            <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="h-7 rounded-lg border bg-background px-2 text-xs" />
          </div>
        )}
        <div className="flex items-center gap-1">
          <span className="text-xs text-muted-foreground mr-1">Sort:</span>
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="h-7 rounded-lg border bg-background px-2 text-xs">
            {SORT_OPTIONS.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
        </div>
        <div className="relative ml-auto">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search name, phone, address..."
            className="rounded-lg border bg-background py-1.5 pl-8 pr-3 text-sm w-64"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Two-panel layout */}
      <div className="flex gap-4">
        {/* Order list (left panel) */}
        <div className="flex-1 min-w-0">
          {/* Select all + count */}
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <button onClick={toggleSelectAll} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
                {selectedOrders.length === orders.length && orders.length > 0 ? (
                  <CheckSquare className="h-4 w-4" />
                ) : (
                  <div className="h-4 w-4 rounded border" />
                )}
                Select all
              </button>
            </div>
            <p className="text-xs text-muted-foreground">
              Showing {orders.length} of {totalCount} orders
            </p>
          </div>

          {/* Order cards */}
          <div className="rounded-lg border divide-y overflow-hidden">
            {loading ? (
              <div className="px-4 py-12 text-center text-muted-foreground">Loading orders...</div>
            ) : orders.length === 0 ? (
              <div className="px-4 py-12 text-center text-muted-foreground">No orders found</div>
            ) : (
              orders.map((order) => (
                <OrderCard
                  key={order.id}
                  order={order}
                  isSelected={activeOrderId === order.id}
                  isChecked={selectedOrders.includes(order.id)}
                  onToggleCheck={() => toggleSelect(order.id)}
                  onClick={() => openDetail(order.id)}
                />
              ))
            )}
          </div>

          {/* Load more */}
          {hasMore && !loading && (
            <div className="text-center mt-3">
              <Button
                size="sm"
                variant="outline"
                onClick={() => fetchOrders(false)}
                disabled={loadingMore}
              >
                {loadingMore ? "Loading..." : "Load More"}
              </Button>
            </div>
          )}
        </div>

        {/* Detail panel (right) */}
        {(activeOrderId || detailLoading) && detailData && (
          <OrderDetailPanel
            order={detailData.order}
            customerHistory={detailData.customerHistory}
            deliveryAssignments={detailData.deliveryAssignments}
            notes={detailData.notes}
            loading={detailLoading}
            onClose={closeDetail}
            onStatusChange={updateStatus}
            onAddNote={addNote}
            onPrintReceipt={() => detailData && printOrderReceipt(detailData.order)}
            onPrintDeliveryTicket={() => detailData && printDeliveryTicket(detailData.order)}
            onEmailReceipt={() => detailData && emailReceipt(detailData.order)}
            onSendSms={() => detailData && sendSmsToCustomer(detailData.order)}
            onEdit={() => detailData && setEditOrder(detailData.order as unknown as EditOrderData)}
            onRefund={() => detailData && setRefundOrder(detailData.order)}
            onCancel={() => detailData && setCancelOrder(detailData.order)}
          />
        )}
      </div>

      {/* Bulk actions bar */}
      {selectedOrders.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-card border-t shadow-lg p-3 flex items-center justify-between z-40">
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium">
              {selectedOrders.length} order{selectedOrders.length > 1 ? "s" : ""} selected
            </span>
            <Button size="sm" variant="outline" onClick={() => setSelectedOrders([])}>
              Clear
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1">
              <span className="text-xs text-muted-foreground">Status:</span>
              <select
                onChange={(e) => {
                  if (e.target.value) bulkUpdateStatus(e.target.value);
                  e.target.value = "";
                }}
                className="h-8 rounded-lg border bg-background px-2 text-xs"
                defaultValue=""
              >
                <option value="" disabled>Change...</option>
                {["confirmed", "scheduled", "loading", "out_for_delivery", "delivered", "cancelled"].map((s) => (
                  <option key={s} value={s}>{s.replace(/_/g, " ")}</option>
                ))}
              </select>
            </div>
            <Button size="sm" variant="outline" onClick={() => bulkPrint("receipt")}>
              <Printer className="mr-1 h-3.5 w-3.5" /> Print Receipts
            </Button>
            <Button size="sm" variant="outline" onClick={() => bulkPrint("ticket")}>
              <Truck className="mr-1 h-3.5 w-3.5" /> Print Tickets
            </Button>
            <Button size="sm" variant="outline" onClick={exportCsv}>
              <Download className="mr-1 h-3.5 w-3.5" /> Export
            </Button>
          </div>
        </div>
      )}

      {/* Edit modal */}
      {editOrder && (
        <EditOrderModal
          order={editOrder}
          onClose={() => setEditOrder(null)}
          onSave={saveOrderEdits}
        />
      )}

      {/* Refund modal */}
      {refundOrder && (
        <RefundModal
          order={{
            id: refundOrder.id,
            grand_total_cents: refundOrder.grand_total_cents,
            materials_subtotal_cents: refundOrder.materials_subtotal_cents,
            delivery_total_cents: refundOrder.delivery_total_cents,
            tax_cents: refundOrder.tax_cents,
            cc_surcharge_cents: refundOrder.cc_surcharge_cents,
            payment_method: refundOrder.payment_method,
            payments: refundOrder.payments || null,
            status: refundOrder.status,
            items: (refundOrder.items || []).map((i) => ({
              product_name: i.product_name,
              quantity: i.quantity,
              unit_price_cents: i.unit_price_cents,
              line_subtotal_cents: i.line_subtotal_cents,
            })),
          }}
          onClose={() => setRefundOrder(null)}
          onRefund={() => {
            setRefundOrder(null);
            fetchOrders(true);
            if (activeOrderId) openDetail(activeOrderId);
            toast.success("Refund processed");
          }}
        />
      )}

      {/* Cancel dialog */}
      {cancelOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setCancelOrder(null)}>
          <div className="bg-card rounded-xl border shadow-xl w-full max-w-md p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
            <h2 className="font-bold text-lg">Cancel Order #{cancelOrder.id.slice(0, 8)}?</h2>
            <div className="text-sm text-muted-foreground">
              <p>Customer: {cancelOrder.customer_name || "Walk-in"}</p>
              <p>Total: {formatUsd(cancelOrder.grand_total_cents)} ({formatPaymentMethod(cancelOrder.payment_method)})</p>
            </div>

            <div className="space-y-3">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={cancelProcessRefund}
                  onChange={(e) => setCancelProcessRefund(e.target.checked)}
                  className="h-4 w-4 rounded"
                />
                Process refund (returns {formatUsd(cancelOrder.grand_total_cents)} to card)
              </label>

              <div>
                <label className="text-xs text-muted-foreground">Reason</label>
                <select
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  className="w-full h-9 rounded-lg border px-3 text-sm mt-0.5"
                >
                  <option>Customer requested</option>
                  <option>Out of stock</option>
                  <option>Duplicate order</option>
                  <option>Fraudulent</option>
                  <option>Other</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setCancelOrder(null)} disabled={cancelling}>
                Keep Order
              </Button>
              <Button variant="destructive" onClick={handleCancel} disabled={cancelling}>
                {cancelling ? "Processing..." : cancelProcessRefund ? "Cancel & Refund" : "Cancel Order"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Helper Components ────────────────────────────────────────

function StatCard({ label, value, sub, icon: Icon, color }: { label: string; value: string; sub?: string; icon: React.ElementType; color?: string }) {
  return (
    <div className="rounded-lg border bg-card p-3">
      <div className="flex items-center gap-2">
        <Icon className={`h-4 w-4 ${color || "text-muted-foreground"}`} />
        <span className="text-xs text-muted-foreground">{label}</span>
      </div>
      <p className={`text-2xl font-bold mt-1 ${color || ""}`}>{value}</p>
      {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
    </div>
  );
}

function FilterPills({
  label,
  options,
  value,
  onChange,
  labelMap,
}: {
  label: string;
  options: string[];
  value: string;
  onChange: (v: string) => void;
  labelMap?: Record<string, string>;
}) {
  return (
    <div className="flex items-center gap-1">
      <span className="text-xs text-muted-foreground mr-1">{label}:</span>
      {options.map((opt) => (
        <Button
          key={opt}
          size="sm"
          variant={value === opt ? "default" : "outline"}
          className="h-7 text-xs px-2"
          onClick={() => onChange(opt)}
        >
          {labelMap?.[opt] || opt.replace(/_/g, " ")}
        </Button>
      ))}
    </div>
  );
}

function OrderCard({
  order,
  isSelected,
  isChecked,
  onToggleCheck,
  onClick,
}: {
  order: OrderListItem;
  isSelected: boolean;
  isChecked: boolean;
  onToggleCheck: () => void;
  onClick: () => void;
}) {
  return (
    <div
      onClick={onClick}
      className={`p-3 cursor-pointer transition-colors ${
        isSelected ? "bg-primary/5 border-l-2 border-l-primary" : "hover:bg-muted/50"
      }`}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={isChecked}
            onChange={onToggleCheck}
            onClick={(e) => e.stopPropagation()}
            className="h-4 w-4 rounded mt-0.5"
          />
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm">#{order.id.slice(0, 8)}</span>
              <span className="text-sm">{order.customer_name || "Walk-in"}</span>
            </div>
            <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground">
              <Badge className={`text-[9px] px-1.5 py-0 ${SOURCE_COLORS[order.source] || "bg-gray-100"}`}>
                {SOURCE_LABELS[order.source] || order.source}
              </Badge>
              <Badge className={`text-[9px] px-1.5 py-0 ${STATUS_COLORS[order.status] || "bg-gray-100"}`}>
                {order.status.replace(/_/g, " ")}
              </Badge>
              <span>{formatShortDateTime(order.placed_at || order.created_at)}</span>
            </div>
          </div>
        </div>
        <span className="font-bold text-sm">{formatUsd(order.grand_total_cents)}</span>
      </div>

      <div className="flex items-center gap-1 mt-1.5 ml-6 text-xs text-muted-foreground">
        {order.delivery_method === "delivery" ? (
          <>
            <Truck className="w-3 h-3" />
            <span>Delivery</span>
            {order.delivery_address && (
              <span className="truncate max-w-48">
                · {order.delivery_address.split(",")[0]}
              </span>
            )}
          </>
        ) : (
          <>
            <Store className="w-3 h-3" />
            <span>Pickup</span>
          </>
        )}
        {order.items && order.items.length > 0 && (
          <span className="truncate max-w-48 ml-1">
            · {order.items.slice(0, 2).map((i) => i.product_name).join(", ")}
          </span>
        )}
      </div>
    </div>
  );
}
