"use client";

import { formatUsd } from "@/lib/format";

export interface CrushedUpgradeProps {
  enabled: boolean;
  priceDeltaCents: number;
  onChange: (enabled: boolean) => void;
}

/**
 * Crushed processing upgrade toggle (LI gravel only).
 * Spec §8.2 — Always enabled (no minimum).
 */
export function CrushedUpgrade({
  enabled,
  priceDeltaCents,
  onChange,
}: CrushedUpgradeProps) {
  return (
    <div data-testid="crushed-upgrade">
      <button
        onClick={() => onChange(!enabled)}
        className={`flex w-full items-center justify-between rounded-xl border p-3.5 text-left transition-colors ${
          enabled
            ? "border-pink-300 bg-pink-50"
            : "border-bulk-border bg-white hover:border-bulk-sage"
        }`}
      >
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-bulk-text">
            ⬆️ Upgrade to Crushed
          </p>
          <p className="mt-0.5 text-[11px] text-bulk-muted">
            +{formatUsd(priceDeltaCents)} per cu. yard · angular, compacts better
          </p>
        </div>
        <div
          className={`ml-3 flex size-5 shrink-0 items-center justify-center rounded border-2 transition-colors ${
            enabled ? "border-pink-600 bg-pink-600" : "border-bulk-border bg-white"
          }`}
        >
          {enabled && (
            <svg className="size-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          )}
        </div>
      </button>
    </div>
  );
}
