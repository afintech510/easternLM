"use client";

import { useCallback, useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatUsd } from "@/lib/format";
import { formatShortDateTime, formatOrderDateTime, formatDeliveryDate, formatTimeWindow, formatPhone, formatPaymentMethod, formatShortDeliveryDate } from "@/lib/format-date";
import { createBrowserClient } from "@supabase/ssr";
import {
  ArrowRight,
  Calendar,
  Clock,
  MapPin,
  Mail,
  Package,
  Phone,
  Printer,
  Search,
  ShoppingCart,
  Truck,
  X,
  AlertTriangle,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────

type OrderItem = {
  id: string;
  product_name: string;
  quantity: number;
  unit: string;
  unit_price_cents: number;
  line_subtotal_cents: number;
  load_number: number | null;
};

type Order = {
  id: string;
  created_at: string;
  status: string;
  source: string;
  customer_name: string | null;
  customer_phone: string | null;
  customer_email: string | null;
  items: OrderItem[];
  order_items?: OrderItem[];
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
  notes: string | null;
  customer_id: string | null;
  metadata: Record<string, unknown> | null;
};

type Stats = {
  totalOrders: number;
  deliveryCount: number;
  pickupCount: number;
  revenueCents: number;
  pendingCount: number;
};

type OrderDetail = {
  order: Order;
  customerHistory: {
    customer: { first_name: string; last_name: string; phone: string; total_orders: number; total_spent_cents: number; tags: string[] } | null;
    recentOrders: Array<{ id: string; created_at: string; items: unknown; grand_total_cents: number; status: string }>;
  } | null;
} | null;

const CONSTRAINT_LABELS: Record<string, string> = {
  lowWires: "Low wires", narrowDriveway: "Narrow driveway", softGround: "Soft ground",
  gated: "Gated", steep: "Steep grade", backyard: "Backyard access",
};

const STATUS_OPTIONS = ["new", "confirmed", "scheduled", "loading", "out_for_delivery", "delivered", "paid", "cancelled", "issue"];
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
};
const SOURCE_LABELS: Record<string, string> = { web: "WEB", pos: "POS", phone: "PHONE", admin: "ADMIN" };
const SOURCE_COLORS: Record<string, string> = { web: "bg-blue-900/40 text-blue-300", pos: "bg-green-900/40 text-green-300", phone: "bg-purple-900/40 text-purple-300", admin: "bg-gray-700 text-gray-300" };

// ─── Print Helpers ───────────────────────────────────────────────

