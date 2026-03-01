import { Package, ShoppingCart, DollarSign, AlertCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { formatUsd } from "@/lib/format";

function tryGetAdmin() {
  try {
    return getSupabaseAdminClient();
  } catch {
    return null;
  }
}

async function getStats() {
  const supabase = tryGetAdmin();
  if (!supabase) {
    return { products: 0, pendingOrders: 0, totalOrders: 0, revenue: 0 };
  }

  const [productsRes, pendingRes, ordersRes] = await Promise.all([
    supabase.from("products").select("id", { count: "exact", head: true }).eq("is_active", true),
    supabase.from("orders").select("id", { count: "exact", head: true }).eq("status", "pending"),
    supabase.from("orders").select("grand_total_cents, status"),
  ]);

  const products = productsRes.count ?? 0;
  const pendingOrders = pendingRes.count ?? 0;
  const orders = ordersRes.data ?? [];
  const totalOrders = orders.length;
  const revenue = orders
    .filter((o) => o.status !== "cancelled")
    .reduce((sum, o) => sum + (o.grand_total_cents ?? 0), 0);

  return { products, pendingOrders, totalOrders, revenue };
}

export default async function AdminDashboardPage() {
  const stats = await getStats();

  const cards = [
    {
      title: "Active Products",
      value: stats.products.toString(),
      icon: Package,
    },
    {
      title: "Pending Orders",
      value: stats.pendingOrders.toString(),
      icon: AlertCircle,
    },
    {
      title: "Total Orders",
      value: stats.totalOrders.toString(),
      icon: ShoppingCart,
    },
    {
      title: "Revenue",
      value: formatUsd(stats.revenue),
      icon: DollarSign,
    },
  ];

  return (
    <div className="space-y-6">
      <h1 className="[font-family:var(--font-display)] text-3xl text-primary">Dashboard</h1>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => (
          <Card key={card.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {card.title}
              </CardTitle>
              <card.icon className="size-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{card.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
