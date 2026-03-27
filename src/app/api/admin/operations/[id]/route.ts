import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/auth";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  const { id } = await ctx.params;
  const supabase = getSupabaseAdminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any;

  const { data: order, error } = await sb
    .from("orders")
    .select(
      `*, order_items(id, product_name, product_slug, quantity, unit, unit_price_cents, line_subtotal_cents, delivery_type, material_class, load_number, delivery_day, notes)`,
    )
    .eq("id", id)
    .single();

  if (error || !order) return NextResponse.json({ error: error?.message || "Not found" }, { status: 404 });

  // Fetch customer, delivery assignments, and notes in parallel
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const fetches: Array<Promise<any>> = [];

  // Customer history
  if (order.customer_id) {
    fetches.push(
      (async () => {
        const [custRes, ordersRes] = await Promise.all([
          sb
            .from("customers")
            .select("id, first_name, last_name, phone, email, total_orders, total_spent_cents, tags, is_charge_account, address, city, state, zip")
            .eq("id", order.customer_id)
            .single(),
          sb
            .from("orders")
            .select("id, created_at, grand_total_cents, status, source")
            .eq("customer_id", order.customer_id)
            .neq("id", id)
            .order("created_at", { ascending: false })
            .limit(10),
        ]);
        return { customer: custRes.data, recentOrders: ordersRes.data || [] };
      })(),
    );
  } else {
    fetches.push(Promise.resolve(null));
  }

  // Delivery assignments
  fetches.push(
    sb
      .from("delivery_assignments")
      .select("id, status, truck_type, delivery_date, time_slot, driver_name, driver_phone, material_summary, total_yards, load_number, dispatch_notes")
      .eq("order_id", id)
      .order("load_number", { ascending: true })
      .then((r: { data: unknown }) => r.data || []),
  );

  // Order notes (cast as any since table may not be in generated types yet)
  fetches.push(
    sb
      .from("order_notes")
      .select("id, note, created_by, created_at")
      .eq("order_id", id)
      .order("created_at", { ascending: false })
      .then((r: { data: unknown }) => r.data || [])
      .catch(() => []),
  );

  const [customerHistory, deliveryAssignments, notes] = await Promise.all(fetches);

  return NextResponse.json({
    order: {
      ...order,
      items: order.order_items ?? [],
      order_items: undefined,
    },
    customerHistory,
    deliveryAssignments,
    notes,
  });
}

export async function PATCH(request: Request, ctx: Ctx) {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  const { id } = await ctx.params;
  const body = await request.json();
  const supabase = getSupabaseAdminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any;

  // Build update object from allowed fields
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const update: Record<string, any> = {};
  const editableFields = [
    "status",
    "customer_name",
    "customer_phone",
    "customer_email",
    "delivery_address",
    "delivery_date",
    "delivery_time_window",
    "delivery_notes",
    "access_constraints",
    "delivery_total_cents",
  ];

  for (const field of editableFields) {
    if (body[field] !== undefined) update[field] = body[field];
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "No fields to update" }, { status: 400 });
  }

  update.updated_at = new Date().toISOString();

  const { error } = await sb.from("orders").update(update).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Auto-add a note describing what changed
  const changedFields = Object.keys(update).filter((k) => k !== "updated_at");
  if (changedFields.length > 0) {
    const descriptions = changedFields.map((f) => {
      if (f === "status") return `status → ${body.status}`;
      return f.replace(/_/g, " ");
    });

    await sb
      .from("order_notes")
      .insert({
        order_id: id,
        note: `Order updated: ${descriptions.join(", ")}`,
        created_by: "staff",
      })
      .catch(() => {
        // order_notes table might not exist yet
      });
  }

  return NextResponse.json({ ok: true });
}
