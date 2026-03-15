"use client";

import { useCallback, useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatUsd } from "@/lib/format";
import { createBrowserClient } from "@supabase/ssr";
import {
  ArrowRight,
  Clock,
  MapPin,
  Package,
  Phone,
  Search,
  ShoppingCart,
  Truck,
  X,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────

type Order = {
  id: string;
  created_at: string;
  status: string;
  source: string;
  customer_name: string | null;
  customer_phone: string | null;
  customer_email: string | null;
  items: Array<{ product_name: string; quantity: number; line_total_cents: number }>;
  grand_total_cents: number;
  delivery_method: string;
  delivery_address: string | null;
  delivery_fee_cents: number;
  payment_method: string;
  notes: string | null;
  customer_id: string | null;
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
  const [dateRange, setDateRange] = useState<"today" | "tomorrow" | "week" | "custom">("today");

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
        <FilterGroup label="Status" options={["all", "new", "confirmed", "scheduled", "out_for_delivery", "delivered", "paid"]} value={statusFilter} onChange={setStatusFilter} />
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
                    {new Date(order.created_at).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
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
          <div className="w-96 shrink-0 rounded-lg border bg-card p-4 space-y-4 overflow-y-auto max-h-[calc(100vh-220px)]">
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
                {/* Customer */}
                <div className="space-y-1">
                  <p className="text-sm font-semibold">{detail.order.customer_name || "Walk-in"}</p>
                  {detail.order.customer_phone && (
                    <a href={`tel:${detail.order.customer_phone}`} className="flex items-center gap-1 text-sm text-primary hover:underline">
                      <Phone className="h-3.5 w-3.5" /> {detail.order.customer_phone}
                    </a>
                  )}
                  {detail.customerHistory?.customer && (
                    <p className="text-xs text-muted-foreground">
                      {detail.customerHistory.customer.total_orders} orders · {formatUsd(detail.customerHistory.customer.total_spent_cents)} lifetime
                    </p>
                  )}
                </div>

                {/* Delivery */}
                {detail.order.delivery_method === "delivery" && detail.order.delivery_address && (
                  <div className="rounded-lg bg-muted/50 p-3">
                    <p className="flex items-center gap-1 text-sm font-medium"><MapPin className="h-3.5 w-3.5" /> Delivery</p>
                    <p className="text-sm">{detail.order.delivery_address}</p>
                    <p className="text-xs text-muted-foreground">Fee: {formatUsd(detail.order.delivery_fee_cents)}</p>
                  </div>
                )}

                {/* Items */}
                <div className="border-t pt-3">
                  <p className="text-xs font-medium text-muted-foreground mb-2">Items</p>
                  {detail.order.items?.map((item, i) => (
                    <div key={i} className="flex justify-between text-sm py-0.5">
                      <span>{item.quantity} {item.product_name}</span>
                      <span className="text-muted-foreground">{formatUsd(item.line_total_cents)}</span>
                    </div>
                  ))}
                  <div className="mt-2 pt-2 border-t flex justify-between font-bold text-sm">
                    <span>Total</span><span>{formatUsd(detail.order.grand_total_cents)}</span>
                  </div>
                </div>

                {/* Notes */}
                {detail.order.notes && (
                  <div className="rounded-lg bg-muted/50 p-3 text-sm">{detail.order.notes}</div>
                )}

                {/* Status change */}
                <div className="border-t pt-3">
                  <p className="text-xs font-medium text-muted-foreground mb-2">Change Status</p>
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
                    <p className="text-xs font-medium text-muted-foreground mb-2">Recent Orders</p>
                    {detail.customerHistory.recentOrders.slice(0, 5).map((o) => (
                      <div key={o.id} className="flex justify-between text-xs py-1 text-muted-foreground">
                        <span>{new Date(o.created_at).toLocaleDateString()}</span>
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
