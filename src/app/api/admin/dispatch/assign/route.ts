import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/auth";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  const body = await request.json();
  const supabase = getSupabaseAdminClient();

  const { data, error } = await supabase.from("delivery_assignments").insert({
    order_id: body.orderId,
    delivery_date: body.deliveryDate,
    time_slot: body.timeSlot || null,
    truck_type: body.truckType,
    truck_id: body.truckId || null,
    driver_name: body.driverName || null,
    material_summary: body.materialSummary,
    total_yards: body.totalYards || null,
    destination_address: body.destinationAddress,
    destination_town: body.destinationTown || null,
    distance_miles: body.distanceMiles || null,
    drive_minutes: body.driveMinutes || null,
    access_constraints: body.accessConstraints || {},
    has_spreading: body.hasSpreading || false,
    dispatch_notes: body.notes || null,
  }).select("id").single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Update order status to scheduled
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase.from("orders").update({ status: "scheduled" }) as any).eq("id", body.orderId);

  return NextResponse.json({ ok: true, id: data.id });
}
