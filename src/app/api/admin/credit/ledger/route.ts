import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export async function GET(req: NextRequest) {
  const customer_id = req.nextUrl.searchParams.get("customer_id");
  const page = parseInt(req.nextUrl.searchParams.get("page") || "1");
  const limit = Math.min(parseInt(req.nextUrl.searchParams.get("limit") || "50"), 100);

  if (!customer_id) {
    return NextResponse.json({ error: "customer_id required" }, { status: 400 });
  }

  const offset = (page - 1) * limit;
  const supabase = getSupabaseAdminClient();

  const [dataRes, countRes] = await Promise.all([
    supabase
      .from("credit_ledger")
      .select("*")
      .eq("customer_id", customer_id)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1),
    supabase
      .from("credit_ledger")
      .select("id", { count: "exact", head: true })
      .eq("customer_id", customer_id),
  ]);

  return NextResponse.json({
    ledger: dataRes.data ?? [],
    total: countRes.count ?? 0,
    page,
    limit,
  });
}
