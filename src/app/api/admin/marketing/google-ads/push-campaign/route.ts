import { NextRequest, NextResponse } from "next/server";
import { pushCampaignToGoogleAds } from "@/lib/marketing/google-ads-client";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import type { CampaignDesign } from "@/lib/marketing/campaign-designer";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { campaigns, planId } = body as {
    campaigns: CampaignDesign[];
    planId: string;
  };

  if (!campaigns?.length) {
    return NextResponse.json({ error: "No campaigns provided" }, { status: 400 });
  }

  const supabase = getSupabaseAdminClient();

  // Check publish mode
  const { data: account } = await (supabase as any)
    .from("mktg_google_accounts")
    .select("publish_mode, refresh_token_encrypted, revoked_at")
    .eq("brand_id", "eastern-lm")
    .single();

  if (!account) {
    return NextResponse.json({ error: "Google Ads account not found" }, { status: 404 });
  }

  if (account.revoked_at) {
    return NextResponse.json({ error: "Google Ads account has been disconnected. Reconnect via OAuth first." }, { status: 403 });
  }

  if (!account.refresh_token_encrypted) {
    return NextResponse.json({ error: "Google Ads OAuth not completed. Connect your account first." }, { status: 403 });
  }

  if (account.publish_mode === "read_only") {
    return NextResponse.json({ error: "Account is in read-only mode. Change publish_mode to 'suggest' or 'auto' to push campaigns." }, { status: 403 });
  }

  const results: Array<{
    campaignName: string;
    success: boolean;
    resourceName?: string;
    adGroups?: number;
    ads?: number;
    sitelinks?: number;
    callouts?: number;
    error?: string;
  }> = [];

  for (const campaign of campaigns) {
    try {
      const result = await pushCampaignToGoogleAds(campaign);
      results.push({
        campaignName: campaign.campaignName,
        success: true,
        resourceName: result.campaignResourceName,
        adGroups: result.adGroupResourceNames.length,
        ads: result.adResourceNames.length,
        sitelinks: result.sitelinkCount,
        callouts: result.calloutCount,
      });
    } catch (err: any) {
      const errMsg = err?.errors?.[0]?.message || err?.message || JSON.stringify(err) || "Unknown error";
      console.error(`[push-campaign] Failed: ${campaign.campaignName}`, err);
      results.push({
        campaignName: campaign.campaignName,
        success: false,
        error: errMsg,
      });

      await (supabase as any).from("mktg_agent_actions").insert({
        brand_id: "eastern-lm",
        agent_name: "campaign-designer",
        action: "push_campaign_to_google",
        target_resource: `plan:${planId}`,
        payload: { campaignName: campaign.campaignName },
        result: { error: errMsg },
        status: "error",
        triggered_by: "admin-ui",
      });
    }
  }

  const successCount = results.filter((r) => r.success).length;

  return NextResponse.json({
    planId,
    total: campaigns.length,
    pushed: successCount,
    failed: campaigns.length - successCount,
    results,
  });
}
