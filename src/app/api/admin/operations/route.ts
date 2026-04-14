import { NextResponse, type NextRequest } from "next/server";
import { requireAdmin } from "@/lib/admin/auth";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

const PAGE_SIZE = 50;

function getDateRange(preset: string, from?: string, to?: string) {
  const now = new Date();
  const today = now.toISOString().split("T")[0];

  switch (preset) {
    case "today":
      return { from: `${today}T00:00:00`, to: `${today}T23:59:59` };
    case "yesterday": {
      const y = new Date(now.getTime() - 86400000).toISOString().split("T")[0];
      return { from: `${y}T00:00:00`, to: `${y}T23:59:59` };
    }
    case "this_week": {
      const dow = now.getDay();
      const mondayOffset = dow === 0 ? 6 : dow - 1;
      const monday = new Date(now.getTime() - mondayOffset * 86400000).toISOString().split("T")[0];
      return { from: `${monday}T00:00:00`, to: `${today}T23:59:59` };
    }
    case "this_month": {
      const monthStart = `${today.slice(0, 7)}-01`;
      return { from: `${monthStart}T00:00:00`, to: `${today}T23:59:59` };
    }
    case "custom":
      if (from && to) return { from: `${from}T00:00:00`, to: `${to}T23:59:59` };
      return { from: `${today}T00:00:00`, to: `${today}T23:59:59` };
    case "all":
      return { from: "2020-01-01T00:00:00", to: `${today}T23:59:59` };
    default:
      return { from: `${today}T00:00:00`, to: `${today}T23:59:59` };
  }
}

