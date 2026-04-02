import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  const supabase = getSupabaseAdminClient();
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  const [balanceRes, countRes, issuedRes, redeemedRes, recentRes] = await Promise.all([
    supabase.rpc("sum_credit_balances"),
    supabase
      .from("customers")
      .select("id", { count: "exact", head: true })
      .gt("credit_balance_cents", 0),
    supabase
      .from("credit_ledger")
      .select("amount_cents")
      .gt("amount_cents", 0)
      .gte("created_at", thirtyDaysAgo),
    supabase
      .from("credit_ledger")
      .select("amount_cents")
      .lt("amount_cents", 0)
      .gte("created_at", thirtyDaysAgo),
    supabase
      .from("credit_ledger")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(10),
  ]);

  const totalOutstanding = typeof balanceRes.data === "number" ? balanceRes.data : 0;
  const issued30d = (issuedRes.data ?? []).reduce((s, r) => s + r.amount_cents, 0);
  const redeemed30d = (redeemedRes.data ?? []).reduce((s, r) => s + Math.abs(r.amount_cents), 0);

  return NextResponse.json({
    total_outstanding_credit_cents: totalOutstanding,
    customers_with_credit: countRes.count ?? 0,
    total_credit_issued_30d_cents: issued30d,
    total_credit_redeemed_30d_cents: redeemed30d,
    recent_activity: recentRes.data ?? [],
  });
}
