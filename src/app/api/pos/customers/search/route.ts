import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim();

  if (!q || q.length < 2) {
    return NextResponse.json({ customers: [] });
  }

  const supabase = getSupabaseAdminClient();
  const isPhone = /^\d{3,}$/.test(q.replace(/[\s()\-+.]/g, ""));
  const isEmail = q.includes("@");
  const pattern = `%${q}%`;

  let query;
  if (isPhone) {
    const digits = q.replace(/\D/g, "");
    query = supabase
      .from("customers")
      .select("id, first_name, last_name, company_name, phone, email, address, city, zip, total_orders, total_spent_cents, tags, is_charge_account, charge_account_name, current_balance_cents, credit_limit_cents, payment_terms, is_scammer, scammer_note")
      .ilike("phone", `%${digits}%`)
      .order("total_orders", { ascending: false })
      .limit(10);
  } else if (isEmail) {
    query = supabase
      .from("customers")
      .select("id, first_name, last_name, company_name, phone, email, address, city, zip, total_orders, total_spent_cents, tags, is_charge_account, charge_account_name, current_balance_cents, credit_limit_cents, payment_terms, is_scammer, scammer_note")
      .ilike("email", pattern)
      .order("total_orders", { ascending: false })
      .limit(10);
  } else {
    query = supabase
      .from("customers")
      .select("id, first_name, last_name, company_name, phone, email, address, city, zip, total_orders, total_spent_cents, tags, is_charge_account, charge_account_name, current_balance_cents, credit_limit_cents, payment_terms, is_scammer, scammer_note")
      .or(`first_name.ilike.${pattern},last_name.ilike.${pattern},company_name.ilike.${pattern},address.ilike.${pattern},city.ilike.${pattern}`)
      .order("total_orders", { ascending: false })
      .limit(10);
  }

  const { data: customers, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ customers: customers || [] });
}
