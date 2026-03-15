import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const supabase = getSupabaseAdminClient();

  // Mark as clicked
  const { data: send } = await supabase
    .from("campaign_sends")
    .update({ link_clicked: true, clicked_at: new Date().toISOString() })
    .eq("id", id)
    .select("campaign_id")
    .single();

  // Update campaign click count
  if (send?.campaign_id) {
    const { count } = await supabase
      .from("campaign_sends")
      .select("id", { count: "exact", head: true })
      .eq("campaign_id", send.campaign_id)
      .eq("link_clicked", true);

    await supabase.from("campaigns").update({ total_clicked: count || 0 }).eq("id", send.campaign_id);
  }

  // Get campaign target URL
  let targetUrl = "https://easternlm.com/shop";
  if (send?.campaign_id) {
    const { data: campaign } = await supabase.from("campaigns").select("target_url").eq("id", send.campaign_id).single();
    if (campaign?.target_url) targetUrl = campaign.target_url;
  }

  return NextResponse.redirect(targetUrl);
}
