"use client";

export interface SizeSelectorProps {
  sizes: Array<{ label: string; slug: string; priceDeltaCents: number }>;
  selected: string;
  onChange: (slug: string) => void;
}

/**
 * Pill toggle for gravel/stone sizes.
 * Spec §8.2
 */
export function SizeSelector({ sizes, selected, onChange }: SizeSelectorProps) {
  return (
    <div data-testid="size-selector">
      <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-bulk-faded">
        Select Size
      </p>
      <div className="flex gap-2">
        {sizes.map((s) => (
          <button
            key={s.slug}
            onClick={() => onChange(s.slug)}
            className={`flex-1 rounded-xl border-2 px-4 py-2.5 text-center text-sm font-semibold transition-colors ${
              selected === s.slug
                ? "border-bulk-primary bg-green-50 text-bulk-primary"
                : "border-bulk-border bg-white text-bulk-muted hover:border-bulk-sage"
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>
    </div>
  );
}
