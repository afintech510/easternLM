import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin/auth";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

const packageSchema = z.object({
  name: z.string().min(1),
  price_cents: z.number().nonnegative(),
  unit: z.enum(["flat", "per_unit", "quote"]),
  description: z.string().optional(),
});

const serviceSchema = z.object({
  id: z.string().uuid().optional(),
  slug: z.string().min(2),
  name: z.string().min(2),
  tagline: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  includes: z.array(z.string()).default([]),
  icon: z.string().optional().nullable(),
  category: z.string().min(1),
  packages: z.array(packageSchema).default([]),
  is_active: z.boolean().default(true),
  is_featured: z.boolean().default(false),
  sort_order: z.number().int().default(0),
  season_start_month: z.number().int().min(1).max(12).nullable().optional(),
  season_end_month: z.number().int().min(1).max(12).nullable().optional(),
  notes: z.string().optional().nullable(),
});

export async function GET() {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  const supabase = getSupabaseAdminClient();
  const { data, error } = await (supabase as any)
    .from("instant_book_services")
    .select("*")
    .order("sort_order");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ services: data });
}

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  const body = await request.json();
  const parsed = serviceSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload", details: parsed.error.issues }, { status: 400 });
  }

  const supabase = getSupabaseAdminClient();
  const payload = { ...parsed.data, updated_at: new Date().toISOString() };

  if (payload.id) {
    const { error } = await (supabase as any)
      .from("instant_book_services")
      .update(payload)
      .eq("id", payload.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  } else {
    delete payload.id;
    const { error } = await (supabase as any)
      .from("instant_book_services")
      .insert(payload);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request) {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  const { id } = await request.json();
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const supabase = getSupabaseAdminClient();
  const { error } = await (supabase as any)
    .from("instant_book_services")
    .delete()
    .eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
