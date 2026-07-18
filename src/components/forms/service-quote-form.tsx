"use client";

import { useState } from "react";
import { ArrowLeft, ArrowRight, CheckCircle2, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

// ─── Service type definitions ──────────────────────────────────────

type ServiceOption = { value: string; label: string; icon: string };

const DRIVEWAY_SERVICES: ServiceOption[] = [
  { value: "gravel-driveway-new", label: "New gravel driveway", icon: "🛤️" },
  { value: "gravel-driveway-resurface", label: "Resurface / top-off", icon: "🔄" },
  { value: "paver-driveway", label: "Paver driveway", icon: "🧱" },
  { value: "driveway-edging", label: "Edging (block, metal, timber)", icon: "📐" },
  { value: "asphalt-prep", label: "Asphalt prep / grading", icon: "🚜" },
];

const LANDSCAPING_SERVICES: ServiceOption[] = [
  { value: "landscaping-design", label: "Design & installation", icon: "🌿" },
  { value: "landscaping-grading-drainage", label: "Grading & drainage", icon: "💧" },
  { value: "landscaping-sod-lawn", label: "Sod / lawn installation", icon: "🌱" },
  { value: "landscaping-retaining-wall", label: "Retaining wall", icon: "🧱" },
  { value: "landscaping-garden-beds", label: "Garden beds", icon: "🌺" },
];

const MASONRY_SERVICES: ServiceOption[] = [
  { value: "masonry-patio", label: "Patio", icon: "🏗️" },
  { value: "masonry-walkway", label: "Walkway", icon: "🚶" },
  { value: "masonry-retaining-wall", label: "Retaining wall", icon: "🧱" },
  { value: "masonry-fireplace", label: "Fireplace / outdoor kitchen", icon: "🔥" },
  { value: "masonry-veneer-steps", label: "Stone veneer / steps", icon: "🪨" },
];

const PAVING_SERVICES: ServiceOption[] = [
  { value: "driveway-sealcoating", label: "Driveway sealcoating", icon: "🛢️" },
  { value: "crack-repair", label: "Crack repair / hot-patch", icon: "🩹" },
  { value: "gravel-driveway-repair", label: "Gravel driveway repair", icon: "🪨" },
  { value: "private-road-maintenance", label: "Private road maintenance", icon: "🛣️" },
  { value: "gravel-parking-lot", label: "Gravel parking lot", icon: "🅿️" },
];

const TREE_SERVICES: ServiceOption[] = [
  { value: "tree-removal", label: "Tree removal", icon: "🪓" },
  { value: "tree-trimming", label: "Tree trimming / pruning", icon: "✂️" },
  { value: "stump-grinding", label: "Stump grinding", icon: "🪵" },
  { value: "land-clearing", label: "Land / lot clearing", icon: "🌲" },
  { value: "storm-cleanup", label: "Storm damage cleanup", icon: "🌧️" },
];

const OTHER_SERVICES: ServiceOption[] = [
  { value: "property-maintenance", label: "Property maintenance", icon: "🏡" },
  { value: "other", label: "Something else", icon: "💬" },
];

const ALL_SERVICES = [...DRIVEWAY_SERVICES, ...PAVING_SERVICES, ...LANDSCAPING_SERVICES, ...MASONRY_SERVICES, ...TREE_SERVICES, ...OTHER_SERVICES];

function getServicesForCategory(category?: string): ServiceOption[] {
  switch (category) {
    case "driveways": return [...DRIVEWAY_SERVICES, ...OTHER_SERVICES];
    case "paving": return [...PAVING_SERVICES, ...OTHER_SERVICES];
    case "landscaping": return [...LANDSCAPING_SERVICES, ...OTHER_SERVICES];
    case "masonry": return [...MASONRY_SERVICES, ...OTHER_SERVICES];
    case "tree-care": return [...TREE_SERVICES, ...OTHER_SERVICES];
    case "maintenance": return OTHER_SERVICES;
    default: return ALL_SERVICES;
  }
}

const TIMELINE_OPTIONS = [
  { value: "asap", label: "ASAP / this week", icon: "⚡" },
  { value: "within-2-weeks", label: "Within 2 weeks", icon: "📅" },
  { value: "within-a-month", label: "Within a month", icon: "🗓️" },
  { value: "just-planning", label: "Just getting quotes", icon: "💭" },
];

// ─── Component ─────────────────────────────────────────────────────

type ServiceQuoteFormProps = {
  defaultServiceType?: string;
  serviceCategory?: "driveways" | "paving" | "landscaping" | "masonry" | "tree-care" | "maintenance";
};

export function ServiceQuoteForm({ defaultServiceType, serviceCategory }: ServiceQuoteFormProps) {
  const [step, setStep] = useState(defaultServiceType ? 2 : 1);
  const [serviceType, setServiceType] = useState(defaultServiceType || "");
  const [description, setDescription] = useState("");
  const [timeline, setTimeline] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [referralSource, setReferralSource] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const services = getServicesForCategory(serviceCategory);
  const selectedLabel = ALL_SERVICES.find((s) => s.value === serviceType)?.label || serviceType;

  async function handleSubmit() {
    const digits = phone.replace(/\D/g, "");
    if (!name.trim() || name.trim().length < 2) { setSubmitError("Please enter your name."); return; }
    if (digits.length !== 10) { setSubmitError("Phone must be 10 digits."); return; }
    if (!address.trim() || address.trim().length < 3) { setSubmitError("Enter your address or town."); return; }
    if (!serviceType) { setSubmitError("Select a service type."); return; }

    setSubmitting(true);
    setSubmitError(null);

    const town = address.split(",").length > 1
      ? address.split(",").slice(-2, -1)[0]?.trim() || null
      : null;

    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          phone: digits,
          email: email.trim() || undefined,
          address: address.trim(),
          town,
          serviceType,
          description: description.trim() || undefined,
          timeline: timeline || undefined,
          referralSource: referralSource || undefined,
        }),
      });

      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? "Something went wrong.");
      }

      setSubmitted(true);
      try { const { trackGenerateLead } = await import("@/lib/bulk-analytics"); trackGenerateLead("service_quote"); } catch {}
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  // ─── Submitted state ─────────────────────────────────────────────

  if (submitted) {
    return (
      <div className="rounded-xl border border-accent/30 bg-accent/5 p-8 text-center">
        <CheckCircle2 className="mx-auto size-12 text-accent" />
        <h3 className="mt-4 text-xl font-semibold">We&apos;ll call you within 1 business day.</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          Your quote request for <strong>{selectedLabel}</strong> has been received.
          We&apos;ll reach out to schedule a site visit or provide an estimate.
        </p>
        <Button variant="outline" className="mt-4" onClick={() => { setSubmitted(false); setStep(1); setServiceType(""); }}>
          Submit Another Request
        </Button>
      </div>
    );
  }

  // ─── Step indicators ──────────────────────────────────────────────

  const steps = ["Service", "Details", "Contact"];

  return (
    <div className="rounded-xl border bg-card">
      {/* Step bar */}
      <div className="flex border-b">
        {steps.map((label, i) => {
          const stepNum = i + 1;
          const isActive = step === stepNum;
          const isDone = step > stepNum;
          return (
            <button
              key={label}
              type="button"
              onClick={() => { if (isDone) setStep(stepNum); }}
              className={`flex flex-1 items-center justify-center gap-2 py-3 text-sm font-medium transition-colors ${
                isActive ? "border-b-2 border-accent text-accent" : isDone ? "text-foreground/70 cursor-pointer hover:text-accent" : "text-muted-foreground/50 cursor-default"
              }`}
              disabled={!isDone && !isActive}
            >
              <span className={`flex size-6 items-center justify-center rounded-full text-xs font-bold ${
                isActive ? "bg-accent text-accent-foreground" : isDone ? "bg-accent/20 text-accent" : "bg-muted text-muted-foreground"
              }`}>
                {isDone ? "✓" : stepNum}
              </span>
              <span className="hidden sm:inline">{label}</span>
            </button>
          );
        })}
      </div>

      <div className="p-5">
        {/* ─── Step 1: What do you need? ───────────────────── */}
        {step === 1 && (
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold">What do you need?</h3>
              <p className="text-sm text-muted-foreground">Pick the service that fits your project.</p>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              {services.map((svc) => (
                <button
                  key={svc.value}
                  type="button"
                  onClick={() => { setServiceType(svc.value); setStep(2); }}
                  className={`flex items-center gap-3 rounded-lg border p-3 text-left text-sm font-medium transition-all hover:border-accent/50 hover:bg-accent/5 ${
                    serviceType === svc.value ? "border-accent bg-accent/10 text-accent" : ""
                  }`}
                >
                  <span className="text-xl">{svc.icon}</span>
                  {svc.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ─── Step 2: Project details ─────────────────────── */}
        {step === 2 && (
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold">Tell us about the project</h3>
              <p className="text-sm text-muted-foreground">
                Selected: <strong>{selectedLabel}</strong>
                <button type="button" className="ml-2 text-accent underline" onClick={() => setStep(1)}>change</button>
              </p>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium" htmlFor="sq-desc">Describe your project (optional)</label>
              <Textarea
                id="sq-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                placeholder="Size of area, current condition, what you're looking for..."
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">When do you need this done?</label>
              <div className="grid grid-cols-2 gap-2">
                {TIMELINE_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setTimeline(opt.value)}
                    className={`flex items-center gap-2 rounded-lg border p-2.5 text-sm font-medium transition-all hover:border-accent/50 ${
                      timeline === opt.value ? "border-accent bg-accent/10 text-accent" : "text-muted-foreground"
                    }`}
                  >
                    <span>{opt.icon}</span> {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep(1)}>
                <ArrowLeft className="size-4" /> Back
              </Button>
              <Button className="flex-1 bg-accent text-accent-foreground hover:bg-accent/90" onClick={() => setStep(3)}>
                Next: Contact Info <ArrowRight className="size-4" />
              </Button>
            </div>
          </div>
        )}

        {/* ─── Step 3: Contact info ────────────────────────── */}
        {step === 3 && (
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold">How do we reach you?</h3>
              <p className="text-sm text-muted-foreground">We&apos;ll call to discuss your project and schedule a visit.</p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium" htmlFor="sq-name">Name *</label>
                <Input id="sq-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium" htmlFor="sq-phone">Phone *</label>
                <Input id="sq-phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(631) 555-1234" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium" htmlFor="sq-email">Email</label>
                <Input id="sq-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium" htmlFor="sq-address">Address / Town *</label>
                <Input id="sq-address" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="123 Main St, Manorville" />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium" htmlFor="sq-referral">How did you hear about us?</label>
              <select
                id="sq-referral"
                value={referralSource}
                onChange={(e) => setReferralSource(e.target.value)}
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="">Select one (optional)</option>
                <option value="google">Google search</option>
                <option value="drove-past">Drove past the yard</option>
                <option value="neighbor-friend">Neighbor / friend referral</option>
                <option value="contractor-referral">Contractor referral</option>
                <option value="facebook">Facebook</option>
                <option value="other">Other</option>
              </select>
            </div>

            {submitError && (
              <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">{submitError}</p>
            )}

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep(2)}>
                <ArrowLeft className="size-4" /> Back
              </Button>
              <Button
                className="flex-1 bg-accent text-accent-foreground hover:bg-accent/90"
                onClick={handleSubmit}
                disabled={submitting}
              >
                {submitting ? "Sending..." : "Get Your Free Quote"}
              </Button>
            </div>

            <p className="text-center text-xs text-muted-foreground">
              Or call <a href="tel:+16318746244" className="font-semibold text-accent hover:underline">(631) 874-6244</a> — Mon-Sat 7am-4pm
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
