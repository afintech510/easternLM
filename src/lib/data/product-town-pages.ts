import { getSupabaseServerClient } from "@/lib/supabase/server";

// ─── Types ────────────────────────────────────────────────────────

export type ProductTownFaq = {
  q: string;
  a: string;
};

export type ProductTownPage = {
  id: string;
  slug: string;
  productGroup: string;
  townSlug: string;
  title: string;
  metaDescription: string;
  h1: string;
  introParagraph: string;
  localContext: string | null;
  projectTips: string | null;
  commonUses: string[];
  featuredProductSlugs: string[];
  calculatorType: string | null;
  relatedServiceSlug: string | null;
  faqs: ProductTownFaq[];
  schemaType: string;
};

export type ProductTownFeaturedProduct = {
  id: string;
  slug: string;
  name: string;
  pricePerUnitCents: number;
  unitDisplay: string;
  description: string;
  image: string;
  deliveryType: string;
  materialClass: string;
};

export type ProductTownTownData = {
  slug: string;
  name: string;
  state: string;
  zipCodes: string[];
  tier: string;
  deliveryFeeCents: number;
  distanceMiles: number;
  driveMinutes: number;
};

export type ProductTownPageBundle = {
  page: ProductTownPage;
  town: ProductTownTownData;
  products: ProductTownFeaturedProduct[];
};

export type ServiceTownPage = {
  id: string;
  slug: string;
  serviceType: string;
  townSlug: string;
  title: string;
  metaDescription: string;
  h1: string;
  introParagraph: string;
  localContext: string | null;
  servicesIncluded: string[];
  relatedProductSlugs: string[];
  faqs: ProductTownFaq[];
  schemaType: string;
};

// ─── Queries ──────────────────────────────────────────────────────

const FALLBACK_IMAGE = "/images/placeholder-product.svg";

export async function getProductTownPages(): Promise<Array<{ slug: string }>> {
  const supabase = getSupabaseServerClient();
  const { data } = await supabase
    .from("product_town_pages")
    .select("slug")
    .eq("is_active", true);
  return data ?? [];
}

export async function getProductTownPageBySlug(slug: string): Promise<ProductTownPageBundle | null> {
  const supabase = getSupabaseServerClient();

  const { data: page } = await supabase
    .from("product_town_pages")
    .select("*")
    .eq("slug", slug)
    .eq("is_active", true)
    .maybeSingle();

  if (!page) return null;

  // Fetch town data
  const { data: town } = await supabase
    .from("town_pages")
    .select("slug, name, state, zip_codes, tier, delivery_fee_cents, distance_miles, drive_minutes")
    .eq("slug", page.town_slug)
    .maybeSingle();

  if (!town) return null;

  // Fetch featured products
  let products: ProductTownFeaturedProduct[] = [];
  if (page.featured_product_slugs && page.featured_product_slugs.length > 0) {
    const { data: prods } = await supabase
      .from("products")
      .select("id, slug, name, price_per_unit_cents, unit_display, description, images, delivery_type, material_class")
      .in("slug", page.featured_product_slugs)
      .eq("is_active", true);

    products = (prods ?? []).map((p) => ({
      id: p.id,
      slug: p.slug,
      name: p.name,
      pricePerUnitCents: p.price_per_unit_cents,
      unitDisplay: p.unit_display,
      description: p.description || "",
      image: (p.images as string[])?.[0] ?? FALLBACK_IMAGE,
      deliveryType: p.delivery_type,
      materialClass: p.material_class,
    }));
  }

  // Parse faqs
  const faqs = parseFaqs(page.faqs);

  return {
    page: {
      id: page.id,
      slug: page.slug,
      productGroup: page.product_group,
      townSlug: page.town_slug,
      title: page.title,
      metaDescription: page.meta_description,
      h1: page.h1,
      introParagraph: page.intro_paragraph,
      localContext: page.local_context,
      projectTips: page.project_tips,
      commonUses: page.common_uses ?? [],
      featuredProductSlugs: page.featured_product_slugs ?? [],
      calculatorType: page.calculator_type,
      relatedServiceSlug: page.related_service_slug,
      faqs,
      schemaType: page.schema_type ?? "Product",
    },
    town: {
      slug: town.slug,
      name: town.name,
      state: town.state,
      zipCodes: town.zip_codes ?? [],
      tier: town.tier,
      deliveryFeeCents: town.delivery_fee_cents,
      distanceMiles: Number(town.distance_miles),
      driveMinutes: town.drive_minutes,
    },
    products,
  };
}

export async function getServiceTownPages(): Promise<Array<{ slug: string }>> {
  const supabase = getSupabaseServerClient();
  const { data } = await supabase
    .from("service_town_pages")
    .select("slug")
    .eq("is_active", true);
  return data ?? [];
}

export async function getServiceTownPageBySlug(slug: string): Promise<{
  page: ServiceTownPage;
  town: ProductTownTownData;
  products: ProductTownFeaturedProduct[];
} | null> {
  const supabase = getSupabaseServerClient();

  const { data: page } = await supabase
    .from("service_town_pages")
    .select("*")
    .eq("slug", slug)
    .eq("is_active", true)
    .maybeSingle();

  if (!page) return null;

  const { data: town } = await supabase
    .from("town_pages")
    .select("slug, name, state, zip_codes, tier, delivery_fee_cents, distance_miles, drive_minutes")
    .eq("slug", page.town_slug)
    .maybeSingle();

  if (!town) return null;

  let products: ProductTownFeaturedProduct[] = [];
  if (page.related_product_slugs?.length > 0) {
    const { data: prods } = await supabase
      .from("products")
      .select("id, slug, name, price_per_unit_cents, unit_display, description, images, delivery_type, material_class")
      .in("slug", page.related_product_slugs)
      .eq("is_active", true);

    products = (prods ?? []).map((p) => ({
      id: p.id,
      slug: p.slug,
      name: p.name,
      pricePerUnitCents: p.price_per_unit_cents,
      unitDisplay: p.unit_display,
      description: p.description || "",
      image: (p.images as string[])?.[0] ?? FALLBACK_IMAGE,
      deliveryType: p.delivery_type,
      materialClass: p.material_class,
    }));
  }

  return {
    page: {
      id: page.id,
      slug: page.slug,
      serviceType: page.service_type,
      townSlug: page.town_slug,
      title: page.title,
      metaDescription: page.meta_description,
      h1: page.h1,
      introParagraph: page.intro_paragraph,
      localContext: page.local_context,
      servicesIncluded: page.services_included ?? [],
      relatedProductSlugs: page.related_product_slugs ?? [],
      faqs: parseFaqs(page.faqs),
      schemaType: page.schema_type ?? "Service",
    },
    town: {
      slug: town.slug,
      name: town.name,
      state: town.state,
      zipCodes: town.zip_codes ?? [],
      tier: town.tier,
      deliveryFeeCents: town.delivery_fee_cents,
      distanceMiles: Number(town.distance_miles),
      driveMinutes: town.drive_minutes,
    },
    products,
  };
}

// ─── Helpers ──────────────────────────────────────────────────────

function parseFaqs(raw: unknown): ProductTownFaq[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((item): item is { q: string; a: string } =>
      typeof item === "object" && item !== null && typeof (item as Record<string, unknown>).q === "string" && typeof (item as Record<string, unknown>).a === "string"
    )
    .map((item) => ({ q: item.q, a: item.a }));
}
