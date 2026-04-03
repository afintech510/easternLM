import { NextResponse, type NextRequest } from "next/server";
import { requireAdmin } from "@/lib/admin/auth";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export async function GET(request: NextRequest) {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  const supabase = getSupabaseAdminClient();
  const date = request.nextUrl.searchParams.get("date") || new Date().toISOString().split("T")[0];

  // Get assignments for this date — join order for customer info + delivery details
  const { data: assignments } = await supabase
    .from("delivery_assignments")
    .select("*, orders!inner(customer_name, customer_phone, delivery_time_window, delivery_notes, notes, metadata)")
    .eq("delivery_date", date)
    .order("time_slot");

  // Get trucks
  const { data: trucks } = await supabase.from("trucks").select("*").eq("is_active", true).order("truck_type");

  // Get unscheduled delivery orders (paid, no assignment for this date)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: allDeliveryOrders } = await supabase
    .from("orders")
    .select("id, created_at, customer_name, customer_phone, items, grand_total_cents, delivery_address, delivery_fee_cents, delivery_method, status, notes, access_constraints, delivery_time_window, delivery_notes, metadata")
    .eq("delivery_method", "delivery")
    .in("status", ["paid", "new", "confirmed"])
    .order("created_at", { ascending: false })
    .limit(50) as { data: any[] | null };

  const assignedOrderIds = new Set((assignments || []).map((a) => a.order_id));
  const unscheduled = (allDeliveryOrders || []).filter((o: { id: string }) => !assignedOrderIds.has(o.id));

  return NextResponse.json({
    assignments: assignments || [],
    trucks: trucks || [],
    unscheduled,
    date,
  });
}
