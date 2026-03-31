"use client";

import { calcCoverageSqFt } from "@/lib/bulk-coverage";

const DEPTHS = [1, 2, 3, 4, 5, 6];

export interface CoverageCalculatorProps {
  yards: number;
  depthInches: number;
  helperText?: string | null;
  onDepthChange: (depth: number) => void;
}

/**
 * Coverage display with depth pill selector and helper text.
 * Spec §4
 */
export function CoverageCalculator({
  yards,
  depthInches,
  helperText,
  onDepthChange,
}: CoverageCalculatorProps) {
  const sqft = calcCoverageSqFt(yards, depthInches);

  return (
    <div data-testid="coverage-calculator" className="rounded-xl bg-bulk-card p-4">
      {/* Coverage display */}
      <p className="text-sm text-bulk-muted">
        Covers approx{" "}
        <span className="font-bulk-mono text-base font-bold text-bulk-text">
          {sqft.toLocaleString()} sq ft
        </span>{" "}
        at {depthInches}&quot; deep
      </p>

      {/* Depth pills */}
      <div className="mt-3 flex gap-1.5">
        {DEPTHS.map((d) => (
          <button
            key={d}
            onClick={() => onDepthChange(d)}
            className={`flex-1 rounded-lg py-2 text-center text-xs font-semibold transition-colors ${
              depthInches === d
                ? "bg-bulk-primary text-white"
                : "bg-white text-bulk-muted hover:bg-bulk-border"
            }`}
          >
            {d}&quot;
          </button>
        ))}
      </div>

      {/* Helper text */}
      {helperText && (
        <p className="mt-2.5 text-[11px] italic leading-relaxed text-bulk-faded">
          {helperText}
        </p>
      )}
    </div>
  );
}
