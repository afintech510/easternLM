import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  CAMPAIGN_DESIGNER_SYSTEM_PROMPT,
  SUFFOLK_GEO_TARGETS,
  type CampaignDesign,
  type GenerateCampaignInput,
} from "@/lib/marketing/campaign-designer";

export async function POST(req: NextRequest) {
  const body = (await req.json()) as GenerateCampaignInput;
  const { goal, monthlyBudgetCents, campaignCount } = body;

  if (!goal || !monthlyBudgetCents || !campaignCount) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "ANTHROPIC_API_KEY not configured" }, { status: 500 });
  }

  const dailyBudgetPerCampaign = Math.round(monthlyBudgetCents / 30 / campaignCount);

  const userPrompt = `Design ${campaignCount} Google Ads Search campaigns for Eastern LM.

GOAL: ${goal}

BUDGET: $${(monthlyBudgetCents / 100).toFixed(0)}/month total, split evenly = $${(dailyBudgetPerCampaign / 100).toFixed(0)}/day per campaign.

GEO TARGETING: Suffolk County, NY — Patchogue to Southampton (south shore) and Miller Place to Mattituck (north shore/fork). Use the geo targets from the system context.

Each campaign should have 2-4 ad groups with distinct keyword themes. Use the landing pages provided. Make the ads compelling for spring 2026 seasonal demand.

Return a JSON array of ${campaignCount} CampaignDesign objects.`;

  try {
    const client = new Anthropic({ apiKey });
    const response = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 16000,
      system: CAMPAIGN_DESIGNER_SYSTEM_PROMPT,
      messages: [{ role: "user", content: userPrompt }],
    });

    const text = response.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("");

    let campaigns: CampaignDesign[];
    function cleanJson(raw: string): string {
      return raw
        .replace(/^```(?:json)?\s*/gm, "")
        .replace(/```\s*$/gm, "")
        .replace(/[\u2013\u2014\u2015]/g, "-")
        .replace(/[\u2018\u2019\u0060]/g, "'")
        .replace(/[\u201C\u201D]/g, '"')
        .replace(/,\s*([}\]])/g, "$1")
        .trim();
    }
    try {
      campaigns = JSON.parse(cleanJson(text));
    } catch {
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        return NextResponse.json({ error: "Failed to parse AI response as JSON", raw: text.slice(0, 500) }, { status: 500 });
      }
      try {
        campaigns = JSON.parse(cleanJson(jsonMatch[0]));
      } catch (e2: any) {
        return NextResponse.json({ error: "JSON parse failed after cleanup", detail: e2.message, raw: jsonMatch[0].slice(0, 500) }, { status: 500 });
      }
    }

    campaigns = campaigns.map((c) => ({
      ...c,
      dailyBudgetCents: dailyBudgetPerCampaign,
      geoTargets: SUFFOLK_GEO_TARGETS,
    }));

    const planId = crypto.randomUUID();
    const supabase = getSupabaseAdminClient();
    await (supabase as any).from("mktg_agent_actions").insert({
      brand_id: "eastern-lm",
      agent_name: "campaign-designer",
      action: "generate_campaign_plan",
      target_resource: `plan:${planId}`,
      payload: { goal, monthlyBudgetCents, campaignCount },
      result: { planId, campaignCount: campaigns.length },
      status: "success",
      triggered_by: "admin-ui",
    });

    return NextResponse.json({
      planId,
      campaigns,
      generatedAt: new Date().toISOString(),
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: "AI generation failed", detail: err.message },
      { status: 500 },
    );
  }
}
