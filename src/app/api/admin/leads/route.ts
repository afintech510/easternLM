import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/auth";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export async function GET(request: Request) {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");
  const serviceType = searchParams.get("serviceType");
  const page = parseInt(searchParams.get("page") ?? "1", 10);
  const limit = 25;
  const offset = (page - 1) * limit;

  const supabase = getSupabaseAdminClient();
  let query = supabase
    .from("service_leads")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (status && status !== "all") {
    query = query.eq("status", status);
  }
  if (serviceType && serviceType !== "all") {
    query = query.eq("service_type", serviceType);
  }

  const { data, error, count } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ leads: data, total: count ?? 0, page, limit });
}
