import { featuredCategories } from "@/config/content";
import type { DeliveryType, MaterialClass } from "@/lib/delivery";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export type ShopCategory = {
  id: string;
  name: string;
  slug: string;
  description: string;
  image: string | null;
  sortOrder: number;
};

export type ShopProduct = {
  id: string;
  name: string;
  slug: string;
  categoryId: string;
  categorySlug: string;
  categoryName: string;
  deliveryType: DeliveryType;
  materialClass: MaterialClass;
  pricePerUnitCents: number;
  unit: string;
  unitDisplay: string;
  description: string;
  images: string[];
  recommendedUses: string[];
  pairsWellWith: string[];
  minQty: number;
  maxQty: number;
  stepQty: number;
  sortOrder: number;
  wcId?: number | null;
  priceNote?: string;
};

export type ShopCatalog = {
  source: "supabase" | "fallback";
  categories: ShopCategory[];
  products: ShopProduct[];
};

export type ShopSortOption = "popular" | "price-asc" | "price-desc" | "name-asc";

export type GetShopCatalogOptions = {
  categorySlug?: string;
  sort?: ShopSortOption;
};

export type ProductDetailBundle = {
  source: "supabase" | "fallback";
  product: ShopProduct;
  relatedProducts: ShopProduct[];
  categories: ShopCategory[];
};

function coerceDeliveryType(value: string): DeliveryType {
  return value === "non-bulk" ? "non-bulk" : "bulk";
}

function coerceMaterialClass(value: string): MaterialClass {
  return value === "mulch" ? "mulch" : "default";
}

function sortProducts(products: ShopProduct[], sort: ShopSortOption) {
  const sorted = [...products];

  if (sort === "price-asc") {
    sorted.sort((a, b) => a.pricePerUnitCents - b.pricePerUnitCents);
    return sorted;
  }

  if (sort === "price-desc") {
    sorted.sort((a, b) => b.pricePerUnitCents - a.pricePerUnitCents);
    return sorted;
  }

  if (sort === "name-asc") {
    sorted.sort((a, b) => a.name.localeCompare(b.name));
    return sorted;
  }

  sorted.sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));
  return sorted;
}

const fallbackCategories: ShopCategory[] = [
  { id: "fallback-mulch", name: "Mulch", slug: "mulch", description: "Dyed and natural bulk mulch for beds, trees, and erosion control.", image: null, sortOrder: 1 },
  { id: "fallback-topsoil-fill", name: "Topsoil & Fill", slug: "topsoil-fill", description: "Screened topsoil, compost, clean fill, and bank run for grading and planting.", image: null, sortOrder: 2 },
  { id: "fallback-base", name: "Base", slug: "base", description: "Crusher run, RCA, Item 4, and process for driveways, foundations, and base courses.", image: null, sortOrder: 3 },
  { id: "fallback-gravel-stone", name: "Gravel & Stone", slug: "gravel-stone", description: "Bulk crushed stone, gravel, and aggregate for driveways, drainage, and bases.", image: null, sortOrder: 4 },
  { id: "fallback-sand", name: "Sand", slug: "sand", description: "Fine mason sand and concrete sand for patios, pavers, and concrete prep.", image: null, sortOrder: 4 },
  { id: "fallback-natural-stone", name: "Natural Stone", slug: "natural-stone", description: "Flagstone, cobblestone, boulders, steppers, treads, and veneer stone.", image: null, sortOrder: 5 },
  { id: "fallback-masonry-concrete", name: "Masonry & Concrete", slug: "masonry-concrete", description: "Cement blocks, brick, mortar, portland, concrete mix, rebar, and reinforcement.", image: null, sortOrder: 6 },
  { id: "fallback-pavers", name: "Pavers & Hardscape", slug: "pavers", description: "Cambridge, Nicolock pavers, polymeric sand, and paver accessories.", image: null, sortOrder: 7 },
  { id: "fallback-bagged-material", name: "Bagged Materials", slug: "bagged-material", description: "Bagged mulch, soil, gravel, salt, and bucket-size materials for small projects.", image: null, sortOrder: 8 },
  { id: "fallback-tools", name: "Tools & Supplies", slug: "tools", description: "Masonry tools, blades, levels, trowels, shovels, and job site essentials.", image: null, sortOrder: 9 },
  { id: "fallback-chemicals", name: "Chemicals & Sealers", slug: "chemicals", description: "Paver sealers, cleaners, stain removers, cement color, and muriatic acid.", image: null, sortOrder: 10 },
  { id: "fallback-landscape", name: "Landscape & Drainage", slug: "landscape", description: "Weed fabric, edging, drain covers, drainage rock, and landscape accessories.", image: null, sortOrder: 11 },
  { id: "fallback-outdoor-living", name: "Outdoor Living", slug: "outdoor-living", description: "Propane fills, firewood, grass seed, and outdoor fireplace units.", image: null, sortOrder: 12 },
  { id: "fallback-rentals-services", name: "Rentals & Services", slug: "rentals-services", description: "Dump trailer rental, mulch installation, dumping fees, and delivery services.", image: null, sortOrder: 13 },
];

