import { NextResponse, type NextRequest } from "next/server";
import { requireAdmin } from "@/lib/admin/auth";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

/**
 * GET /api/admin/review-requests
 * Returns paginated orders (delivery-first) with items summary and outreach history.
 */
export async function GET(request: NextRequest) {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  const sp = request.nextUrl.searchParams;
  const page = Math.max(1, parseInt(sp.get("page") || "1"));
  const limit = Math.min(100, Math.max(10, parseInt(sp.get("limit") || "50")));
  const offset = (page - 1) * limit;
  const status = sp.get("status");
  const customerType = sp.get("customer_type");
  const reviewStatus = sp.get("review_status");
  const search = sp.get("search")?.trim();
  const dateFrom = sp.get("date_from");
  const dateTo = sp.get("date_to");
  const deliveryOnly = sp.get("delivery_only") !== "false";

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = getSupabaseAdminClient() as any;

  // Build orders query
  let query = supabase
    .from("orders")
    .select(
      `id, customer_name, customer_phone, customer_email, customer_id,
       status, delivery_method, delivery_address, delivery_zip,
       materials_subtotal_cents, delivery_total_cents, grand_total_cents,
       placed_at, updated_at, source, sms_opt_in`,
      { count: "exact" }
    )
    .order("placed_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (deliveryOnly) {
    query = query.eq("delivery_method", "delivery");
  }
  if (status) {
    query = query.eq("status", status);
  }
  if (dateFrom) {
    query = query.gte("placed_at", dateFrom);
  }
  if (dateTo) {
    query = query.lte("placed_at", dateTo + "T23:59:59.999Z");
  }
  if (search) {
    const s = search.replace(/[()\\-\s]/g, "");
    const isPhone = /^\d{7,}$/.test(s);
    if (isPhone) {
      query = query.ilike("customer_phone", `%${s.slice(-10)}%`);
    } else {
      query = query.or(
        `customer_name.ilike.%${search}%,delivery_address.ilike.%${search}%,id.ilike.${search}%`
      );
    }
  }

  const { data: orders, count, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!orders || orders.length === 0) {
    return NextResponse.json({ orders: [], total: 0, page, limit, stats: null });
  }

  const orderIds = orders.map((o: { id: string }) => o.id);
  const customerIds = orders
    .map((o: { customer_id: string | null }) => o.customer_id)
    .filter(Boolean) as string[];

  // Fetch items, follow-ups, and customer types in parallel
  const [itemsRes, followUpsRes, customersRes] = await Promise.all([
    supabase
      .from("order_items")
      .select("order_id, product_name, quantity, unit")
      .in("order_id", orderIds),
    supabase
      .from("follow_ups")
      .select("id, order_id, channel, template_slug, status, sent_at, link_clicked")
      .in("order_id", orderIds)
      .in("template_slug", [
        "review-request-sms",
        "review-request-email",
        "review-reminder-sms",
        "manual-review-sms",
        "manual-review-email",
        "manual-marketing-sms",
        "manual-reminder-sms",
        "manual-reminder-email",
      ])
      .order("sent_at", { ascending: false }),
    customerIds.length > 0
      ? supabase
          .from("customers")
          .select("id, customer_type")
          .in("id", customerIds)
      : Promise.resolve({ data: [] }),
  ]);

  const itemsByOrder = new Map<string, { product_name: string; quantity: number; unit: string }[]>();
  for (const item of itemsRes.data ?? []) {
    const arr = itemsByOrder.get(item.order_id) ?? [];
    arr.push(item);
    itemsByOrder.set(item.order_id, arr);
  }

  const followUpsByOrder = new Map<string, typeof followUpsRes.data>();
  for (const fu of followUpsRes.data ?? []) {
    const arr = followUpsByOrder.get(fu.order_id) ?? [];
    arr.push(fu);
    followUpsByOrder.set(fu.order_id, arr);
  }

  const customerTypeMap = new Map<string, string>();
  for (const c of customersRes.data ?? []) {
    customerTypeMap.set(c.id, c.customer_type);
  }

  // Apply customer_type filter
  let enrichedOrders = orders.map((o: Record<string, unknown>) => ({
    ...o,
    items: itemsByOrder.get(o.id as string) ?? [],
    outreach: followUpsByOrder.get(o.id as string) ?? [],
    customer_type: o.customer_id ? customerTypeMap.get(o.customer_id as string) ?? null : null,
  }));

  if (customerType) {
    if (customerType === "untagged") {
      enrichedOrders = enrichedOrders.filter(
        (o: { customer_type: string | null }) => !o.customer_type || o.customer_type === "homeowner"
      );
    } else {
      enrichedOrders = enrichedOrders.filter(
        (o: { customer_type: string | null }) => o.customer_type === customerType
      );
    }
  }

  if (reviewStatus === "sent") {
    enrichedOrders = enrichedOrders.filter(
      (o: { outreach: unknown[] }) => o.outreach.length > 0
    );
  } else if (reviewStatus === "not_sent") {
    enrichedOrders = enrichedOrders.filter(
      (o: { outreach: unknown[] }) => o.outreach.length === 0
    );
  }

  // Stats
  const { data: statsRows } = await supabase
    .from("orders")
    .select("id", { count: "exact", head: true })
    .eq("delivery_method", "delivery")
    .gte("placed_at", new Date(Date.now() - 30 * 86400000).toISOString());

  const { data: sentRows } = await supabase
    .from("follow_ups")
    .select("id, link_clicked", { count: "exact" })
    .in("status", ["sent", "delivered"])
    .gte("sent_at", new Date(Date.now() - 30 * 86400000).toISOString());

  const sentList = sentRows ?? [];
  const stats = {
    deliveries_this_month: statsRows?.length ?? 0,
    reviews_sent: sentList.length,
    clicks: sentList.filter((r: { link_clicked: boolean }) => r.link_clicked).length,
    click_rate: sentList.length > 0
      ? Math.round((sentList.filter((r: { link_clicked: boolean }) => r.link_clicked).length / sentList.length) * 100)
      : 0,
  };

  // Settings
  const { data: settings } = await supabase
    .from("site_settings")
    .select("follow_up_enabled, google_review_url, yelp_review_url")
    .eq("id", 1)
    .single();

  return NextResponse.json({
    orders: enrichedOrders,
    total: count ?? 0,
    page,
    limit,
    stats,
    settings,
  });
}

/**
 * PATCH /api/admin/review-requests
 * Update settings (follow_up_enabled, review URLs).
 */
export async function PATCH(request: Request) {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  const body = await request.json();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = getSupabaseAdminClient() as any;

  if (body.settings) {
    const { error } = await supabase
      .from("site_settings")
      .update({ ...body.settings, updated_at: new Date().toISOString() })
      .eq("id", 1);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
