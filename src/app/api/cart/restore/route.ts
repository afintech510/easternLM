import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

// GET — restore a saved cart by token
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get("token");

  if (!token) {
    return NextResponse.json({ error: "Missing token" }, { status: 400 });
  }

  const supabase = getSupabaseAdminClient() as any;

  const { data, error } = await supabase
    .from("saved_carts")
    .select("*")
    .eq("token", token)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "Cart not found or expired" }, { status: 404 });
  }

  // Mark as restored
  await supabase
    .from("saved_carts")
    .update({ status: "restored" })
    .eq("id", data.id);

  return NextResponse.json({
    items: data.items,
    deliveryMethod: data.delivery_method,
    deliveryAddress: data.delivery_address,
    customerName: data.customer_name,
    customerEmail: data.customer_email,
    customerPhone: data.customer_phone,
  });
}
