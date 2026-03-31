"use client";

import { formatUsd } from "@/lib/format";

export interface PriceDisplayProps {
  unitPriceCents: number;
  totalCents: number;
  savingsCents: number;
  ceilingCents: number;
  floorCents: number;
  qty: number;
  floorQty: number;
}

/**
 * Dark green gradient price card with per-yard price, total, savings badge, progress bar.
 * Spec §3.5
 */
export function PriceDisplay({
  unitPriceCents,
  totalCents,
  savingsCents,
  ceilingCents,
  floorCents,
  qty,
  floorQty,
}: PriceDisplayProps) {
  const progressPct = Math.min(100, (qty / floorQty) * 100);

  return (
    <div data-testid="price-display" className="overflow-hidden rounded-2xl bg-gradient-to-br from-bulk-primary to-bulk-medium p-4">
      {/* Price row */}
      <div className="flex items-end justify-between">
        <div>
          <p className="text-[10px] font-medium text-white/60">Price per cu. yard</p>
          <p className="font-bulk-mono text-4xl font-bold text-white">
            {formatUsd(unitPriceCents)}
          </p>
        </div>
        <div className="text-right">
          <p className="text-[10px] font-medium text-white/60">Total</p>
          <p className="font-bulk-mono text-2xl font-bold text-white">
            {formatUsd(totalCents)}
          </p>
        </div>
      </div>

      {/* Savings badge */}
      {savingsCents > 0 && (
        <div className="mt-3 rounded-lg bg-bulk-sage/20 px-3 py-1.5">
          <p className="text-[12px] font-semibold text-bulk-sage">
            🎉 You save {formatUsd(savingsCents)} vs. buying 1 at a time
          </p>
        </div>
      )}

      {/* Progress bar to best price */}
      <div className="mt-3">
        <div className="flex justify-between text-[9px] font-medium text-white/40">
          <span>{formatUsd(ceilingCents)}</span>
          <span>Best: {formatUsd(floorCents)}</span>
        </div>
        <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/15">
          <div
            className="h-full rounded-full bg-gradient-to-r from-bulk-sage to-green-400 transition-all duration-300"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>
    </div>
  );
}
