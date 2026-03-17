import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/auth";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

async function generateQuoteNumber(supabase: ReturnType<typeof getSupabaseAdminClient> & object): Promise<string> {
  const year = new Date().getFullYear();
  // Count quotes created this year
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { count } = await (supabase as any)
    .from("quotes")
    .select("id", { count: "exact", head: true })
    .gte("created_at", `${year}-01-01T00:00:00Z`);
  const seq = ((count ?? 0) + 1).toString().padStart(4, "0");
  return `QT-${year}-${seq}`;
}

export async function GET(request: Request) {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = getSupabaseAdminClient() as any;

  let query = supabase
    .from("quotes")
    .select("id, quote_number, customer_name, customer_phone, title, total_cents, deposit_required_cents, deposit_paid_cents, status, sent_at, accepted_at, created_at")
    .order("created_at", { ascending: false });

  if (status) query = query.eq("status", status);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ quotes: data ?? [] });
}

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  const body = await request.json();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = getSupabaseAdminClient() as any;

  const quoteNumber = await generateQuoteNumber(supabase);

  const { data, error } = await supabase
    .from("quotes")
    .insert({
      ...body,
      quote_number: quoteNumber,
      created_by: auth.userId,
    })
    .select("id, quote_number, public_token")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ quote: data });
}