const fallbackProducts: ShopProduct[] = [
  {
    id: "fallback-black-mulch",
    name: "Black Mulch",
    slug: "black-mulch",
    categoryId: "fallback-mulch",
    categorySlug: "mulch",
    categoryName: "Mulch",
    deliveryType: "bulk",
    materialClass: "mulch",
    pricePerUnitCents: 3000,
    unit: "yard",
    unitDisplay: "per cubic yard",
    description: "Premium black dyed mulch for curb appeal and moisture retention.",
    images: ["https://easternbuilding.supply/wp-content/uploads/2023/04/black-mulch-pile.jpg"],
    recommendedUses: ["Plant beds", "Tree rings", "Erosion control"],
    pairsWellWith: ["dark-natural-mulch"],
    minQty: 0.5,
    maxQty: 30,
    stepQty: 0.5,
    sortOrder: 10,
  },
  {
    id: "fallback-dark-natural-mulch",
    name: "Dark Natural Mulch",
    slug: "dark-natural-mulch",
    categoryId: "fallback-mulch",
    categorySlug: "mulch",
    categoryName: "Mulch",
    deliveryType: "bulk",
    materialClass: "mulch",
    pricePerUnitCents: 2000,
    unit: "yard",
    unitDisplay: "per cubic yard",
    description: "Brown natural mulch, no dye.",
    images: ["https://easternbuilding.supply/wp-content/uploads/2023/04/dark-natural-mulch.jpg"],
    recommendedUses: ["Decorative beds", "Foundation planting"],
    pairsWellWith: ["black-mulch"],
    minQty: 0.5,
    maxQty: 30,
    stepQty: 0.5,
    sortOrder: 10,
  },
  {
    id: "fallback-topsoil-screened-organic",
    name: "Topsoil, Screened Organic",
    slug: "topsoil-screened-organic",
    categoryId: "fallback-topsoil-fill",
    categorySlug: "topsoil-fill",
    categoryName: "Topsoil & Fill",
    deliveryType: "bulk",
    materialClass: "default",
    pricePerUnitCents: 2400,
    unit: "yard",
    unitDisplay: "per cubic yard",
    description: "Nutrient-rich organic soil with optimal blend of sand, silt, and clay.",
    images: ["https://easternbuilding.supply/wp-content/uploads/2023/04/topsoil-pile_929.jpg"],
    recommendedUses: ["Lawn installation", "Backfill", "Garden beds"],
    pairsWellWith: ["compost-certified-organic-rich-in-nutrients"],
    minQty: 0.5,
    maxQty: 30,
    stepQty: 0.5,
    sortOrder: 10,
  },
  {
    id: "fallback-34-inch-bluestone",
    name: '3/4" Bluestone',
    slug: "34-inch-bluestone",
    categoryId: "fallback-gravel-stone",
    categorySlug: "gravel-stone",
    categoryName: "Gravel & Stone",
    deliveryType: "bulk",
    materialClass: "default",
    pricePerUnitCents: 8800,
    unit: "yard",
    unitDisplay: "per cubic yard",
    description: "Natural, durable bluestone for decorative features and base layers.",
    images: ["https://easternbuilding.supply/wp-content/uploads/2023/05/blue-stone-3-4.jpg"],
    recommendedUses: ["Driveway base", "Walkway base", "Drainage"],
    pairsWellWith: ["fine-sand"],
    minQty: 0.5,
    maxQty: 30,
    stepQty: 0.5,
    sortOrder: 10,
  },
  {
    id: "fallback-fine-sand",
    name: "Fine Sand",
    slug: "fine-sand",
    categoryId: "fallback-sand",
    categorySlug: "sand",
    categoryName: "Sand",
    deliveryType: "bulk",
    materialClass: "default",
    pricePerUnitCents: 6000,
    unit: "yard",
    unitDisplay: "per cubic yard",
    description: "Fine sand for leveling surfaces, filling between pavers, or as base layer.",
    images: ["https://easternbuilding.supply/wp-content/uploads/2023/04/fine-mason-sand.jpg"],
    recommendedUses: ["Paver bedding", "Masonry mixing", "Leveling"],
    pairsWellWith: ["34-inch-bluestone"],
    minQty: 0.5,
    maxQty: 30,
    stepQty: 0.5,
    sortOrder: 10,
  },
  {
    id: "fallback-sakrete-concrete-mix",
    name: "Sakrete Concrete Mix (80lbs.)",
    slug: "sakrete-concrete-mix-80lbs",
    categoryId: "fallback-masonry-concrete",
    categorySlug: "masonry-concrete",
    categoryName: "Masonry & Concrete",
    deliveryType: "non-bulk",
    materialClass: "default",
    pricePerUnitCents: 825,
    unit: "each",
    unitDisplay: "each",
    description: "High-strength concrete mix for slabs, posts, and patching work.",
    images: ["https://easternbuilding.supply/wp-content/uploads/2023/04/sakrete-concrete-mix-80lbs-12.jpg"],
    recommendedUses: ["Footings", "Post setting", "General concrete repair"],
    pairsWellWith: ["rebar-12-inch-4"],
    minQty: 1,
    maxQty: 100,
    stepQty: 1,
    sortOrder: 100,
  },
  {
    id: "fallback-mortar-type-s",
    name: "Mortar Type S (75lbs.)",
    slug: "mortar-type-s-75lbs",
    categoryId: "fallback-masonry-concrete",
    categorySlug: "masonry-concrete",
    categoryName: "Masonry & Concrete",
    deliveryType: "non-bulk",
    materialClass: "default",
    pricePerUnitCents: 1300,
    unit: "each",
    unitDisplay: "each",
    description: "High-strength mortar for block, brick, and stone setting.",
    images: ["https://easternbuilding.supply/wp-content/uploads/2023/04/lehigh-masonry-cement-type-s-9.jpg"],
    recommendedUses: ["Block walls", "Stone veneer", "Brick repair"],
    pairsWellWith: [],
    minQty: 1,
    maxQty: 100,
    stepQty: 1,
    sortOrder: 100,
  },
  {
    id: "fallback-poly-sweep-tan",
    name: "Poly Sweep - Tan",
    slug: "poly-sweep-tan",
    categoryId: "fallback-pavers",
    categorySlug: "pavers",
    categoryName: "Pavers & Hardscape",
    deliveryType: "non-bulk",
    materialClass: "default",
    pricePerUnitCents: 2800,
    unit: "each",
    unitDisplay: "each",
    description: "Polymeric sand for paver joints that resists washout and weeds.",
    images: ["https://easternbuilding.supply/wp-content/uploads/2023/04/polymeric-sand-gator-maxx-alliance-beige.jpg"],
    recommendedUses: ["Paver joints", "Walkway joints", "Patio joints"],
    pairsWellWith: [],
    minQty: 1,
    maxQty: 100,
    stepQty: 1,
    sortOrder: 100,
  },
];

