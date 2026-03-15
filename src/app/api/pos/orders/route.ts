import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export async function GET(request: NextRequest) {
  const supabase = getSupabaseAdminClient();
  const date = request.nextUrl.searchParams.get("date") || new Date().toISOString().split("T")[0];
  const search = request.nextUrl.searchParams.get("q");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query: any = supabase
    .from("orders")
    .select("id, created_at, status, customer_name, customer_phone, items, grand_total_cents, delivery_method, payment_method, source, notes")
    .in("source", ["pos", "phone"])
    .order("created_at", { ascending: false });

  if (search) {
    query = query.or(`customer_name.ilike.%${search}%,customer_phone.ilike.%${search}%`);
  } else {
    query = query.gte("created_at", `${date}T00:00:00`).lt("created_at", `${date}T23:59:59`);
  }

  const { data, error } = await query.limit(100);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ orders: data });
}
