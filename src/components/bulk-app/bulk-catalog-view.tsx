"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { CatalogHeader } from "./catalog-header";
import { CategoryFilter, TAG_TO_FILTER } from "./category-filter";
import { ProductCard } from "./product-card";
import { ProductSheet } from "./product-sheet";
import { QtySelector } from "./qty-selector";
import { PriceDisplay } from "./price-display";
import { CoverageCalculator } from "./coverage-calculator";
import { SizeSelector } from "./size-selector";
import { PremiumToggle } from "./premium-toggle";
import { CrushedUpgrade } from "./crushed-upgrade";
import { SandQuickSelect } from "./sand-quick-select";
import { calcPriceCents, calcTotalCents, calcSavingsCents, calcNextBreakpoint } from "@/lib/bulk-pricing";
import { calcCoverageSqFt } from "@/lib/bulk-coverage";
import { formatUsd } from "@/lib/format";
import { useBulkOrderStore } from "@/stores/bulk-order-store";
import { OrderBar } from "./order-bar";

// Product type from DB query (matches Supabase row shape)
interface DBProduct {
  id: string;
  slug: string;
  name: string;
  description: string;
  category_tag: string;
  price_per_unit_cents: number;
  ceiling_price_cents: number;
  floor_price_cents: number;
  floor_qty: number;
  default_depth_inches: number;
  depth_helper_text: string | null;
  local_badge: string | null;
  origin_story: string | null;
  stock_level: string;
  pair_position: string;
  pair_slug: string;
  row_order: number;
  material_class: string;
  premium_upgrade: { label: string; minQty: number; priceDeltaCents: number; badge: string } | null;
  crushed_upgrade: { label: string; priceDeltaCents: number } | null;
  application_quick_selects: Array<{ label: string; defaultDepthInches: number; helperText: string }> | null;
  product_sizes: Array<{ id: string; label: string; slug: string; price_delta_cents: number; sort_order: number }>;
}

interface ProductRow {
  rowOrder: number;
  categoryTag: string;
  products: DBProduct[];
}

// ── Sheet state ──────────────────────────────────────────────────

interface SheetState {
  qty: number;
  depth: number;
  selectedSize: string | null;
  premiumEnabled: boolean;
  crushedEnabled: boolean;
  sandApp: string | null;
}

function defaultSheetState(product: DBProduct): SheetState {
  return {
    qty: 5,
    depth: product.default_depth_inches,
    selectedSize: product.product_sizes[0]?.slug ?? null,
    premiumEnabled: false,
    crushedEnabled: false,
    sandApp: null,
  };
}

// ── Component ────────────────────────────────────────────────────

