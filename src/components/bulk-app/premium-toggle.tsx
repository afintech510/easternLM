"use client";

import { formatUsd } from "@/lib/format";

export interface PremiumToggleProps {
  enabled: boolean;
  minQty: number;
  currentQty: number;
  priceDeltaCents: number;
  label: string;
  badge: string;
  onChange: (enabled: boolean) => void;
}

/**
 * Triple-shred premium upgrade checkbox. Grayed below minQty.
 * Spec §8.2
 */
export function PremiumToggle({
  enabled,
  minQty,
  currentQty,
  priceDeltaCents,
  label,
  badge,
  onChange,
}: PremiumToggleProps) {
  const available = currentQty >= minQty;
  const needMore = minQty - currentQty;

  return (
    <div data-testid="premium-toggle">
      <button
        onClick={() => available && onChange(!enabled)}
        disabled={!available}
        className={`flex w-full items-center justify-between rounded-xl border p-3.5 text-left transition-colors ${
          enabled && available
            ? "border-bulk-premium-text/30 bg-bulk-premium-bg"
            : available
            ? "border-bulk-border bg-white hover:border-bulk-sage"
            : "border-bulk-border bg-bulk-card opacity-60"
        }`}
      >
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-bulk-text">
            ⬆️ {badge}: {label}
          </p>
          {available ? (
            <p className="mt-0.5 text-[11px] text-bulk-muted">
              +{formatUsd(priceDeltaCents)} per cu. yard · finer texture, premium look
            </p>
          ) : (
            <p className="mt-0.5 text-[11px] text-bulk-faded">
              Minimum {minQty} cu yds — add {needMore} more
            </p>
          )}
        </div>
        <div
          className={`ml-3 flex size-5 shrink-0 items-center justify-center rounded border-2 transition-colors ${
            enabled && available
              ? "border-bulk-premium-text bg-bulk-premium-text"
              : "border-bulk-border bg-white"
          }`}
        >
          {enabled && available && (
            <svg className="size-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          )}
        </div>
      </button>
    </div>
  );
}
