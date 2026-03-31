import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

/**
 * GET /api/pos/saved-carts?type=saved|quotes
 * Returns quotes with status 'saved'/'draft' (saved carts) or 'sent'/'viewed' (quotes)
 *
 * DELETE /api/pos/saved-carts?id=xxx
 * Deletes a saved cart/quote by ID
 *
 * PATCH /api/pos/saved-carts
 * Updates a quote's status (e.g., mark as 'converted' after checkout)
 */

export async function GET(request: Request) {
  const url = new URL(request.url);
  const type = url.searchParams.get("type") ?? "saved";

  const supabase = getSupabaseAdminClient() as any;

  const statuses =
    type === "quotes"
      ? ["sent", "viewed"]
      : ["saved", "draft"];

  const { data, error } = await supabase
    .from("quotes")
    .select(
      "id, quote_number, short_code, public_token, customer_id, customer_name, customer_phone, customer_email, customer_address, delivery_address, delivery_fee_cents, delivery_date, delivery_time_window, delivery_notes, access_constraints, route_info, title, line_items, subtotal_cents, tax_cents, total_cents, status, sent_at, viewed_at, created_at"
    )
    .in("status", statuses)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    return NextResponse.json({ quotes: [] }, { status: 500 });
  }

  return NextResponse.json({ quotes: data ?? [] });
}

export async function DELETE(request: Request) {
  const url = new URL(request.url);
  const id = url.searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "id required" }, { status: 400 });
  }

  const supabase = getSupabaseAdminClient() as any;
  await supabase.from("quotes").delete().eq("id", id);

  return NextResponse.json({ ok: true });
}

export async function PATCH(request: Request) {
  const { id, status } = await request.json();
  if (!id || !status) {
    return NextResponse.json(
      { error: "id and status required" },
      { status: 400 }
    );
  }

  const supabase = getSupabaseAdminClient() as any;
  await supabase
    .from("quotes")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", id);

  return NextResponse.json({ ok: true });
}
