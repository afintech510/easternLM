import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/auth";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { scheduleFollowUps } from "@/lib/follow-ups/engine";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, ctx: Ctx) {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  const { id } = await ctx.params;
  const body = await request.json();
  const supabase = getSupabaseAdminClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const update: any = {};
  if (body.status) update.status = body.status;
  if (body.time_slot !== undefined) update.time_slot = body.time_slot;
  if (body.truck_type) update.truck_type = body.truck_type;
  if (body.driver_name !== undefined) update.driver_name = body.driver_name;
  if (body.dispatch_notes !== undefined) update.dispatch_notes = body.dispatch_notes;
  if (body.status === "departed") update.actual_departure = new Date().toISOString();
  if (body.status === "arrived") update.actual_arrival = new Date().toISOString();
  if (body.status === "delivered") update.actual_completion = new Date().toISOString();

  const { error } = await supabase.from("delivery_assignments").update(update).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Sync order status
  if (body.status === "delivered" || body.status === "departed") {
    const { data: assignment } = await supabase.from("delivery_assignments").select("order_id").eq("id", id).single();
    if (assignment) {
      const orderStatus = body.status === "delivered" ? "delivered" : "out_for_delivery";
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase.from("orders").update({ status: orderStatus }) as any).eq("id", assignment.order_id);

      // Schedule review solicitation follow-ups when marked delivered
      if (body.status === "delivered") {
        try {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const { data: order } = await (supabase as any).from("orders")
            .select("id, customer_name, customer_phone, customer_email, delivery_address")
            .eq("id", assignment.order_id)
            .single();
          if (order) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            await scheduleFollowUps(supabase as any, order);
          }
        } catch (err) {
          console.error("[admin/dispatch] scheduleFollowUps failed:", err);
        }
      }
    }
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(_request: Request, ctx: Ctx) {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  const { id } = await ctx.params;
  const supabase = getSupabaseAdminClient();
  await supabase.from("delivery_assignments").delete().eq("id", id);
  return NextResponse.json({ ok: true });
}
