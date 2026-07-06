"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Loader2, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatUsd } from "@/lib/book-now/pricing";

/**
 * Buy-it-now widget for the sealcoating landing page.
 * Builds a Book-a-Crew `Quote` (timeline locked to "two_weeks" so the
 * buy-now price is exact, no multiplier) and hands it to the existing,
 * battle-tested checkout at /services/book-now/checkout — which places the
 * Stripe auth-hold. Prices come from the DB (single source of truth) so a
 * server-side re-price always matches.
 */

const INSPECTION_HREF = "tel:+16318746244";

type SizeKey = "small" | "standard" | "large";
type CrackKey = "none" | "minor" | "major";

export type SealcoatPricing = {
  sealcoatName: string;
  tiers: Record<SizeKey, number>;
  minor: { name: string; cents: number };
  major: { name: string; cents: number };
};

const SIZE_LABELS: Record<SizeKey, { label: string; sub: string }> = {
  small: { label: "Small", sub: "1-car · up to ~500 sq ft" },
  standard: { label: "Standard", sub: "2-car · ~500–900 sq ft" },
  large: { label: "Large", sub: "3-car / long · ~900–1,600 sq ft" },
};

export function SealcoatBookingWidget({ pricing }: { pricing: SealcoatPricing }) {
  const router = useRouter();
  const [size, setSize] = useState<SizeKey>("standard");
  const [crack, setCrack] = useState<CrackKey>("none");
  const [address, setAddress] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sealcoatCents = pricing.tiers[size];
  const crackCents = crack === "minor" ? pricing.minor.cents : crack === "major" ? pricing.major.cents : 0;
  const totalCents = sealcoatCents + crackCents;

  const addressValid = address.trim().length >= 5;

  const items = useMemo(() => {
    const list: Array<{
      serviceSlug: string;
      serviceName: string;
      inputs: Record<string, string | number>;
      subtotalCents: number;
    }> = [
      {
        serviceSlug: "driveway-sealcoating",
        serviceName: pricing.sealcoatName,
        inputs: { size },
        subtotalCents: sealcoatCents,
      },
    ];
    if (crack === "minor") {
      list.push({
        serviceSlug: "driveway-crackfill-minor",
        serviceName: pricing.minor.name,
        inputs: {},
        subtotalCents: pricing.minor.cents,
      });
    } else if (crack === "major") {
      list.push({
        serviceSlug: "driveway-crackfill-major",
        serviceName: pricing.major.name,
        inputs: {},
        subtotalCents: pricing.major.cents,
      });
    }
    return list;
  }, [size, crack, sealcoatCents, pricing]);

  function handleReserve() {
    if (!addressValid || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const quote = {
        property: { address: address.trim(), lotSize: "quarter_half" as const },
        timeline: "two_weeks" as const,
        items,
        subtotalCents: totalCents,
        timelineMultiplier: 1,
        adjustedSubtotalCents: totalCents,
        totalCents,
      };
      sessionStorage.setItem("elm_book_now_quote", JSON.stringify(quote));
      router.push("/services/book-now/checkout");
    } catch {
      setError("Something went wrong. Please call (631) 874-6244.");
      setSubmitting(false);
    }
  }

  return (
    <div className="rounded-xl border-2 border-accent/30 bg-card p-6 shadow-sm">
      <div className="mb-1 text-xs font-semibold uppercase tracking-widest text-accent">Buy it now</div>
      <h2 className="[font-family:var(--font-display)] text-2xl text-primary">Book your sealcoat online</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Pick your driveway size, secure the slot with a card hold, and we&apos;ll schedule within 2 weeks.
      </p>

      {/* Size tiers */}
      <fieldset className="mt-5">
        <legend className="mb-2 text-sm font-semibold">Driveway size</legend>
        <div className="space-y-2">
          {(Object.keys(SIZE_LABELS) as SizeKey[]).map((key) => {
            const active = size === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => setSize(key)}
                className={`flex w-full items-center justify-between rounded-lg border px-4 py-3 text-left transition-colors ${
                  active ? "border-accent bg-accent/10" : "hover:border-accent/40 hover:bg-accent/5"
                }`}
              >
                <span>
                  <span className="block text-sm font-semibold">{SIZE_LABELS[key].label}</span>
                  <span className="block text-xs text-muted-foreground">{SIZE_LABELS[key].sub}</span>
                </span>
                <span className="shrink-0 text-base font-bold text-primary">{formatUsd(pricing.tiers[key])}</span>
              </button>
            );
          })}
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          Oversized or commercial? <a href={INSPECTION_HREF} className="text-primary underline">Book a free inspection</a> for a custom price.
        </p>
      </fieldset>

      {/* Crack add-ons */}
      <fieldset className="mt-5">
        <legend className="mb-2 text-sm font-semibold">Crack repair (optional)</legend>
        <div className="space-y-2">
          {([
            { key: "none" as CrackKey, label: "No crack repair needed", cents: 0, sub: "Surface is in good shape" },
            { key: "minor" as CrackKey, label: pricing.minor.name, cents: pricing.minor.cents, sub: "Hairline to 1/2\" cracks" },
            { key: "major" as CrackKey, label: pricing.major.name, cents: pricing.major.cents, sub: "Wide cracks, alligatoring, potholes" },
          ]).map((opt) => {
            const active = crack === opt.key;
            return (
              <button
                key={opt.key}
                type="button"
                onClick={() => setCrack(opt.key)}
                className={`flex w-full items-center justify-between rounded-lg border px-4 py-3 text-left transition-colors ${
                  active ? "border-accent bg-accent/10" : "hover:border-accent/40 hover:bg-accent/5"
                }`}
              >
                <span>
                  <span className="block text-sm font-semibold">{opt.label}</span>
                  <span className="block text-xs text-muted-foreground">{opt.sub}</span>
                </span>
                <span className="shrink-0 text-sm font-bold text-primary">
                  {opt.cents ? `+${formatUsd(opt.cents)}` : "—"}
                </span>
              </button>
            );
          })}
        </div>
      </fieldset>

      {/* Address */}
      <div className="mt-5">
        <label className="mb-1 block text-sm font-semibold">Driveway address</label>
        <input
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder="Street, town, NY"
          className="w-full rounded-md border px-3 py-2 text-sm"
        />
      </div>

      {/* Total + CTA */}
      <div className="mt-5 flex items-center justify-between border-t pt-4">
        <span className="text-sm text-muted-foreground">Your price</span>
        <span className="[font-family:var(--font-display)] text-2xl text-primary">{formatUsd(totalCents)}</span>
      </div>

      {error && <div className="mt-3 rounded-md border border-destructive/30 bg-destructive/5 p-2 text-sm text-destructive">{error}</div>}

      <Button
        onClick={handleReserve}
        disabled={!addressValid || submitting}
        size="lg"
        className="mt-3 w-full bg-accent text-accent-foreground hover:bg-accent/90"
      >
        {submitting ? (
          <><Loader2 className="size-4 animate-spin" /> Loading checkout…</>
        ) : (
          <>Reserve my slot — {formatUsd(totalCents)}</>
        )}
      </Button>

      <ul className="mt-4 space-y-1.5 text-xs text-muted-foreground">
        <li className="flex items-center gap-1.5"><ShieldCheck className="size-3.5 text-accent" /> Card hold only — nothing charged until you confirm a date</li>
        <li className="flex items-center gap-1.5"><CheckCircle2 className="size-3.5 text-accent" /> We inspect first to confirm your price before any fee</li>
        <li className="flex items-center gap-1.5"><CheckCircle2 className="size-3.5 text-accent" /> $199 booking fee (non-refundable) locks your date — reschedule anytime</li>
      </ul>
    </div>
  );
}
