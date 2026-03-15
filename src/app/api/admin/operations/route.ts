import { NextResponse, type NextRequest } from "next/server";
import { requireAdmin } from "@/lib/admin/auth";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export async function GET(request: NextRequest) {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  const supabase = getSupabaseAdminClient();
  const sp = request.nextUrl.searchParams;
  const source = sp.get("source");
  const deliveryMethod = sp.get("type");
  const status = sp.get("status");
  const search = sp.get("q");
  const dateFrom = sp.get("from") || new Date().toISOString().split("T")[0];
  const dateTo = sp.get("to") || dateFrom;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query: any = supabase
    .from("orders")
    .select("id, created_at, status, source, customer_name, customer_phone, customer_email, items, grand_total_cents, delivery_method, delivery_address, delivery_fee_cents, payment_method, notes, customer_id")
    .gte("created_at", `${dateFrom}T00:00:00`)
    .lte("created_at", `${dateTo}T23:59:59`)
    .order("created_at", { ascending: false });

  if (source && source !== "all") query = query.eq("source", source);
  if (deliveryMethod && deliveryMethod !== "all") query = query.eq("delivery_method", deliveryMethod);
  if (status && status !== "all") query = query.eq("status", status);
  if (search) {
    query = query.or(`customer_name.ilike.%${search}%,customer_phone.ilike.%${search}%,delivery_address.ilike.%${search}%`);
  }

  const { data, error } = await query.limit(200);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Compute stats
  const orders = data || [];
  const deliveries = orders.filter((o: { delivery_method: string }) => o.delivery_method === "delivery");
  const pickups = orders.filter((o: { delivery_method: string }) => o.delivery_method === "pickup");
  const revenue = orders.reduce((s: number, o: { grand_total_cents: number }) => s + (o.grand_total_cents || 0), 0);
  const pending = orders.filter((o: { status: string }) => ["new", "pending", "pending_payment"].includes(o.status));

  return NextResponse.json({
    orders,
    stats: {
      totalOrders: orders.length,
      deliveryCount: deliveries.length,
      pickupCount: pickups.length,
      revenueCents: revenue,
      pendingCount: pending.length,
    },
  });
}
