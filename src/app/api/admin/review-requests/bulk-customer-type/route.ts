import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/auth";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export async function PATCH(request: Request) {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  const { order_ids, customer_type } = await request.json();

  if (!order_ids?.length || !customer_type) {
    return NextResponse.json({ error: "order_ids and customer_type required" }, { status: 400 });
  }

  const validTypes = ["homeowner", "contractor", "business"];
  if (!validTypes.includes(customer_type)) {
    return NextResponse.json({ error: `Invalid type. Must be one of: ${validTypes.join(", ")}` }, { status: 400 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = getSupabaseAdminClient() as any;

  // Get customer_ids from orders
  const { data: orders } = await supabase
    .from("orders")
    .select("customer_id")
    .in("id", order_ids);

  const customerIds = [...new Set(
    (orders ?? [])
      .map((o: { customer_id: string | null }) => o.customer_id)
      .filter(Boolean)
  )];

  if (customerIds.length === 0) {
    return NextResponse.json({ error: "No linked customers found" }, { status: 404 });
  }

  const { error, count } = await supabase
    .from("customers")
    .update({ customer_type, updated_at: new Date().toISOString() })
    .in("id", customerIds);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ updated: count ?? customerIds.length });
}
