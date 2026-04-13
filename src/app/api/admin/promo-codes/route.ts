import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/auth";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  const supabase = getSupabaseAdminClient() as any;
  const { data, error } = await supabase
    .from("promo_codes")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ codes: data ?? [] });
}

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  const body = await request.json();
  const { code, description, discount_type, discount_value, min_order_cents, max_uses, valid_from, valid_until } = body;

  if (!code || !discount_type || discount_value == null) {
    return NextResponse.json({ error: "code, discount_type, and discount_value required" }, { status: 400 });
  }

  const supabase = getSupabaseAdminClient() as any;
  const { data, error } = await supabase
    .from("promo_codes")
    .insert({
      code: code.trim().toUpperCase(),
      description: description || null,
      discount_type,
      discount_value: Number(discount_value),
      min_order_cents: min_order_cents ? Number(min_order_cents) : 0,
      max_uses: max_uses ? Number(max_uses) : null,
      valid_from: valid_from || null,
      valid_until: valid_until || null,
    })
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ code: data });
}

export async function PATCH(request: Request) {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  const body = await request.json();
  const { id, ...updates } = body;
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  if (updates.code) updates.code = updates.code.trim().toUpperCase();
  updates.updated_at = new Date().toISOString();

  const supabase = getSupabaseAdminClient() as any;
  const { error } = await supabase.from("promo_codes").update(updates).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
