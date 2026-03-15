import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/auth";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  const { id } = await context.params;
  const supabase = getSupabaseAdminClient();

  const [campaignRes, sendsRes] = await Promise.all([
    supabase.from("campaigns").select("*").eq("id", id).single(),
    supabase.from("campaign_sends").select("*").eq("campaign_id", id).order("created_at").limit(200),
  ]);

  if (campaignRes.error) return NextResponse.json({ error: campaignRes.error.message }, { status: 404 });
  return NextResponse.json({ campaign: campaignRes.data, sends: sendsRes.data || [] });
}

export async function PATCH(request: Request, context: RouteContext) {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  const { id } = await context.params;
  const body = await request.json();
  const supabase = getSupabaseAdminClient();

  // Status transitions
  const update: Record<string, unknown> = {};
  if (body.status) {
    update.status = body.status;
    if (body.status === "scheduled" && body.scheduled_at) update.scheduled_at = body.scheduled_at;
    if (body.status === "sending") update.started_at = new Date().toISOString();
    if (body.status === "cancelled") update.completed_at = new Date().toISOString();
  }
  if (body.approved) {
    update.approved_by = "admin";
    update.approved_at = new Date().toISOString();
  }

  const { error } = await supabase.from("campaigns").update(update).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
