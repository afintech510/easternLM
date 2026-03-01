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
  { id: "fallback-mulch", name: "Mulch", slug: "mulch", description: "Dyed and natural mulch for beds, trees, and erosion control.", image: null, sortOrder: 1 },
  { id: "fallback-topsoil", name: "Topsoil", slug: "topsoil", description: "Screened soils for lawns, grading, and planting work.", image: null, sortOrder: 2 },
  { id: "fallback-gravel-stone", name: "Gravel & Stone", slug: "gravel-stone", description: "Crushed stone blends for drainage, driveways, and bases.", image: null, sortOrder: 3 },
  { id: "fallback-sand", name: "Sand", slug: "sand", description: "Masonry and leveling sand for patios, pavers, and concrete prep.", image: null, sortOrder: 4 },
  { id: "fallback-natural-stone", name: "Natural Stone", slug: "natural-stone", description: "Decorative and structural stone for custom outdoor projects.", image: null, sortOrder: 5 },
  { id: "fallback-pavers", name: "Pavers", slug: "pavers", description: "Concrete and stone pavers for patios, walkways, and hardscapes.", image: null, sortOrder: 6 },
  { id: "fallback-concrete-supplies", name: "Concrete Supplies", slug: "concrete-supplies", description: "Concrete-ready products and reinforcement for structural work.", image: null, sortOrder: 7 },
  { id: "fallback-mason-supplies", name: "Mason Supplies", slug: "mason-supplies", description: "Cement, mix, and essentials for masonry and hardscape installs.", image: null, sortOrder: 8 },
];

