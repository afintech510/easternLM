import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/auth";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  const { id } = await context.params;
  const supabase = getSupabaseAdminClient();

  const { data: lead, error } = await supabase
    .from("service_leads")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !lead) {
    return NextResponse.json({ error: "Lead not found" }, { status: 404 });
  }

  // Fetch customer order history if linked
  let customerHistory = null;
  if (lead.customer_id) {
    const { data: customer } = await supabase
      .from("customers")
      .select("*")
      .eq("id", lead.customer_id)
      .single();

    const { data: orders } = await supabase
      .from("order_history")
      .select("wc_order_id, order_date, order_total_cents, items, payment_method")
      .eq("customer_id", lead.customer_id)
      .order("order_date", { ascending: false })
      .limit(10);

    customerHistory = { customer, orders };
  }

  return NextResponse.json({ lead, customerHistory });
}

export async function PATCH(request: Request, context: RouteContext) {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  const { id } = await context.params;
  const body = await request.json();

  const allowedFields = ["status", "internal_notes", "assigned_to", "quoted_amount_cents"];
  const updates: Record<string, unknown> = {};
  for (const field of allowedFields) {
    if (field in body) updates[field] = body[field];
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
  }

  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("service_leads")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
