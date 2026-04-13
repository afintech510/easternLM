import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

/**
 * GET /api/installation-pricing?category=mulch
 * Public endpoint — returns installation pricing for a material category.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const category = searchParams.get("category");

  const supabase = getSupabaseAdminClient() as any;

  if (category) {
    const { data } = await supabase
      .from("installation_pricing")
      .select("*")
      .eq("material_category", category)
      .eq("is_active", true)
      .single();

    return NextResponse.json({ pricing: data ?? null });
  }

  // Return all active pricing
  const { data } = await supabase
    .from("installation_pricing")
    .select("*")
    .eq("is_active", true)
    .order("material_category");

  return NextResponse.json({ pricing: data ?? [] });
}
