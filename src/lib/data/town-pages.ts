import type { Json } from "@/types/database";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import type { GalleryProject, GalleryServiceType } from "@/lib/data/gallery";

export type TownFaq = {
  q: string;
  a: string;
};

export type TownPageData = {
  slug: string;
  name: string;
  state: string;
  zipCodes: string[];
  tier: "A" | "B";
  deliveryFeeCents: number;
  distanceMiles: number;
  driveMinutes: number;
  estimatedDeliveryMinutes: number;
  localDescription: string;
  localDescriptionExtended: string | null;
  featuredProjectIds: string[];
  featuredProductSlugs: string[];
  testimonialQuote: string | null;
  testimonialAuthor: string | null;
  faqs: TownFaq[];
  routeOrigin: string;
  routeDestination: string;
  sortOrder: number;
};

export type TownFeaturedProduct = {
  id: string;
  slug: string;
  name: string;
  pricePerUnitCents: number;
  unitDisplay: string;
  image: string;
};

export type TownPageBundle = {
  town: TownPageData;
  projects: GalleryProject[];
  products: TownFeaturedProduct[];
};

export type TownLink = {
  slug: string;
  name: string;
  tier: "A" | "B";
};

const fallbackTowns: TownPageData[] = [
  { slug: "center-moriches", name: "Center Moriches", state: "NY", zipCodes: ["11934"], tier: "A", deliveryFeeCents: 4500, distanceMiles: 3.2, driveMinutes: 11, estimatedDeliveryMinutes: 35, localDescription: "Center Moriches deliveries are frequent and typically fast for driveway stone, topsoil, and mulch orders.", localDescriptionExtended: "Early weekday checkout usually gives the best same-day scheduling options.", featuredProjectIds: ["Center Moriches Gravel Driveway Recovery"], featuredProductSlugs: ["three-quarter-crushed-bluestone", "screened-topsoil", "black-dyed-mulch"], testimonialQuote: null, testimonialAuthor: null, faqs: [], routeOrigin: "110 Frowein Road, Center Moriches, NY 11934", routeDestination: "Center Moriches, NY", sortOrder: 1 },
  { slug: "east-moriches", name: "East Moriches", state: "NY", zipCodes: ["11940"], tier: "A", deliveryFeeCents: 4500, distanceMiles: 2.7, driveMinutes: 10, estimatedDeliveryMinutes: 35, localDescription: "East Moriches is in our core zone with consistent delivery windows for multi-material orders.", localDescriptionExtended: "Bed refresh and drainage combos are common in this area.", featuredProjectIds: ["East Moriches Foundation Refresh"], featuredProductSlugs: ["hemlock-mulch", "screened-topsoil", "pea-gravel"], testimonialQuote: null, testimonialAuthor: null, faqs: [], routeOrigin: "110 Frowein Road, Center Moriches, NY 11934", routeDestination: "East Moriches, NY", sortOrder: 2 },
  { slug: "moriches", name: "Moriches", state: "NY", zipCodes: ["11955"], tier: "A", deliveryFeeCents: 5000, distanceMiles: 4.6, driveMinutes: 14, estimatedDeliveryMinutes: 40, localDescription: "Moriches orders often focus on driveway resurfacing and stone base upgrades.", localDescriptionExtended: "Phased delivery helps keep multi-day jobs moving.", featuredProjectIds: ["Center Moriches Gravel Driveway Recovery"], featuredProductSlugs: ["three-quarter-crushed-bluestone", "mason-sand", "landscape-fabric-roll"], testimonialQuote: null, testimonialAuthor: null, faqs: [], routeOrigin: "110 Frowein Road, Center Moriches, NY 11934", routeDestination: "Moriches, NY", sortOrder: 3 },
  { slug: "eastport", name: "Eastport", state: "NY", zipCodes: ["11941"], tier: "A", deliveryFeeCents: 6000, distanceMiles: 8.3, driveMinutes: 20, estimatedDeliveryMinutes: 50, localDescription: "Eastport jobs commonly bundle topsoil and mulch for large-lot installs.", localDescriptionExtended: "Pre-booked delivery windows support staged site work.", featuredProjectIds: ["Eastport Mulch and Planting Bed Reset"], featuredProductSlugs: ["compost-blend-topsoil", "hemlock-mulch", "mason-sand"], testimonialQuote: null, testimonialAuthor: null, faqs: [], routeOrigin: "110 Frowein Road, Center Moriches, NY 11934", routeDestination: "Eastport, NY", sortOrder: 4 },
  { slug: "manorville", name: "Manorville", state: "NY", zipCodes: ["11949"], tier: "A", deliveryFeeCents: 6500, distanceMiles: 10.4, driveMinutes: 24, estimatedDeliveryMinutes: 55, localDescription: "Manorville material plans often include base stone and paver accessory loads.", localDescriptionExtended: "Adding driveway constraints helps dispatch choose the right truck.", featuredProjectIds: ["Manorville Patio Expansion"], featuredProductSlugs: ["three-quarter-crushed-bluestone", "cambridge-pavers-sahara-chestnut", "polymeric-sand"], testimonialQuote: null, testimonialAuthor: null, faqs: [], routeOrigin: "110 Frowein Road, Center Moriches, NY 11934", routeDestination: "Manorville, NY", sortOrder: 5 },
  { slug: "shirley", name: "Shirley", state: "NY", zipCodes: ["11967"], tier: "A", deliveryFeeCents: 6000, distanceMiles: 7.8, driveMinutes: 19, estimatedDeliveryMinutes: 50, localDescription: "Shirley projects frequently need driveway stone and drainage-friendly blends.", localDescriptionExtended: "Early orders support same-day dispatch in many cases.", featuredProjectIds: ["Shirley Walkway Rebuild"], featuredProductSlugs: ["three-quarter-crushed-bluestone", "pea-gravel", "screened-topsoil"], testimonialQuote: null, testimonialAuthor: null, faqs: [], routeOrigin: "110 Frowein Road, Center Moriches, NY 11934", routeDestination: "Shirley, NY", sortOrder: 6 },
  { slug: "mastic", name: "Mastic", state: "NY", zipCodes: ["11950"], tier: "A", deliveryFeeCents: 6500, distanceMiles: 10.7, driveMinutes: 24, estimatedDeliveryMinutes: 55, localDescription: "Mastic deliveries often include aggregate, sand, and topsoil in staged loads.", localDescriptionExtended: "Access notes in checkout improve placement accuracy.", featuredProjectIds: ["Mastic Beach Drainage Correction"], featuredProductSlugs: ["three-quarter-crushed-bluestone", "screened-topsoil", "mason-sand"], testimonialQuote: null, testimonialAuthor: null, faqs: [], routeOrigin: "110 Frowein Road, Center Moriches, NY 11934", routeDestination: "Mastic, NY", sortOrder: 7 },
  { slug: "mastic-beach", name: "Mastic Beach", state: "NY", zipCodes: ["11951"], tier: "A", deliveryFeeCents: 7000, distanceMiles: 13.1, driveMinutes: 28, estimatedDeliveryMinutes: 60, localDescription: "Mastic Beach homes often require drainage-focused material planning and careful truck access.", localDescriptionExtended: "Weather and traffic can influence narrow delivery windows.", featuredProjectIds: ["Mastic Beach Drainage Correction"], featuredProductSlugs: ["pea-gravel", "mason-sand", "screened-topsoil"], testimonialQuote: null, testimonialAuthor: null, faqs: [], routeOrigin: "110 Frowein Road, Center Moriches, NY 11934", routeDestination: "Mastic Beach, NY", sortOrder: 8 },
  { slug: "brookhaven", name: "Brookhaven", state: "NY", zipCodes: ["11719"], tier: "A", deliveryFeeCents: 7000, distanceMiles: 12.8, driveMinutes: 27, estimatedDeliveryMinutes: 60, localDescription: "Brookhaven orders regularly combine retaining wall, base, and drainage products.", localDescriptionExtended: "Multi-day delivery planning helps larger property phases stay on schedule.", featuredProjectIds: ["Brookhaven Retaining Wall"], featuredProductSlugs: ["three-quarter-crushed-bluestone", "type-s-mortar-mix", "polymeric-sand"], testimonialQuote: null, testimonialAuthor: null, faqs: [], routeOrigin: "110 Frowein Road, Center Moriches, NY 11934", routeDestination: "Brookhaven, NY", sortOrder: 9 },
  { slug: "patchogue", name: "Patchogue", state: "NY", zipCodes: ["11772"], tier: "A", deliveryFeeCents: 8000, distanceMiles: 16.4, driveMinutes: 32, estimatedDeliveryMinutes: 65, localDescription: "Patchogue customers often order paver systems and masonry reset materials.", localDescriptionExtended: "Detailed placement notes are useful on tighter village streets.", featuredProjectIds: ["Patchogue Front Entry Masonry"], featuredProductSlugs: ["cambridge-pavers-sahara-chestnut", "polymeric-sand", "type-s-mortar-mix"], testimonialQuote: null, testimonialAuthor: null, faqs: [], routeOrigin: "110 Frowein Road, Center Moriches, NY 11934", routeDestination: "Patchogue, NY", sortOrder: 10 },
  { slug: "bellport", name: "Bellport", state: "NY", zipCodes: ["11713"], tier: "B", deliveryFeeCents: 8000, distanceMiles: 15.2, driveMinutes: 30, estimatedDeliveryMinutes: 65, localDescription: "Bellport deliveries commonly include decorative stone and edge materials.", localDescriptionExtended: null, featuredProjectIds: [], featuredProductSlugs: ["black-dyed-mulch", "pea-gravel", "edging-block"], testimonialQuote: null, testimonialAuthor: null, faqs: [], routeOrigin: "110 Frowein Road, Center Moriches, NY 11934", routeDestination: "Bellport, NY", sortOrder: 11 },
  { slug: "east-patchogue", name: "East Patchogue", state: "NY", zipCodes: ["11772"], tier: "B", deliveryFeeCents: 8000, distanceMiles: 15.8, driveMinutes: 31, estimatedDeliveryMinutes: 65, localDescription: "East Patchogue routes support combined bulk and non-bulk orders.", localDescriptionExtended: null, featuredProjectIds: [], featuredProductSlugs: ["three-quarter-crushed-bluestone", "mason-sand", "type-s-mortar-mix"], testimonialQuote: null, testimonialAuthor: null, faqs: [], routeOrigin: "110 Frowein Road, Center Moriches, NY 11934", routeDestination: "East Patchogue, NY", sortOrder: 12 },
  { slug: "medford", name: "Medford", state: "NY", zipCodes: ["11763"], tier: "B", deliveryFeeCents: 8500, distanceMiles: 17.7, driveMinutes: 34, estimatedDeliveryMinutes: 70, localDescription: "Medford projects often use topsoil and mulch for seasonal property resets.", localDescriptionExtended: null, featuredProjectIds: [], featuredProductSlugs: ["screened-topsoil", "hemlock-mulch", "edging-block"], testimonialQuote: null, testimonialAuthor: null, faqs: [], routeOrigin: "110 Frowein Road, Center Moriches, NY 11934", routeDestination: "Medford, NY", sortOrder: 13 },
  { slug: "yaphank", name: "Yaphank", state: "NY", zipCodes: ["11980"], tier: "B", deliveryFeeCents: 8000, distanceMiles: 16.1, driveMinutes: 30, estimatedDeliveryMinutes: 65, localDescription: "Yaphank orders are frequently centered on driveway and base-prep material packages.", localDescriptionExtended: null, featuredProjectIds: [], featuredProductSlugs: ["three-quarter-crushed-bluestone", "mason-sand", "screened-topsoil"], testimonialQuote: null, testimonialAuthor: null, faqs: [], routeOrigin: "110 Frowein Road, Center Moriches, NY 11934", routeDestination: "Yaphank, NY", sortOrder: 14 },
  { slug: "ridge", name: "Ridge", state: "NY", zipCodes: ["11961"], tier: "B", deliveryFeeCents: 9000, distanceMiles: 20.5, driveMinutes: 37, estimatedDeliveryMinutes: 75, localDescription: "Ridge homeowners often order aggregate and topsoil for larger lots and longer driveways.", localDescriptionExtended: null, featuredProjectIds: [], featuredProductSlugs: ["three-quarter-crushed-bluestone", "screened-topsoil", "pea-gravel"], testimonialQuote: null, testimonialAuthor: null, faqs: [], routeOrigin: "110 Frowein Road, Center Moriches, NY 11934", routeDestination: "Ridge, NY", sortOrder: 15 },
  { slug: "wading-river", name: "Wading River", state: "NY", zipCodes: ["11792"], tier: "B", deliveryFeeCents: 9000, distanceMiles: 21.8, driveMinutes: 39, estimatedDeliveryMinutes: 75, localDescription: "Wading River projects usually prioritize driveway apron and drainage-stone improvements.", localDescriptionExtended: null, featuredProjectIds: [], featuredProductSlugs: ["three-quarter-crushed-bluestone", "pea-gravel", "mason-sand"], testimonialQuote: null, testimonialAuthor: null, faqs: [], routeOrigin: "110 Frowein Road, Center Moriches, NY 11934", routeDestination: "Wading River, NY", sortOrder: 16 },
  { slug: "riverhead", name: "Riverhead", state: "NY", zipCodes: ["11901"], tier: "B", deliveryFeeCents: 10000, distanceMiles: 24.9, driveMinutes: 43, estimatedDeliveryMinutes: 80, localDescription: "Riverhead deliveries often include base stone and seasonal mulch replenishment.", localDescriptionExtended: null, featuredProjectIds: [], featuredProductSlugs: ["three-quarter-crushed-bluestone", "hemlock-mulch", "mason-sand"], testimonialQuote: null, testimonialAuthor: null, faqs: [], routeOrigin: "110 Frowein Road, Center Moriches, NY 11934", routeDestination: "Riverhead, NY", sortOrder: 17 },
  { slug: "hampton-bays", name: "Hampton Bays", state: "NY", zipCodes: ["11946"], tier: "B", deliveryFeeCents: 9500, distanceMiles: 22.7, driveMinutes: 40, estimatedDeliveryMinutes: 75, localDescription: "Hampton Bays orders often involve paver resets and bed refresh materials.", localDescriptionExtended: null, featuredProjectIds: [], featuredProductSlugs: ["cambridge-pavers-sahara-chestnut", "polymeric-sand", "hemlock-mulch"], testimonialQuote: null, testimonialAuthor: null, faqs: [], routeOrigin: "110 Frowein Road, Center Moriches, NY 11934", routeDestination: "Hampton Bays, NY", sortOrder: 18 },
  { slug: "east-hampton", name: "East Hampton", state: "NY", zipCodes: ["11937"], tier: "B", deliveryFeeCents: 12000, distanceMiles: 35.4, driveMinutes: 56, estimatedDeliveryMinutes: 95, localDescription: "East Hampton work typically uses premium stone and finishing materials in phased deliveries.", localDescriptionExtended: null, featuredProjectIds: [], featuredProductSlugs: ["bluestone-treads", "pennsylvania-fieldstone", "polymeric-sand"], testimonialQuote: null, testimonialAuthor: null, faqs: [], routeOrigin: "110 Frowein Road, Center Moriches, NY 11934", routeDestination: "East Hampton, NY", sortOrder: 19 },
  { slug: "southampton", name: "Southampton", state: "NY", zipCodes: ["11968"], tier: "B", deliveryFeeCents: 11500, distanceMiles: 32.8, driveMinutes: 53, estimatedDeliveryMinutes: 90, localDescription: "Southampton deliveries commonly support stonework touch-ups and paver rebuilds.", localDescriptionExtended: null, featuredProjectIds: [], featuredProductSlugs: ["bluestone-treads", "pennsylvania-fieldstone", "type-s-mortar-mix"], testimonialQuote: null, testimonialAuthor: null, faqs: [], routeOrigin: "110 Frowein Road, Center Moriches, NY 11934", routeDestination: "Southampton, NY", sortOrder: 20 },
  { slug: "quogue", name: "Quogue", state: "NY", zipCodes: ["11959"], tier: "B", deliveryFeeCents: 10500, distanceMiles: 28.9, driveMinutes: 47, estimatedDeliveryMinutes: 85, localDescription: "Quogue projects usually combine premium mulch, stone, and edging materials.", localDescriptionExtended: null, featuredProjectIds: [], featuredProductSlugs: ["hemlock-mulch", "pennsylvania-fieldstone", "edging-block"], testimonialQuote: null, testimonialAuthor: null, faqs: [], routeOrigin: "110 Frowein Road, Center Moriches, NY 11934", routeDestination: "Quogue, NY", sortOrder: 21 },
  { slug: "westhampton", name: "Westhampton", state: "NY", zipCodes: ["11977"], tier: "B", deliveryFeeCents: 10000, distanceMiles: 26.4, driveMinutes: 45, estimatedDeliveryMinutes: 80, localDescription: "Westhampton routes support driveway, paver, and seasonal landscaping projects.", localDescriptionExtended: null, featuredProjectIds: [], featuredProductSlugs: ["three-quarter-crushed-bluestone", "mason-sand", "black-dyed-mulch"], testimonialQuote: null, testimonialAuthor: null, faqs: [], routeOrigin: "110 Frowein Road, Center Moriches, NY 11934", routeDestination: "Westhampton, NY", sortOrder: 22 },
  { slug: "calverton", name: "Calverton", state: "NY", zipCodes: ["11933"], tier: "B", deliveryFeeCents: 10000, distanceMiles: 25.1, driveMinutes: 43, estimatedDeliveryMinutes: 80, localDescription: "Calverton customers often order topsoil, aggregate, and concrete accessories together.", localDescriptionExtended: null, featuredProjectIds: [], featuredProductSlugs: ["screened-topsoil", "three-quarter-crushed-bluestone", "wire-mesh-roll"], testimonialQuote: null, testimonialAuthor: null, faqs: [], routeOrigin: "110 Frowein Road, Center Moriches, NY 11934", routeDestination: "Calverton, NY", sortOrder: 23 },
  { slug: "coram", name: "Coram", state: "NY", zipCodes: ["11727"], tier: "B", deliveryFeeCents: 9000, distanceMiles: 21.9, driveMinutes: 40, estimatedDeliveryMinutes: 75, localDescription: "Coram deliveries frequently include retaining-wall and drainage support materials.", localDescriptionExtended: null, featuredProjectIds: [], featuredProductSlugs: ["type-s-mortar-mix", "polymeric-sand", "three-quarter-crushed-bluestone"], testimonialQuote: null, testimonialAuthor: null, faqs: [], routeOrigin: "110 Frowein Road, Center Moriches, NY 11934", routeDestination: "Coram, NY", sortOrder: 24 },
  { slug: "selden", name: "Selden", state: "NY", zipCodes: ["11784"], tier: "B", deliveryFeeCents: 9000, distanceMiles: 22.6, driveMinutes: 41, estimatedDeliveryMinutes: 75, localDescription: "Selden jobs often need topsoil, mulch, and edging products for seasonal updates.", localDescriptionExtended: null, featuredProjectIds: [], featuredProductSlugs: ["screened-topsoil", "black-dyed-mulch", "edging-block"], testimonialQuote: null, testimonialAuthor: null, faqs: [], routeOrigin: "110 Frowein Road, Center Moriches, NY 11934", routeDestination: "Selden, NY", sortOrder: 25 },
];

