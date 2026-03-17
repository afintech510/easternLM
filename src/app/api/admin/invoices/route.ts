import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/auth";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export async function GET(request: Request) {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  const { searchParams } = new URL(request.url);
  const isPaid = searchParams.get("is_paid");
  const status = searchParams.get("status");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = getSupabaseAdminClient() as any;

  let query = supabase
    .from("supplier_invoices")
    .select("id, invoice_number, invoice_date, total_amount_cents, ocr_status, is_paid, created_at, file_urls, supplier_id, suppliers(name)")
    .order("created_at", { ascending: false });

  if (isPaid !== null) query = query.eq("is_paid", isPaid === "true");
  if (status) query = query.eq("ocr_status", status);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ invoices: data ?? [] });
}
