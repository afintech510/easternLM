import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/auth";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  const { id } = await ctx.params;
  const supabase = getSupabaseAdminClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: order, error } = await supabase.from("orders").select("*").eq("id", id).single() as { data: any; error: any };
  if (error || !order) return NextResponse.json({ error: error?.message || "Not found" }, { status: 404 });

  // Get customer history if linked
  let customerHistory = null;
  if (order.customer_id) {
    const [custRes, ordersRes] = await Promise.all([
      supabase.from("customers").select("first_name, last_name, phone, total_orders, total_spent_cents, tags").eq("id", order.customer_id).single(),
      supabase.from("orders").select("id, created_at, items, grand_total_cents, status").eq("customer_id", order.customer_id).order("created_at", { ascending: false }).limit(10),
    ]);
    customerHistory = { customer: custRes.data, recentOrders: ordersRes.data };
  }

  return NextResponse.json({ order, customerHistory });
}

export async function PATCH(request: Request, ctx: Ctx) {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  const { id } = await ctx.params;
  const body = await request.json();
  const supabase = getSupabaseAdminClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const update: any = {};
  if (body.status) update.status = body.status;
  if (body.notes !== undefined) update.notes = body.notes;

  const { error } = await supabase.from("orders").update(update).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
