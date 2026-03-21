export const dynamic = "force-dynamic";

import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { BulkMaterialsGrid } from "@/components/shop/bulk-materials-grid";

export const metadata = {
  title: "Bulk Materials — Dump Truck Delivery | Eastern Landscape & Mason Supply",
  description: "Order mulch, topsoil, gravel, sand, and stone by the cubic yard. Dump truck delivery across Suffolk County, Long Island.",
};

export default async function BulkMaterialsPage() {
  let products: any[] = [];
  try {
    const supabase = getSupabaseAdminClient();
    const { data } = await supabase
      .from("products")
      .select("id, name, slug, price_per_unit_cents, web_price_per_unit_cents, unit_display, delivery_type, material_class, images, category_id, categories(name, slug, sort_order)")
      .eq("delivery_type", "bulk")
      .eq("visible_web", true)
      .eq("is_active", true)
      .order("sort_order")
      .order("name");
    products = (data ?? []) as any[];
  } catch {}

  return <BulkMaterialsGrid products={products} />;
}
