import { GoogleAdsApi, enums } from "google-ads-api";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { decryptRefreshToken } from "./crypto";
import type { CampaignDesign } from "./campaign-designer";

const CUSTOMER_ID = process.env.GOOGLE_ADS_CUSTOMER_ID || "5409526270";
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://www.easternlm.com";

type PushResult = {
  campaignResourceName: string;
  adGroupResourceNames: string[];
  adResourceNames: string[];
  sitelinkCount: number;
  calloutCount: number;
};

async function getGoogleAdsClient() {
  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID || process.env.GOOGLE_ADS_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET || process.env.GOOGLE_ADS_CLIENT_SECRET;
  const developerToken = process.env.GOOGLE_ADS_DEVELOPER_TOKEN;

  if (!clientId || !clientSecret || !developerToken) {
    throw new Error("Google Ads API credentials not configured (GOOGLE_OAUTH_CLIENT_ID, GOOGLE_OAUTH_CLIENT_SECRET, GOOGLE_ADS_DEVELOPER_TOKEN)");
  }

  // Prefer plaintext refresh token from env, fall back to encrypted in Supabase
  let refreshToken = process.env.GOOGLE_ADS_REFRESH_TOKEN;
  if (!refreshToken) {
    const supabase = getSupabaseAdminClient();
    const { data: account } = await (supabase as any)
      .from("mktg_google_accounts")
      .select("refresh_token_encrypted")
      .eq("brand_id", "eastern-lm")
      .single();

    if (!account?.refresh_token_encrypted) {
      throw new Error("Google Ads account not connected — set GOOGLE_ADS_REFRESH_TOKEN or complete OAuth");
    }
    refreshToken = decryptRefreshToken(account.refresh_token_encrypted);
  }

  const api = new GoogleAdsApi({
    client_id: clientId,
    client_secret: clientSecret,
    developer_token: developerToken,
  });

  return api.Customer({
    customer_id: CUSTOMER_ID,
    refresh_token: refreshToken,
  });
}

function keywordMatchEnum(matchType: string) {
  switch (matchType) {
    case "EXACT": return enums.KeywordMatchType.EXACT;
    case "PHRASE": return enums.KeywordMatchType.PHRASE;
    case "BROAD": return enums.KeywordMatchType.BROAD;
    default: return enums.KeywordMatchType.BROAD;
  }
}

