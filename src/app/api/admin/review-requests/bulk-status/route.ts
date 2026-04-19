import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/auth";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export async function PATCH(request: Request) {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  const { order_ids, status } = await request.json();

  if (!order_ids?.length || !status) {
    return NextResponse.json({ error: "order_ids and status required" }, { status: 400 });
  }

  const validStatuses = ["delivered", "cancelled", "pending", "paid", "processing", "scheduled"];
  if (!validStatuses.includes(status)) {
    return NextResponse.json({ error: `Invalid status. Must be one of: ${validStatuses.join(", ")}` }, { status: 400 });
  }

  const supabase = getSupabaseAdminClient();
  const { error, count } = await supabase
    .from("orders")
    .update({ status, updated_at: new Date().toISOString() })
    .in("id", order_ids);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ updated: count ?? order_ids.length });
}
