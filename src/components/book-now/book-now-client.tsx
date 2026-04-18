"use client";

import { useMemo, useState } from "react";
import { ArrowRight, Check, CheckCircle2, Loader2, MapPin, Minus, Plus, Sparkles, X, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { InstantBookService, PropertyInfo, TimelineOption } from "@/lib/book-now/types";
import { TIMELINE_CONFIG, TIMELINE_ORDER } from "@/lib/book-now/types";
import { getServiceSchema } from "@/lib/book-now/schemas";
import { buildQuote, formatUsd, priceService } from "@/lib/book-now/pricing";

const LOT_SIZES: Array<{ value: PropertyInfo["lotSize"]; label: string }> = [
  { value: "under_quarter", label: "Under 0.25 acre" },
  { value: "quarter_half",  label: "0.25–0.5 acre" },
  { value: "half_one",      label: "0.5–1 acre" },
  { value: "over_one",      label: "Over 1 acre" },
];

type SelectionInputs = Record<string, Record<string, string | number>>;

export function BookNowClient({ initialServices }: { initialServices: InstantBookService[] }) {
  // Property info
  const [address, setAddress] = useState("");
  const [lotSize, setLotSize] = useState<PropertyInfo["lotSize"] | null>(null);

  // Service selections — map of serviceId → inputs object
  const [selected, setSelected] = useState<Record<string, Record<string, string | number>>>({});

  // Timeline
  const [timeline, setTimeline] = useState<TimelineOption>("two_weeks");

  // Custom project modal
  const [showCustom, setShowCustom] = useState(false);

  const propertyReady = address.trim().length >= 5 && lotSize !== null;
  const hasSelections = Object.keys(selected).length > 0;
  const canBook = propertyReady && hasSelections;

  function toggleService(service: InstantBookService) {
    const schema = getServiceSchema(service.slug);
    if (!schema) return;
    if (schema.mode === "quote_only") {
      setShowCustom(true);
      return;
    }

    setSelected((prev) => {
      if (prev[service.id]) {
        const next = { ...prev };
        delete next[service.id];
        return next;
      }
      // Initialize with defaults
      const initialInputs: Record<string, string | number> = {};
      for (const input of schema.inputs) {
        initialInputs[input.key] = input.default;
      }
      return { ...prev, [service.id]: initialInputs };
    });
  }

  function updateInput(serviceId: string, key: string, value: string | number) {
    setSelected((prev) => ({
      ...prev,
      [serviceId]: { ...prev[serviceId], [key]: value },
    }));
  }

  // Live quote
  const quote = useMemo(() => {
    if (!propertyReady || !hasSelections) return null;
    const selections = Object.entries(selected)
      .map(([serviceId, inputs]) => {
        const service = initialServices.find((s) => s.id === serviceId);
        if (!service) return null;
        return { service, inputs };
      })
      .filter((x): x is { service: InstantBookService; inputs: Record<string, string | number> } => x !== null);

    return buildQuote({
      address,
      lotSize: lotSize!,
      timeline,
      selections,
    });
  }, [propertyReady, hasSelections, selected, initialServices, address, lotSize, timeline]);

  function handleBook() {
    if (!quote || !canBook) return;
    // Persist to sessionStorage for the checkout page
    if (typeof window !== "undefined") {
      sessionStorage.setItem("elm_book_now_quote", JSON.stringify(quote));
    }
    window.location.href = "/services/book-now/checkout";
  }

  return (
    <div className="min-h-screen bg-warm-bg">
      {/* ─── Hero ───────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-primary text-primary-foreground">
        <div className="topo-pattern absolute inset-0 opacity-30" />
        <div className="relative mx-auto max-w-7xl px-4 py-12 sm:px-6 md:py-16">
          <div className="max-w-3xl">
            <h1 className="[font-family:var(--font-display)] text-4xl md:text-5xl">
              Pro Crews for Your Yard.<br />Booked Online in 60 Seconds.
            </h1>
            <p className="mt-4 text-lg text-primary-foreground/80">
              Mulch, cleanups, pathways, power washing — tell us what your property needs, get a price on the spot, lock in a crew.
            </p>
          </div>
        </div>
      </section>

      {/* ─── How it works strip ─────────────────────────── */}
      <section className="border-b bg-card">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
          <div className="grid gap-3 sm:grid-cols-3">
            {[
              { n: "1", t: "Tell us about your yard", d: "Address and what needs doing." },
              { n: "2", t: "See your price", d: "Instant quote. Slide the timeline to save." },
              { n: "3", t: "We lock in your crew", d: "Certified locals, confirmed by text." },
            ].map((step) => (
              <div key={step.n} className="flex gap-3">
                <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-accent text-sm font-bold text-accent-foreground">
                  {step.n}
                </div>
                <div>
                  <p className="font-semibold">{step.t}</p>
                  <p className="text-sm text-muted-foreground">{step.d}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Main flow ──────────────────────────────────── */}
      <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
        {/* Step 1: Property */}
        <Step number={1} title="Where's the property?" complete={propertyReady}>
          <div className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">Service address</label>
              <div className="relative">
                <MapPin className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="123 Main St, Center Moriches, NY 11934"
                  className="w-full rounded-lg border bg-background py-2.5 pl-9 pr-3 text-sm"
                />
              </div>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">Lot size</label>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {LOT_SIZES.map((size) => (
                  <button
                    key={size.value}
                    type="button"
                    onClick={() => setLotSize(size.value)}
                    className={`rounded-lg border p-2.5 text-sm font-medium transition-colors ${
                      lotSize === size.value
                        ? "border-accent bg-accent/10 text-foreground"
                        : "border-border bg-background text-muted-foreground hover:border-border/80 hover:text-foreground"
                    }`}
                  >
                    {size.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </Step>

        {/* Step 2: Services */}
        <Step number={2} title="What do you need?" complete={hasSelections} disabled={!propertyReady}>
          <div className="grid gap-2.5 sm:grid-cols-2">
            {initialServices.map((service) => {
              const schema = getServiceSchema(service.slug);
              const picked = !!selected[service.id];
              const isQuoteOnly = schema?.mode === "quote_only";
              return (
                <button
                  key={service.id}
                  type="button"
                  onClick={() => toggleService(service)}
                  disabled={!propertyReady && !isQuoteOnly}
                  className={`flex items-start gap-3 rounded-lg border p-3.5 text-left transition-colors ${
                    picked
                      ? "border-accent bg-accent/5"
                      : "border-border bg-card hover:border-accent/40"
                  } disabled:pointer-events-none disabled:opacity-50`}
                >
                  <div
                    className={`mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-md border-2 transition-colors ${
                      picked ? "border-accent bg-accent text-accent-foreground" : "border-border"
                    }`}
                  >
                    {picked && <Check className="size-3" strokeWidth={3} />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold">{service.name}</p>
                    {service.tagline && (
                      <p className="mt-0.5 text-xs text-muted-foreground">{service.tagline}</p>
                    )}
                    {isQuoteOnly && (
                      <p className="mt-1 text-xs font-medium text-accent">Custom quote →</p>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={() => setShowCustom(true)}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border bg-card p-4 text-sm font-medium text-muted-foreground transition-colors hover:border-accent hover:text-accent"
          >
            <Sparkles className="size-4" />
            Don't see it? Tell us about a larger project
          </button>
        </Step>

        {/* Step 3: Scope inputs */}
        {hasSelections && (
          <Step number={3} title="Size it up" complete>
            <div className="space-y-4">
              {Object.entries(selected).map(([serviceId, inputs]) => {
                const service = initialServices.find((s) => s.id === serviceId);
                if (!service) return null;
                const schema = getServiceSchema(service.slug);
                if (!schema) return null;
                const lineSubtotal = priceService(service, inputs);

                return (
                  <div key={serviceId} className="rounded-xl border bg-card p-4">
                    <div className="mb-3 flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold">{service.name}</p>
                        {schema.summary && (
                          <p className="mt-0.5 text-xs text-muted-foreground">{schema.summary(inputs)}</p>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-primary">{formatUsd(lineSubtotal)}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => toggleService(service)}
                        className="text-muted-foreground hover:text-destructive"
                        aria-label="Remove"
                      >
                        <X className="size-4" />
                      </button>
                    </div>

                    <div className="space-y-3 border-t pt-3">
                      {schema.inputs.map((input) => (
                        <InputRow
                          key={input.key}
                          input={input}
                          value={inputs[input.key] ?? (input as { default: string | number }).default}
                          onChange={(v) => updateInput(serviceId, input.key, v)}
                        />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </Step>
        )}

        {/* Step 4: Timeline */}
        {hasSelections && (
          <Step number={4} title="When should we come?" complete={!!timeline}>
            <TimelineSlider value={timeline} onChange={setTimeline} quote={quote} />
          </Step>
        )}

        {/* Final quote + CTA */}
        {quote && (
          <div className="sticky bottom-4 z-40 mt-8 rounded-2xl border-2 border-primary bg-card p-5 shadow-xl">
            <div className="flex items-center justify-between gap-4">
              <div className="min-w-0">
                <p className="text-xs uppercase tracking-wider text-muted-foreground">Your quote</p>
                <p className="text-3xl font-bold text-primary">{formatUsd(quote.totalCents)}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {quote.items.length} service{quote.items.length > 1 ? "s" : ""} ·{" "}
                  {TIMELINE_CONFIG[quote.timeline].label}
                </p>
              </div>
              <Button
                size="lg"
                onClick={handleBook}
                disabled={!canBook}
                className="shrink-0 bg-accent text-accent-foreground hover:bg-accent/90"
              >
                Book This Crew <ArrowRight className="size-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Trust signals */}
        <div className="mt-10 grid gap-3 sm:grid-cols-3">
          {[
            "Vetted, insured local crews",
            "Confirmed by text within 24 hours",
            "Cancel before confirm — zero fees",
          ].map((text) => (
            <div key={text} className="flex items-center gap-2 rounded-lg bg-card p-3 text-sm">
              <CheckCircle2 className="size-4 shrink-0 text-accent" />
              <span className="text-muted-foreground">{text}</span>
            </div>
          ))}
        </div>
      </div>

      {showCustom && <CustomProjectModal onClose={() => setShowCustom(false)} />}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Step wrapper
// ─────────────────────────────────────────────────────────────
function Step({
  number,
  title,
  children,
  complete,
  disabled,
}: {
  number: number;
  title: string;
  children: React.ReactNode;
  complete?: boolean;
  disabled?: boolean;
}) {
  return (
    <section className={`mb-6 rounded-2xl border bg-card p-5 transition-opacity ${disabled ? "opacity-50" : ""}`}>
      <div className="mb-4 flex items-center gap-3">
        <div
          className={`flex size-8 items-center justify-center rounded-full text-sm font-bold transition-colors ${
            complete
              ? "bg-accent text-accent-foreground"
              : "bg-muted text-muted-foreground"
          }`}
        >
          {complete ? <Check className="size-4" strokeWidth={3} /> : number}
        </div>
        <h2 className="text-lg font-semibold">{title}</h2>
      </div>
      <div className={disabled ? "pointer-events-none" : ""}>{children}</div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────
// Input row (number / select / tier)
// ─────────────────────────────────────────────────────────────
function InputRow({
  input,
  value,
  onChange,
}: {
  input: ReturnType<typeof getServiceSchema> extends infer S ? S extends { inputs: infer I } ? I extends (infer F)[] ? F : never : never : never;
  value: string | number;
  onChange: (v: string | number) => void;
}) {
  if (input.type === "number") {
    const numValue = Number(value) || input.default;
    return (
      <div>
        <label className="mb-1 block text-sm font-medium">{input.label}</label>
        <div className="flex items-center gap-3">
          <div className="inline-flex items-center rounded-lg border">
            <button
              type="button"
              onClick={() => onChange(Math.max(input.min, numValue - (input.step || 1)))}
              className="flex size-9 items-center justify-center text-muted-foreground hover:text-foreground"
              aria-label="Decrease"
            >
              <Minus className="size-4" />
            </button>
            <span className="min-w-12 text-center text-sm font-semibold">{numValue}</span>
            <button
              type="button"
              onClick={() => onChange(Math.min(input.max ?? 999, numValue + (input.step || 1)))}
              className="flex size-9 items-center justify-center text-muted-foreground hover:text-foreground"
              aria-label="Increase"
            >
              <Plus className="size-4" />
            </button>
          </div>
          {input.unit && <span className="text-sm text-muted-foreground">{input.unit}</span>}
          {input.help && <span className="text-xs text-muted-foreground">· {input.help}</span>}
        </div>
      </div>
    );
  }

  if (input.type === "select") {
    return (
      <div>
        <label className="mb-1 block text-sm font-medium">{input.label}</label>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {input.options.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => onChange(opt.value)}
              className={`rounded-lg border px-3 py-2 text-sm transition-colors ${
                value === opt.value
                  ? "border-accent bg-accent/10 font-medium"
                  : "border-border bg-background text-muted-foreground hover:border-border/80 hover:text-foreground"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>
    );
  }

  // Tier
  return (
    <div>
      <label className="mb-1 block text-sm font-medium">{input.label}</label>
      <div className="grid gap-2 sm:grid-cols-3">
        {input.options.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={`flex flex-col gap-0.5 rounded-lg border p-3 text-left transition-colors ${
              value === opt.value
                ? "border-accent bg-accent/10"
                : "border-border bg-background hover:border-border/80"
            }`}
          >
            <span className="text-sm font-semibold">{opt.label}</span>
            {opt.sublabel && <span className="text-xs text-muted-foreground">{opt.sublabel}</span>}
          </button>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Timeline slider
// ─────────────────────────────────────────────────────────────
function TimelineSlider({
  value,
  onChange,
  quote,
}: {
  value: TimelineOption;
  onChange: (v: TimelineOption) => void;
  quote: ReturnType<typeof buildQuote> | null;
}) {
  const currentIdx = TIMELINE_ORDER.indexOf(value);

  return (
    <div className="space-y-4">
      {/* Slider */}
      <div className="px-2">
        <input
          type="range"
          min={0}
          max={TIMELINE_ORDER.length - 1}
          step={1}
          value={currentIdx}
          onChange={(e) => onChange(TIMELINE_ORDER[parseInt(e.target.value, 10)])}
          className="w-full accent-accent"
        />
        <div className="mt-1 flex justify-between text-[10px] text-muted-foreground">
          {TIMELINE_ORDER.map((opt) => (
            <span key={opt} className={value === opt ? "font-semibold text-foreground" : ""}>
              {TIMELINE_CONFIG[opt].days}
            </span>
          ))}
        </div>
      </div>

      {/* Price comparison grid */}
      {quote && (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {TIMELINE_ORDER.map((opt) => {
            const mult = TIMELINE_CONFIG[opt].multiplier;
            const price = Math.round(quote.subtotalCents * mult);
            const isSelected = value === opt;
            const isRush = opt === "rush_48h";
            const isFlexible = opt === "flexible";
            return (
              <button
                key={opt}
                type="button"
                onClick={() => onChange(opt)}
                className={`rounded-lg border p-3 text-left transition-all ${
                  isSelected
                    ? "border-accent bg-accent/10 ring-2 ring-accent/20"
                    : "border-border bg-background hover:border-border/80"
                }`}
              >
                <div className="flex items-center gap-1">
                  {isRush && <Zap className="size-3 text-amber-500" />}
                  <p className="text-xs font-medium">{TIMELINE_CONFIG[opt].label}</p>
                </div>
                <p className={`mt-1 text-lg font-bold ${isRush ? "text-amber-600" : isFlexible ? "text-green-600" : "text-primary"}`}>
                  {formatUsd(price)}
                </p>
                {isRush && <p className="text-[10px] text-amber-600">Rush</p>}
                {isFlexible && <p className="text-[10px] text-green-600">Save 8%</p>}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Custom project modal
// ─────────────────────────────────────────────────────────────
function CustomProjectModal({ onClose }: { onClose: () => void }) {
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
    projectDescription: "",
    budget: "",
    timeline: "",
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/services/book-now/custom-quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Submit failed");
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Submit failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div className="w-full max-w-lg rounded-2xl bg-card p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
        {done ? (
          <div className="space-y-4 text-center">
            <CheckCircle2 className="mx-auto size-12 text-green-600" />
            <h2 className="text-xl font-bold">Got it — we'll be in touch.</h2>
            <p className="text-sm text-muted-foreground">We'll call or text within 24 hours with a custom quote.</p>
            <Button onClick={onClose} className="w-full">Close</Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-xl font-semibold">Tell us about your project</h2>
                <p className="mt-1 text-sm text-muted-foreground">We'll respond within 24 hours with a custom quote.</p>
              </div>
              <button type="button" onClick={onClose} className="text-muted-foreground hover:text-foreground">
                <X className="size-5" />
              </button>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium">Name *</label>
                <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full rounded-md border px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Phone *</label>
                <input required type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className="w-full rounded-md border px-3 py-2 text-sm" />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">Email</label>
              <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full rounded-md border px-3 py-2 text-sm" />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">Property address</label>
              <input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })}
                placeholder="Street, City, NY ZIP"
                className="w-full rounded-md border px-3 py-2 text-sm" />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">Describe your project *</label>
              <textarea required rows={4} value={form.projectDescription} onChange={(e) => setForm({ ...form, projectDescription: e.target.value })}
                placeholder="Size, materials, timing, any photos you can share..."
                className="w-full rounded-md border px-3 py-2 text-sm" />
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={onClose} className="flex-1">Cancel</Button>
              <Button type="submit" disabled={submitting} className="flex-1 bg-accent text-accent-foreground hover:bg-accent/90">
                {submitting ? <><Loader2 className="size-4 animate-spin" /> Sending...</> : "Send Request"}
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