export async function pushCampaignToGoogleAds(
  design: CampaignDesign,
  brandId: string = "eastern-lm",
): Promise<PushResult> {
  const customer = await getGoogleAdsClient();
  const supabase = getSupabaseAdminClient();

  // 1. Create campaign budget
  const budgetResult = await customer.campaignBudgets.create([
    {
      name: `${design.campaignName} Budget ${Date.now()}`,
      amount_micros: design.dailyBudgetCents * 10000,
      delivery_method: enums.BudgetDeliveryMethod.STANDARD,
    } as any,
  ]);
  const budgetResourceName = budgetResult.results[0]?.resource_name;
  if (!budgetResourceName) throw new Error("Failed to create campaign budget");

  // 2. Create campaign (PAUSED — must manually enable in Google Ads)
  const campaignCreate: any = {
    name: design.campaignName,
    advertising_channel_type: enums.AdvertisingChannelType.SEARCH,
    status: enums.CampaignStatus.PAUSED,
    campaign_budget: budgetResourceName,
    network_settings: {
      target_google_search: true,
      target_search_network: false,
      target_content_network: false,
    },
    contains_eu_political_advertising: enums.EuPoliticalAdvertisingStatus.DOES_NOT_CONTAIN_EU_POLITICAL_ADVERTISING,
  };

  if (design.biddingStrategy === "MAXIMIZE_CONVERSIONS") {
    campaignCreate.maximize_conversions = {};
  } else if (design.biddingStrategy === "TARGET_CPA" && design.targetCpaCents) {
    campaignCreate.target_cpa = {
      target_cpa_micros: design.targetCpaCents * 10000,
    };
  } else {
    campaignCreate.target_spend = {};
  }

  const campaignResult = await customer.campaigns.create([campaignCreate]);
  const campaignResourceName = campaignResult.results[0]?.resource_name;
  if (!campaignResourceName) throw new Error("Failed to create campaign");

  // 3. Set geo targets
  if (design.geoTargets.length > 0) {
    await customer.campaignCriteria.create(
      design.geoTargets.map((gt) => ({
        campaign: campaignResourceName,
        location: {
          geo_target_constant: `geoTargetConstants/${gt.criterionId}`,
        },
      })) as any[],
    );
  }

  // 4. Create ad groups + keywords + ads
  const adGroupResourceNames: string[] = [];
  const adResourceNames: string[] = [];

  for (const adGroup of design.adGroups) {
    const agResult = await customer.adGroups.create([
      {
        name: adGroup.name,
        campaign: campaignResourceName,
        status: enums.AdGroupStatus.ENABLED,
        type: enums.AdGroupType.SEARCH_STANDARD,
      } as any,
    ]);
    const agResourceName = agResult.results[0]?.resource_name;
    if (!agResourceName) continue;
    adGroupResourceNames.push(agResourceName);

    // Keywords
    if (adGroup.keywords.length > 0) {
      await customer.adGroupCriteria.create(
        adGroup.keywords.map((kw) => ({
          ad_group: agResourceName,
          status: enums.AdGroupCriterionStatus.ENABLED,
          keyword: {
            text: kw.text,
            match_type: keywordMatchEnum(kw.matchType),
          },
        })) as any[],
      );
    }

    // Negative keywords
    if (adGroup.negativeKeywords.length > 0) {
      await customer.adGroupCriteria.create(
        adGroup.negativeKeywords.map((nk) => ({
          ad_group: agResourceName,
          negative: true,
          keyword: {
            text: nk,
            match_type: enums.KeywordMatchType.BROAD,
          },
        })) as any[],
      );
    }

    // Responsive Search Ads
    for (const ad of adGroup.ads) {
      const adResult = await customer.adGroupAds.create([
        {
          ad_group: agResourceName,
          status: enums.AdGroupAdStatus.PAUSED,
          ad: {
            responsive_search_ad: {
              headlines: ad.headlines.map((h, i) => ({
                text: h.slice(0, 30),
                pinned_field: i === 0 ? enums.ServedAssetFieldType.HEADLINE_1 : undefined,
              })),
              descriptions: ad.descriptions.map((d) => ({
                text: d.slice(0, 90),
              })),
              path1: ad.path1?.slice(0, 15),
              path2: ad.path2?.slice(0, 15),
            },
            final_urls: [`${SITE_URL}${ad.finalUrl}`],
          },
        } as any,
      ]);
      const adRn = adResult.results[0]?.resource_name;
      if (adRn) adResourceNames.push(adRn);
    }
  }

  // 5. Sitelinks (campaign-level assets)
  let sitelinkCount = 0;
  if (design.sitelinks.length > 0) {
    const assetResult = await customer.assets.create(
      design.sitelinks.map((sl) => ({
        final_urls: [`${SITE_URL}${sl.finalUrl}`],
        sitelink_asset: {
          link_text: sl.linkText.slice(0, 25),
          description1: sl.description1.slice(0, 35),
          description2: sl.description2.slice(0, 35),
        },
      })) as any[],
    );

    await customer.campaignAssets.create(
      assetResult.results.map((r: any) => ({
        campaign: campaignResourceName,
        asset: r.resource_name,
        field_type: enums.AssetFieldType.SITELINK,
      })) as any[],
    );
    sitelinkCount = design.sitelinks.length;
  }

  // 6. Callouts (campaign-level assets)
  let calloutCount = 0;
  if (design.callouts.length > 0) {
    const calloutResult = await customer.assets.create(
      design.callouts.map((c) => ({
        callout_asset: {
          callout_text: c.text.slice(0, 25),
        },
      })) as any[],
    );

    await customer.campaignAssets.create(
      calloutResult.results.map((r: any) => ({
        campaign: campaignResourceName,
        asset: r.resource_name,
        field_type: enums.AssetFieldType.CALLOUT,
      })) as any[],
    );
    calloutCount = design.callouts.length;
  }

  // 7. Audit log
  await (supabase as any).from("mktg_agent_actions").insert({
    brand_id: brandId,
    agent_name: "campaign-designer",
    action: "push_campaign_to_google",
    target_resource: campaignResourceName,
    payload: {
      campaignName: design.campaignName,
      adGroupCount: design.adGroups.length,
      keywordCount: design.adGroups.reduce((s, ag) => s + ag.keywords.length, 0),
    },
    result: {
      campaignResourceName,
      adGroupCount: adGroupResourceNames.length,
      adCount: adResourceNames.length,
      sitelinkCount,
      calloutCount,
    },
    status: "success",
    triggered_by: "admin-ui",
  });

  // 8. Mirror to local campaigns table
  const campaignId = campaignResourceName.split("/").pop() || "";
  await (supabase as any).from("mktg_google_campaigns").upsert(
    {
      brand_id: brandId,
      google_campaign_id: campaignId,
      name: design.campaignName,
      type: "SEARCH",
      status: "PAUSED",
      budget_cents_daily: design.dailyBudgetCents,
      bidding_strategy: design.biddingStrategy,
      target_cpa_cents: design.targetCpaCents || null,
      created_by_agent: true,
      last_synced_at: new Date().toISOString(),
    },
    { onConflict: "brand_id,google_campaign_id" },
  );

  return {
    campaignResourceName,
    adGroupResourceNames,
    adResourceNames,
    sitelinkCount,
    calloutCount,
  };
}
