"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, ArrowRight, Eye, Send, Users } from "lucide-react";

const CUSTOMER_TAGS = [
  "repeat", "high-value", "contractor", "mulch-buyer", "gravel-buyer",
  "topsoil-buyer", "mason-buyer", "account-customer", "cod-customer",
];

const MERGE_FIELDS = [
  { label: "Name", value: "{{customer_name}}" },
  { label: "First Name", value: "{{first_name}}" },
  { label: "Town", value: "{{town}}" },
  { label: "Shop URL", value: "{{shop_url}}" },
  { label: "Phone", value: "{{phone}}" },
  { label: "Last Order", value: "{{last_order_date}}" },
  { label: "Tracking Link", value: "{{tracking_url}}" },
];

const TEMPLATES = [
  {
    name: "Spring Mulch Season",
    channel: "sms" as const,
    sms_body: "Spring is here! Eastern LM has fresh mulch starting at $20/yd with same-day delivery. Order online: {{shop_url}} or call (631) 874-6244. Reply STOP to opt out",
    audience_filter: { tags_include: ["mulch-buyer"], has_phone: true },
  },
  {
    name: "Topsoil Sale",
    channel: "sms" as const,
    sms_body: "Starting a lawn project, {{first_name}}? Screened organic topsoil is $24/yd delivered. Calculate how much you need: easternlm.com/calculator/topsoil Reply STOP to opt out",
    audience_filter: { tags_include: ["topsoil-buyer"], has_phone: true },
  },
  {
    name: "Driveway Season",
    channel: "sms" as const,
    sms_body: "Time to fix that driveway! RCA starts at $20/yd, bluestone at $88/yd. We deliver and install. Get a free quote: easternlm.com/quote Reply STOP to opt out",
    audience_filter: { tags_include: ["gravel-buyer"], has_phone: true },
  },
  {
    name: "Reactivation",
    channel: "sms" as const,
    sms_body: "We miss you, {{first_name}}! It's been a while since your last order. Eastern LM has same-day delivery on mulch, topsoil, gravel & more. Shop: {{shop_url}} Reply STOP to opt out",
    audience_filter: { last_order_before: "RELATIVE:-6months", min_orders: 1, has_phone: true },
  },
  {
    name: "Contractor Special",
    channel: "sms" as const,
    sms_body: "Pro pricing this week at Eastern LM: 5% off pickup orders. Bulk mulch, gravel, RCA, topsoil. Call for volume quotes: (631) 874-6244 Reply STOP to opt out",
    audience_filter: { tags_include: ["contractor"], has_phone: true },
  },
];

type AudienceFilter = {
  tags_include?: string[];
  tags_include_any?: string[];
  tags_exclude?: string[];
  min_orders?: number;
  last_order_after?: string;
  last_order_before?: string;
  towns?: string[];
  has_phone?: boolean;
  has_email?: boolean;
};