function mapFallbackCatalog(options: GetShopCatalogOptions = {}): ShopCatalog {
  const selectedSort: ShopSortOption = options.sort ?? "popular";
  const filteredProducts = options.categorySlug
    ? fallbackProducts.filter((product) => product.categorySlug === options.categorySlug)
    : fallbackProducts;

  return {
    source: "fallback",
    categories: fallbackCategories,
    products: sortProducts(filteredProducts, selectedSort),
  };
}

function mapFallbackProductDetail(slug: string): ProductDetailBundle | null {
  const catalog = mapFallbackCatalog();
  const product = catalog.products.find((item) => item.slug === slug);
  if (!product) {
    return null;
  }

  const relatedProducts = catalog.products.filter((item) => product.pairsWellWith.includes(item.slug));
  return {
    source: "fallback",
    product,
    relatedProducts,
    categories: catalog.categories,
  };
}

export async function getShopCatalog(options: GetShopCatalogOptions = {}): Promise<ShopCatalog> {
  const selectedSort: ShopSortOption = options.sort ?? "popular";

  try {
    const supabase = getSupabaseServerClient() as any;

    const [categoriesResult, productsResult] = await Promise.all([
      supabase
        .from("categories")
        .select("id, name, slug, image, sort_order")
        .eq("is_active", true)
        .order("sort_order", { ascending: true }),
      supabase
        .from("products")
        .select(
          "id, name, slug, category_id, delivery_type, material_class, price_per_unit_cents, web_price_per_unit_cents, unit, unit_display, description, images, recommended_uses, pairs_well_with, min_qty, max_qty, step_qty, sort_order",
        )
        .eq("visible_web", true)
        .order("sort_order", { ascending: true }),
    ]);

    if (categoriesResult.error) {
      throw categoriesResult.error;
    }

    if (productsResult.error) {
      throw productsResult.error;
    }

    const categoryDescriptionMap = new Map(featuredCategories.map((category) => [category.slug, category.description]));
    const cats: any[] = categoriesResult.data ?? [];
    const prods: any[] = productsResult.data ?? [];
    const categoryById = new Map(
      cats.map((category: any) => [
        category.id,
        {
          id: category.id,
          name: category.name,
          slug: category.slug,
          image: category.image,
          sortOrder: category.sort_order,
          description:
            categoryDescriptionMap.get(category.slug) ?? "Material options available in this category.",
        } satisfies ShopCategory,
      ]),
    );

    const mappedProducts: ShopProduct[] = prods
      .map((product: any) => {
        const category = categoryById.get(product.category_id);
        if (!category) {
          return null;
        }

        return {
          id: product.id,
          name: product.name,
          slug: product.slug,
          categoryId: product.category_id,
          categorySlug: category.slug,
          categoryName: category.name,
          deliveryType: coerceDeliveryType(product.delivery_type),
          materialClass: coerceMaterialClass(product.material_class),
          pricePerUnitCents: product.web_price_per_unit_cents ?? product.price_per_unit_cents,
          unit: product.unit,
          unitDisplay: product.unit_display,
          description: product.description,
          images: product.images ?? [],
          recommendedUses: product.recommended_uses ?? [],
          pairsWellWith: product.pairs_well_with ?? [],
          minQty: Number(product.min_qty),
          maxQty: Number(product.max_qty),
          stepQty: Number(product.step_qty),
          sortOrder: product.sort_order,
        } satisfies ShopProduct;
      })
      .filter((value: any): value is ShopProduct => value !== null);

    const filteredProducts = options.categorySlug
      ? mappedProducts.filter((product) => product.categorySlug === options.categorySlug)
      : mappedProducts;

    // Only include categories that have at least one visible_web product
    const categorySlugsWithProducts = new Set(mappedProducts.map((p) => p.categorySlug));
    const visibleCategories = cats
      .map((category: any) => categoryById.get(category.id) as ShopCategory)
      .filter((cat: any) => categorySlugsWithProducts.has(cat.slug));

    return {
      source: "supabase",
      categories: visibleCategories,
      products: sortProducts(filteredProducts, selectedSort),
    };
  } catch {
    return mapFallbackCatalog(options);
  }
}

