"use client";

import { useCallback, useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatUsd } from "@/lib/format";
import { AlertTriangle, ArrowLeft, ArrowRight, ChevronLeft, ChevronRight, Clock, MapPin, Navigation, Phone, StickyNote, Truck } from "lucide-react";

type Assignment = {
  id: string;
  order_id: string;
  delivery_date: string;
  time_slot: string | null;
  truck_type: string;
  truck_id: string | null;
  driver_name: string | null;
  material_summary: string;
  total_yards: number | null;
  destination_address: string;
  destination_town: string | null;
  distance_miles: number | null;
  drive_minutes: number | null;
  access_constraints: Record<string, boolean>;
  status: string;
  has_spreading: boolean;
  dispatch_notes: string | null;
  // Enriched from orders table by API
  customer_name: string | null;
  customer_phone: string | null;
  delivery_time_window: string | null;
  order_notes: string | null;
};

type UnscheduledOrder = {
  id: string;
  created_at: string;
  customer_name: string | null;
  customer_phone: string | null;
  items: Array<{ product_name: string; quantity: number; line_total_cents: number }>;
  grand_total_cents: number;
  delivery_address: string | null;
  delivery_fee_cents: number;
  access_constraints: Record<string, boolean> | null;
  delivery_time_window: string | null;
  delivery_notes: string | null;
};

type TruckInfo = { id: string; name: string; truck_type: string; default_driver_name: string | null };

const TRUCK_TYPES = ["small", "medium", "tri-axle"] as const;
const TRUCK_LABELS: Record<string, string> = { small: "Small Dump", medium: "Medium Dump", "tri-axle": "Tri-Axle" };
const TRUCK_CAPACITY: Record<string, string> = { small: "5yd / 7yd mulch", medium: "10yd", "tri-axle": "20yd" };
const STATUS_COLORS: Record<string, string> = {
  scheduled: "bg-gray-100 text-gray-700 dark:bg-zinc-700 dark:text-zinc-300",
  loading: "bg-amber-100 text-amber-800",
  departed: "bg-blue-100 text-blue-800",
  arrived: "bg-cyan-100 text-cyan-800",
  delivered: "bg-green-100 text-green-800",
  issue: "bg-red-100 text-red-800",
};
const TIME_SLOTS = ["07:00", "07:30", "08:00", "08:30", "09:00", "09:30", "10:00", "10:30", "11:00", "11:30", "12:00", "13:00", "14:00", "15:00"];
const TW_LABELS: Record<string, string> = { morning: "7–10 AM", midday: "10 AM–1 PM", afternoon: "1–5 PM", flexible: "7 AM–5 PM" };
const YARD_ADDRESS = "110 Frowein Road, Center Moriches, NY 11934";
function mapsUrl(dest: string) {
  return `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(YARD_ADDRESS)}&destination=${encodeURIComponent(dest)}`;
}

