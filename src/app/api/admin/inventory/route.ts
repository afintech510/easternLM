import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/auth";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

// GET — list products with inventory tracking enabled
export async function GET() {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  const supabase = getSupabaseAdminClient() as any;
  const { data, error } = await supabase
    .from("products")
    .select("id, name, slug, stock_qty, low_stock_threshold, stock_unit, track_inventory, delivery_type, categories(name)")
    .eq("is_active", true)
    .order("name");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ products: data ?? [] });
}

// POST — adjust inventory for a product
export async function POST(request: Request) {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  const { product_id, adjustment_qty, reason, notes } = await request.json();

  if (!product_id || adjustment_qty === undefined || !reason) {
    return NextResponse.json({ error: "product_id, adjustment_qty, and reason required" }, { status: 400 });
  }

  const supabase = getSupabaseAdminClient() as any;

  // Get current stock
  const { data: product, error: pErr } = await supabase
    .from("products")
    .select("stock_qty")
    .eq("id", product_id)
    .single();

  if (pErr || !product) return NextResponse.json({ error: "Product not found" }, { status: 404 });

  const currentQty = parseFloat(product.stock_qty) || 0;
  const newQty = currentQty + parseFloat(adjustment_qty);

  // Update product stock
  await supabase
    .from("products")
    .update({ stock_qty: newQty })
    .eq("id", product_id);

  // Log adjustment
  await supabase.from("inventory_adjustments").insert({
    product_id,
    adjustment_qty: parseFloat(adjustment_qty),
    new_qty: newQty,
    reason,
    notes: notes || null,
    staff_id: auth.userId,
  });

  return NextResponse.json({ ok: true, newQty });
}
