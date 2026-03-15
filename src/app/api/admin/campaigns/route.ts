import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/auth";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { prepareCampaign } from "@/lib/marketing/campaigns";

export async function GET() {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("campaigns")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ campaigns: data });
}

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  const body = await request.json();
  const supabase = getSupabaseAdminClient();

  const { data, error } = await supabase.from("campaigns").insert({
    slug: body.slug,
    name: body.name,
    description: body.description || null,
    channel: body.channel,
    sms_body: body.sms_body || null,
    email_subject: body.email_subject || null,
    email_body_html: body.email_body_html || null,
    audience_filter: body.audience_filter || {},
    target_url: body.target_url || null,
    status: "draft",
  }).select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Prepare sends
  const result = await prepareCampaign(supabase, data.id);
  return NextResponse.json({ campaign: data, ...result });
}