function normalizeGalleryServiceType(value: string): GalleryServiceType {
  if (value === "masonry") {
    return "masonry";
  }
  if (value === "driveways") {
    return "driveways";
  }
  if (value === "maintenance" || value === "property-maintenance") {
    return "maintenance";
  }
  return "landscaping";
}

function parseFaqs(value: Json): TownFaq[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((entry) => {
      if (!entry || typeof entry !== "object") {
        return null;
      }

      const record = entry as Record<string, unknown>;
      const question = typeof record.q === "string" ? record.q : "";
      const answer = typeof record.a === "string" ? record.a : "";

      if (!question || !answer) {
        return null;
      }

      return { q: question, a: answer };
    })
    .filter((entry): entry is TownFaq => entry !== null);
}

function mapTownRow(row: {
  slug: string;
  name: string;
  state: string;
  zip_codes: string[];
  tier: string;
  delivery_fee_cents: number;
  distance_miles: number;
  drive_minutes: number;
  estimated_delivery_minutes: number;
  local_description: string;
  local_description_extended: string | null;
  featured_project_ids: string[];
  featured_product_slugs: string[];
  testimonial_quote: string | null;
  testimonial_author: string | null;
  faqs: Json;
  route_origin: string;
  route_destination: string;
  sort_order: number;
}): TownPageData {
  return {
    slug: row.slug,
    name: row.name,
    state: row.state,
    zipCodes: row.zip_codes ?? [],
    tier: row.tier === "A" ? "A" : "B",
    deliveryFeeCents: row.delivery_fee_cents,
    distanceMiles: Number(row.distance_miles),
    driveMinutes: row.drive_minutes,
    estimatedDeliveryMinutes: row.estimated_delivery_minutes,
    localDescription: row.local_description,
    localDescriptionExtended: row.local_description_extended,
    featuredProjectIds: row.featured_project_ids ?? [],
    featuredProductSlugs: row.featured_product_slugs ?? [],
    testimonialQuote: row.testimonial_quote,
    testimonialAuthor: row.testimonial_author,
    faqs: parseFaqs(row.faqs),
    routeOrigin: row.route_origin,
    routeDestination: row.route_destination,
    sortOrder: row.sort_order,
  };
}

