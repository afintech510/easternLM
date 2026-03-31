"use client";

import { Minus, Plus } from "lucide-react";

const DEFAULT_SHORTCUTS = [3, 5, 10, 15, 20];

export interface QtySelectorProps {
  value: number;
  min?: number;
  max?: number;
  step?: number;
  shortcuts?: number[];
  onChange: (qty: number) => void;
}

/**
 * Shortcut buttons + fine adjuster.
 * Spec §8.2
 */
export function QtySelector({
  value,
  min = 0.5,
  max = 100,
  step = 0.5,
  shortcuts = DEFAULT_SHORTCUTS,
  onChange,
}: QtySelectorProps) {
  function clamp(v: number) {
    return Math.max(min, Math.min(max, Math.round(v * 10) / 10));
  }

  return (
    <div data-testid="qty-selector" className="space-y-3">
      {/* Shortcut buttons */}
      <div className="flex gap-2">
        {shortcuts.map((s) => (
          <button
            key={s}
            onClick={() => onChange(s)}
            className={`flex-1 rounded-lg py-2.5 font-bulk-mono text-sm font-bold transition-colors ${
              value === s
                ? "bg-bulk-primary text-white"
                : "bg-bulk-card text-bulk-text hover:bg-bulk-border"
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      {/* Fine adjuster */}
      <div className="flex items-center gap-3 rounded-xl border border-bulk-border bg-white p-2">
        <button
          onClick={() => onChange(clamp(value - step))}
          disabled={value <= min}
          className="flex size-10 items-center justify-center rounded-lg bg-bulk-card text-bulk-text transition-colors hover:bg-bulk-border disabled:opacity-30"
        >
          <Minus className="size-4" />
        </button>

        <div className="flex-1 text-center">
          <input
            type="text"
            inputMode="decimal"
            value={value}
            onChange={(e) => {
              const v = parseFloat(e.target.value);
              if (!isNaN(v)) onChange(clamp(v));
            }}
            className="w-full bg-transparent text-center font-bulk-mono text-2xl font-bold text-bulk-text outline-none"
          />
          <p className="text-[11px] text-bulk-muted">cu yds</p>
        </div>

        <button
          onClick={() => onChange(clamp(value + step))}
          disabled={value >= max}
          className="flex size-10 items-center justify-center rounded-lg bg-bulk-card text-bulk-text transition-colors hover:bg-bulk-border disabled:opacity-30"
        >
          <Plus className="size-4" />
        </button>
      </div>
    </div>
  );
}
