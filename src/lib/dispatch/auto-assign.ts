import { getSupabaseAdminClient } from "@/lib/supabase/admin";

type OrderForDispatch = {
  id: string;
  delivery_method: string;
  delivery_address: string | null;
  delivery_zip: string | null;
  delivery_schedule: any;
  distance_meters: number | null;
  duration_seconds: number | null;
  access_constraints: any;
  metadata: any;
  total_loads: number;
  total_delivery_days: number;
};

type DeliveryScheduleEntry = {
  day: number;
  truckName: string;
  materialClass: string;
  quantity: number;
  feeCents: number;
};

/**
 * Auto-create delivery_assignment records when a delivery order is paid.
 * Creates one assignment per load in the delivery schedule.
 * Leaves time_slot, truck_id, and driver_name null for dispatcher to fill.
 * Phase 8 AI columns (suggested_route_order, backhaul_*) left null for optimizer.
 */
export async function createDeliveryAssignments(order: OrderForDispatch): Promise<void> {
  if (order.delivery_method !== "delivery") return;

  const supabase = getSupabaseAdminClient() as any;

  // Check if assignments already exist (idempotency)
  const { count } = await supabase
    .from("delivery_assignments")
    .select("id", { count: "exact", head: true })
    .eq("order_id", order.id);

  if (count && count > 0) return; // Already created

  // Get order items for material summary
  const { data: orderItems } = await supabase
    .from("order_items")
    .select("product_name, quantity, unit, load_number, delivery_type")
    .eq("order_id", order.id);

  const items: any[] = orderItems ?? [];

  // Parse delivery schedule
  const schedule = parseDeliverySchedule(order.delivery_schedule);

  if (schedule.length === 0) {
    // Fallback: single assignment from order data
    const assignment = buildSingleAssignment(order, items);
    await supabase.from("delivery_assignments").insert(assignment);
    return;
  }

  // Create one assignment per load
  for (const load of schedule) {
    const loadItems = items.filter(
      (i) => i.load_number === load.day || (!i.load_number && i.delivery_type === "bulk"),
    );

    const materialSummary =
      loadItems.length > 0
        ? loadItems.map((i) => `${i.quantity} ${i.unit ?? "yd"} ${i.product_name}`).join(", ")
        : `Load ${load.day} — ${load.materialClass}`;

    const hasSpreading = items.some(
      (i) =>
        /spreading/i.test(i.product_name ?? "") &&
        (i.load_number === load.day || !i.load_number),
    );

    const deliveryDate = calculateDeliveryDate(order, load.day);

    await supabase.from("delivery_assignments").insert({
      order_id: order.id,
      delivery_date: deliveryDate,
      time_slot: null, // Dispatcher assigns
      truck_type: mapTruckName(load.truckName),
      truck_id: null, // Dispatcher assigns
      driver_name: null,
      load_number: load.day,
      material_summary: materialSummary,
      total_yards: load.quantity > 0 ? load.quantity : null,
      destination_address: order.delivery_address ?? "Address pending",
      destination_town: extractTown(order.delivery_address),
      distance_miles: order.distance_meters
        ? Number((order.distance_meters / 1609.34).toFixed(1))
        : null,
      drive_minutes: order.duration_seconds
        ? Math.round(order.duration_seconds / 60)
        : null,
      access_constraints: order.access_constraints ?? {},
      has_spreading: hasSpreading,
      spreading_yards: hasSpreading ? load.quantity : null,
      status: "scheduled",
      dispatch_notes: buildDispatchNotes(order),
      // Phase 8 AI Dispatch — left null for optimizer
      suggested_route_order: null,
      backhaul_supplier_id: null,
      auto_scheduled: false,
    });
  }
}

function parseDeliverySchedule(schedule: any): DeliveryScheduleEntry[] {
  if (!schedule) return [];

  // Handle array of objects (from checkout API)
  if (Array.isArray(schedule)) {
    return schedule
      .filter((entry: any) => entry && typeof entry === "object")
      .map((entry: any) => ({
        day: entry.day ?? 1,
        truckName: entry.truckName ?? "Medium Dump",
        materialClass: entry.materialClass ?? "default",
        quantity: entry.quantity ?? 0,
        feeCents: entry.feeCents ?? 0,
      }));
  }

  // Handle serialized string (legacy: "day|truck|class|qty|fee;...")
  if (typeof schedule === "string" && schedule.includes("|")) {
    return schedule
      .split(";")
      .filter(Boolean)
      .map((entry: string) => {
        const [day, truck, matClass, qty, fee] = entry.split("|");
        return {
          day: parseInt(day) || 1,
          truckName: decodeURIComponent(truck ?? "Medium Dump"),
          materialClass: decodeURIComponent(matClass ?? "default"),
          quantity: parseFloat(qty ?? "0"),
          feeCents: parseInt(fee ?? "0"),
        };
      });
  }

  return [];
}

