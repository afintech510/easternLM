import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/auth";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { createServiceLead } from "@/lib/leads/engine";

// GET — list leads with optional filters
export async function GET(request: Request) {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");

  const supabase = getSupabaseAdminClient() as any;
  let query = supabase
    .from("service_leads")
    .select("*")
    .order("created_at", { ascending: false });

  if (status && status !== "all") query = query.eq("status", status);

  const { data, error } = await query.limit(200);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const leads = data ?? [];
  const stats = {
    new: leads.filter((l: any) => l.status === "new").length,
    assigned: leads.filter((l: any) => l.status === "assigned").length,
    contacted: leads.filter((l: any) => l.status === "contacted").length,
    quoted: leads.filter((l: any) => l.status === "quoted").length,
    won: leads.filter((l: any) => ["completed", "won"].includes(l.status)).length,
    lost: leads.filter((l: any) => l.status === "lost").length,
    total: leads.length,
    pipeline_value: leads
      .filter((l: any) => !["lost", "completed", "won"].includes(l.status))
      .reduce((s: number, l: any) => s + (l.estimated_value_cents ?? 0), 0),
  };

  return NextResponse.json({ leads, stats });
}

// POST — create lead from admin
export async function POST(request: Request) {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  const body = await request.json();
  try {
    const lead = await createServiceLead({
      ...body,
      source: body.source ?? "admin",
      created_by: auth.userId,
    });
    return NextResponse.json({ lead });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Failed" }, { status: 500 });
  }
}
