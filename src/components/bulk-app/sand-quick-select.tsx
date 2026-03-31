"use client";

export interface SandQuickSelectProps {
  options: Array<{ label: string; defaultDepthInches: number; helperText: string }>;
  selected: string | null;
  onChange: (label: string) => void;
}

/**
 * Application quick-select chips for sand products.
 * Tapping a chip updates depth default via parent callback.
 * Spec §2.4, §8.2
 */
export function SandQuickSelect({
  options,
  selected,
  onChange,
}: SandQuickSelectProps) {
  return (
    <div data-testid="sand-quick-select">
      <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-bulk-faded">
        What&apos;s it for?
      </p>
      <div className="flex flex-wrap gap-2">
        {options.map((opt) => (
          <button
            key={opt.label}
            onClick={() => onChange(opt.label)}
            className={`rounded-full border-2 px-4 py-2 text-xs font-semibold transition-colors ${
              selected === opt.label
                ? "border-teal-600 bg-teal-50 text-teal-700"
                : "border-bulk-border bg-white text-bulk-muted hover:border-teal-300"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
      {selected && (
        <p className="mt-2 text-[11px] italic text-bulk-faded">
          {options.find((o) => o.label === selected)?.helperText}
        </p>
      )}
    </div>
  );
}
