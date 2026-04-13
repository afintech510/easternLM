import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

/**
 * GET /api/cart/restore?token=xxx — Returns saved cart data for restoration.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get("token");

  if (!token) {
    return NextResponse.json({ error: "token required" }, { status: 400 });
  }

  const supabase = getSupabaseAdminClient() as any;
  const { data, error } = await supabase
    .from("saved_carts")
    .select("cart_data")
    .eq("token", token)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "Cart not found" }, { status: 404 });
  }

  return NextResponse.json({ cartData: data.cart_data });
}