export function BulkCatalogView({ products }: { products: DBProduct[] }) {
  const [filter, setFilter] = useState("all");
  const [openSlug, setOpenSlug] = useState<string | null>(null);
  const [sheetState, setSheetState] = useState<SheetState | null>(null);
  const rowRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // Group products into paired rows
  const rows = useMemo<ProductRow[]>(() => {
    const map = new Map<number, ProductRow>();
    for (const p of products) {
      if (!map.has(p.row_order)) {
        map.set(p.row_order, { rowOrder: p.row_order, categoryTag: p.category_tag, products: [] });
      }
      map.get(p.row_order)!.products.push(p);
    }
    // Sort products within each row by pair_position
    for (const row of map.values()) {
      row.products.sort((a, b) => (a.pair_position < b.pair_position ? -1 : 1));
    }
    return Array.from(map.values()).sort((a, b) => a.rowOrder - b.rowOrder);
  }, [products]);

  const openProduct = products.find((p) => p.slug === openSlug) ?? null;

  // Handle filter change — scroll to category
  const handleFilterChange = useCallback((cat: string) => {
    setFilter(cat);
    if (cat === "all") return;
    // Find first row matching this filter
    const targetRow = rows.find((r) => TAG_TO_FILTER[r.categoryTag] === cat);
    if (targetRow) {
      rowRefs.current[targetRow.rowOrder]?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [rows]);

  // Open product sheet
  function openSheet(slug: string) {
    const p = products.find((pr) => pr.slug === slug);
    if (!p) return;
    setOpenSlug(slug);
    setSheetState(defaultSheetState(p));
  }

  // Calculate pricing for sheet
  const sheetPricing = useMemo(() => {
    if (!openProduct || !sheetState) return null;
    const basePriceCents = calcPriceCents(sheetState.qty, openProduct.ceiling_price_cents, openProduct.floor_price_cents, openProduct.floor_qty);
    const sizeDelta = openProduct.product_sizes.find((s) => s.slug === sheetState.selectedSize)?.price_delta_cents ?? 0;
    const premiumDelta = sheetState.premiumEnabled && openProduct.premium_upgrade ? openProduct.premium_upgrade.priceDeltaCents : 0;
    const crushedDelta = sheetState.crushedEnabled && openProduct.crushed_upgrade ? openProduct.crushed_upgrade.priceDeltaCents : 0;
    const unitPrice = basePriceCents + sizeDelta + premiumDelta + crushedDelta;
    const total = calcTotalCents(sheetState.qty, unitPrice);
    const savings = calcSavingsCents(sheetState.qty, openProduct.ceiling_price_cents + sizeDelta + premiumDelta + crushedDelta, unitPrice);
    const nextBp = calcNextBreakpoint(sheetState.qty);
    return { unitPrice, total, savings, nextBp };
  }, [openProduct, sheetState]);

  return (
    <div className="flex flex-col">
      <CatalogHeader />
      <CategoryFilter active={filter} onChange={handleFilterChange} />

      {/* Product grid */}
      <div className="space-y-6 px-4 py-5">
        {rows.map((row) => {
          const filterKey = TAG_TO_FILTER[row.categoryTag] ?? "";
          const dimmed = filter !== "all" && filterKey !== filter;

          return (
            <div
              key={row.rowOrder}
              ref={(el) => { rowRefs.current[row.rowOrder] = el; }}
              className={`transition-opacity duration-200 ${dimmed ? "opacity-30" : ""}`}
            >
              {/* Category label */}
              <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.15em] text-bulk-faded">
                {row.categoryTag}
              </p>

              {/* Paired cards */}
              <div className="grid grid-cols-2 gap-3">
                {row.products.map((p) => (
                  <ProductCard
                    key={p.slug}
                    slug={p.slug}
                    name={p.name}
                    description={p.description}
                    ceilingPriceCents={p.ceiling_price_cents}
                    floorPriceCents={p.floor_price_cents}
                    floorQty={p.floor_qty}
                    categoryTag={p.category_tag}
                    badge={p.local_badge}
                    stockLevel={p.stock_level}
                    hasPremium={!!p.premium_upgrade}
                    hasSizes={p.product_sizes.length > 0}
                    hasQuickSelect={!!p.application_quick_selects}
                    hasCrushed={!!p.crushed_upgrade}
                    onTap={openSheet}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Product detail sheet */}
      {openProduct && sheetState && sheetPricing && (
        <ProductSheet
          open={!!openSlug}
          onClose={() => setOpenSlug(null)}
          title={openProduct.name}
          badge={openProduct.local_badge}
          subtitle={openProduct.description}
        >
          <div className="space-y-4">
            {/* Size selector (if applicable) */}
            {openProduct.product_sizes.length > 0 && (
              <SizeSelector
                sizes={openProduct.product_sizes.map((s) => ({
                  label: s.label,
                  slug: s.slug,
                  priceDeltaCents: s.price_delta_cents,
                }))}
                selected={sheetState.selectedSize ?? ""}
                onChange={(slug) => setSheetState((s) => s ? { ...s, selectedSize: slug } : s)}
              />
            )}

            {/* Sand quick select (if applicable) */}
            {openProduct.application_quick_selects && (
              <SandQuickSelect
                options={openProduct.application_quick_selects}
                selected={sheetState.sandApp}
                onChange={(label) => {
                  const app = openProduct.application_quick_selects!.find((a) => a.label === label);
                  setSheetState((s) => s ? { ...s, sandApp: label, depth: app?.defaultDepthInches ?? s.depth } : s);
                }}
              />
            )}

            {/* Price display */}
            <PriceDisplay
              unitPriceCents={sheetPricing.unitPrice}
              totalCents={sheetPricing.total}
              savingsCents={sheetPricing.savings}
              ceilingCents={openProduct.ceiling_price_cents}
              floorCents={openProduct.floor_price_cents}
              qty={sheetState.qty}
              floorQty={openProduct.floor_qty}
            />

            {/* Qty selector */}
            <QtySelector
              value={sheetState.qty}
              onChange={(qty) => setSheetState((s) => s ? { ...s, qty } : s)}
            />

            {/* Coverage calculator */}
            <CoverageCalculator
              yards={sheetState.qty}
              depthInches={sheetState.depth}
              helperText={openProduct.depth_helper_text}
              onDepthChange={(depth) => setSheetState((s) => s ? { ...s, depth } : s)}
            />

            {/* Premium toggle (mulch only) */}
            {openProduct.premium_upgrade && (
              <PremiumToggle
                enabled={sheetState.premiumEnabled}
                minQty={openProduct.premium_upgrade.minQty}
                currentQty={sheetState.qty}
                priceDeltaCents={openProduct.premium_upgrade.priceDeltaCents}
                label={openProduct.premium_upgrade.label}
                badge={openProduct.premium_upgrade.badge}
                onChange={(enabled) => setSheetState((s) => s ? { ...s, premiumEnabled: enabled } : s)}
              />
            )}

            {/* Crushed upgrade (LI gravel only) */}
            {openProduct.crushed_upgrade && (
              <CrushedUpgrade
                enabled={sheetState.crushedEnabled}
                priceDeltaCents={openProduct.crushed_upgrade.priceDeltaCents}
                onChange={(enabled) => setSheetState((s) => s ? { ...s, crushedEnabled: enabled } : s)}
              />
            )}

            {/* Nudge messaging */}
            {sheetPricing.nextBp && (
              <div className="rounded-xl border border-bulk-warn-border bg-bulk-warn-bg p-3">
                <p className="text-[12px] font-medium text-bulk-warn-text">
                  💡 Add {sheetPricing.nextBp.addQty} more cu yds to drop to{" "}
                  {formatUsd(calcPriceCents(sheetPricing.nextBp.nextQty, openProduct.ceiling_price_cents, openProduct.floor_price_cents, openProduct.floor_qty))}{" "}
                  per cu. yard
                </p>
              </div>
            )}

            {/* BNPL teaser */}
            {sheetPricing.total > 15000 && (
              <div className="rounded-xl border border-bulk-bnpl-border bg-bulk-bnpl-bg p-3">
                <p className="text-[12px] font-medium text-bulk-bnpl-text">
                  💳 Or 4 payments of {formatUsd(Math.ceil(sheetPricing.total / 4))} with Klarna
                </p>
              </div>
            )}

            {/* Add to Order button */}
            <button
              onClick={() => {
                const store = useBulkOrderStore.getState();
                store.addItem({
                  slug: openProduct.slug,
                  name: openProduct.name,
                  qty: sheetState.qty,
                  priceCents: sheetPricing.unitPrice,
                  options: {
                    size: sheetState.selectedSize ?? undefined,
                    premium: sheetState.premiumEnabled,
                    crushed: sheetState.crushedEnabled,
                    application: sheetState.sandApp ?? undefined,
                    depth: sheetState.depth,
                  },
                });
                setOpenSlug(null);
              }}
              className="w-full rounded-xl bg-gradient-to-r from-bulk-primary to-bulk-medium py-4 text-center font-semibold text-white shadow-lg transition-transform active:scale-[0.98]"
            >
              {useBulkOrderStore.getState().items.find((i) => i.slug === openProduct.slug)
                ? `UPDATE ORDER — ${sheetState.qty} cu yds for ${formatUsd(sheetPricing.total)}`
                : `★ ADD TO ORDER — ${sheetState.qty} cu yds for ${formatUsd(sheetPricing.total)}`}
            </button>
          </div>
        </ProductSheet>
      )}
      {/* Floating order bar */}
      <OrderBar />
    </div>
  );
}
