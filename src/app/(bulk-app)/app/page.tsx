import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { BulkCatalogView } from "@/components/bulk-app/bulk-catalog-view";

export const dynamic = "force-dynamic";

/**
 * /app — Bulk Materials Catalog (Server Component)
 * Fetches products from Supabase and renders the client-side catalog view.
 * Spec §2 (catalog grid), §8 (product interaction)
 */
export default async function BulkAppPage() {
  const supabase = getSupabaseAdminClient();

  const { data: products } = await (supabase as any)
    .from("products")
    .select(
      "id, slug, name, description, category_tag, price_per_unit_cents, ceiling_price_cents, floor_price_cents, floor_qty, default_depth_inches, depth_helper_text, local_badge, origin_story, stock_level, pair_position, pair_slug, row_order, material_class, premium_upgrade, crushed_upgrade, application_quick_selects, product_sizes(id, label, slug, price_delta_cents, sort_order)"
    )
    .eq("is_active", true)
    .eq("is_bulk_app_enabled", true)
    .order("row_order", { ascending: true });

  return <BulkCatalogView products={products ?? []} />;
}
