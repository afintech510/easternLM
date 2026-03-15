export const dynamic = "force-dynamic";

import Link from "next/link";
import { ClipboardList, DollarSign, Package, Phone, Search, ShoppingCart, Truck, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

function tryGetAdmin() {
  try { return getSupabaseAdminClient(); } catch { return null; }
}

function formatUsd(cents: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);
}

async function getDashboardData() {
  const supabase = tryGetAdmin();
  if (!supabase) return { products: 0, pendingOrders: 0, totalOrders: 0, revenue: 0, newLeads: 0, recentOrders: [], recentLeads: [] };

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [productsRes, pendingRes, ordersRes, leadsRes, recentOrdersRes, recentLeadsRes] = await Promise.all([
    supabase.from("products").select("id", { count: "exact", head: true }).eq("is_active", true),
    supabase.from("orders").select("id", { count: "exact", head: true }).eq("status", "pending"),
    supabase.from("orders").select("grand_total_cents, status"),
    supabase.from("service_leads").select("id", { count: "exact", head: true }).eq("status", "new"),
    supabase.from("orders").select("id, customer_name, grand_total_cents, status, delivery_method, placed_at").order("placed_at", { ascending: false }).limit(8),
    supabase.from("service_leads").select("id, name, phone, service_type, town, status, created_at").eq("status", "new").order("created_at", { ascending: false }).limit(5),
  ]);

  const orders = ordersRes.data ?? [];
  const revenue = orders.filter((o) => o.status !== "cancelled").reduce((sum, o) => sum + (o.grand_total_cents ?? 0), 0);

  return {
    products: productsRes.count ?? 0,
    pendingOrders: pendingRes.count ?? 0,
    totalOrders: orders.length,
    revenue,
    newLeads: leadsRes.count ?? 0,
    recentOrders: (recentOrdersRes.data ?? []) as Array<{ id: string; customer_name: string | null; grand_total_cents: number; status: string; delivery_method: string; placed_at: string }>,
    recentLeads: (recentLeadsRes.data ?? []) as Array<{ id: string; name: string; phone: string; service_type: string; town: string | null; status: string; created_at: string }>,
  };
}

const SERVICE_LABELS: Record<string, string> = {
  "gravel-driveway-new": "Gravel Driveway", "gravel-driveway-resurface": "Driveway Resurface",
  "paver-driveway": "Paver Driveway", "landscaping-design": "Landscaping",
  "masonry-patio": "Patio", "masonry-walkway": "Walkway",
  "property-maintenance": "Maintenance", "other": "Other",
};

export default async function AdminDashboardPage() {
  const data = await getDashboardData();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <p className="text-sm text-muted-foreground">{new Date().toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })}</p>
      </div>

      {/* Stats */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {[
          { label: "Active Products", value: String(data.products), icon: Package },
          { label: "Pending Orders", value: String(data.pendingOrders), icon: ShoppingCart, highlight: data.pendingOrders > 0 },
          { label: "Total Orders", value: String(data.totalOrders), icon: Truck },
          { label: "Revenue", value: formatUsd(data.revenue), icon: DollarSign },
          { label: "New Leads", value: String(data.newLeads), icon: ClipboardList, highlight: data.newLeads > 0 },
        ].map((card) => (
          <div key={card.label} className={`rounded-lg border p-4 ${card.highlight ? "border-accent/50 bg-accent/5" : "bg-card"}`}>
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-muted-foreground">{card.label}</p>
              <card.icon className={`size-4 ${card.highlight ? "text-accent" : "text-muted-foreground"}`} />
            </div>
            <p className={`mt-1 text-2xl font-bold ${card.highlight ? "text-accent" : ""}`}>{card.value}</p>
          </div>
        ))}
      </div>

      {/* Quick actions */}
      <div className="flex flex-wrap gap-2">
        <Button asChild size="sm"><Link href="/admin/orders"><ShoppingCart className="size-4" /> Orders</Link></Button>
        <Button asChild size="sm" variant="outline"><Link href="/admin/leads"><ClipboardList className="size-4" /> Leads {data.newLeads > 0 && <span className="ml-1 rounded-full bg-accent px-1.5 text-xs text-accent-foreground">{data.newLeads}</span>}</Link></Button>
        <Button asChild size="sm" variant="outline"><Link href="/admin/customers"><Search className="size-4" /> Search Customer</Link></Button>
        <Button asChild size="sm" variant="outline"><Link href="/admin/products"><Package className="size-4" /> Products</Link></Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent orders */}
        <div className="rounded-lg border bg-card">
          <div className="flex items-center justify-between border-b px-4 py-3">
            <h2 className="text-sm font-semibold">Recent Orders</h2>
            <Button asChild variant="ghost" size="sm"><Link href="/admin/orders">View all</Link></Button>
          </div>
          <div className="divide-y">
            {data.recentOrders.length > 0 ? data.recentOrders.map((order) => (
              <div key={order.id} className="flex items-center justify-between px-4 py-2.5 text-sm">
                <div>
                  <p className="font-medium">{order.customer_name || "Guest"}</p>
                  <p className="text-xs text-muted-foreground">{new Date(order.placed_at).toLocaleDateString()} &middot; {order.delivery_method}</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold">{formatUsd(order.grand_total_cents)}</p>
                  <span className={`text-xs font-medium ${order.status === "paid" ? "text-green-600" : order.status === "pending" ? "text-yellow-600" : "text-muted-foreground"}`}>{order.status}</span>
                </div>
              </div>
            )) : <p className="px-4 py-6 text-center text-sm text-muted-foreground">No orders yet</p>}
          </div>
        </div>

        {/* New leads */}
        <div className="rounded-lg border bg-card">
          <div className="flex items-center justify-between border-b px-4 py-3">
            <h2 className="text-sm font-semibold">New Service Leads</h2>
            <Button asChild variant="ghost" size="sm"><Link href="/admin/leads">View all</Link></Button>
          </div>
          <div className="divide-y">
            {data.recentLeads.length > 0 ? data.recentLeads.map((lead) => (
              <div key={lead.id} className="flex items-center justify-between px-4 py-2.5 text-sm">
                <div>
                  <p className="font-medium">{lead.name}</p>
                  <p className="text-xs text-muted-foreground">{SERVICE_LABELS[lead.service_type] || lead.service_type} &middot; {lead.town || "No town"}</p>
                </div>
                <div className="text-right">
                  <a href={`tel:+1${lead.phone}`} className="flex items-center gap-1 text-xs font-medium text-accent hover:underline">
                    <Phone className="size-3" /> Call
                  </a>
                  <p className="text-xs text-muted-foreground">{new Date(lead.created_at).toLocaleDateString()}</p>
                </div>
              </div>
            )) : <p className="px-4 py-6 text-center text-sm text-muted-foreground">No new leads</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