export async function getTownPages(): Promise<TownPageData[]> {
  try {
    const supabase = getSupabaseServerClient();
    const result = await supabase
      .from("town_pages")
      .select(
        "slug, name, state, zip_codes, tier, delivery_fee_cents, distance_miles, drive_minutes, estimated_delivery_minutes, local_description, local_description_extended, featured_project_ids, featured_product_slugs, testimonial_quote, testimonial_author, faqs, route_origin, route_destination, sort_order",
      )
      .eq("is_active", true)
      .order("sort_order", { ascending: true });

    if (result.error) {
      throw result.error;
    }

    if (!result.data?.length) {
      return fallbackTowns;
    }

    return result.data.map(mapTownRow);
  } catch {
    return fallbackTowns;
  }
}

export async function getTownPageBundle(slug: string): Promise<TownPageBundle | null> {
  const townPages = await getTownPages();
  const town = townPages.find((entry) => entry.slug === slug);

  if (!town) {
    return null;
  }

  const supabase = getSupabaseServerClient();

  const [projectsResult, featuredProductsResult, fallbackProductsResult] = await Promise.all([
    supabase
      .from("gallery_projects")
      .select("id, title, description, images, town_tags, service_type, before_after, is_featured, created_at")
      .contains("town_tags", [slug])
      .order("is_featured", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(8),
    town.featuredProductSlugs.length > 0
      ? supabase
          .from("products")
          .select("id, slug, name, price_per_unit_cents, unit_display, images")
          .in("slug", town.featuredProductSlugs)
          .eq("is_active", true)
          .limit(6)
      : Promise.resolve({ data: null, error: null }),
    supabase
      .from("products")
      .select("id, slug, name, price_per_unit_cents, unit_display, images")
      .eq("is_active", true)
      .order("sort_order", { ascending: true })
      .limit(6),
  ]);

  const projects: GalleryProject[] = projectsResult.error
    ? []
    : (projectsResult.data ?? []).map((project) => ({
        id: project.id,
        title: project.title,
        description: project.description,
        images: project.images ?? [],
        townTags: project.town_tags ?? [],
        serviceType: normalizeGalleryServiceType(project.service_type),
        beforeAfter: project.before_after,
        isFeatured: project.is_featured,
        createdAt: project.created_at,
      }));

  const effectiveProductRows =
    !featuredProductsResult.error && (featuredProductsResult.data?.length ?? 0) > 0
      ? featuredProductsResult.data ?? []
      : fallbackProductsResult.error
        ? []
        : fallbackProductsResult.data ?? [];

  const products: TownFeaturedProduct[] = effectiveProductRows.map((product) => ({
    id: product.id,
    slug: product.slug,
    name: product.name,
    pricePerUnitCents: product.price_per_unit_cents,
    unitDisplay: product.unit_display,
    image: product.images?.[0] ?? "/images/placeholder-product.svg",
  }));

  return {
    town,
    projects,
    products,
  };
}

export async function getTownsForProductSlug(productSlug: string, limit = 6): Promise<TownLink[]> {
  const towns = await getTownPages();
  return towns
    .filter((town) => town.featuredProductSlugs.includes(productSlug))
    .slice(0, limit)
    .map((town) => ({
      slug: town.slug,
      name: town.name,
      tier: town.tier,
    }));
}
