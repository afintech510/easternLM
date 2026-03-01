import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { OrderList } from "@/components/admin/orders/order-list";

function tryGetAdmin() {
  try {
    return getSupabaseAdminClient();
  } catch {
    return null;
  }
}

export default async function AdminOrdersPage() {
  const supabase = tryGetAdmin();
  let orders: Array<Record<string, unknown>> = [];
  let total = 0;

  if (supabase) {
    const { data, count } = await supabase
      .from("orders")
      .select("*, order_items(*)", { count: "exact" })
      .order("placed_at", { ascending: false })
      .range(0, 24);
    orders = (data as Array<Record<string, unknown>>) ?? [];
    total = count ?? 0;
  }

  return (
    <div className="space-y-6">
      <h1 className="[font-family:var(--font-display)] text-3xl text-primary">Orders</h1>
      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      <OrderList initialOrders={orders as any} initialTotal={total} />
    </div>
  );
}
