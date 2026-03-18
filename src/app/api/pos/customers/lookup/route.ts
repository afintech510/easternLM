import { NextResponse, type NextRequest } from "next/server";
import { requirePOS } from "@/lib/admin/auth";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export async function GET(request: NextRequest) {
  const auth = await requirePOS();
  if (auth instanceof NextResponse) return auth;

  const phone = request.nextUrl.searchParams.get("phone");
  if (!phone) return NextResponse.json({ customer: null });

  const digits = phone.replace(/\D/g, "");
  const normalized = digits.length === 11 && digits.startsWith("1") ? digits.slice(1) : digits;
  if (normalized.length < 10) return NextResponse.json({ customer: null });

  const supabase = getSupabaseAdminClient() as any;

  const { data } = await supabase
    .from("customers")
    .select("id, first_name, last_name, email, phone, address, city, zip, company_name, total_orders, total_spent_cents, is_charge_account, charge_account_name, credit_limit_cents, current_balance_cents, payment_terms, tags")
    .eq("phone", normalized)
    .maybeSingle();

  return NextResponse.json({ customer: data ?? null });
}
