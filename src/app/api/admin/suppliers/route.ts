import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/auth";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

function slugify(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

export async function GET() {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("suppliers")
    .select("id, name, slug, city, state, fulfillment_type, payment_terms, account_number, phone, email, is_active, created_at")
    .order("name");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Get product counts per supplier
  const supplierIds = (data ?? []).map((s) => s.id);
  let counts: Record<string, number> = {};
  if (supplierIds.length > 0) {
    const { data: countData } = await supabase
      .from("supplier_products")
      .select("supplier_id")
      .in("supplier_id", supplierIds);
    if (countData) {
      for (const row of countData) {
        counts[row.supplier_id] = (counts[row.supplier_id] ?? 0) + 1;
      }
    }
  }

  return NextResponse.json({
    suppliers: (data ?? []).map((s) => ({ ...s, product_count: counts[s.id] ?? 0 })),
  });
}

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  const body = await request.json();
  const supabase = getSupabaseAdminClient();

  const slug = body.slug || slugify(body.name);
  const { data, error } = await supabase
    .from("suppliers")
    .insert({ ...body, slug })
    .select("id, slug")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ supplier: data });
}
