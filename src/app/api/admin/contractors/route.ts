import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/auth";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  const supabase = getSupabaseAdminClient() as any;
  const { data, error } = await supabase
    .from("contractors")
    .select("*")
    .order("name");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ contractors: data ?? [] });
}

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  const body = await request.json();
  const supabase = getSupabaseAdminClient() as any;

  const { data, error } = await supabase
    .from("contractors")
    .insert({
      name: body.name,
      company_name: body.company_name ?? null,
      phone: body.phone,
      email: body.email ?? null,
      service_types: body.service_types ?? [],
      customer_id: body.customer_id ?? null,
      notes: body.notes ?? null,
    })
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ contractor: data });
}