function printOrderReceipt(order: Order) {
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
    <div class="mt">Payment: ${(order.payment_method ?? "card").replace(/_/g, " ")}</div>
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

function printDeliveryTicket(order: Order) {
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
    ${flags.length > 0 || notes ? `<div class="warn"><strong>⚠ ACCESS:</strong> ${[...flags, notes].filter(Boolean).join(" · ")}</div>` : ""}
    ${order.delivery_notes ? `<div class="mt">NOTES: ${order.delivery_notes}</div>` : ""}
    <div class="line"></div>
    <div class="bold big">MATERIAL TO LOAD:</div>
    ${items.map((i) => { const u = (i.unit === "unit" || !i.unit) ? "cu. yards" : i.unit; return `<div class="mt bold" style="font-size:16px;">${i.quantity} ${u}<br/>${i.product_name}</div>`; }).join('<div class="dashed"></div>')}
    <div class="line"></div>
    <div class="row bold"><span>ORDER TOTAL:</span><span>${formatUsd(order.grand_total_cents)}</span></div>
    ${order.payment_method === "cod" ? `
      <div class="center bold" style="font-size:18px;border:2px solid #000;padding:8px;margin:8px 0;">COLLECT ON DELIVERY<br/>${formatUsd(order.grand_total_cents)}</div>
    ` : `
      <div class="bold big center">PAID</div>
    `}
    <div class="line"></div>
    <div class="line"></div>
    </body></html>`);
  w.document.close();
  w.print();
}

// ─── Component ────────────────────────────────────────────────────

export default function AdminOperationsPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [stats, setStats] = useState<Stats>({ totalOrders: 0, deliveryCount: 0, pickupCount: 0, revenueCents: 0, pendingCount: 0 });
  const [loading, setLoading] = useState(true);

  // Filters
  const [sourceFilter, setSourceFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [dateRange, setDateRange] = useState<"today" | "tomorrow" | "week" | "custom">("week");

  // Detail panel
  const [detail, setDetail] = useState<OrderDetail>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    const today = new Date().toISOString().split("T")[0];
    const tomorrow = new Date(Date.now() + 86400000).toISOString().split("T")[0];
    const weekEnd = new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0];

    let from = today, to = today;
    if (dateRange === "tomorrow") { from = tomorrow; to = tomorrow; }
    if (dateRange === "week") { from = today; to = weekEnd; }

    const params = new URLSearchParams({ from, to });
    if (sourceFilter !== "all") params.set("source", sourceFilter);
    if (typeFilter !== "all") params.set("type", typeFilter);
    if (statusFilter !== "all") params.set("status", statusFilter);
    if (searchQuery) params.set("q", searchQuery);

    const res = await fetch(`/api/admin/operations?${params}`);
    if (res.ok) {
      const data = await res.json();
      setOrders(data.orders || []);
      setStats(data.stats);
    }
    setLoading(false);
  }, [sourceFilter, typeFilter, statusFilter, searchQuery, dateRange]);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  // Real-time subscriptions
  useEffect(() => {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    );

    const channel = supabase
      .channel("orders-realtime")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "orders" }, () => {
        fetchOrders(); // Refresh on new order
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "orders" }, () => {
        fetchOrders(); // Refresh on status change
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [fetchOrders]);

  async function openDetail(orderId: string) {
    setDetailLoading(true);
    const res = await fetch(`/api/admin/operations/${orderId}`);
    if (res.ok) setDetail(await res.json());
    setDetailLoading(false);
  }

  async function updateStatus(orderId: string, newStatus: string) {
    await fetch(`/api/admin/operations/${orderId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    fetchOrders();
    if (detail?.order.id === orderId) openDetail(orderId);
  }

  // ── Render ──────────────────────────────────────────────────────

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Operations</h1>

      {/* Stats row */}
      <div className="grid grid-cols-5 gap-3">
        <StatCard icon={ShoppingCart} label="Today" value={String(stats.totalOrders)} sub="orders" />
        <StatCard icon={Truck} label="Deliveries" value={String(stats.deliveryCount)} sub="loads" color="text-blue-600" />
        <StatCard icon={Package} label="Pickups" value={String(stats.pickupCount)} sub="orders" color="text-green-600" />
        <StatCard icon={ArrowRight} label="Revenue" value={formatUsd(stats.revenueCents)} color="text-amber-600" />
        <StatCard icon={Clock} label="Pending" value={String(stats.pendingCount)} sub="new" color="text-red-600" />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <FilterGroup label="Source" options={["all", "web", "pos", "phone"]} value={sourceFilter} onChange={setSourceFilter} />
        <FilterGroup label="Type" options={["all", "delivery", "pickup"]} value={typeFilter} onChange={setTypeFilter} />
        <FilterGroup label="Status" options={["all", "pending", "paid", "processing", "scheduled", "delivered", "cancelled"]} value={statusFilter} onChange={setStatusFilter} />
        <FilterGroup label="Date" options={["today", "tomorrow", "week"]} value={dateRange} onChange={(v) => setDateRange(v as "today" | "tomorrow" | "week")} />
        <div className="relative ml-auto">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search..."
            className="rounded-lg border bg-background py-1.5 pl-8 pr-3 text-sm"
          />
        </div>
      </div>

      <div className="flex gap-4">
        {/* Order table */}
        <div className="flex-1 overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50 text-left">
                <th className="px-3 py-2 font-medium">Time</th>
                <th className="px-3 py-2 font-medium">Source</th>
                <th className="px-3 py-2 font-medium">Customer</th>
                <th className="px-3 py-2 font-medium">Items</th>
                <th className="px-3 py-2 font-medium">Type</th>
                <th className="px-3 py-2 font-medium text-right">Total</th>
                <th className="px-3 py-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">Loading...</td></tr>
              ) : orders.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">No orders found</td></tr>
              ) : orders.map((order) => (
                <tr key={order.id} onClick={() => openDetail(order.id)} className="border-b cursor-pointer hover:bg-muted/30 transition-colors">
                  <td className="px-3 py-2 text-xs text-muted-foreground whitespace-nowrap">
                    {formatShortDateTime(order.created_at)}
                  </td>
                  <td className="px-3 py-2">
                    <Badge className={`text-[10px] ${SOURCE_COLORS[order.source] || ""}`}>
                      {SOURCE_LABELS[order.source] || order.source}
                    </Badge>
                  </td>
                  <td className="px-3 py-2">
                    <p className="font-medium text-sm">{order.customer_name || "Walk-in"}</p>
                    {order.customer_phone && <p className="text-xs text-muted-foreground">{order.customer_phone}</p>}
                  </td>
                  <td className="px-3 py-2 text-xs text-muted-foreground max-w-40 truncate">
                    {order.items?.map((i) => `${i.quantity} ${i.product_name}`).join(", ")}
                  </td>
                  <td className="px-3 py-2">
                    {order.delivery_method === "delivery" ? (
                      <span className="flex items-center gap-1 text-xs"><Truck className="h-3 w-3" /> Delivery</span>
                    ) : (
                      <span className="text-xs text-muted-foreground">Pickup</span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-right font-mono text-sm">{formatUsd(order.grand_total_cents)}</td>
                  <td className="px-3 py-2">
                    <select
                      value={order.status}
                      onChange={(e) => { e.stopPropagation(); updateStatus(order.id, e.target.value); }}
                      onClick={(e) => e.stopPropagation()}
                      className={`rounded px-2 py-0.5 text-xs font-medium border-0 cursor-pointer ${STATUS_COLORS[order.status] || "bg-gray-100"}`}
                    >
                      {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s.replace(/_/g, " ")}</option>)}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Order detail slide-over */}
        {detail && (
          <div className="w-[420px] shrink-0 rounded-lg border bg-card p-4 space-y-4 overflow-y-auto max-h-[calc(100vh-220px)]">
            <div className="flex items-center justify-between">
              <h2 className="font-bold">Order Detail</h2>
              <button onClick={() => setDetail(null)} className="text-muted-foreground hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
            </div>

            {detailLoading ? (
              <p className="text-center text-muted-foreground py-8">Loading...</p>
            ) : (
              <>
                {/* Order header */}
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">{formatOrderDateTime(detail.order.created_at)}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge className={`text-[10px] ${SOURCE_COLORS[detail.order.source] || ""}`}>
                        {SOURCE_LABELS[detail.order.source] || detail.order.source}
                      </Badge>
                      <Badge className={`text-[10px] ${STATUS_COLORS[detail.order.status] || ""}`}>
                        {detail.order.status.replace(/_/g, " ")}
                      </Badge>
                    </div>
                  </div>
                  <p className="text-lg font-bold">{formatUsd(detail.order.grand_total_cents)}</p>
                </div>

                {/* Customer */}
                <div className="rounded-lg bg-muted/50 p-3 space-y-1.5">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Customer</p>
                  <p className="text-sm font-semibold">{detail.order.customer_name || "Walk-in"}</p>
                  {detail.order.customer_phone && (
                    <a href={`tel:${detail.order.customer_phone}`} className="flex items-center gap-1.5 text-sm text-primary hover:underline">
                      <Phone className="h-3.5 w-3.5" /> {formatPhone(detail.order.customer_phone)}
                    </a>
                  )}
                  {detail.order.customer_email && (
                    <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                      <Mail className="h-3.5 w-3.5" /> {detail.order.customer_email}
                    </div>
                  )}
                  {detail.customerHistory?.customer && (
                    <p className="text-xs text-muted-foreground">
                      {detail.customerHistory.customer.total_orders} orders · {formatUsd(detail.customerHistory.customer.total_spent_cents)} lifetime
                    </p>
                  )}
                </div>

                {/* Items */}
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">Items</p>
                  {(detail.order.order_items ?? detail.order.items ?? []).filter((i: OrderItem) => !i.product_name?.startsWith("Delivery Load") && !i.product_name?.startsWith("Sales Tax") && !i.product_name?.startsWith("Credit Card")).map((item: OrderItem, i: number) => (
                    <div key={i} className="flex justify-between text-sm py-1 border-b border-border/50 last:border-0">
                      <div>
                        <p className="font-medium">{item.product_name}</p>
                        <p className="text-xs text-muted-foreground">{item.quantity} {(item.unit === "unit" || !item.unit) ? "cu. yards" : item.unit} × {formatUsd(item.unit_price_cents)}</p>
                      </div>
                      <span className="font-medium whitespace-nowrap">{formatUsd(item.line_subtotal_cents)}</span>
                    </div>
                  ))}
                  {(detail.order.order_items ?? detail.order.items ?? []).length === 0 && (
                    <p className="text-sm text-muted-foreground py-2">No items recorded</p>
                  )}
                </div>

                {/* Delivery */}
                {detail.order.delivery_method === "delivery" && (
                  <div className="rounded-lg bg-muted/50 p-3 space-y-1.5">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Delivery</p>
                    {detail.order.delivery_address && (
                      <div className="flex items-start gap-1.5 text-sm">
                        <MapPin className="h-3.5 w-3.5 mt-0.5 shrink-0 text-muted-foreground" />
                        <span>{detail.order.delivery_address}</span>
                      </div>
                    )}
                    {(() => {
                      const dd = detail.order.delivery_date || String((detail.order.metadata as Record<string, unknown>)?.deliveryDate ?? "");
                      return dd ? (
                        <div className="flex items-center gap-1.5 text-sm">
                          <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                          <span>{formatDeliveryDate(dd)}</span>
                        </div>
                      ) : null;
                    })()}
                    {detail.order.delivery_time_window && (
                      <div className="flex items-center gap-1.5 text-sm">
                        <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                        <span>{formatTimeWindow(detail.order.delivery_time_window)}</span>
                      </div>
                    )}
                    {detail.order.delivery_time_window && (
                      <div className="flex items-center gap-1.5 text-sm">
                        <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                        <span>{detail.order.delivery_time_window}</span>
                      </div>
                    )}
                    <p className="text-xs text-muted-foreground">Fee: {formatUsd(detail.order.delivery_total_cents ?? 0)}</p>
                    {detail.order.delivery_notes && (
                      <p className="text-xs text-muted-foreground">Notes: {detail.order.delivery_notes}</p>
                    )}
                    {(() => {
                      if (!detail.order.access_constraints) return null;
                      const c = detail.order.access_constraints as Record<string, unknown>;
                      const flags = Object.entries(c).filter(([k, v]) => v === true && k !== "notes").map(([k]) => CONSTRAINT_LABELS[k] || k);
                      const cNotes = typeof c.notes === "string" && c.notes.trim() ? c.notes.trim() : null;
                      if (!flags.length && !cNotes) return null;
                      return (
                        <div className="flex items-start gap-1.5 text-xs text-amber-700">
                          <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                          <span>{[...flags, cNotes].filter(Boolean).join(" · ")}</span>
                        </div>
                      );
                    })()}
                  </div>
                )}

                {/* Totals */}
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">Totals</p>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between"><span className="text-muted-foreground">Materials</span><span>{formatUsd(detail.order.materials_subtotal_cents ?? 0)}</span></div>
                    {(detail.order.delivery_total_cents ?? 0) > 0 && (
                      <div className="flex justify-between"><span className="text-muted-foreground">Delivery</span><span>{formatUsd(detail.order.delivery_total_cents)}</span></div>
                    )}
                    <div className="flex justify-between"><span className="text-muted-foreground">Tax (8.75%)</span><span>{formatUsd(detail.order.tax_cents ?? 0)}</span></div>
                    {(detail.order.cc_surcharge_cents ?? 0) > 0 && (
                      <div className="flex justify-between"><span className="text-muted-foreground">CC Fee (3%)</span><span>{formatUsd(detail.order.cc_surcharge_cents)}</span></div>
                    )}
                    <div className="flex justify-between border-t pt-1.5 font-bold">
                      <span>Total</span><span>{formatUsd(detail.order.grand_total_cents)}</span>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1.5">
                    Payment: {formatPaymentMethod(detail.order.payment_method)}
                    {detail.order.stripe_checkout_session_id && (
                      <span className="ml-1 font-mono text-[10px]">({detail.order.stripe_checkout_session_id.slice(0, 15)}…)</span>
                    )}
                  </p>
                </div>

                {/* Notes */}
                {detail.order.notes && (
                  <div className="rounded-lg bg-muted/50 p-3 text-sm">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Notes</p>
                    {detail.order.notes}
                  </div>
                )}

                {/* Print actions */}
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" className="flex-1 text-xs" onClick={() => printOrderReceipt(detail.order)}>
                    <Printer className="mr-1.5 h-3.5 w-3.5" /> Receipt
                  </Button>
                  {detail.order.delivery_method === "delivery" && (
                    <Button size="sm" variant="outline" className="flex-1 text-xs" onClick={() => printDeliveryTicket(detail.order)}>
                      <Truck className="mr-1.5 h-3.5 w-3.5" /> Delivery Ticket
                    </Button>
                  )}
                </div>

                {/* Status change */}
                <div className="border-t pt-3">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">Change Status</p>
                  <div className="flex flex-wrap gap-1">
                    {STATUS_OPTIONS.map((s) => (
                      <Button
                        key={s}
                        size="sm"
                        variant={detail.order.status === s ? "default" : "outline"}
                        className="text-xs"
                        onClick={() => updateStatus(detail.order.id, s)}
                      >
                        {s.replace(/_/g, " ")}
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Customer history */}
                {detail.customerHistory?.recentOrders && detail.customerHistory.recentOrders.length > 1 && (
                  <div className="border-t pt-3">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">Recent Orders</p>
                    {detail.customerHistory.recentOrders.slice(0, 5).map((o) => (
                      <div key={o.id} className="flex justify-between text-xs py-1 text-muted-foreground">
                        <span>{new Date(o.created_at).toLocaleDateString("en-US", { weekday: "short", month: "numeric", day: "numeric" })}</span>
                        <span>{formatUsd(o.grand_total_cents)}</span>
                        <Badge className={`text-[10px] ${STATUS_COLORS[o.status] || ""}`}>{o.status}</Badge>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Helper components ──────────────────────────────────────────────

function StatCard({ icon: Icon, label, value, sub, color }: { icon: React.ElementType; label: string; value: string; sub?: string; color?: string }) {
  return (
    <div className="rounded-lg border bg-card p-3 text-center">
      <Icon className={`mx-auto mb-1 h-5 w-5 ${color || "text-muted-foreground"}`} />
      <p className={`text-xl font-bold ${color || ""}`}>{value}</p>
      <p className="text-xs text-muted-foreground">{sub ? `${label} · ${sub}` : label}</p>
    </div>
  );
}

function FilterGroup({ label, options, value, onChange }: { label: string; options: string[]; value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex items-center gap-1">
      <span className="text-xs text-muted-foreground mr-1">{label}:</span>
      {options.map((opt) => (
        <Button key={opt} size="sm" variant={value === opt ? "default" : "outline"} className="h-7 text-xs px-2" onClick={() => onChange(opt)}>
          {opt.replace(/_/g, " ")}
        </Button>
      ))}
    </div>
  );
}
