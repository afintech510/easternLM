import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

type RouteContext = { params: Promise<{ token: string }> };

export async function GET(_req: Request, context: RouteContext) {
  const { token } = await context.params;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = getSupabaseAdminClient() as any;

  const { data, error } = await supabase
    .from("statements")
    .select("id, statement_number, public_token, balance_due_cents, charges_cents, period_start, period_end, due_date, status, amount_paid_cents, order_ids, customers(charge_account_name, first_name, last_name, payment_terms)")
    .eq("public_token", token)
    .single();

  if (error || !data) return NextResponse.json({ error: "Statement not found" }, { status: 404 });

  // Fetch orders included in this statement
  let orders: unknown[] = [];
  if (data.order_ids?.length > 0) {
    const { data: orderData } = await supabase
      .from("orders")
      .select("id, placed_at, grand_total_cents, delivery_method, order_items(product_name, quantity)")
      .in("id", data.order_ids)
      .order("placed_at");
    orders = orderData ?? [];
  }

  // Mark as viewed if first time
  if (data.status === "sent") {
    await supabase.from("statements").update({
      status: "viewed",
      viewed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }).eq("public_token", token);
    data.status = "viewed";
  }

  return NextResponse.json({ statement: data, orders });
}
