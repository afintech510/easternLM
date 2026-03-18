import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/auth";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

// GET — list projects with optional status filter
export async function GET(request: Request) {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");

  const supabase = getSupabaseAdminClient() as any;
  let query = supabase
    .from("projects")
    .select("*, quotes(quote_number, total_cents), orders(grand_total_cents, status, delivery_method)")
    .order("created_at", { ascending: false });

  if (status && status !== "all") query = query.eq("status", status);

  const { data, error } = await query.limit(100);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ projects: data ?? [] });
}

// POST — create a project (optionally from a quote)
export async function POST(request: Request) {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  const body = await request.json();
  const supabase = getSupabaseAdminClient() as any;

  // If creating from a quote
  if (body.quote_id) {
    const { data: quote } = await supabase
      .from("quotes")
      .select("*")
      .eq("id", body.quote_id)
      .single();

    if (!quote) return NextResponse.json({ error: "Quote not found" }, { status: 404 });

    const { data: project, error } = await supabase
      .from("projects")
      .insert({
        title: quote.title,
        description: quote.description,
        status: "active",
        customer_name: quote.customer_name,
        customer_phone: quote.customer_phone,
        customer_email: quote.customer_email,
        address: quote.customer_address,
        quote_id: quote.id,
        order_id: quote.converted_order_id ?? null,
        created_by: auth.userId,
      })
      .select("id")
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, projectId: project.id });
  }

  // Manual project creation
  const { data: project, error } = await supabase
    .from("projects")
    .insert({
      title: body.title || "New Project",
      description: body.description ?? null,
      status: "active",
      customer_name: body.customer_name ?? null,
      customer_phone: body.customer_phone ?? null,
      customer_email: body.customer_email ?? null,
      address: body.address ?? null,
      created_by: auth.userId,
    })
    .select("id")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, projectId: project.id });
}
