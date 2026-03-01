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

function mapFallbackCatalog(): ShopCatalog {
  const fallbackCategories: ShopCategory[] = featuredCategories.map((category, index) => ({
    id: `fallback-${index + 1}`,
    name: category.name,
    slug: category.slug,
    description: category.description,
    image: null,
    sortOrder: index + 1,
  }));

  return {
    source: "fallback",
    categories: fallbackCategories,
    products: [],
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

    const categoryDescriptionMap = new Map(
      featuredCategories.map((category) => [category.slug, category.description]),
    );
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
    return mapFallbackCatalog();
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
      return null;
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
      return null;
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
    return null;
  }
}
