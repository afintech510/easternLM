import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import type { SealcoatPricing } from "@/components/sealcoat/sealcoat-booking-widget";

/** Fallback used if the DB fetch fails — keeps the page renderable. */
export const DEFAULT_SEALCOAT_PRICING: SealcoatPricing = {
  sealcoatName: "Premium Driveway Sealcoat",
  tiers: { small: 39900, standard: 65000, large: 89900 },
  minor: { name: "Minor Crack Fill", cents: 10000 },
  major: { name: "Major Crack Fill / Hot-Patch", cents: 25000 },
};

type ServiceRow = {
  slug: string;
  name: string | null;
  pricing: { tiers?: Record<string, number> | null; flat_cents?: number | null } | null;
};

/** Load live sealcoat pricing from instant_book_services (single source of truth). */
export async function loadSealcoatPricing(): Promise<SealcoatPricing> {
  try {
    const supabase = getSupabaseAdminClient();
    const { data } = await (supabase as any)
      .from("instant_book_services")
      .select("slug, name, pricing")
      .in("slug", ["driveway-sealcoating", "driveway-crackfill-minor", "driveway-crackfill-major"]);
    const rows = (data ?? []) as ServiceRow[];
    if (rows.length === 0) return DEFAULT_SEALCOAT_PRICING;

    const bySlug = new Map<string, ServiceRow>(rows.map((s) => [s.slug, s]));
    const seal = bySlug.get("driveway-sealcoating");
    const minor = bySlug.get("driveway-crackfill-minor");
    const major = bySlug.get("driveway-crackfill-major");

    return {
      sealcoatName: seal?.name ?? DEFAULT_SEALCOAT_PRICING.sealcoatName,
      tiers: {
        small: seal?.pricing?.tiers?.small ?? DEFAULT_SEALCOAT_PRICING.tiers.small,
        standard: seal?.pricing?.tiers?.standard ?? DEFAULT_SEALCOAT_PRICING.tiers.standard,
        large: seal?.pricing?.tiers?.large ?? DEFAULT_SEALCOAT_PRICING.tiers.large,
      },
      minor: {
        name: minor?.name ?? DEFAULT_SEALCOAT_PRICING.minor.name,
        cents: minor?.pricing?.flat_cents ?? DEFAULT_SEALCOAT_PRICING.minor.cents,
      },
      major: {
        name: major?.name ?? DEFAULT_SEALCOAT_PRICING.major.name,
        cents: major?.pricing?.flat_cents ?? DEFAULT_SEALCOAT_PRICING.major.cents,
      },
    };
  } catch {
    return DEFAULT_SEALCOAT_PRICING;
  }
}
