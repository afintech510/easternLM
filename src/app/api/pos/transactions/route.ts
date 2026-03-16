import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const q = searchParams.get("q") || "";
  const dateFilter = searchParams.get("date") || "today";

  const supabase = getSupabaseAdminClient();
  let query = supabase
    .from("orders")
    .select("id, placed_at, customer_name, customer_phone, grand_total_cents, status, payment_method, delivery_method, source")
    .order("placed_at", { ascending: false })
    .limit(50);

  // Date filter
  const now = new Date();
  if (dateFilter === "today") {
    const start = new Date(now); start.setHours(0, 0, 0, 0);
    query = query.gte("placed_at", start.toISOString());
  } else if (dateFilter === "yesterday") {
    const start = new Date(now); start.setDate(start.getDate() - 1); start.setHours(0, 0, 0, 0);
    const end = new Date(now); end.setHours(0, 0, 0, 0);
    query = query.gte("placed_at", start.toISOString()).lt("placed_at", end.toISOString());
  } else if (dateFilter === "week") {
    const start = new Date(now); start.setDate(start.getDate() - 7); start.setHours(0, 0, 0, 0);
    query = query.gte("placed_at", start.toISOString());
  }

  // Search filter
  if (q) {
    query = query.or(`customer_name.ilike.%${q}%,customer_phone.ilike.%${q}%,id.ilike.%${q}%`);
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ orders: data || [] });
}
