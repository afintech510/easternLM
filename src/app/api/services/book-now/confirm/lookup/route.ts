import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { verifyConfirmationToken } from "@/lib/book-now/confirmation-token";

/**
 * GET /api/services/book-now/confirm/lookup?token=...
 * Public endpoint — returns order details for the confirmation page.
 * No auth required (token is the auth).
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get("token");

  if (!token) {
    return NextResponse.json({ error: "Missing token" }, { status: 400 });
  }

  const verified = verifyConfirmationToken(token);
  if (!verified) {
    return NextResponse.json({ error: "Invalid or expired confirmation link" }, { status: 400 });
  }

  const supabase = getSupabaseAdminClient();

  const { data: order, error } = await (supabase as any)
    .from("orders")
    .select("id, customer_name, delivery_address, delivery_date, grand_total_cents, materials_subtotal_cents, cc_surcharge_cents, metadata, status, provider_id, providers:provider_id(name)")
    .eq("id", verified.orderId)
    .single();

  if (error || !order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  // Get platform fee rate
  const { data: settings } = await (supabase as any)
    .from("site_settings")
    .select("book_now_platform_fee_rate")
    .limit(1)
    .single();

  const feeRate = settings?.book_now_platform_fee_rate ?? 0.20;
  const platformFeeCents = Math.round(order.grand_total_cents * feeRate);

  return NextResponse.json({
    order: {
      id: order.id,
      customerName: order.customer_name,
      address: order.delivery_address,
      confirmedDate: order.delivery_date,
      grandTotalCents: order.grand_total_cents,
      platformFeeCents,
      items: order.metadata?.items || [],
      timeline: order.metadata?.timeline,
      status: order.status,
      providerName: order.providers?.name || null,
      alreadySigned: !!order.metadata?.waivers_signed_at,
    },
  });
}
