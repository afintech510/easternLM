import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q") || "";
  const sort = req.nextUrl.searchParams.get("sort") || "balance";
  const page = parseInt(req.nextUrl.searchParams.get("page") || "1");
  const limit = 25;
  const offset = (page - 1) * limit;

  const supabase = getSupabaseAdminClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query = (supabase as any)
    .from("customers")
    .select(`
      id, first_name, last_name, phone, email, credit_balance_cents,
      credit_ledger!inner(id)
    `, { count: "exact" });

  if (q) {
    query = query.or(`first_name.ilike.%${q}%,last_name.ilike.%${q}%,phone.ilike.%${q}%`);
  }

  if (sort === "balance") {
    query = query.order("credit_balance_cents", { ascending: false });
  } else if (sort === "name") {
    query = query.order("first_name", { ascending: true });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: customers, count, error } = await query.range(offset, offset + limit - 1) as any;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const customerIds = (customers ?? []).map((c: any) => c.id);
  if (customerIds.length === 0) {
    return NextResponse.json({ customers: [], total: 0, page, limit });
  }

  const { data: stats } = await supabase
    .from("credit_ledger")
    .select("customer_id, amount_cents, created_at")
    .in("customer_id", customerIds);

  const statsMap = new Map<string, { total_credited: number; total_redeemed: number; last_activity: string }>();
  for (const row of stats ?? []) {
    const existing = statsMap.get(row.customer_id) || { total_credited: 0, total_redeemed: 0, last_activity: "" };
    if (row.amount_cents > 0) existing.total_credited += row.amount_cents;
    else existing.total_redeemed += Math.abs(row.amount_cents);
    if (!existing.last_activity || row.created_at > existing.last_activity) {
      existing.last_activity = row.created_at;
    }
    statsMap.set(row.customer_id, existing);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const result = ((customers ?? []) as any[]).map((c) => {
    const s = statsMap.get(c.id) || { total_credited: 0, total_redeemed: 0, last_activity: "" };
    return {
      id: c.id,
      first_name: c.first_name,
      last_name: c.last_name,
      phone: c.phone,
      email: c.email,
      credit_balance_cents: c.credit_balance_cents,
      total_credited_cents: s.total_credited,
      total_redeemed_cents: s.total_redeemed,
      last_activity: s.last_activity,
    };
  });

  if (sort === "activity") {
    result.sort((a, b) => (b.last_activity || "").localeCompare(a.last_activity || ""));
  }

  return NextResponse.json({ customers: result, total: count ?? 0, page, limit });
}