function buildSingleAssignment(order: OrderForDispatch, items: any[]) {
  const materialSummary =
    items.length > 0
      ? items
          .filter((i) => !/delivery|tax|fee|surcharge/i.test(i.product_name ?? ""))
          .map((i) => `${i.quantity} ${i.unit ?? "yd"} ${i.product_name}`)
          .join(", ")
      : "Material delivery";

  const totalYards = items
    .filter((i) => i.delivery_type === "bulk")
    .reduce((sum, i) => sum + (parseFloat(i.quantity) || 0), 0);

  const hasSpreading = items.some((i) => /spreading/i.test(i.product_name ?? ""));

  // Pick truck type based on total yards
  let truckType: "small" | "medium" | "tri-axle" = "medium";
  if (totalYards <= 5) truckType = "small";
  else if (totalYards <= 10) truckType = "medium";
  else truckType = "tri-axle";

  return {
    order_id: order.id,
    delivery_date: calculateDeliveryDate(order, 1),
    time_slot: null,
    truck_type: truckType,
    truck_id: null,
    driver_name: null,
    load_number: 1,
    material_summary: materialSummary || "Delivery",
    total_yards: totalYards > 0 ? totalYards : null,
    destination_address: order.delivery_address ?? "Address pending",
    destination_town: extractTown(order.delivery_address),
    distance_miles: order.distance_meters
      ? Number((order.distance_meters / 1609.34).toFixed(1))
      : null,
    drive_minutes: order.duration_seconds
      ? Math.round(order.duration_seconds / 60)
      : null,
    access_constraints: order.access_constraints ?? {},
    has_spreading: hasSpreading,
    spreading_yards: hasSpreading ? totalYards : null,
    status: "scheduled",
    dispatch_notes: buildDispatchNotes(order),
    suggested_route_order: null,
    backhaul_supplier_id: null,
    auto_scheduled: false,
  };
}

function calculateDeliveryDate(order: OrderForDispatch, loadNumber: number): string {
  // Rule: MAX 1 LOAD PER DAY PER ADDRESS
  const meta = (order.metadata ?? {}) as Record<string, any>;
  const requestedStr = meta.deliveryDate || meta.delivery_date;

  let baseDate: Date;
  if (requestedStr) {
    baseDate = new Date(requestedStr + "T12:00:00");
    if (isNaN(baseDate.getTime())) baseDate = getNextBusinessDay(new Date());
  } else {
    baseDate = getNextBusinessDay(new Date());
  }

  // Each subsequent load goes to the next business day
  let deliveryDate = baseDate;
  for (let i = 1; i < loadNumber; i++) {
    deliveryDate = getNextBusinessDay(addDays(deliveryDate, 1));
  }

  return deliveryDate.toISOString().split("T")[0];
}

function getNextBusinessDay(date: Date): Date {
  const d = new Date(date);
  // Skip Sunday (0) — yard is closed
  while (d.getDay() === 0) {
    d.setDate(d.getDate() + 1);
  }
  return d;
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function mapTruckName(name: string): "small" | "medium" | "tri-axle" {
  const lower = (name ?? "").toLowerCase();
  if (lower.includes("small") || lower.includes("5")) return "small";
  if (lower.includes("tri") || lower.includes("20")) return "tri-axle";
  return "medium";
}

function extractTown(address: string | null): string | null {
  if (!address) return null;
  const parts = address.split(",").map((p) => p.trim());
  if (parts.length >= 2) {
    return parts[1]?.replace(/\s*(NY|New York)\s*\d*/i, "").trim() || null;
  }
  return null;
}

function buildDispatchNotes(order: OrderForDispatch): string | null {
  const meta = (order.metadata ?? {}) as Record<string, any>;
  const parts: string[] = [];
  if (meta.notes) parts.push(meta.notes);
  if (meta.deliveryTimeWindow) parts.push(`Preferred: ${meta.deliveryTimeWindow}`);

  const constraints = order.access_constraints as Record<string, boolean> | null;
  if (constraints) {
    const flags: string[] = [];
    if (constraints.lowWires) flags.push("LOW WIRES");
    if (constraints.narrowDriveway) flags.push("NARROW DRIVEWAY");
    if (constraints.softGround) flags.push("SOFT GROUND");
    if (constraints.gated) flags.push("GATED");
    if (constraints.steep) flags.push("STEEP");
    if (flags.length > 0) parts.push(`Access: ${flags.join(", ")}`);
  }

  return parts.length > 0 ? parts.join(" | ") : null;
}
