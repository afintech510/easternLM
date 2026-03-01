import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { OrderDetail } from "@/components/admin/orders/order-detail";
import { notFound } from "next/navigation";

type Params = { params: Promise<{ id: string }> };

export default async function AdminOrderDetailPage({ params }: Params) {
  const { id } = await params;
  let order = null;

  try {
    const supabase = getSupabaseAdminClient();
    const { data } = await supabase
      .from("orders")
      .select("*, order_items(*)")
      .eq("id", id)
      .single();
    order = data;
  } catch {
    // Supabase not available
  }

  if (!order) notFound();

  return (
    <div className="space-y-6">
      <h1 className="[font-family:var(--font-display)] text-3xl text-primary">
        Order {id.slice(0, 8)}…
      </h1>
      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      <OrderDetail order={order as any} />
    </div>
  );
}
