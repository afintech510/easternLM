import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/auth";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  const supabase = getSupabaseAdminClient();
  const { data, error } = await (supabase as any)
    .from("providers")
    .select("*")
    .order("name");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ providers: data });
}

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  const body = await request.json();
  const supabase = getSupabaseAdminClient();

  if (body.id) {
    // Update
    const { id, created_at, ...updates } = body;
    updates.updated_at = new Date().toISOString();
    const { data, error } = await (supabase as any)
      .from("providers")
      .update(updates)
      .eq("id", id)
      .select()
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ provider: data });
  }

  // Insert
  const { data, error } = await (supabase as any)
    .from("providers")
    .insert({
      name: body.name,
      phone: body.phone || null,
      email: body.email || null,
      categories: body.categories || [],
      insurance_expiration: body.insurance_expiration || null,
      is_active: body.is_active ?? true,
      notes: body.notes || null,
      internal_rate_percent: body.internal_rate_percent ?? 70,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ provider: data });
}

export async function DELETE(request: Request) {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  const { id } = await request.json();
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const supabase = getSupabaseAdminClient();
  const { error } = await (supabase as any).from("providers").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
