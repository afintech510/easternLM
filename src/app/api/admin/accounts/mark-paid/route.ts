import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/auth";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

/**
 * POST /api/admin/accounts/mark-paid
 * Mark one or more charge account orders as paid.
 * Decrements the customer's current_balance_cents.
 */
export async function POST(request: Request) {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  const body = await request.json();
  const {
    order_ids,
    payment_method,
    payment_note,
    paid_date,
    customer_id,
  } = body as {
    order_ids: string[];
    payment_method: string;
    payment_note?: string;
    paid_date?: string;
    customer_id: string;
  };

  if (!order_ids?.length || !payment_method || !customer_id) {
    return NextResponse.json(
      { error: "order_ids, payment_method, and customer_id required" },
      { status: 400 }
    );
  }

  const supabase = getSupabaseAdminClient();
  const paidAt = paid_date ? new Date(paid_date).toISOString() : new Date().toISOString();

  // Get the orders to calculate total being paid
  const { data: orders, error: fetchErr } = await supabase
    .from("orders")
    .select("id, grand_total_cents, account_paid_at")
    .in("id", order_ids)
    .eq("customer_id", customer_id)
    .eq("payment_method", "account");

  if (fetchErr || !orders) {
    return NextResponse.json({ error: fetchErr?.message ?? "Orders not found" }, { status: 500 });
  }

  // Filter to only unpaid orders
  const unpaid = orders.filter((o) => !o.account_paid_at);
  if (unpaid.length === 0) {
    return NextResponse.json({ error: "All selected orders are already marked as paid" }, { status: 400 });
  }

  const totalPaidCents = unpaid.reduce((sum, o) => sum + (o.grand_total_cents ?? 0), 0);
  const unpaidIds = unpaid.map((o) => o.id);

  // Mark orders as paid
  const { error: updateErr } = await supabase
    .from("orders")
    .update({
      account_paid_at: paidAt,
      account_payment_method: payment_method,
      account_payment_note: payment_note || null,
      updated_at: new Date().toISOString(),
    })
    .in("id", unpaidIds);

  if (updateErr) {
    return NextResponse.json({ error: updateErr.message }, { status: 500 });
  }

  // Decrement customer balance
  const { data: customer } = await supabase
    .from("customers")
    .select("current_balance_cents")
    .eq("id", customer_id)
    .single();

  if (customer) {
    const newBalance = Math.max(0, (customer.current_balance_cents ?? 0) - totalPaidCents);
    await supabase
      .from("customers")
      .update({
        current_balance_cents: newBalance,
        updated_at: new Date().toISOString(),
      })
      .eq("id", customer_id);
  }

  return NextResponse.json({
    marked_paid: unpaidIds.length,
    total_paid_cents: totalPaidCents,
    payment_method,
    paid_at: paidAt,
  });
}
