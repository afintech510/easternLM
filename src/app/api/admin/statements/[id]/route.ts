import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/auth";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_req: Request, context: RouteContext) {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  const { id } = await context.params;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = getSupabaseAdminClient() as any;

  const { data: stmt, error } = await supabase
    .from("statements")
    .select("*, customers(id, first_name, last_name, charge_account_name, billing_email, billing_address, payment_terms, current_balance_cents, phone)")
    .eq("id", id)
    .single();

  if (error || !stmt) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Fetch the orders included in this statement
  let orders: unknown[] = [];
  if (stmt.order_ids?.length > 0) {
    const { data: orderData } = await supabase
      .from("orders")
      .select("id, order_number, placed_at, grand_total_cents, payment_method, delivery_method, items:order_items(product_name, quantity, unit_price_cents)")
      .in("id", stmt.order_ids)
      .order("placed_at");
    orders = orderData ?? [];
  }

  return NextResponse.json({ statement: stmt, orders });
}

export async function PATCH(request: Request, context: RouteContext) {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  const { id } = await context.params;
  const body = await request.json();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = getSupabaseAdminClient() as any;

  // If marking as paid manually
  if (body.mark_paid) {
    const { amount_cents, method, reference } = body;
    const { data: stmt } = await supabase
      .from("statements")
      .select("customer_id, balance_due_cents, amount_paid_cents")
      .eq("id", id)
      .single();

    if (stmt) {
      const newPaid = (stmt.amount_paid_cents ?? 0) + amount_cents;
      const newBalance = stmt.balance_due_cents - amount_cents;

      await supabase.from("statements").update({
        amount_paid_cents: newPaid,
        balance_due_cents: Math.max(0, newBalance),
        status: newBalance <= 0 ? "paid" : "partial_paid",
        paid_at: newBalance <= 0 ? new Date().toISOString() : null,
        payment_method: method,
        payment_reference: reference ?? null,
        updated_at: new Date().toISOString(),
      }).eq("id", id);

      // Update customer balance
      const { data: cust } = await supabase
        .from("customers")
        .select("current_balance_cents")
        .eq("id", stmt.customer_id)
        .single();

      if (cust) {
        await supabase.from("customers").update({
          current_balance_cents: Math.max(0, (cust.current_balance_cents ?? 0) - amount_cents),
        }).eq("id", stmt.customer_id);
      }
    }
    return NextResponse.json({ ok: true });
  }

  body.updated_at = new Date().toISOString();
  const { error } = await supabase.from("statements").update(body).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