export default function NewCampaignPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);

  // Step 1: Basics
  const [name, setName] = useState("");
  const [channel, setChannel] = useState<"sms" | "email" | "both">("sms");
  const [description, setDescription] = useState("");

  // Step 2: Audience
  const [filter, setFilter] = useState<AudienceFilter>({ has_phone: true });
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [tagMatchMode, setTagMatchMode] = useState<"all" | "any">("all");
  const [preview, setPreview] = useState<{ count: number; smsFriendly: number; emailFriendly: number; sample: Array<{ first_name: string | null; phone: string | null }> } | null>(null);
  const [previewing, setPreviewing] = useState(false);

  // Step 3: Content
  const [smsBody, setSmsBody] = useState("");
  const [emailSubject, setEmailSubject] = useState("");
  const [emailBodyHtml, setEmailBodyHtml] = useState("");
  const [targetUrl, setTargetUrl] = useState("https://easternlm.com/shop");

  // Step 4: Schedule
  const [scheduleType, setScheduleType] = useState<"now" | "later">("now");
  const [scheduledAt, setScheduledAt] = useState("");

  function toggleTag(tag: string) {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  }

  function buildAudienceFilter(): AudienceFilter {
    const tags = selectedTags.length > 0 ? selectedTags : undefined;
    return {
      ...filter,
      tags_include: tagMatchMode === "all" ? tags : undefined,
      tags_include_any: tagMatchMode === "any" ? tags : undefined,
    };
  }

  async function previewAudience() {
    setPreviewing(true);
    const audienceFilter = buildAudienceFilter();
    const res = await fetch("/api/admin/campaigns/preview", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ filter: audienceFilter }),
    });
    if (res.ok) setPreview(await res.json());
    setPreviewing(false);
  }

  function applyTemplate(tpl: typeof TEMPLATES[0]) {
    setName(tpl.name);
    setChannel(tpl.channel);
    setSmsBody(tpl.sms_body);
    const f = tpl.audience_filter as AudienceFilter;
    setFilter(f);
    setSelectedTags(f.tags_include || []);
    setStep(3);
  }

  function insertMergeField(field: string) {
    if (channel === "sms" || channel === "both") {
      setSmsBody((prev) => prev + field);
    }
  }

  async function saveCampaign(sendNow: boolean) {
    setSaving(true);
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/-+$/, "") + "-" + Date.now().toString(36);
    const audienceFilter = buildAudienceFilter();

    // Ensure SMS opt-out language
    let finalSmsBody = smsBody;
    if (finalSmsBody && !finalSmsBody.toLowerCase().includes("stop")) {
      finalSmsBody += "\nReply STOP to opt out";
    }

    const res = await fetch("/api/admin/campaigns", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        slug,
        name,
        description,
        channel,
        sms_body: finalSmsBody || null,
        email_subject: emailSubject || null,
        email_body_html: emailBodyHtml || null,
        audience_filter: audienceFilter,
        target_url: targetUrl || null,
      }),
    });

    if (res.ok) {
      const data = await res.json();
      if (sendNow) {
        await fetch(`/api/admin/campaigns/${data.campaign.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            status: scheduleType === "now" ? "sending" : "scheduled",
            scheduled_at: scheduleType === "later" ? scheduledAt : undefined,
          }),
        });
      }
      router.push("/admin/campaigns");
    }
    setSaving(false);
  }

  const smsCharCount = smsBody.length;
  const smsSegments = Math.ceil(smsCharCount / 160) || 1;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => router.push("/admin/campaigns")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-semibold">New Campaign</h1>
          <p className="text-sm text-muted-foreground">Step {step} of 4</p>
        </div>
      </div>

      {/* Step indicator */}
      <div className="flex gap-1">
        {[1, 2, 3, 4].map((s) => (
          <div key={s} className={`h-1.5 flex-1 rounded-full ${s <= step ? "bg-primary" : "bg-muted"}`} />
        ))}
      </div>

      {/* Templates (show before step 1) */}
      {step === 1 && (
        <div className="rounded-lg border bg-muted/30 p-4">
          <p className="mb-3 text-sm font-medium text-muted-foreground">Quick start from a template:</p>
          <div className="flex flex-wrap gap-2">
            {TEMPLATES.map((tpl) => (
              <Button key={tpl.name} variant="outline" size="sm" onClick={() => applyTemplate(tpl)}>
                {tpl.name}
              </Button>
            ))}
          </div>
        </div>
      )}

      {/* Step 1: Basics */}
      {step === 1 && (
        <div className="space-y-4 rounded-lg border bg-card p-6">
          <h2 className="font-semibold">Campaign Basics</h2>
          <div>
            <label className="mb-1 block text-sm font-medium">Campaign Name</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g., Spring Mulch 2026" className="w-full rounded-lg border bg-background px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Channel</label>
            <div className="flex gap-2">
              {(["sms", "email", "both"] as const).map((ch) => (
                <Button key={ch} variant={channel === ch ? "default" : "outline"} size="sm" onClick={() => setChannel(ch)}>
                  {ch.toUpperCase()}
                </Button>
              ))}
            </div>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Internal Notes (optional)</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} className="w-full rounded-lg border bg-background px-3 py-2 text-sm" />
          </div>
          <Button onClick={() => setStep(2)} disabled={!name} className="mt-2">
            Next: Audience <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Step 2: Audience */}
      {step === 2 && (
        <div className="space-y-4 rounded-lg border bg-card p-6">
          <h2 className="font-semibold">Target Audience</h2>

          <div>
            <label className="mb-2 block text-sm font-medium">Customer Tags (include)</label>
            <div className="flex flex-wrap gap-2">
              {CUSTOMER_TAGS.map((tag) => (
                <Badge key={tag} variant={selectedTags.includes(tag) ? "default" : "outline"} className="cursor-pointer" onClick={() => toggleTag(tag)}>
                  {tag}
                </Badge>
              ))}
            </div>
            {selectedTags.length > 1 && (
              <div className="mt-3 flex items-center gap-2 text-sm">
                <span className="text-muted-foreground">Match</span>
                <Button size="sm" variant={tagMatchMode === "all" ? "default" : "outline"} onClick={() => setTagMatchMode("all")}>
                  ALL tags
                </Button>
                <Button size="sm" variant={tagMatchMode === "any" ? "default" : "outline"} onClick={() => setTagMatchMode("any")}>
                  ANY tag
                </Button>
                <span className="text-xs text-muted-foreground">
                  {tagMatchMode === "all" ? "must have every selected tag" : "has at least one selected tag"}
                </span>
              </div>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium">Min Orders</label>
              <input type="number" min={0} value={filter.min_orders || ""} onChange={(e) => setFilter({ ...filter, min_orders: e.target.value ? Number(e.target.value) : undefined })} className="w-full rounded-lg border bg-background px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Last Order After</label>
              <input type="date" value={filter.last_order_after || ""} onChange={(e) => setFilter({ ...filter, last_order_after: e.target.value || undefined })} className="w-full rounded-lg border bg-background px-3 py-2 text-sm" />
            </div>
          </div>

          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={filter.has_phone || false} onChange={(e) => setFilter({ ...filter, has_phone: e.target.checked })} />
              Has phone
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={filter.has_email || false} onChange={(e) => setFilter({ ...filter, has_email: e.target.checked })} />
              Has email
            </label>
          </div>

          <Button variant="outline" onClick={previewAudience} disabled={previewing}>
            <Eye className="mr-2 h-4 w-4" />
            {previewing ? "Loading..." : "Preview Audience"}
          </Button>

          {preview && (
            <div className="rounded-lg border bg-muted/30 p-4">
              <p className="font-semibold flex items-center gap-2">
                <Users className="h-4 w-4" />
                {preview.count} customers matched
              </p>
              <p className="text-sm text-muted-foreground">
                {preview.smsFriendly} SMS-ready · {preview.emailFriendly} email-ready
              </p>
              {preview.sample.length > 0 && (
                <div className="mt-2 text-xs text-muted-foreground">
                  Sample: {preview.sample.map((c) => c.first_name || c.phone).join(", ")}
                </div>
              )}
            </div>
          )}

          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setStep(1)}>Back</Button>
            <Button onClick={() => setStep(3)}>
              Next: Content <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Step 3: Content */}
      {step === 3 && (
        <div className="space-y-4 rounded-lg border bg-card p-6">
          <h2 className="font-semibold">Campaign Content</h2>

          {(channel === "sms" || channel === "both") && (
            <div>
              <label className="mb-1 block text-sm font-medium">
                SMS Body
                <span className={`ml-2 text-xs ${smsCharCount > 160 ? "text-amber-600" : "text-muted-foreground"}`}>
                  {smsCharCount}/160 chars ({smsSegments} segment{smsSegments > 1 ? "s" : ""})
                </span>
              </label>
              <textarea value={smsBody} onChange={(e) => setSmsBody(e.target.value)} rows={4} className="w-full rounded-lg border bg-background px-3 py-2 text-sm font-mono" placeholder="Hi {{first_name}}! ..." />
              <div className="mt-1 flex flex-wrap gap-1">
                {MERGE_FIELDS.map((f) => (
                  <button key={f.value} onClick={() => insertMergeField(f.value)} className="rounded border bg-muted/50 px-2 py-0.5 text-xs hover:bg-muted">
                    {f.label}
                  </button>
                ))}
              </div>
              {!smsBody.toLowerCase().includes("stop") && smsBody.length > 0 && (
                <p className="mt-1 text-xs text-amber-600">
                  "Reply STOP to opt out" will be auto-appended (TCPA required)
                </p>
              )}
            </div>
          )}

          {(channel === "email" || channel === "both") && (
            <>
              <div>
                <label className="mb-1 block text-sm font-medium">Email Subject</label>
                <input type="text" value={emailSubject} onChange={(e) => setEmailSubject(e.target.value)} className="w-full rounded-lg border bg-background px-3 py-2 text-sm" placeholder="e.g., Spring mulch is here, {{first_name}}!" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Email Body (HTML)</label>
                <textarea value={emailBodyHtml} onChange={(e) => setEmailBodyHtml(e.target.value)} rows={8} className="w-full rounded-lg border bg-background px-3 py-2 text-sm font-mono" placeholder="<h2>Hi {{customer_name}}</h2>..." />
              </div>
            </>
          )}

          <div>
            <label className="mb-1 block text-sm font-medium">Link Tracking URL (where clicks redirect)</label>
            <input type="url" value={targetUrl} onChange={(e) => setTargetUrl(e.target.value)} className="w-full rounded-lg border bg-background px-3 py-2 text-sm" />
          </div>

          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setStep(2)}>Back</Button>
            <Button onClick={() => setStep(4)} disabled={(channel !== "email" && !smsBody) || (channel !== "sms" && !emailSubject)}>
              Next: Review <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Step 4: Schedule & Review */}
      {step === 4 && (
        <div className="space-y-4 rounded-lg border bg-card p-6">
          <h2 className="font-semibold">Review & Schedule</h2>

          <div className="rounded-lg border bg-muted/30 p-4 space-y-2">
            <p><span className="font-medium">Campaign:</span> {name}</p>
            <p><span className="font-medium">Channel:</span> {channel.toUpperCase()}</p>
            <p><span className="font-medium">Audience:</span> {preview?.count || "?"} customers</p>
            {smsBody && (
              <div>
                <p className="font-medium text-sm">SMS Preview:</p>
                <p className="text-sm bg-background rounded p-2 mt-1">{smsBody.replace(/\{\{first_name\}\}/g, "John").replace(/\{\{customer_name\}\}/g, "John Smith").replace(/\{\{shop_url\}\}/g, "easternlm.com/shop").replace(/\{\{phone\}\}/g, "(631) 874-6244").replace(/\{\{town\}\}/g, "Shirley")}</p>
              </div>
            )}
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">When to Send</label>
            <div className="flex gap-3">
              <label className="flex items-center gap-2 text-sm">
                <input type="radio" name="schedule" checked={scheduleType === "now"} onChange={() => setScheduleType("now")} />
                Send immediately
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="radio" name="schedule" checked={scheduleType === "later"} onChange={() => setScheduleType("later")} />
                Schedule for later
              </label>
            </div>
            {scheduleType === "later" && (
              <input type="datetime-local" value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} className="mt-2 rounded-lg border bg-background px-3 py-2 text-sm" />
            )}
          </div>

          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setStep(3)}>Back</Button>
            <Button variant="outline" onClick={() => saveCampaign(false)} disabled={saving}>
              Save as Draft
            </Button>
            <Button onClick={() => saveCampaign(true)} disabled={saving}>
              <Send className="mr-2 h-4 w-4" />
              {scheduleType === "now" ? "Send Now" : "Schedule"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