function WeeklyView({ startDate }: { startDate: string }) {
  const [weekData, setWeekData] = useState<Record<string, { assignments: Assignment[]; total: number }>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadWeek() {
      setLoading(true);
      const start = new Date(startDate + "T12:00:00");
      const days: string[] = [];
      for (let i = 0; i < 5; i++) {
        const d = new Date(start);
        d.setDate(start.getDate() + i);
        days.push(d.toISOString().split("T")[0]);
      }
      const results: Record<string, { assignments: Assignment[]; total: number }> = {};
      await Promise.all(
        days.map(async (day) => {
          const res = await fetch(`/api/admin/dispatch?date=${day}`);
          if (res.ok) {
            const data = await res.json();
            results[day] = { assignments: data.assignments || [], total: (data.unscheduled || []).length };
          } else {
            results[day] = { assignments: [], total: 0 };
          }
        }),
      );
      setWeekData(results);
      setLoading(false);
    }
    loadWeek();
  }, [startDate]);

  if (loading) return <div className="py-20 text-center text-muted-foreground">Loading week view...</div>;

  const days = Object.entries(weekData).sort(([a], [b]) => a.localeCompare(b));
  const MAX_HOURS_PER_DAY = 8;

  return (
    <div className="grid grid-cols-5 gap-3">
      {days.map(([day, data]) => {
        const dateObj = new Date(day + "T12:00:00");
        const dayLabel = dateObj.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
        const deliveryCount = data.assignments.length;
        const totalDriveMin = data.assignments.reduce((s, a) => s + (a.drive_minutes || 0) * 2, 0);
        const totalLoadMin = data.assignments.length * 30;
        const totalTruckMin = totalDriveMin + totalLoadMin;
        const truckHours = (totalTruckMin / 60).toFixed(1);
        const utilization = Math.min(100, Math.round((totalTruckMin / (MAX_HOURS_PER_DAY * 60)) * 100));
        const utilizationColor = utilization > 90 ? "text-red-600" : utilization > 70 ? "text-amber-600" : utilization > 40 ? "text-green-600" : "text-muted-foreground";
        const barColor = utilization > 90 ? "bg-red-500" : utilization > 70 ? "bg-amber-500" : utilization > 40 ? "bg-green-500" : "bg-gray-300";

        const byTruck: Record<string, Assignment[]> = {};
        data.assignments.forEach((a) => {
          (byTruck[a.truck_type] ??= []).push(a);
        });

        return (
          <div key={day} className="rounded-xl border bg-card p-4 space-y-3">
            <div>
              <p className="text-sm font-semibold">{dayLabel}</p>
              <p className="text-xs text-muted-foreground">{deliveryCount} deliver{deliveryCount !== 1 ? "ies" : "y"}</p>
            </div>

            {/* Utilization bar */}
            <div>
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-muted-foreground">Truck time: {truckHours}h</span>
                <span className={`font-semibold ${utilizationColor}`}>{utilization}%</span>
              </div>
              <div className="h-2 rounded-full bg-muted overflow-hidden">
                <div className={`h-full rounded-full ${barColor} transition-all`} style={{ width: `${utilization}%` }} />
              </div>
            </div>

            {/* Truck breakdown */}
            {Object.entries(byTruck).map(([type, assigns]) => (
              <div key={type} className="text-xs">
                <span className="font-medium">{TRUCK_LABELS[type] ?? type}:</span>{" "}
                <span className="text-muted-foreground">{assigns.length} trip{assigns.length > 1 ? "s" : ""}</span>
              </div>
            ))}

            {data.total > 0 && (
              <p className="text-xs text-amber-600 font-medium">+{data.total} unscheduled</p>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function DispatchBoardPage() {
  const [view, setView] = useState<"day" | "week">("day");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [unscheduled, setUnscheduled] = useState<UnscheduledOrder[]>([]);
  const [trucks, setTrucks] = useState<TruckInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [assigningOrder, setAssigningOrder] = useState<UnscheduledOrder | null>(null);
  const [assignTruck, setAssignTruck] = useState<string>("small");
  const [assignTime, setAssignTime] = useState<string>("07:00");

  const fetchData = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/admin/dispatch?date=${date}`);
    if (res.ok) {
      const data = await res.json();
      setAssignments(data.assignments || []);
      setUnscheduled(data.unscheduled || []);
      setTrucks(data.trucks || []);
    }
    setLoading(false);
  }, [date]);

  useEffect(() => { fetchData(); }, [fetchData]);

  function changeDate(delta: number) {
    const d = new Date(date + "T12:00:00");
    d.setDate(d.getDate() + delta);
    setDate(d.toISOString().split("T")[0]);
  }

  async function assignOrder() {
    if (!assigningOrder) return;
    const items = assigningOrder.items || [];
    const materialSummary = items.map((i) => `${i.quantity} ${i.product_name}`).join(", ");

    await fetch("/api/admin/dispatch/assign", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        orderId: assigningOrder.id,
        deliveryDate: date,
        timeSlot: assignTime,
        truckType: assignTruck,
        materialSummary,
        destinationAddress: assigningOrder.delivery_address || "",
        accessConstraints: assigningOrder.access_constraints || {},
      }),
    });

    setAssigningOrder(null);
    fetchData();
  }

  async function updateAssignmentStatus(id: string, status: string) {
    await fetch(`/api/admin/dispatch/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    fetchData();
  }

  const dateObj = new Date(date + "T12:00:00");
  const isToday = date === new Date().toISOString().split("T")[0];
  const dateLabel = dateObj.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" });

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-semibold">Dispatch Board</h1>
          <div className="flex rounded-lg border overflow-hidden">
            <button onClick={() => setView("day")} className={`px-3 py-1.5 text-sm font-medium ${view === "day" ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground hover:bg-muted"}`}>Day</button>
            <button onClick={() => setView("week")} className={`px-3 py-1.5 text-sm font-medium ${view === "week" ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground hover:bg-muted"}`}>Week</button>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={() => changeDate(view === "week" ? -7 : -1)}><ChevronLeft className="h-4 w-4" /></Button>
          <Button size="sm" variant={isToday ? "default" : "outline"} onClick={() => setDate(new Date().toISOString().split("T")[0])}>
            {isToday ? "Today" : dateLabel}
          </Button>
          <Button size="sm" variant="outline" onClick={() => changeDate(view === "week" ? 7 : 1)}><ChevronRight className="h-4 w-4" /></Button>
        </div>
      </div>

      {view === "week" && <WeeklyView startDate={date} />}

      {view === "day" && (loading ? (
        <div className="py-20 text-center text-muted-foreground">Loading dispatch board...</div>
      ) : (
        <div className="flex gap-4">
          {/* Truck columns */}
          <div className="flex flex-1 gap-3">
            {TRUCK_TYPES.map((type) => {
              const truckAssignments = assignments.filter((a) => a.truck_type === type).sort((a, b) => (a.time_slot || "").localeCompare(b.time_slot || ""));
              const totalDriveMin = truckAssignments.reduce((s, a) => s + (a.drive_minutes || 0), 0);

              return (
                <div key={type} className="flex-1 rounded-xl border bg-card">
                  {/* Truck header */}
                  <div className="border-b p-3">
                    <div className="flex items-center gap-2">
                      <Truck className="h-5 w-5" />
                      <div>
                        <p className="font-bold text-sm">{TRUCK_LABELS[type]}</p>
                        <p className="text-xs text-muted-foreground">{TRUCK_CAPACITY[type]}</p>
                      </div>
                    </div>
                  </div>

                  {/* Assignment cards */}
                  <div className="p-2 space-y-2 min-h-[300px]">
                    {truckAssignments.length === 0 ? (
                      <div className="py-8 text-center text-xs text-muted-foreground">No loads scheduled</div>
                    ) : truckAssignments.map((a) => {
                      const tw = a.delivery_time_window;
                      const orderNotes = a.order_notes;
                      const custName = a.customer_name;
                      const custPhone = a.customer_phone;
                      const addr = a.destination_address;
                      return (
                        <div key={a.id} className="rounded-lg border bg-background p-3 space-y-1.5">
                          {/* Row 1: time slot + time window + status */}
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-mono font-semibold">{a.time_slot || "Flex"}</span>
                              {tw && <span className="rounded bg-blue-100 px-1.5 py-0.5 text-[10px] font-medium text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">{TW_LABELS[tw] ?? tw}</span>}
                            </div>
                            <select
                              value={a.status}
                              onChange={(e) => updateAssignmentStatus(a.id, e.target.value)}
                              className={`rounded px-1.5 py-0.5 text-[10px] font-medium border-0 cursor-pointer ${STATUS_COLORS[a.status] || ""}`}
                            >
                              {["scheduled", "loading", "departed", "arrived", "delivered", "issue"].map((s) => (
                                <option key={s} value={s}>{s}</option>
                              ))}
                            </select>
                          </div>

                          {/* Customer */}
                          {custName && <p className="text-sm font-semibold">{custName}</p>}
                          {custPhone && (
                            <a href={`tel:${custPhone}`} className="flex items-center gap-1 text-xs text-primary hover:underline">
                              <Phone className="h-3 w-3" /> {custPhone}
                            </a>
                          )}

                          {/* Materials */}
                          <p className="text-sm font-medium">{a.material_summary}</p>

                          {/* Address — full + Google Maps link */}
                          <div className="flex items-start gap-1 text-xs">
                            <MapPin className="h-3 w-3 mt-0.5 shrink-0 text-muted-foreground" />
                            <div className="min-w-0">
                              <p className="text-muted-foreground">{addr}</p>
                              <a href={mapsUrl(addr)} target="_blank" rel="noopener" className="flex items-center gap-0.5 text-primary hover:underline mt-0.5">
                                <Navigation className="h-3 w-3" /> Directions
                              </a>
                            </div>
                          </div>

                          {a.drive_minutes && (
                            <p className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Clock className="h-3 w-3" /> ~{a.drive_minutes} min
                            </p>
                          )}

                          {/* Notes */}
                          {orderNotes && (
                            <p className="flex items-start gap-1 text-xs text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 rounded px-2 py-1">
                              <StickyNote className="h-3 w-3 mt-0.5 shrink-0" />
                              <span className="line-clamp-3">{orderNotes}</span>
                            </p>
                          )}
                          {a.dispatch_notes && (
                            <p className="text-xs text-muted-foreground italic">Dispatch: {a.dispatch_notes}</p>
                          )}

                          {a.has_spreading && <Badge variant="outline" className="text-[10px]">+ Spreading</Badge>}
                          {Object.values(a.access_constraints || {}).some(Boolean) && (
                            <p className="flex items-center gap-1 text-xs text-amber-600">
                              <AlertTriangle className="h-3 w-3" /> Access constraints
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Truck footer */}
                  <div className="border-t p-2 text-xs text-muted-foreground text-center">
                    {truckAssignments.length} loads · ~{Math.round(totalDriveMin / 60 * 10) / 10}h driving
                  </div>
                </div>
              );
            })}
          </div>

          {/* Unscheduled sidebar */}
          <div className="w-72 shrink-0 rounded-xl border bg-card">
            <div className="border-b p-3">
              <p className="font-bold text-sm">Unscheduled ({unscheduled.length})</p>
            </div>
            <div className="p-2 space-y-2 max-h-[60vh] overflow-y-auto">
              {unscheduled.length === 0 ? (
                <div className="py-8 text-center text-xs text-muted-foreground">All orders scheduled</div>
              ) : unscheduled.map((order) => {
                const tw = order.delivery_time_window;
                const allNotes = order.delivery_notes || null;
                return (
                  <div key={order.id} className="rounded-lg border bg-background p-3 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold">{order.customer_name || "Walk-in"}</p>
                      {tw && <span className="rounded bg-blue-100 px-1.5 py-0.5 text-[10px] font-medium text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">{TW_LABELS[tw] ?? tw}</span>}
                    </div>
                    {order.customer_phone && (
                      <a href={`tel:${order.customer_phone}`} className="flex items-center gap-1 text-xs text-primary hover:underline">
                        <Phone className="h-3 w-3" /> {order.customer_phone}
                      </a>
                    )}
                    <p className="text-xs text-muted-foreground">
                      {order.items?.map((i) => `${i.quantity} ${i.product_name}`).join(", ")}
                    </p>
                    {order.delivery_address && (
                      <div className="flex items-start gap-1 text-xs">
                        <MapPin className="h-3 w-3 mt-0.5 shrink-0 text-muted-foreground" />
                        <div className="min-w-0">
                          <p className="text-muted-foreground">{order.delivery_address}</p>
                          <a href={mapsUrl(order.delivery_address)} target="_blank" rel="noopener" className="flex items-center gap-0.5 text-primary hover:underline mt-0.5">
                            <Navigation className="h-3 w-3" /> Directions
                          </a>
                        </div>
                      </div>
                    )}
                    {allNotes && (
                      <p className="flex items-start gap-1 text-xs text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 rounded px-2 py-1">
                        <StickyNote className="h-3 w-3 mt-0.5 shrink-0" />
                        <span className="line-clamp-2">{allNotes}</span>
                      </p>
                    )}
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">{formatUsd(order.delivery_fee_cents)}</span>
                      <Button size="sm" className="h-6 text-xs" onClick={() => setAssigningOrder(order)}>Assign</Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ))}


      {/* Assign dialog */}
      {assigningOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setAssigningOrder(null)}>
          <div className="w-96 rounded-2xl border bg-card p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
            <h2 className="font-bold">Assign to Truck</h2>
            <p className="text-sm text-muted-foreground">
              {assigningOrder.customer_name} — {assigningOrder.items?.map((i) => `${i.quantity} ${i.product_name}`).join(", ")}
            </p>

            <div>
              <label className="mb-1 block text-sm font-medium">Truck</label>
              <div className="flex gap-2">
                {TRUCK_TYPES.map((t) => (
                  <Button key={t} size="sm" variant={assignTruck === t ? "default" : "outline"} onClick={() => setAssignTruck(t)}>
                    {TRUCK_LABELS[t]}
                  </Button>
                ))}
              </div>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">Time Slot</label>
              <select value={assignTime} onChange={(e) => setAssignTime(e.target.value)} className="w-full rounded-lg border bg-background px-3 py-2 text-sm">
                {TIME_SLOTS.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setAssigningOrder(null)} className="flex-1">Cancel</Button>
              <Button onClick={assignOrder} className="flex-1">Assign</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
