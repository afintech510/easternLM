import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/auth";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: RouteContext) {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  const { id } = await context.params;
  const body = await request.json();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = getSupabaseAdminClient() as any;

  const { data, error } = await supabase
    .from("supplier_products")
    .insert({ ...body, supplier_id: id, last_price_update: new Date().toISOString() })
    .select("*, products(name, slug)")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ product: data });
}
