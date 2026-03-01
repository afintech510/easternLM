import { NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

const querySchema = z.object({
  email: z.email(),
});

export async function GET(request: Request) {
  const url = new URL(request.url);
  const parsed = querySchema.safeParse({
    email: url.searchParams.get("email"),
  });

  if (!parsed.success) {
    return NextResponse.json({ error: "Valid email query is required." }, { status: 400 });
  }

  const supabaseAdmin = getSupabaseAdminClient();
  const ordersResult = await supabaseAdmin
    .from("orders")
    .select("id, status, delivery_method, grand_total_cents, placed_at, created_at, stripe_checkout_session_id")
    .eq("customer_email", parsed.data.email)
    .order("created_at", { ascending: false })
    .limit(20);

  if (ordersResult.error) {
    return NextResponse.json({ error: ordersResult.error.message }, { status: 500 });
  }

  return NextResponse.json({
    orders: ordersResult.data,
  });
}