export async function getShopProductBySlug(slug: string): Promise<ProductDetailBundle | null> {
  try {
    const supabase = getSupabaseServerClient() as any;

    const [productResult, categoriesResult] = await Promise.all([
      supabase
        .from("products")
        .select(
          "id, name, slug, category_id, delivery_type, material_class, price_per_unit_cents, web_price_per_unit_cents, unit, unit_display, description, images, recommended_uses, pairs_well_with, min_qty, max_qty, step_qty, sort_order",
        )
        .eq("is_active", true)
        .eq("slug", slug)
        .maybeSingle(),
      supabase
        .from("categories")
        .select("id, name, slug, image, sort_order")
        .eq("is_active", true)
        .order("sort_order", { ascending: true }),
    ]);

    if (productResult.error || !productResult.data || categoriesResult.error) {
      return mapFallbackProductDetail(slug);
    }

    const categoryDescriptionMap = new Map(
      featuredCategories.map((category) => [category.slug, category.description]),
    );

    const detailCats: any[] = categoriesResult.data ?? [];
    const categories: ShopCategory[] = detailCats.map((category: any) => ({
      id: category.id,
      name: category.name,
      slug: category.slug,
      image: category.image,
      sortOrder: category.sort_order,
      description: categoryDescriptionMap.get(category.slug) ?? "Material options available in this category.",
    }));
    const categoryById = new Map(categories.map((category) => [category.id, category]));
    const pd: any = productResult.data;
    const productCategory = categoryById.get(pd.category_id);

    if (!productCategory) {
      return mapFallbackProductDetail(slug);
    }

    const product: ShopProduct = {
      id: pd.id,
      name: pd.name,
      slug: pd.slug,
      categoryId: pd.category_id,
      categorySlug: productCategory.slug,
      categoryName: productCategory.name,
      deliveryType: coerceDeliveryType(pd.delivery_type),
      materialClass: coerceMaterialClass(pd.material_class),
      pricePerUnitCents: pd.web_price_per_unit_cents ?? pd.price_per_unit_cents,
      unit: pd.unit,
      unitDisplay: pd.unit_display,
      description: pd.description,
      images: pd.images ?? [],
      recommendedUses: pd.recommended_uses ?? [],
      pairsWellWith: pd.pairs_well_with ?? [],
      minQty: Number(pd.min_qty),
      maxQty: Number(pd.max_qty),
      stepQty: Number(pd.step_qty),
      sortOrder: pd.sort_order,
    };

    let relatedProducts: ShopProduct[] = [];
    if (product.pairsWellWith.length > 0) {
      const relatedResult = await supabase
        .from("products")
        .select(
          "id, name, slug, category_id, delivery_type, material_class, price_per_unit_cents, web_price_per_unit_cents, unit, unit_display, description, images, recommended_uses, pairs_well_with, min_qty, max_qty, step_qty, sort_order",
        )
        .eq("visible_web", true)
        .in("slug", product.pairsWellWith)
        .order("sort_order", { ascending: true });

      if (!relatedResult.error) {
        const relatedData: any[] = relatedResult.data ?? [];
        relatedProducts = relatedData
          .map((related: any) => {
            const category = categoryById.get(related.category_id);
            if (!category) {
              return null;
            }

            return {
              id: related.id,
              name: related.name,
              slug: related.slug,
              categoryId: related.category_id,
              categorySlug: category.slug,
              categoryName: category.name,
              deliveryType: coerceDeliveryType(related.delivery_type),
              materialClass: coerceMaterialClass(related.material_class),
              pricePerUnitCents: related.web_price_per_unit_cents ?? related.price_per_unit_cents,
              unit: related.unit,
              unitDisplay: related.unit_display,
              description: related.description,
              images: related.images ?? [],
              recommendedUses: related.recommended_uses ?? [],
              pairsWellWith: related.pairs_well_with ?? [],
              minQty: Number(related.min_qty),
              maxQty: Number(related.max_qty),
              stepQty: Number(related.step_qty),
              sortOrder: related.sort_order,
            } satisfies ShopProduct;
          })
          .filter((value: any): value is ShopProduct => value !== null);
      }
    }

    return {
      source: "supabase",
      product,
      relatedProducts,
      categories,
    };
  } catch {
    return mapFallbackProductDetail(slug);
  }
}
