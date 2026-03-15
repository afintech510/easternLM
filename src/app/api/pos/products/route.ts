import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  const supabase = getSupabaseAdminClient();

  const { data: products } = await supabase
    .from("products")
    .select("id, name, slug, price_per_unit_cents, delivery_type, min_qty, category_id, categories(slug, name)")
    .eq("visible_pos", true)
    .order("name");

  const mapped = (products || []).map((p) => ({
    id: p.id,
    name: p.name,
    slug: p.slug,
    price_per_unit_cents: p.price_per_unit_cents,
    unit_label: p.delivery_type === "bulk" ? "yd" : "ea",
    delivery_type: p.delivery_type,
    min_qty: p.min_qty || 1,
    qty_step: p.delivery_type === "bulk" ? 0.5 : 1,
    category_slug: (p.categories as { slug: string; name: string } | null)?.slug || "other",
    category_name: (p.categories as { slug: string; name: string } | null)?.name || "Other",
  }));

  // Build category list with counts
  const catMap = new Map<string, { slug: string; name: string; count: number }>();
  for (const p of mapped) {
    const existing = catMap.get(p.category_slug);
    if (existing) existing.count++;
    else catMap.set(p.category_slug, { slug: p.category_slug, name: p.category_name, count: 1 });
  }

  return NextResponse.json({
    products: mapped,
    categories: Array.from(catMap.values()).sort((a, b) => b.count - a.count),
  });
}
