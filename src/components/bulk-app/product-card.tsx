"use client";

import { formatUsd } from "@/lib/format";

const BAND_COLORS: Record<string, string> = {
  "Soil & Compost": "bg-green-700",
  Mulch: "bg-amber-900",
  "Recycled Aggregate": "bg-zinc-500",
  "Long Island Gravel": "bg-zinc-500",
  "Crushed Stone": "bg-zinc-600",
  "Decorative Stone": "bg-zinc-600",
  Sand: "bg-amber-500",
};

export interface ProductCardProps {
  slug: string;
  name: string;
  description: string;
  ceilingPriceCents: number;
  floorPriceCents: number;
  floorQty: number;
  categoryTag: string;
  badge: string | null;
  stockLevel: string;
  hasPremium: boolean;
  hasSizes: boolean;
  hasQuickSelect: boolean;
  hasCrushed: boolean;
  onTap: (slug: string) => void;
}

/**
 * Paired product card with color band, badge, name, blurb, price, feature pills.
 * Spec §2.2
 */
export function ProductCard({
  slug,
  name,
  description,
  ceilingPriceCents,
  floorPriceCents,
  floorQty,
  categoryTag,
  badge,
  stockLevel,
  hasPremium,
  hasSizes,
  hasQuickSelect,
  hasCrushed,
  onTap,
}: ProductCardProps) {
  const isOutOfStock = stockLevel === "out_of_stock";
  const isLowStock = stockLevel === "low_stock";
  const bandColor = BAND_COLORS[categoryTag] ?? "bg-zinc-400";

  return (
    <button
      data-testid={`product-card-${slug}`}
      onClick={() => !isOutOfStock && onTap(slug)}
      disabled={isOutOfStock}
      className={`group relative flex w-full flex-col overflow-hidden rounded-xl border border-bulk-border bg-white text-left shadow-sm transition-shadow ${
        isOutOfStock ? "opacity-50" : "hover:shadow-md active:scale-[0.98]"
      }`}
    >
      {/* Color band */}
      <div className={`h-1.5 ${bandColor}`} />

      {/* Out-of-stock overlay */}
      {isOutOfStock && (
        <div className="absolute inset-0 z-10 flex items-center justify-center">
          <span className="rounded-full bg-bulk-dark/80 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-white">
            Back Soon
          </span>
        </div>
      )}

      {/* Low stock badge */}
      {isLowStock && (
        <div className="absolute right-2 top-3.5 z-10 rounded-full bg-orange-500 px-2 py-0.5 text-[9px] font-bold uppercase text-white">
          Limited
        </div>
      )}

      <div className="flex flex-1 flex-col p-3 pt-2.5">
        {/* Badge */}
        {badge && (
          <p className="mb-1 text-[10px] font-semibold text-bulk-sage">
            ● {badge}
          </p>
        )}

        {/* Name */}
        <h3 className="font-bulk-display text-[14px] font-bold leading-tight text-bulk-text">
          {name}
        </h3>

        {/* Description — 2 lines max */}
        <p className="mt-1 line-clamp-2 text-[11px] leading-relaxed text-bulk-muted">
          {description}
        </p>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Price */}
        <div className="mt-2.5">
          <p className="font-bulk-mono text-[17px] font-bold text-bulk-text">
            {formatUsd(ceilingPriceCents)}
          </p>
          <p className="text-[10px] text-bulk-faded">per cu. yard</p>
        </div>

        {/* "As low as" hint */}
        {floorPriceCents < ceilingPriceCents && (
          <p className="mt-1 text-[10px] font-medium text-bulk-sage">
            As low as {formatUsd(floorPriceCents)} at {floorQty}+ cu yds
          </p>
        )}

        {/* Feature pills */}
        <div className="mt-2 flex flex-wrap gap-1">
          {hasPremium && (
            <span className="rounded-full bg-bulk-premium-bg px-2 py-0.5 text-[9px] font-bold uppercase text-bulk-premium-text">
              Premium avail
            </span>
          )}
          {hasSizes && (
            <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[9px] font-bold uppercase text-blue-600">
              Multiple sizes
            </span>
          )}
          {hasQuickSelect && (
            <span className="rounded-full bg-teal-50 px-2 py-0.5 text-[9px] font-bold uppercase text-teal-700">
              Quick select
            </span>
          )}
          {hasCrushed && (
            <span className="rounded-full bg-pink-50 px-2 py-0.5 text-[9px] font-bold uppercase text-pink-700">
              +Crushed
            </span>
          )}
        </div>
      </div>
    </button>
  );
}
