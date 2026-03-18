import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/auth";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { logProjectActivity } from "@/lib/projects/auto-create";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  const { id } = await context.params;
  const supabase = getSupabaseAdminClient() as any;

  const { data: project, error } = await supabase
    .from("projects")
    .select("*, quotes(quote_number, total_cents, public_token)")
    .eq("id", id)
    .single();

  if (error || !project) return NextResponse.json({ error: "Project not found" }, { status: 404 });

  // Get linked deliveries
  let deliveries: any[] = [];
  if (project.order_id) {
    const { data } = await supabase
      .from("delivery_assignments")
      .select("*")
      .eq("order_id", project.order_id)
      .order("delivery_date");
    deliveries = data ?? [];
  }

  return NextResponse.json({ project, deliveries });
}

export async function PATCH(request: Request, context: RouteContext) {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  const { id } = await context.params;
  const body = await request.json();
  const supabase = getSupabaseAdminClient() as any;

  const oldProject = await supabase.from("projects").select("status").eq("id", id).single();

  const { error } = await supabase
    .from("projects")
    .update({ ...body, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Log status change
  if (body.status && oldProject.data?.status !== body.status) {
    await logProjectActivity(id, "status_changed",
      `Status changed from ${oldProject.data?.status} to ${body.status}`,
      { old_status: oldProject.data?.status, new_status: body.status },
      auth.userId,
    );
  }

  return NextResponse.json({ ok: true });
}
