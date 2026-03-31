"use client";

import { Phone } from "lucide-react";

const VALUE_PROPS = [
  { emoji: "📉", text: "Buy more, save more" },
  { emoji: "🚛", text: "Same-day delivery" },
  { emoji: "💳", text: "Buy now, pay later" },
  { emoji: "🌿", text: "Locally sourced" },
];

/**
 * Branded header for the /app catalog.
 * Spec §2 — Dark gradient with Eastern LM branding, call button, value prop pills.
 */
export function CatalogHeader() {
  return (
    <header data-testid="catalog-header" className="relative overflow-hidden">
      {/* Dark gradient background with diagonal texture */}
      <div className="bg-gradient-to-br from-bulk-dark via-bulk-primary to-bulk-medium px-5 pb-5 pt-6">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              "repeating-linear-gradient(45deg, transparent, transparent 10px, white 10px, white 11px)",
          }}
        />

        {/* Brand + call */}
        <div className="relative flex items-start justify-between">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-bulk-sage">
              Eastern Landscape &amp; Mason Supply
            </p>
            <h1 className="mt-1.5 font-bulk-display text-[26px] font-bold leading-tight text-white">
              Bulk Materials
            </h1>
            <p className="mt-1 text-[13px] text-white/55">
              Dump truck delivery · Suffolk County
            </p>
          </div>
          <a
            href="tel:+16318746244"
            className="flex shrink-0 items-center gap-1.5 rounded-full bg-white/10 px-3.5 py-2 text-xs font-medium text-bulk-sage backdrop-blur-sm"
          >
            <Phone className="size-3.5" />
            Call Us
          </a>
        </div>

        {/* Value prop pills */}
        <div className="relative -mx-5 mt-4">
          <div className="flex gap-2 overflow-x-auto px-5 pb-1" style={{ scrollbarWidth: "none" }}>
            {VALUE_PROPS.map((vp) => (
              <div
                key={vp.text}
                className="flex shrink-0 items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-[11px] font-medium text-white/80 backdrop-blur-sm"
              >
                <span>{vp.emoji}</span>
                <span>{vp.text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </header>
  );
}
