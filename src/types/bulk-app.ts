/**
 * TypeScript interfaces for the /app bulk ordering experience.
 * Spec §2.3 — Product data model types.
 */

export interface BulkProduct {
  id: string;
  slug: string;
  name: string;
  description: string;
  categoryTag: string;
  deliveryType: "bulk";
  materialClass: "mulch" | "default";
  unit: string;
  unitDisplay: string;
  pricPerUnitCents: number;
  ceilingPriceCents: number;
  floorPriceCents: number;
  floorQty: number;
  defaultDepthInches: number;
  depthHelperText: string | null;
  localBadge: string | null;
  originStory: string | null;
  stockLevel: "in_stock" | "low_stock" | "out_of_stock";
  lowStockMessage: string | null;
  pairPosition: "A" | "B";
  pairSlug: string;
  rowOrder: number;
  images: string[];
  isBulkAppEnabled: boolean;
  premiumUpgrade: PremiumUpgrade | null;
  crushedUpgrade: CrushedUpgrade | null;
  applicationQuickSelects: ApplicationQuickSelect[] | null;
  sizes: SizeOption[];
}

export interface SizeOption {
  id: string;
  label: string;
  slug: string;
  priceDeltaCents: number;
  sortOrder: number;
}

export interface PremiumUpgrade {
  label: string;
  minQty: number;
  priceDeltaCents: number;
  badge: string;
}

export interface CrushedUpgrade {
  label: string;
  priceDeltaCents: number;
}

export interface ApplicationQuickSelect {
  label: string;
  defaultDepthInches: number;
  helperText: string;
}
