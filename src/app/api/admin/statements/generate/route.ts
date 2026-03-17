import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/auth";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  const { period_start, period_end, customer_id } = await request.json();
  if (!period_start || !period_end) {
    return NextResponse.json({ error: "period_start and period_end required" }, { status: 400 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = getSupabaseAdminClient() as any;

  // Get all charge account customers (or just the one if specified)
  let custQuery = supabase
    .from("customers")
    .select("id, first_name, last_name, charge_account_name, current_balance_cents, payment_terms, last_statement_date")
    .eq("is_charge_account", true);
  if (customer_id) custQuery = custQuery.eq("id", customer_id);

  const { data: accounts, error: custErr } = await custQuery;
  if (custErr) return NextResponse.json({ error: custErr.message }, { status: 500 });

  const generated: unknown[] = [];
  const errors: string[] = [];
  const year = new Date(period_end).getFullYear();
  const month = new Date(period_end).getMonth() + 1;

  for (const acct of accounts ?? []) {
    try {
      // Get all account orders in the period
      const { data: orders } = await supabase
        .from("orders")
        .select("id, order_number, placed_at, grand_total_cents, delivery_method")
        .eq("customer_id", acct.id)
        .eq("payment_method", "account")
        .gte("placed_at", period_start + "T00:00:00Z")
        .lte("placed_at", period_end + "T23:59:59Z")
        .in("status", ["paid", "delivered", "scheduled", "processing"])
        .order("placed_at");

      if (!orders?.length) continue; // Skip if no charges this period

      const chargesCents = orders.reduce((s: number, o: { grand_total_cents: number }) => s + o.grand_total_cents, 0);
      const orderIds = orders.map((o: { id: string }) => o.id);

      // Previous balance = current_balance_cents minus charges in this period
      // (approximate — production systems track this more precisely)
      const previousBalance = Math.max(0, (acct.current_balance_cents ?? 0) - chargesCents);

      // Due date based on payment_terms
      const termDays = acct.payment_terms?.includes("15") ? 15 : 30;
      const dueDate = new Date(period_end);
      dueDate.setDate(dueDate.getDate() + termDays);

      // Build statement number: STMT-2026-03-GP-001 style
      const slug = (acct.charge_account_name || [acct.first_name, acct.last_name].filter(Boolean).join(" "))
        .replace(/[^a-zA-Z0-9]/g, "")
        .slice(0, 4)
        .toUpperCase();
      const stmtCountRes = await supabase
        .from("statements")
        .select("id", { count: "exact", head: true })
        .eq("customer_id", acct.id);
      const seq = ((stmtCountRes.count ?? 0) + 1).toString().padStart(3, "0");
      const stmtNumber = `STMT-${year}-${month.toString().padStart(2, "0")}-${slug}-${seq}`;

      const { data: stmt, error: stmtErr } = await supabase
        .from("statements")
        .insert({
          statement_number: stmtNumber,
          customer_id: acct.id,
          period_start,
          period_end,
          previous_balance_cents: previousBalance,
          charges_cents: chargesCents,
          payments_cents: 0,
          adjustments_cents: 0,
          balance_due_cents: chargesCents, // charges only (previous already in customer balance)
          due_date: dueDate.toISOString().slice(0, 10),
          order_ids: orderIds,
          status: "draft",
          created_by: auth.userId,
        })
        .select("id, statement_number")
        .single();

      if (stmtErr) {
        errors.push(`${acct.charge_account_name ?? acct.first_name}: ${stmtErr.message}`);
      } else {
        // Update customer's last_statement_date
        await supabase.from("customers").update({
          last_statement_date: period_end,
        }).eq("id", acct.id);

        generated.push(stmt);
      }
    } catch (e) {
      errors.push(`${acct.charge_account_name ?? acct.first_name}: ${e instanceof Error ? e.message : "error"}`);
    }
  }

  return NextResponse.json({ generated, errors });
}
