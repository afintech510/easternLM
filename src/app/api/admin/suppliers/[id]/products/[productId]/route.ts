import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/auth";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

type RouteContext = { params: Promise<{ id: string; productId: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  const { productId } = await context.params;
  const body = await request.json();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = getSupabaseAdminClient() as any;

  // If cost changed, log to price history first
  if (body.cost_per_unit_cents !== undefined) {
    const { data: current } = await supabase
      .from("supplier_products")
      .select("cost_per_unit_cents")
      .eq("id", productId)
      .single();

    if (current && current.cost_per_unit_cents !== body.cost_per_unit_cents) {
      await supabase.from("supplier_price_history").insert({
        supplier_product_id: productId,
        old_cost_cents: current.cost_per_unit_cents,
        new_cost_cents: body.cost_per_unit_cents,
        source: "manual",
      });
      body.last_price_update = new Date().toISOString();
    }
  }

  const { error } = await supabase.from("supplier_products").update(body).eq("id", productId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, context: RouteContext) {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  const { productId } = await context.params;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = getSupabaseAdminClient() as any;

  const { error } = await supabase.from("supplier_products").delete().eq("id", productId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
