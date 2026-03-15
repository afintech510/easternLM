"use client";

import { useEffect, useMemo, useState } from "react";
import { CheckCircle, Plus } from "lucide-react";
import { type Upsell, type UpsellContext, calculateUpsellPrice, getApplicableUpsells, mapDbRowToUpsell } from "@/lib/upsells";

function formatUsd(cents: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);
}

type SelectedUpsell = { slug: string; priceCents: number };

type UpsellOffersProps = {
  context: UpsellContext;
  yards: number;
  selectedUpsells: SelectedUpsell[];
  onUpsellToggle: (slug: string, enabled: boolean, priceCents: number) => void;
};

export function UpsellOffers({ context, yards, selectedUpsells, onUpsellToggle }: UpsellOffersProps) {
  const [allUpsells, setAllUpsells] = useState<Upsell[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetch("/api/upsells")
      .then((r) => r.json())
      .then((data: { upsells: Array<Record<string, unknown>> }) => {
        setAllUpsells((data.upsells || []).map(mapDbRowToUpsell));
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  }, []);

  const applicable = useMemo(
    () => getApplicableUpsells(allUpsells, context),
    [allUpsells, context],
  );

  if (!loaded || applicable.length === 0) return null;

  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Add-ons</p>
      {applicable.map((upsell) => {
        const price = calculateUpsellPrice(upsell, yards);
        const isSelected = selectedUpsells.some((s) => s.slug === upsell.slug);

        return (
          <button
            key={upsell.slug}
            type="button"
            onClick={() => onUpsellToggle(upsell.slug, !isSelected, price)}
            className={`flex w-full items-start gap-3 rounded-lg border p-3 text-left transition-all ${
              isSelected ? "border-accent bg-accent/5" : "hover:border-accent/30"
            }`}
          >
            <div className={`mt-0.5 flex size-5 shrink-0 items-center justify-center rounded ${isSelected ? "bg-accent text-accent-foreground" : "border bg-background"}`}>
              {isSelected ? <CheckCircle className="size-3.5" /> : <Plus className="size-3 text-muted-foreground" />}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold">{upsell.name}</p>
                <span className="shrink-0 text-sm font-bold text-accent">+{formatUsd(price)}</span>
              </div>
              <p className="text-xs text-muted-foreground">{upsell.shortDescription}</p>
              {upsell.pricingType === "tiered_per_yard" && yards > 0 && (
                <p className="text-xs text-muted-foreground">{yards.toFixed(1)} yd &times; tiered rate</p>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}
