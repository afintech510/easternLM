import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { processCampaignBatch } from "@/lib/marketing/campaigns";

export async function GET(request: NextRequest) {
  const key = request.nextUrl.searchParams.get("key");
  if (key !== process.env.CRON_SECRET_KEY) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = getSupabaseAdminClient();

  // 1. Activate scheduled campaigns that are due
  const now = new Date().toISOString();
  await supabase
    .from("campaigns")
    .update({ status: "sending", started_at: now })
    .eq("status", "scheduled")
    .lte("scheduled_at", now);

  // 2. Process active campaigns
  const { data: active } = await supabase
    .from("campaigns")
    .select("id")
    .eq("status", "sending");

  if (!active || active.length === 0) {
    return NextResponse.json({ ok: true, processed: 0 });
  }

  const results = [];
  for (const campaign of active) {
    const result = await processCampaignBatch(supabase, campaign.id, 25);
    results.push({ id: campaign.id, ...result });
  }

  return NextResponse.json({ ok: true, processed: results.length, results });
}
