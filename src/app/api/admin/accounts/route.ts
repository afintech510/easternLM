import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/auth";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = getSupabaseAdminClient() as any;

  const { data, error } = await supabase
    .from("customers")
    .select("id, first_name, last_name, charge_account_name, phone, email, billing_email, credit_limit_cents, current_balance_cents, payment_terms, last_statement_date, total_orders")
    .eq("is_charge_account", true)
    .order("charge_account_name");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ accounts: data ?? [] });
}
