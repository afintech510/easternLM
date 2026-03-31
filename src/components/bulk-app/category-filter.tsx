"use client";

const CATEGORIES = [
  { key: "all", label: "All" },
  { key: "soil", label: "Soil" },
  { key: "mulch", label: "Mulch" },
  { key: "gravel", label: "Gravel" },
  { key: "stone", label: "Stone" },
  { key: "sand", label: "Sand" },
];

/** Maps category_tag values to filter keys */
export const TAG_TO_FILTER: Record<string, string> = {
  "Soil & Compost": "soil",
  Mulch: "mulch",
  "Long Island Gravel": "gravel",
  "Recycled Aggregate": "gravel",
  "Crushed Stone": "stone",
  "Decorative Stone": "stone",
  Sand: "sand",
};

/**
 * Sticky horizontal filter bar.
 * Spec §2.1 — All | Soil | Mulch | Gravel | Stone | Sand
 */
export function CategoryFilter({
  active,
  onChange,
}: {
  active: string;
  onChange: (cat: string) => void;
}) {
  return (
    <div
      data-testid="category-filter"
      className="sticky top-0 z-30 border-b border-bulk-border bg-white/95 backdrop-blur-sm"
    >
      <div className="flex gap-1.5 overflow-x-auto px-4 py-2.5" style={{ scrollbarWidth: "none" }}>
        {CATEGORIES.map((cat) => (
          <button
            key={cat.key}
            onClick={() => onChange(cat.key)}
            className={`shrink-0 rounded-full px-4 py-1.5 text-xs font-semibold transition-colors ${
              active === cat.key
                ? "bg-bulk-primary text-white"
                : "text-bulk-muted hover:bg-bulk-card"
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>
    </div>
  );
}
