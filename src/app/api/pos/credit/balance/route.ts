import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export async function GET(req: NextRequest) {
  const customer_id = req.nextUrl.searchParams.get("customer_id");
  if (!customer_id) {
    return NextResponse.json({ error: "customer_id required" }, { status: 400 });
  }

  const supabase = getSupabaseAdminClient();

  const [custRes, ledgerRes] = await Promise.all([
    supabase
      .from("customers")
      .select("credit_balance_cents")
      .eq("id", customer_id)
      .single(),
    supabase
      .from("credit_ledger")
      .select("*")
      .eq("customer_id", customer_id)
      .order("created_at", { ascending: false })
      .limit(10),
  ]);

  if (!custRes.data) {
    return NextResponse.json({ error: "Customer not found" }, { status: 404 });
  }

  return NextResponse.json({
    balance_cents: custRes.data.credit_balance_cents,
    ledger: ledgerRes.data ?? [],
  });
}
