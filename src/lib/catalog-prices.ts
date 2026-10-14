import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import type { CartItem } from "@/lib/delivery";

/**
 * Authoritative web prices from the `products` table.
 *
 * Cart items carry a client-side unitPriceCents (calculators, persisted carts,
 * shared cart links). Anything whose id is a product UUID or product slug is
 * repriced from the catalog so stale/hardcoded prices can never reach an order.
 */

export type CatalogPrice = {
  productId: string;
  slug: string;
  name: string;
  unitPriceCents: number;
  deliveryType: CartItem["deliveryType"];
  materialClass: CartItem["materialClass"];
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type ProductRow = {
  id: string;
  slug: string;
  name: string;
  price_per_unit_cents: number;
  web_price_per_unit_cents: number | null;
  delivery_type: string | null;
  material_class: string | null;
};

function toCatalogPrice(p: ProductRow): CatalogPrice {
  return {
    productId: p.id,
    slug: p.slug,
    name: p.name,
    unitPriceCents: p.web_price_per_unit_cents ?? p.price_per_unit_cents,
    deliveryType: p.delivery_type === "bulk" ? "bulk" : "non-bulk",
    materialClass: p.material_class === "mulch" ? "mulch" : "default",
  };
}

/** Look up catalog prices keyed by the id or slug that was passed in. */
export async function lookupCatalogPrices(keys: string[]): Promise<Map<string, CatalogPrice>> {
  const unique = [...new Set(keys.filter(Boolean))];
  const ids = unique.filter((k) => UUID_RE.test(k));
  const slugs = unique.filter((k) => !UUID_RE.test(k));
  const result = new Map<string, CatalogPrice>();
  if (unique.length === 0) return result;

  const supabase = getSupabaseAdminClient();
  const cols = "id, slug, name, price_per_unit_cents, web_price_per_unit_cents, delivery_type, material_class";
  const fetchBy = async (column: "id" | "slug", values: string[]): Promise<ProductRow[]> => {
    if (values.length === 0) return [];
    const { data, error } = await supabase.from("products").select(cols).in(column, values);
    if (error) throw new Error(`Catalog price lookup failed: ${error.message}`);
    return (data ?? []) as ProductRow[];
  };
  const [byId, bySlug] = await Promise.all([fetchBy("id", ids), fetchBy("slug", slugs)]);

  for (const row of byId) result.set(row.id, toCatalogPrice(row));
  for (const row of bySlug) result.set(row.slug, toCatalogPrice(row));
  return result;
}

/**
 * Replace client prices with catalog prices. Items that don't map to a product
 * (install services, delivery add-ons, reorders) are returned unchanged.
 */
export async function repriceCartItems<T extends CartItem>(
  items: T[],
): Promise<Array<T & { productId: string | null }>> {
  const prices = await lookupCatalogPrices(items.map((i) => i.id));
  return items.map((item) => {
    const p = prices.get(item.id);
    if (!p) return { ...item, productId: null };
    return {
      ...item,
      productId: p.productId,
      unitPriceCents: p.unitPriceCents,
      deliveryType: p.deliveryType,
      materialClass: p.materialClass,
    };
  });
}
