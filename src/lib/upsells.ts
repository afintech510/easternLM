/**
 * Upsell engine — pure calculation + matching logic, no UI.
 */

export type TieredPricingTier = {
  max_yards: number | null;
  rate_cents_per_yard?: number;
  flat_cents?: number;
  base_cents?: number;
};

export type Upsell = {
  id: string;
  slug: string;
  name: string;
  description: string;
  shortDescription: string;
  pricingType: "flat" | "per_yard" | "tiered_per_yard";
  flatPriceCents: number | null;
  perYardPriceCents: number | null;
  tieredPricing: TieredPricingTier[] | null;
  triggerProductTypes: string[];
  triggerMaterialClasses: string[];
  triggerCategories: string[];
  triggerCalculatorTypes: string[];
  triggerContexts: string[];
  upsellType: "service" | "product" | "add-on";
  linkedProductSlugs: string[];
  sortOrder: number;
  isTaxable: boolean;
  icon: string | null;
};

export type UpsellContext = {
  productType?: string;
  materialClass?: string;
  categorySlug?: string;
  calculatorType?: string;
  displayContext: "calculator" | "product_detail" | "cart" | "quote_tool";
};

// ─── Price calculation ────────────────────────────────────────────

export function calculateUpsellPrice(upsell: Upsell, yards: number): number {
  if (yards <= 0) return 0;

  switch (upsell.pricingType) {
    case "flat":
      return upsell.flatPriceCents ?? 0;

    case "per_yard":
      return Math.round(yards * (upsell.perYardPriceCents ?? 0));

    case "tiered_per_yard": {
      if (!upsell.tieredPricing || upsell.tieredPricing.length === 0) return 0;

      // Sort tiers by max_yards (null = infinity goes last)
      const tiers = [...upsell.tieredPricing].sort((a, b) => {
        if (a.max_yards === null) return 1;
        if (b.max_yards === null) return -1;
        return a.max_yards - b.max_yards;
      });

      // Find the applicable tier
      for (const tier of tiers) {
        if (tier.max_yards === null || yards <= tier.max_yards) {
          // Flat price for this tier
          if (tier.flat_cents !== undefined) return tier.flat_cents;

          // Base + per-yard rate
          if (tier.base_cents !== undefined && tier.rate_cents_per_yard !== undefined) {
            return tier.base_cents + Math.round(yards * tier.rate_cents_per_yard);
          }

          // Simple per-yard rate
          if (tier.rate_cents_per_yard !== undefined) {
            return Math.round(yards * tier.rate_cents_per_yard);
          }

          return 0;
        }
      }

      return 0;
    }

    default:
      return 0;
  }
}

// ─── Trigger matching ─────────────────────────────────────────────

function matchesTrigger(triggerArray: string[], value: string | undefined): boolean {
  // Empty array = match all
  if (triggerArray.length === 0) return true;
  // If no value provided, don't match non-empty triggers
  if (!value) return false;
  return triggerArray.includes(value);
}

export function getApplicableUpsells(upsells: Upsell[], context: UpsellContext): Upsell[] {
  return upsells
    .filter((u) => {
      if (!matchesTrigger(u.triggerProductTypes, context.productType)) return false;
      if (!matchesTrigger(u.triggerMaterialClasses, context.materialClass)) return false;
      if (!matchesTrigger(u.triggerCategories, context.categorySlug)) return false;
      if (!matchesTrigger(u.triggerCalculatorTypes, context.calculatorType)) return false;
      if (!matchesTrigger(u.triggerContexts, context.displayContext)) return false;
      return true;
    })
    .sort((a, b) => a.sortOrder - b.sortOrder);
}

// ─── DB row mapper ────────────────────────────────────────────────

export function mapDbRowToUpsell(row: Record<string, unknown>): Upsell {
  return {
    id: row.id as string,
    slug: row.slug as string,
    name: row.name as string,
    description: row.description as string,
    shortDescription: row.short_description as string,
    pricingType: row.pricing_type as Upsell["pricingType"],
    flatPriceCents: row.flat_price_cents as number | null,
    perYardPriceCents: row.per_yard_price_cents as number | null,
    tieredPricing: row.tiered_pricing as TieredPricingTier[] | null,
    triggerProductTypes: (row.trigger_product_types as string[]) || [],
    triggerMaterialClasses: (row.trigger_material_classes as string[]) || [],
    triggerCategories: (row.trigger_categories as string[]) || [],
    triggerCalculatorTypes: (row.trigger_calculator_types as string[]) || [],
    triggerContexts: (row.trigger_contexts as string[]) || [],
    upsellType: row.upsell_type as Upsell["upsellType"],
    linkedProductSlugs: (row.linked_product_slugs as string[]) || [],
    sortOrder: row.sort_order as number,
    isTaxable: row.is_taxable as boolean,
    icon: row.icon as string | null,
  };
}
