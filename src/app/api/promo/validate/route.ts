import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

/**
 * POST /api/promo/validate
 * Public endpoint — validates a promo code and returns discount details.
 * Used by the cart store instead of hardcoded code checking.
 */
export async function POST(request: Request) {
  const { code } = await request.json();
  if (!code || typeof code !== "string") {
    return NextResponse.json({ valid: false, error: "Code required" }, { status: 400 });
  }

  const normalized = code.trim().toUpperCase();
  const supabase = getSupabaseAdminClient() as any;

  const { data: promo, error } = await supabase
    .from("promo_codes")
    .select("*")
    .eq("code", normalized)
    .eq("is_active", true)
    .single();

  if (error || !promo) {
    return NextResponse.json({ valid: false, error: "Promo code not recognized." });
  }

  // Check expiration
  const now = new Date();
  if (promo.valid_from && new Date(promo.valid_from) > now) {
    return NextResponse.json({ valid: false, error: "This code is not yet active." });
  }
  if (promo.valid_until && new Date(promo.valid_until) < now) {
    return NextResponse.json({ valid: false, error: "This code has expired." });
  }

  // Check max uses
  if (promo.max_uses && promo.used_count >= promo.max_uses) {
    return NextResponse.json({ valid: false, error: "This code has reached its usage limit." });
  }

  return NextResponse.json({
    valid: true,
    code: promo.code,
    discount_type: promo.discount_type,
    discount_value: Number(promo.discount_value),
    description: promo.description,
  });
}
