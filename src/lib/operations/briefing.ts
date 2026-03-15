/**
 * Daily operations briefing generator.
 * Produces morning briefing and end-of-day summary from dispatch data.
 */

import type { SupabaseClient } from "@supabase/supabase-js";

export type Briefing = {
  date: string;
  deliveries: {
    total: number;
    byTruck: Record<string, { count: number; towns: string[] }>;
  };
  materials: Array<{ name: string; yards: number; orderCount: number }>;
  spreadingJobs: Array<{ material: string; yards: number; town: string; customer: string; time: string }>;
  revenue: { materialsCents: number; deliveryCents: number; spreadingCents: number; totalCents: number };
  alerts: string[];
  unscheduled: number;
  pickups: number;
};

export type EodSummary = {
  date: string;
  deliveredCount: number;
  scheduledCount: number;
  rescheduledCount: number;
  completedRevenueCents: number;
  posRevenueCents: number;
  totalRevenueCents: number;
  tomorrowScheduled: number;
  tomorrowUnscheduled: number;
};

export async function generateDailyBriefing(
  supabase: SupabaseClient,
  date: string,
): Promise<Briefing> {
  // Get assignments for this date
  const { data: assignments } = await supabase
    .from("delivery_assignments")
    .select("*")
    .eq("delivery_date", date)
    .neq("status", "cancelled");

  const all = assignments || [];

  // By truck
  const byTruck: Record<string, { count: number; towns: string[] }> = {};
  for (const a of all) {
    if (!byTruck[a.truck_type]) byTruck[a.truck_type] = { count: 0, towns: [] };
    byTruck[a.truck_type].count++;
    if (a.destination_town) byTruck[a.truck_type].towns.push(a.destination_town);
  }

  // Materials aggregation
  const materialMap = new Map<string, { yards: number; count: number }>();
  for (const a of all) {
    const name = a.material_summary.replace(/^\d+(\.\d+)?\s*(yd|yards?)\s*/i, "").trim() || a.material_summary;
    const yards = Number(a.total_yards) || 0;
    const existing = materialMap.get(name);
    if (existing) { existing.yards += yards; existing.count++; }
    else materialMap.set(name, { yards, count: 1 });
  }
  const materials = Array.from(materialMap.entries()).map(([name, v]) => ({ name, yards: v.yards, orderCount: v.count }));

  // Spreading jobs
  const spreadingJobs = all
    .filter((a) => a.has_spreading)
    .map((a) => ({
      material: a.material_summary,
      yards: Number(a.total_yards) || 0,
      town: a.destination_town || "",
      customer: "", // Would need join to orders
      time: a.time_slot || "TBD",
    }));

  // Revenue estimate
  const deliveryCents = all.reduce((s, a) => {
    // Rough estimate from distance
    return s + (a.drive_minutes ? a.drive_minutes * 200 : 5000);
  }, 0);

  // Alerts
  const alerts: string[] = [];
  for (const a of all) {
    const constraints = a.access_constraints as Record<string, boolean> || {};
    if (constraints.low_wires) alerts.push(`Order ${a.order_id.slice(0, 8)}: low wire constraint — use small dump`);
    if (constraints.soft_ground) alerts.push(`Order ${a.order_id.slice(0, 8)}: soft ground possible`);
    if (constraints.gated) alerts.push(`Order ${a.order_id.slice(0, 8)}: gated property — call ahead`);
  }

  // Unscheduled delivery orders
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { count: unscheduled } = await supabase
    .from("orders")
    .select("id", { count: "exact", head: true })
    .eq("delivery_method", "delivery")
    .in("status", ["paid", "new", "confirmed"]) as any;

  // Pickup orders today
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { count: pickups } = await supabase
    .from("orders")
    .select("id", { count: "exact", head: true })
    .eq("delivery_method", "pickup")
    .gte("created_at", `${date}T00:00:00`)
    .lt("created_at", `${date}T23:59:59`) as any;

  if ((unscheduled || 0) > 0) alerts.push(`${unscheduled} new orders need scheduling`);

  return {
    date,
    deliveries: { total: all.length, byTruck },
    materials,
    spreadingJobs,
    revenue: { materialsCents: 0, deliveryCents, spreadingCents: spreadingJobs.length * 35000, totalCents: deliveryCents + spreadingJobs.length * 35000 },
    alerts,
    unscheduled: unscheduled || 0,
    pickups: pickups || 0,
  };
}

export async function generateEodSummary(
  supabase: SupabaseClient,
  date: string,
): Promise<EodSummary> {
  const { data: assignments } = await supabase
    .from("delivery_assignments")
    .select("status")
    .eq("delivery_date", date);

  const all = assignments || [];
  const delivered = all.filter((a) => a.status === "delivered").length;
  const rescheduled = all.filter((a) => a.status === "rescheduled").length;

  // Today's POS revenue
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: posOrders } = await supabase
    .from("orders")
    .select("grand_total_cents")
    .eq("source", "pos")
    .eq("status", "paid")
    .gte("created_at", `${date}T00:00:00`)
    .lt("created_at", `${date}T23:59:59`) as any;

  const posRevenue = (posOrders || []).reduce((s: number, o: { grand_total_cents: number }) => s + o.grand_total_cents, 0);

  // Tomorrow
  const tomorrow = new Date(date + "T12:00:00");
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split("T")[0];

  const { count: tomorrowScheduled } = await supabase
    .from("delivery_assignments")
    .select("id", { count: "exact", head: true })
    .eq("delivery_date", tomorrowStr);

  return {
    date,
    deliveredCount: delivered,
    scheduledCount: all.length,
    rescheduledCount: rescheduled,
    completedRevenueCents: 0,
    posRevenueCents: posRevenue,
    totalRevenueCents: posRevenue,
    tomorrowScheduled: tomorrowScheduled || 0,
    tomorrowUnscheduled: 0,
  };
}

/** Format briefing as plain text (for email/SMS) */
export function formatBriefingText(b: Briefing): string {
  const lines: string[] = [];
  lines.push(`MORNING BRIEFING — ${b.date}`);
  lines.push("");
  lines.push(`DELIVERIES: ${b.deliveries.total} loads`);
  for (const [truck, info] of Object.entries(b.deliveries.byTruck)) {
    lines.push(`  ${truck}: ${info.count} loads (${info.towns.join(", ")})`);
  }
  lines.push("");
  lines.push("MATERIALS TO LOAD:");
  for (const m of b.materials) {
    lines.push(`  ${m.name}: ${m.yards} yards (${m.orderCount} orders)`);
  }
  if (b.spreadingJobs.length > 0) {
    lines.push("");
    lines.push(`SPREADING JOBS: ${b.spreadingJobs.length}`);
    for (const j of b.spreadingJobs) {
      lines.push(`  ${j.material} → ${j.town} (${j.time})`);
    }
  }
  if (b.alerts.length > 0) {
    lines.push("");
    lines.push("ALERTS:");
    for (const a of b.alerts) lines.push(`  ⚠ ${a}`);
  }
  lines.push("");
  lines.push(`PICKUPS EXPECTED: ${b.pickups}`);
  return lines.join("\n");
}
