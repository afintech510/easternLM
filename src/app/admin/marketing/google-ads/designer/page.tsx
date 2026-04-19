"use client";

import { useState } from "react";
import {
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Globe,
  Loader2,
  Megaphone,
  Search,
  Sparkles,
  Target,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import type {
  CampaignDesign,
  AdGroupDesign,
  ResponsiveSearchAd,
  SitelinkDesign,
} from "@/lib/marketing/campaign-designer";

type PlanResult = {
  planId: string;
  campaigns: CampaignDesign[];
  generatedAt: string;
};

function formatUsd(cents: number) {
  return `$${(cents / 100).toFixed(0)}`;
}

export default function DesignerPage() {
  const [goal, setGoal] = useState(
    "Capture spring material deliveries: topsoil, mulch, gravel for driveway refresh, clean ups, and installation services."
  );
  const [budget, setBudget] = useState("2000");
  const [campaignCount, setCampaignCount] = useState("5");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [plan, setPlan] = useState<PlanResult | null>(null);
  const [expandedCampaigns, setExpandedCampaigns] = useState<Set<number>>(new Set());
  const [expandedAdGroups, setExpandedAdGroups] = useState<Set<string>>(new Set());
  const [pushing, setPushing] = useState(false);
  const [pushResults, setPushResults] = useState<any>(null);

  async function handleGenerate() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/marketing/google-ads/generate-campaign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          goal,
          monthlyBudgetCents: Math.round(parseFloat(budget) * 100),
          campaignCount: parseInt(campaignCount),
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Generation failed");
      }
      const data = await res.json();
      setPlan(data);
      setExpandedCampaigns(new Set([0]));
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handlePush() {
    if (!plan) return;
    const confirmed = window.confirm(
      `Push ${plan.campaigns.length} campaigns to Google Ads?\n\nAll campaigns will be created in PAUSED status. You'll need to enable them in Google Ads when ready.`
    );
    if (!confirmed) return;

    setPushing(true);
    setPushResults(null);
    try {
      const res = await fetch("/api/admin/marketing/google-ads/push-campaign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ campaigns: plan.campaigns, planId: plan.planId }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Push failed");
      }
      setPushResults(data);
      if (data.pushed === data.total) {
        toast.success(`${data.pushed} campaigns pushed to Google Ads (PAUSED)`);
      } else {
        toast.error(`${data.pushed}/${data.total} campaigns pushed. ${data.failed} failed.`);
      }
    } catch (err: any) {
      toast.error(err.message);
      setError(err.message);
    } finally {
      setPushing(false);
    }
  }

  function toggleCampaign(idx: number) {
    setExpandedCampaigns((prev) => {
      const next = new Set(prev);
      next.has(idx) ? next.delete(idx) : next.add(idx);
      return next;
    });
  }

  function toggleAdGroup(key: string) {
    setExpandedAdGroups((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold flex items-center gap-2">
          <Sparkles className="size-5 text-accent" /> AI Campaign Designer
        </h2>
        <p className="text-sm text-muted-foreground">
          Describe your campaign goals and AI will generate complete Google Ads campaigns with keywords, ad copy, sitelinks, and geo targeting.
        </p>
      </div>

      {/* ── Input Form ──────────────────────────────────── */}
      <div className="rounded-xl border bg-card p-6 space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium">Campaign Goal</label>
          <Textarea
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
            placeholder="What do you want to promote? Who are you targeting?"
            rows={3}
            className="resize-none"
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium">Monthly Budget ($)</label>
            <Input
              type="number"
              value={budget}
              onChange={(e) => setBudget(e.target.value)}
              min={100}
              step={100}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Number of Campaigns</label>
            <Input
              type="number"
              value={campaignCount}
              onChange={(e) => setCampaignCount(e.target.value)}
              min={1}
              max={10}
            />
          </div>
        </div>
        <Button
          onClick={handleGenerate}
          disabled={loading || !goal.trim()}
          className="bg-accent text-accent-foreground hover:bg-accent/90"
          size="lg"
        >
          {loading ? (
            <>
              <Loader2 className="size-4 animate-spin" /> Generating campaigns...
            </>
          ) : (
            <>
              <Sparkles className="size-4" /> Generate Campaign Plan
            </>
          )}
        </Button>
        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}
      </div>

      {/* ── Generated Plan ──────────────────────────────── */}
      {plan && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">Generated Campaign Plan</h3>
              <p className="text-xs text-muted-foreground">
                Plan {plan.planId.slice(0, 8)} · {plan.campaigns.length} campaigns · Generated {new Date(plan.generatedAt).toLocaleString()}
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => {
                const blob = new Blob([JSON.stringify(plan.campaigns, null, 2)], { type: "application/json" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = `campaign-plan-${plan.planId.slice(0, 8)}.json`;
                a.click();
                URL.revokeObjectURL(url);
              }}>
                Export JSON
              </Button>
              <Button
                className="bg-accent text-accent-foreground hover:bg-accent/90"
                size="sm"
                disabled={pushing || !!pushResults}
                onClick={handlePush}
              >
                {pushing ? (
                  <><Loader2 className="size-3 animate-spin" /> Pushing...</>
                ) : pushResults ? (
                  <><CheckCircle2 className="size-3" /> Pushed {pushResults.pushed}/{pushResults.total}</>
                ) : (
                  <>Push to Google Ads <ArrowRight className="size-3" /></>
                )}
              </Button>
            </div>
          </div>

          {/* ── Budget Summary ──────────────────────────── */}
          <div className="grid gap-3 sm:grid-cols-4">
            <div className="rounded-lg border bg-card p-3 text-center">
              <p className="text-2xl font-bold text-accent">{plan.campaigns.length}</p>
              <p className="text-xs text-muted-foreground">Campaigns</p>
            </div>
            <div className="rounded-lg border bg-card p-3 text-center">
              <p className="text-2xl font-bold">{plan.campaigns.reduce((s, c) => s + c.adGroups.length, 0)}</p>
              <p className="text-xs text-muted-foreground">Ad Groups</p>
            </div>
            <div className="rounded-lg border bg-card p-3 text-center">
              <p className="text-2xl font-bold">{plan.campaigns.reduce((s, c) => s + c.adGroups.reduce((t, ag) => t + ag.keywords.length, 0), 0)}</p>
              <p className="text-xs text-muted-foreground">Keywords</p>
            </div>
            <div className="rounded-lg border bg-card p-3 text-center">
              <p className="text-2xl font-bold text-accent">{formatUsd(plan.campaigns.reduce((s, c) => s + c.dailyBudgetCents, 0) * 30)}/mo</p>
              <p className="text-xs text-muted-foreground">Total Budget</p>
            </div>
          </div>

          {/* ── Push Results ──────────────────────────── */}
          {pushResults && (
            <div className="rounded-xl border bg-card p-4 space-y-2">
              <h4 className="font-semibold flex items-center gap-2">
                {pushResults.failed === 0 ? (
                  <><CheckCircle2 className="size-5 text-green-600" /> All campaigns pushed successfully</>
                ) : (
                  <><XCircle className="size-5 text-red-600" /> {pushResults.failed} of {pushResults.total} campaigns failed</>
                )}
              </h4>
              <p className="text-xs text-muted-foreground">
                Campaigns are created in PAUSED status. Go to Google Ads to review and enable them.
              </p>
              {pushResults.results.map((r: any, i: number) => (
                <div key={i} className={`flex items-center gap-2 text-sm rounded-md p-2 ${r.success ? "bg-green-50" : "bg-red-50"}`}>
                  {r.success ? <CheckCircle2 className="size-4 text-green-600 shrink-0" /> : <XCircle className="size-4 text-red-600 shrink-0" />}
                  <span className="flex-1 font-medium">{r.campaignName}</span>
                  {r.success && (
                    <span className="text-xs text-muted-foreground">
                      {r.adGroups} ad groups · {r.ads} ads · {r.sitelinks} sitelinks
                    </span>
                  )}
                  {!r.success && <span className="text-xs text-red-600">{r.error}</span>}
                </div>
              ))}
            </div>
          )}

          {/* ── Campaign Cards ──────────────────────────── */}
          {plan.campaigns.map((campaign, cIdx) => (
            <CampaignCard
              key={cIdx}
              campaign={campaign}
              index={cIdx}
              expanded={expandedCampaigns.has(cIdx)}
              onToggle={() => toggleCampaign(cIdx)}
              expandedAdGroups={expandedAdGroups}
              onToggleAdGroup={toggleAdGroup}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function CampaignCard({
  campaign,
  index,
  expanded,
  onToggle,
  expandedAdGroups,
  onToggleAdGroup,
}: {
  campaign: CampaignDesign;
  index: number;
  expanded: boolean;
  onToggle: () => void;
  expandedAdGroups: Set<string>;
  onToggleAdGroup: (key: string) => void;
}) {
  const totalKeywords = campaign.adGroups.reduce((s, ag) => s + ag.keywords.length, 0);

  return (
    <div className="rounded-xl border bg-card overflow-hidden">
      <button
        onClick={onToggle}
        className="flex w-full items-center gap-3 p-4 text-left hover:bg-muted/30 transition-colors"
      >
        {expanded ? <ChevronDown className="size-4 shrink-0" /> : <ChevronRight className="size-4 shrink-0" />}
        <Megaphone className="size-5 text-accent shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="font-semibold truncate">{campaign.campaignName}</p>
          <p className="text-xs text-muted-foreground">
            {campaign.adGroups.length} ad groups · {totalKeywords} keywords · {formatUsd(campaign.dailyBudgetCents)}/day
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          <Badge variant="outline" className="text-xs">{campaign.biddingStrategy.replace(/_/g, " ")}</Badge>
          <Badge className="bg-accent/10 text-accent border-0 text-xs">{formatUsd(campaign.dailyBudgetCents * 30)}/mo</Badge>
        </div>
      </button>

      {expanded && (
        <div className="border-t p-4 space-y-4">
          {/* Geo Targets */}
          <div>
            <h4 className="mb-2 flex items-center gap-1.5 text-sm font-medium">
              <Globe className="size-4 text-muted-foreground" /> Geo Targets
            </h4>
            <div className="flex flex-wrap gap-1.5">
              {campaign.geoTargets.map((g) => (
                <Badge key={g.criterionId} variant="outline" className="text-xs">{g.name}</Badge>
              ))}
            </div>
          </div>

          {/* Sitelinks */}
          {campaign.sitelinks.length > 0 && (
            <div>
              <h4 className="mb-2 text-sm font-medium">Sitelinks</h4>
              <div className="grid gap-2 sm:grid-cols-2">
                {campaign.sitelinks.map((sl, i) => (
                  <SitelinkPreview key={i} sitelink={sl} />
                ))}
              </div>
            </div>
          )}

          {/* Callouts */}
          {campaign.callouts.length > 0 && (
            <div>
              <h4 className="mb-2 text-sm font-medium">Callouts</h4>
              <div className="flex flex-wrap gap-1.5">
                {campaign.callouts.map((c, i) => (
                  <Badge key={i} variant="secondary" className="text-xs">{c.text}</Badge>
                ))}
              </div>
            </div>
          )}

          {/* Ad Groups */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium">Ad Groups</h4>
            {campaign.adGroups.map((ag, agIdx) => {
              const agKey = `${index}-${agIdx}`;
              return (
                <AdGroupCard
                  key={agIdx}
                  adGroup={ag}
                  expanded={expandedAdGroups.has(agKey)}
                  onToggle={() => onToggleAdGroup(agKey)}
                />
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function AdGroupCard({
  adGroup,
  expanded,
  onToggle,
}: {
  adGroup: AdGroupDesign;
  expanded: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="rounded-lg border">
      <button
        onClick={onToggle}
        className="flex w-full items-center gap-2 p-3 text-left text-sm hover:bg-muted/30 transition-colors"
      >
        {expanded ? <ChevronDown className="size-3" /> : <ChevronRight className="size-3" />}
        <Target className="size-4 text-muted-foreground" />
        <span className="flex-1 font-medium">{adGroup.name}</span>
        <span className="text-xs text-muted-foreground">{adGroup.keywords.length} keywords · {adGroup.ads.length} ads</span>
      </button>

      {expanded && (
        <div className="border-t p-3 space-y-4">
          {/* Keywords */}
          <div>
            <h5 className="mb-1.5 flex items-center gap-1 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              <Search className="size-3" /> Keywords
            </h5>
            <div className="flex flex-wrap gap-1.5">
              {adGroup.keywords.map((kw, i) => (
                <Badge key={i} variant="outline" className="text-xs font-mono">
                  {kw.matchType === "EXACT" && `[${kw.text}]`}
                  {kw.matchType === "PHRASE" && `"${kw.text}"`}
                  {kw.matchType === "BROAD" && kw.text}
                </Badge>
              ))}
            </div>
            {adGroup.negativeKeywords.length > 0 && (
              <div className="mt-2">
                <span className="text-xs text-muted-foreground">Negatives: </span>
                {adGroup.negativeKeywords.map((nk, i) => (
                  <Badge key={i} variant="destructive" className="text-xs mr-1 mb-1">-{nk}</Badge>
                ))}
              </div>
            )}
          </div>

          {/* Ads */}
          {adGroup.ads.map((ad, adIdx) => (
            <AdPreview key={adIdx} ad={ad} index={adIdx} />
          ))}
        </div>
      )}
    </div>
  );
}

function AdPreview({ ad, index }: { ad: ResponsiveSearchAd; index: number }) {
  return (
    <div className="rounded-lg border bg-muted/20 p-3 space-y-2">
      <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">RSA #{index + 1}</p>
      <div className="rounded-md border bg-background p-3 space-y-1">
        <p className="text-xs text-green-600 truncate">
          Ad · {ad.finalUrl}/{ad.path1}/{ad.path2}
        </p>
        <p className="text-blue-600 font-medium text-sm">
          {ad.headlines.slice(0, 3).join(" | ")}
        </p>
        <p className="text-xs text-muted-foreground">
          {ad.descriptions[0]}
        </p>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        <div>
          <p className="text-xs font-medium mb-1">Headlines ({ad.headlines.length})</p>
          <div className="space-y-0.5">
            {ad.headlines.map((h, i) => (
              <p key={i} className={`text-xs ${h.length > 30 ? "text-red-500" : "text-muted-foreground"}`}>
                {i + 1}. {h} <span className="text-muted-foreground/50">({h.length})</span>
              </p>
            ))}
          </div>
        </div>
        <div>
          <p className="text-xs font-medium mb-1">Descriptions ({ad.descriptions.length})</p>
          <div className="space-y-0.5">
            {ad.descriptions.map((d, i) => (
              <p key={i} className={`text-xs ${d.length > 90 ? "text-red-500" : "text-muted-foreground"}`}>
                {i + 1}. {d} <span className="text-muted-foreground/50">({d.length})</span>
              </p>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function SitelinkPreview({ sitelink }: { sitelink: SitelinkDesign }) {
  return (
    <div className="rounded-md border bg-muted/20 p-2">
      <p className="text-sm font-medium text-blue-600">{sitelink.linkText}</p>
      <p className="text-xs text-muted-foreground">{sitelink.description1}</p>
      <p className="text-xs text-muted-foreground">{sitelink.description2}</p>
      <p className="text-xs text-green-600 truncate">{sitelink.finalUrl}</p>
    </div>
  );
}
