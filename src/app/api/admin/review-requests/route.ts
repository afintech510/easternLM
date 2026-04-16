import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/auth";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { scheduleFollowUps } from "@/lib/follow-ups/engine";

/**
 * GET /api/admin/review-requests
 * Returns settings, templates, metrics, and recent review-request follow-ups.
 */
export async function GET() {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = getSupabaseAdminClient() as any;

  // Settings
  const { data: settings } = await supabase
    .from("site_settings")
    .select("follow_up_enabled, google_review_url, yelp_review_url, follow_up_timezone")
    .eq("id", 1)
    .single();

  // Templates (filter to delivery-triggered only)
  const { data: templates } = await supabase
    .from("follow_up_templates")
    .select("*")
    .in("trigger_event", ["order_delivered", "days_after_delivery"])
    .order("delay_minutes");

  // Recent review-request follow-ups (last 90 days)
  const cutoff = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
  const { data: recent } = await supabase
    .from("follow_ups")
    .select("id, customer_name, phone, email, template_slug, channel, status, scheduled_at, sent_at, link_clicked, review_submitted, order_id, error_message")
    .in("template_slug", ["review-request-sms", "review-request-email", "review-reminder-sms"])
    .gte("created_at", cutoff)
    .order("scheduled_at", { ascending: false })
    .limit(100);

  // Metrics (last 30 days)
  const metricCutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const { data: metricRows } = await supabase
    .from("follow_ups")
    .select("status, link_clicked, review_submitted, channel")
    .in("template_slug", ["review-request-sms", "review-request-email", "review-reminder-sms"])
    .gte("created_at", metricCutoff);

  const rows = metricRows ?? [];
  const metrics = {
    total: rows.length,
    sent: rows.filter((r: { status: string }) => r.status === "sent" || r.status === "delivered").length,
    pending: rows.filter((r: { status: string }) => r.status === "pending").length,
    failed: rows.filter((r: { status: string }) => r.status === "failed").length,
    clicked: rows.filter((r: { link_clicked: boolean }) => r.link_clicked).length,
    reviews_submitted: rows.filter((r: { review_submitted: boolean }) => r.review_submitted).length,
    by_channel: {
      sms: rows.filter((r: { channel: string }) => r.channel === "sms").length,
      email: rows.filter((r: { channel: string }) => r.channel === "email").length,
    },
  };

  return NextResponse.json({ settings, templates: templates ?? [], recent: recent ?? [], metrics });
}

/**
 * PATCH /api/admin/review-requests
 * Update settings or toggle template active state.
 */
export async function PATCH(request: Request) {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  const body = await request.json();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = getSupabaseAdminClient() as any;

  if (body.settings) {
    const { error } = await supabase.from("site_settings").update({
      ...body.settings,
      updated_at: new Date().toISOString(),
    }).eq("id", 1);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (body.template) {
    const { id, ...updates } = body.template;
    const { error } = await supabase.from("follow_up_templates").update({
      ...updates,
      updated_at: new Date().toISOString(),
    }).eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

/**
 * POST /api/admin/review-requests (manual trigger)
 * Schedule follow-ups for a specific order manually (for testing/recovery).
 */
export async function POST(request: Request) {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  const { order_id } = await request.json();
  if (!order_id) return NextResponse.json({ error: "order_id required" }, { status: 400 });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = getSupabaseAdminClient() as any;
  const trimmed = order_id.trim().replace(/^#/, "");

  // Support full UUID or prefix (first 8+ chars)
  const isFullUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(trimmed);
  let order;
  if (isFullUuid) {
    const { data } = await supabase
      .from("orders")
      .select("id, customer_name, customer_phone, customer_email, delivery_address")
      .eq("id", trimmed)
      .single();
    order = data;
  } else {
    // Prefix match — cast uuid to text and use LIKE
    const prefix = trimmed.toLowerCase();
    if (!/^[0-9a-f]{4,}$/.test(prefix)) {
      return NextResponse.json({ error: "Invalid order ID format" }, { status: 400 });
    }
    const { data } = await supabase
      .from("orders")
      .select("id, customer_name, customer_phone, customer_email, delivery_address")
      .filter("id::text", "like", `${prefix}%`)
      .limit(1)
      .single();
    order = data;
  }

  if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });

  const result = await scheduleFollowUps(supabase, order);
  return NextResponse.json({ ok: true, ...result });
}