export async function GET(request: NextRequest) {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  const supabase = getSupabaseAdminClient() as ReturnType<typeof getSupabaseAdminClient>;
  const sp = request.nextUrl.searchParams;

  const source = sp.get("source");
  const deliveryMethod = sp.get("type");
  const status = sp.get("status");
  const search = sp.get("q")?.trim();
  const datePreset = sp.get("date") || "this_week";
  const dateFrom = sp.get("dateFrom") || undefined;
  const dateTo = sp.get("dateTo") || undefined;
  const sortBy = sp.get("sort") || "newest";
  const offset = parseInt(sp.get("offset") || "0", 10);
  const limit = parseInt(sp.get("limit") || String(PAGE_SIZE), 10);

  const { from, to } = getDateRange(datePreset, dateFrom, dateTo);

  // Build query
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query = (supabase as any)
    .from("orders")
    .select(
      "id, created_at, placed_at, status, source, customer_name, customer_phone, customer_email, grand_total_cents, materials_subtotal_cents, delivery_total_cents, tax_cents, cc_surcharge_cents, discount_amount_cents, discount_reason, tax_exempt, store_credit_applied_cents, delivery_method, delivery_address, delivery_date, delivery_time_window, delivery_notes, payment_method, stripe_checkout_session_id, customer_id, metadata, access_constraints, order_items(id, product_name, quantity, unit, unit_price_cents, line_subtotal_cents, delivery_type, material_class, load_number)",
      { count: "exact" },
    )
    .gte("created_at", from)
    .lte("created_at", to);

  if (source && source !== "all") query = query.eq("source", source);
  if (deliveryMethod && deliveryMethod !== "all") query = query.eq("delivery_method", deliveryMethod);
  if (status && status !== "all") query = query.eq("status", status);

  if (search) {
    const digits = search.replace(/\D/g, "");
    const isPhone = digits.length >= 7;
    const isOrderId = /^[0-9a-f]{4,}/i.test(search);

    if (isOrderId) {
      // Search by order ID — remove date filter for ID searches
      query = (supabase as any)
        .from("orders")
        .select(
          "id, created_at, placed_at, status, source, customer_name, customer_phone, customer_email, grand_total_cents, materials_subtotal_cents, delivery_total_cents, tax_cents, cc_surcharge_cents, discount_amount_cents, discount_reason, delivery_method, delivery_address, delivery_date, delivery_time_window, delivery_notes, payment_method, stripe_checkout_session_id, customer_id, metadata, access_constraints, tax_exempt, store_credit_applied_cents, order_items(id, product_name, quantity, unit, unit_price_cents, line_subtotal_cents, delivery_type, material_class, load_number)",
          { count: "exact" },
        )
        .filter("id::text", "ilike", `${search.toLowerCase()}%`)
        .order("created_at", { ascending: false })
        .range(offset, offset + limit - 1);
    } else if (isPhone) {
      query = query.ilike("customer_phone", `%${digits}%`);
    } else {
      query = query.or(
        `customer_name.ilike.%${search}%,customer_email.ilike.%${search}%,delivery_address.ilike.%${search}%`,
      );
    }
  }

  // Sort
  switch (sortBy) {
    case "oldest":
      query = query.order("created_at", { ascending: true });
      break;
    case "total_high":
      query = query.order("grand_total_cents", { ascending: false });
      break;
    case "total_low":
      query = query.order("grand_total_cents", { ascending: true });
      break;
    case "customer_name":
      query = query.order("customer_name", { ascending: true });
      break;
    default:
      query = query.order("created_at", { ascending: false });
  }

  query = query.range(offset, offset + limit - 1);

  const { data, error, count } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const orders = (data || []).map((o: Record<string, unknown>) => ({
    ...o,
    items: (o.order_items as unknown[]) ?? [],
    order_items: undefined,
  }));

  // Compute stats for the current date range
  const deliveries = orders.filter((o: Record<string, unknown>) => o.delivery_method === "delivery");
  const pickups = orders.filter((o: Record<string, unknown>) => o.delivery_method === "pickup");
  const revenue = orders.reduce((s: number, o: Record<string, unknown>) => s + ((o.grand_total_cents as number) || 0), 0);
  const pending = orders.filter((o: Record<string, unknown>) => ["new", "pending", "pending_payment"].includes(o.status as string));

  // Also compute today + this week stats independently (for the stats bar)
  const now = new Date();
  const todayStr = now.toISOString().split("T")[0];
  const dow = now.getDay();
  const mondayOffset = dow === 0 ? 6 : dow - 1;
  const mondayStr = new Date(now.getTime() - mondayOffset * 86400000).toISOString().split("T")[0];

  const [todayRes, weekRes] = await Promise.all([
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase as any)
      .from("orders")
      .select("grand_total_cents, status", { count: "exact" })
      .gte("created_at", `${todayStr}T00:00:00`)
      .lte("created_at", `${todayStr}T23:59:59`),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase as any)
      .from("orders")
      .select("grand_total_cents, status", { count: "exact" })
      .gte("created_at", `${mondayStr}T00:00:00`)
      .lte("created_at", `${todayStr}T23:59:59`),
  ]);

  const todayOrders = todayRes.data || [];
  const weekOrders = weekRes.data || [];

  const sumCents = (arr: Array<{ grand_total_cents: number }>) =>
    arr.reduce((s, o) => s + (o.grand_total_cents || 0), 0);
  const countByStatus = (arr: Array<{ status: string }>, statuses: string[]) =>
    arr.filter((o) => statuses.includes(o.status)).length;

  return NextResponse.json({
    orders,
    totalCount: count ?? orders.length,
    stats: {
      filtered: {
        totalOrders: count ?? orders.length,
        deliveryCount: deliveries.length,
        pickupCount: pickups.length,
        revenueCents: revenue,
        pendingCount: pending.length,
      },
      today: {
        count: todayRes.count ?? todayOrders.length,
        revenueCents: sumCents(todayOrders),
      },
      thisWeek: {
        count: weekRes.count ?? weekOrders.length,
        revenueCents: sumCents(weekOrders),
      },
      byStatus: {
        pending: countByStatus(weekOrders, ["new", "pending", "pending_payment"]),
        scheduled: countByStatus(weekOrders, ["confirmed", "scheduled"]),
        delivered: countByStatus(weekOrders, ["delivered"]),
        cancelled: countByStatus(weekOrders, ["cancelled"]),
      },
    },
  });
}
