import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  const supabase = getSupabaseAdminClient();

  const { data: orders } = await supabase
    .from("orders")
    .select("id, placed_at, grand_total_cents, materials_subtotal_cents, delivery_method, status, order_items(product_name, quantity, unit_price_cents)")
    .eq("customer_id", id)
    .order("placed_at", { ascending: false })
    .limit(20);

  return NextResponse.json({ orders: orders || [] });
}