const fallbackProducts: ShopProduct[] = [
  {
    id: "fallback-black-dyed-mulch",
    name: "Black Dyed Mulch",
    slug: "black-dyed-mulch",
    categoryId: "fallback-mulch",
    categorySlug: "mulch",
    categoryName: "Mulch",
    deliveryType: "bulk",
    materialClass: "mulch",
    pricePerUnitCents: 4200,
    unit: "yard",
    unitDisplay: "per cubic yard",
    description: "Long-lasting dyed mulch for curb appeal and moisture retention.",
    images: ["https://images.unsplash.com/photo-1473448912268-2022ce9509d8"],
    recommendedUses: ["Plant beds", "Tree rings", "Erosion control"],
    pairsWellWith: ["hemlock-mulch", "landscape-fabric-roll"],
    minQty: 1,
    maxQty: 30,
    stepQty: 0.5,
    sortOrder: 1,
  },
  {
    id: "fallback-hemlock-mulch",
    name: "Hemlock Mulch",
    slug: "hemlock-mulch",
    categoryId: "fallback-mulch",
    categorySlug: "mulch",
    categoryName: "Mulch",
    deliveryType: "bulk",
    materialClass: "mulch",
    pricePerUnitCents: 5100,
    unit: "yard",
    unitDisplay: "per cubic yard",
    description: "Premium natural mulch with rich color and clean texture.",
    images: ["https://images.unsplash.com/photo-1492496913980-501348b61469"],
    recommendedUses: ["Decorative beds", "Foundation planting", "Seasonal refresh"],
    pairsWellWith: ["black-dyed-mulch", "landscape-fabric-roll"],
    minQty: 1,
    maxQty: 30,
    stepQty: 0.5,
    sortOrder: 2,
  },
  {
    id: "fallback-screened-topsoil",
    name: "Screened Topsoil",
    slug: "screened-topsoil",
    categoryId: "fallback-topsoil",
    categorySlug: "topsoil",
    categoryName: "Topsoil",
    deliveryType: "bulk",
    materialClass: "default",
    pricePerUnitCents: 3900,
    unit: "yard",
    unitDisplay: "per cubic yard",
    description: "Clean screened topsoil for lawn prep, grading, and planting.",
    images: ["https://images.unsplash.com/photo-1591638844332-d79f111b11f8"],
    recommendedUses: ["Lawn installation", "Backfill", "Garden beds"],
    pairsWellWith: ["compost-blend-topsoil", "straw-bale"],
    minQty: 1,
    maxQty: 35,
    stepQty: 0.5,
    sortOrder: 3,
  },
  {
    id: "fallback-three-quarter-crushed-bluestone",
    name: "3/4 Crushed Bluestone",
    slug: "three-quarter-crushed-bluestone",
    categoryId: "fallback-gravel-stone",
    categorySlug: "gravel-stone",
    categoryName: "Gravel & Stone",
    deliveryType: "bulk",
    materialClass: "default",
    pricePerUnitCents: 5200,
    unit: "yard",
    unitDisplay: "per cubic yard",
    description: "Compacting aggregate for driveways and base layers.",
    images: ["https://images.unsplash.com/photo-1518987048-93e29699f29b"],
    recommendedUses: ["Driveway base", "Walkway base", "Drainage"],
    pairsWellWith: ["mason-sand", "landscape-fabric-roll"],
    minQty: 1,
    maxQty: 30,
    stepQty: 0.5,
    sortOrder: 4,
  },
  {
    id: "fallback-mason-sand",
    name: "Mason Sand",
    slug: "mason-sand",
    categoryId: "fallback-sand",
    categorySlug: "sand",
    categoryName: "Sand",
    deliveryType: "bulk",
    materialClass: "default",
    pricePerUnitCents: 4500,
    unit: "yard",
    unitDisplay: "per cubic yard",
    description: "Fine clean sand for paver bedding and masonry applications.",
    images: ["https://images.unsplash.com/photo-1552298223-1f5fbb79ff8d"],
    recommendedUses: ["Paver bedding", "Masonry mixing", "Leveling"],
    pairsWellWith: ["three-quarter-crushed-bluestone", "concrete-mix"],
    minQty: 1,
    maxQty: 25,
    stepQty: 0.5,
    sortOrder: 5,
  },
  {
    id: "fallback-pennsylvania-fieldstone",
    name: "Pennsylvania Fieldstone",
    slug: "pennsylvania-fieldstone",
    categoryId: "fallback-natural-stone",
    categorySlug: "natural-stone",
    categoryName: "Natural Stone",
    deliveryType: "non-bulk",
    materialClass: "default",
    pricePerUnitCents: 985,
    unit: "sqft",
    unitDisplay: "per square foot",
    description: "Natural fieldstone for walls, edging, and outdoor accents.",
    images: ["https://images.unsplash.com/photo-1504309092620-4d0ec726efa4"],
    recommendedUses: ["Garden walls", "Stone borders", "Landscape accents"],
    pairsWellWith: ["type-s-mortar-mix", "edging-block"],
    minQty: 25,
    maxQty: 400,
    stepQty: 5,
    sortOrder: 6,
  },
  {
    id: "fallback-cambridge-pavers-sahara-chestnut",
    name: "Cambridge Pavers - Sahara Chestnut",
    slug: "cambridge-pavers-sahara-chestnut",
    categoryId: "fallback-pavers",
    categorySlug: "pavers",
    categoryName: "Pavers",
    deliveryType: "non-bulk",
    materialClass: "default",
    pricePerUnitCents: 825,
    unit: "sqft",
    unitDisplay: "per square foot",
    description: "Durable concrete paver system for patios and walkways.",
    images: ["https://images.unsplash.com/photo-1600566753376-12c8ab7fb75b"],
    recommendedUses: ["Patios", "Walkways", "Pool surrounds"],
    pairsWellWith: ["polymeric-sand", "edging-block"],
    minQty: 50,
    maxQty: 3000,
    stepQty: 10,
    sortOrder: 7,
  },
  {
    id: "fallback-concrete-mix",
    name: "Concrete Mix (80lb)",
    slug: "concrete-mix",
    categoryId: "fallback-concrete-supplies",
    categorySlug: "concrete-supplies",
    categoryName: "Concrete Supplies",
    deliveryType: "non-bulk",
    materialClass: "default",
    pricePerUnitCents: 799,
    unit: "bag",
    unitDisplay: "per 80lb bag",
    description: "High-strength concrete mix for slabs, posts, and patching work.",
    images: ["https://images.unsplash.com/photo-1581092795360-fd1ca04f0952"],
    recommendedUses: ["Footings", "Post setting", "General concrete repair"],
    pairsWellWith: ["rebar-3-8-inch", "wire-mesh-roll"],
    minQty: 1,
    maxQty: 400,
    stepQty: 1,
    sortOrder: 8,
  },
  {
    id: "fallback-type-s-mortar-mix",
    name: "Type S Mortar Mix (80lb)",
    slug: "type-s-mortar-mix",
    categoryId: "fallback-mason-supplies",
    categorySlug: "mason-supplies",
    categoryName: "Mason Supplies",
    deliveryType: "non-bulk",
    materialClass: "default",
    pricePerUnitCents: 999,
    unit: "bag",
    unitDisplay: "per 80lb bag",
    description: "General-purpose mortar mix for block, brick, and stone setting.",
    images: ["https://images.unsplash.com/photo-1504711434969-e33886168f5c"],
    recommendedUses: ["Block walls", "Stone veneer", "Brick repair"],
    pairsWellWith: ["pennsylvania-fieldstone", "bluestone-treads"],
    minQty: 1,
    maxQty: 400,
    stepQty: 1,
    sortOrder: 9,
  },
  {
    id: "fallback-polymeric-sand",
    name: "Polymeric Sand",
    slug: "polymeric-sand",
    categoryId: "fallback-mason-supplies",
    categorySlug: "mason-supplies",
    categoryName: "Mason Supplies",
    deliveryType: "non-bulk",
    materialClass: "default",
    pricePerUnitCents: 3599,
    unit: "bag",
    unitDisplay: "per bag",
    description: "Jointing sand for interlock pavers that resists washout and weeds.",
    images: ["https://images.unsplash.com/photo-1441974231531-c6227db76b6e"],
    recommendedUses: ["Paver joints", "Walkway joints", "Patio joints"],
    pairsWellWith: ["cambridge-pavers-sahara-chestnut", "nicolock-pavers-granite-city"],
    minQty: 1,
    maxQty: 250,
    stepQty: 1,
    sortOrder: 10,
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
    const supabase = getSupabaseServerClient();

    const [categoriesResult, productsResult] = await Promise.all([
      supabase
        .from("categories")
        .select("id, name, slug, image, sort_order")
        .eq("is_active", true)
        .order("sort_order", { ascending: true }),
      supabase
        .from("products")
        .select(
          "id, name, slug, category_id, delivery_type, material_class, price_per_unit_cents, unit, unit_display, description, images, recommended_uses, pairs_well_with, min_qty, max_qty, step_qty, sort_order",
        )
        .eq("is_active", true)
        .order("sort_order", { ascending: true }),
    ]);

    if (categoriesResult.error) {
      throw categoriesResult.error;
    }

    if (productsResult.error) {
      throw productsResult.error;
    }

    const categoryDescriptionMap = new Map(featuredCategories.map((category) => [category.slug, category.description]));
    const categoryById = new Map(
      categoriesResult.data.map((category) => [
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

    const mappedProducts: ShopProduct[] = productsResult.data
      .map((product) => {
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
          pricePerUnitCents: product.price_per_unit_cents,
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
      .filter((value): value is ShopProduct => value !== null);

    const filteredProducts = options.categorySlug
      ? mappedProducts.filter((product) => product.categorySlug === options.categorySlug)
      : mappedProducts;

    return {
      source: "supabase",
      categories: categoriesResult.data.map((category) => categoryById.get(category.id) as ShopCategory),
      products: sortProducts(filteredProducts, selectedSort),
    };
  } catch {
    return mapFallbackCatalog(options);
  }
}

export async function getShopProductBySlug(slug: string): Promise<ProductDetailBundle | null> {
  try {
    const supabase = getSupabaseServerClient();

    const [productResult, categoriesResult] = await Promise.all([
      supabase
        .from("products")
        .select(
          "id, name, slug, category_id, delivery_type, material_class, price_per_unit_cents, unit, unit_display, description, images, recommended_uses, pairs_well_with, min_qty, max_qty, step_qty, sort_order",
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

    const categories: ShopCategory[] = categoriesResult.data.map((category) => ({
      id: category.id,
      name: category.name,
      slug: category.slug,
      image: category.image,
      sortOrder: category.sort_order,
      description: categoryDescriptionMap.get(category.slug) ?? "Material options available in this category.",
    }));
    const categoryById = new Map(categories.map((category) => [category.id, category]));
    const productCategory = categoryById.get(productResult.data.category_id);

    if (!productCategory) {
      return mapFallbackProductDetail(slug);
    }

    const product: ShopProduct = {
      id: productResult.data.id,
      name: productResult.data.name,
      slug: productResult.data.slug,
      categoryId: productResult.data.category_id,
      categorySlug: productCategory.slug,
      categoryName: productCategory.name,
      deliveryType: coerceDeliveryType(productResult.data.delivery_type),
      materialClass: coerceMaterialClass(productResult.data.material_class),
      pricePerUnitCents: productResult.data.price_per_unit_cents,
      unit: productResult.data.unit,
      unitDisplay: productResult.data.unit_display,
      description: productResult.data.description,
      images: productResult.data.images ?? [],
      recommendedUses: productResult.data.recommended_uses ?? [],
      pairsWellWith: productResult.data.pairs_well_with ?? [],
      minQty: Number(productResult.data.min_qty),
      maxQty: Number(productResult.data.max_qty),
      stepQty: Number(productResult.data.step_qty),
      sortOrder: productResult.data.sort_order,
    };

    let relatedProducts: ShopProduct[] = [];
    if (product.pairsWellWith.length > 0) {
      const relatedResult = await supabase
        .from("products")
        .select(
          "id, name, slug, category_id, delivery_type, material_class, price_per_unit_cents, unit, unit_display, description, images, recommended_uses, pairs_well_with, min_qty, max_qty, step_qty, sort_order",
        )
        .eq("is_active", true)
        .in("slug", product.pairsWellWith)
        .order("sort_order", { ascending: true });

      if (!relatedResult.error) {
        relatedProducts = relatedResult.data
          .map((related) => {
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
              pricePerUnitCents: related.price_per_unit_cents,
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
          .filter((value): value is ShopProduct => value !== null);
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
