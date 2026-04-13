"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatUsd } from "@/lib/format";
import {
  formatOrderDateTime,
  formatDeliveryDate,
  formatTimeWindow,
  formatPhone,
  formatPaymentMethod,
  formatShortDateTime,
} from "@/lib/format-date";
import {
  AlertTriangle,
  Calendar,
  Clock,
  ExternalLink,
  Mail,
  MapPin,
  MessageSquare,
  Pencil,
  Phone,
  Printer,
  RotateCcw,
  Truck,
  X,
  XCircle,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────

export interface OrderItem {
  id: string;
  product_name: string;
  quantity: number;
  unit: string;
  unit_price_cents: number;
  line_subtotal_cents: number;
  delivery_type?: string;
  material_class?: string;
  load_number: number | null;
}

export interface OrderFull {
  id: string;
  created_at: string;
  placed_at: string | null;
  status: string;
  source: string;
  customer_name: string | null;
  customer_phone: string | null;
  customer_email: string | null;
  items: OrderItem[];
  order_items?: OrderItem[];
  grand_total_cents: number;
  materials_subtotal_cents: number;
  delivery_total_cents: number;
  tax_cents: number;
  cc_surcharge_cents: number;
  discount_amount_cents?: number;
  discount_reason?: string | null;
  tax_exempt?: boolean;
  store_credit_applied_cents?: number;
  delivery_method: string;
  delivery_address: string | null;
  delivery_date: string | null;
  delivery_time_window: string | null;
  delivery_notes: string | null;
  access_constraints: Record<string, unknown> | null;
  payment_method: string;
  stripe_checkout_session_id: string | null;
  stripe_payment_intent_id?: string | null;
  notes: string | null;
  customer_id: string | null;
  metadata: Record<string, unknown> | null;
  payments?: Array<{ method: string; amount_cents: number; stripe_id?: string; card_last4?: string; card_brand?: string }> | null;
  refunds?: Array<{ id: string; amount_cents: number; reason: string; processed_at: string; stripe_refund_id?: string }> | null;
}

export interface CustomerHistory {
  customer: {
    id: string;
    first_name: string;
    last_name: string;
    phone: string;
    email: string;
    total_orders: number;
    total_spent_cents: number;
    tags: string[];
  } | null;
  recentOrders: Array<{ id: string; created_at: string; grand_total_cents: number; status: string; source: string }>;
}

export interface DeliveryAssignment {
  id: string;
  status: string;
  truck_type: string;
  delivery_date: string;
  time_slot: string | null;
  driver_name: string | null;
  material_summary: string;
  total_yards: number | null;
  load_number: number;
}

export interface OrderNote {
  id: string;
  note: string;
  created_by: string | null;
  created_at: string;
}

interface TimelineEntry {
  time: string;
  type: "created" | "payment" | "status" | "note" | "delivery";
  description: string;
}

// ─── Constants ────────────────────────────────────────────────

const STATUS_OPTIONS = [
  "new", "confirmed", "scheduled", "loading",
  "out_for_delivery", "delivered", "paid",
  "cancelled", "issue",
];

const STATUS_COLORS: Record<string, string> = {
  new: "bg-blue-100 text-blue-800",
  confirmed: "bg-cyan-100 text-cyan-800",
  scheduled: "bg-indigo-100 text-indigo-800",
  loading: "bg-amber-100 text-amber-800",
  out_for_delivery: "bg-orange-100 text-orange-800",
  delivered: "bg-green-100 text-green-800",
  paid: "bg-green-200 text-green-900",
  cancelled: "bg-gray-100 text-gray-600",
  issue: "bg-red-100 text-red-800",
  pending: "bg-yellow-100 text-yellow-800",
  pending_payment: "bg-yellow-100 text-yellow-800",
  refunded: "bg-red-200 text-red-800",
  partially_refunded: "bg-orange-100 text-orange-600",
};

const SOURCE_LABELS: Record<string, string> = { web: "WEB", pos: "POS", phone: "PHONE", admin: "ADMIN", quote: "QUOTE" };
const SOURCE_COLORS: Record<string, string> = {
  web: "bg-blue-100 text-blue-700",
  pos: "bg-green-100 text-green-700",
  phone: "bg-amber-100 text-amber-700",
  admin: "bg-gray-100 text-gray-700",
  quote: "bg-purple-100 text-purple-700",
};

const CONSTRAINT_LABELS: Record<string, string> = {
  lowWires: "Low wires",
  narrowDriveway: "Narrow driveway",
  softGround: "Soft ground",
  gated: "Gated",
  steep: "Steep grade",
  backyard: "Backyard access",
};

// ─── Component ────────────────────────────────────────────────

interface Props {
  order: OrderFull;
  customerHistory: CustomerHistory | null;
  deliveryAssignments: DeliveryAssignment[];
  notes: OrderNote[];
  loading: boolean;
  onClose: () => void;
  onStatusChange: (orderId: string, status: string) => void;
  onAddNote: (orderId: string, note: string) => Promise<void>;
  onPrintReceipt: () => void;
  onPrintDeliveryTicket: () => void;
  onEmailReceipt: () => void;
  onSendSms: () => void;
  onEdit: () => void;
  onRefund: () => void;
  onCancel: () => void;
}

export function OrderDetailPanel({
  order,
  customerHistory,
  deliveryAssignments,
  notes,
  loading,
  onClose,
  onStatusChange,
  onAddNote,
  onPrintReceipt,
  onPrintDeliveryTicket,
  onEmailReceipt,
  onSendSms,
  onEdit,
  onRefund,
  onCancel,
}: Props) {
  const [addingNote, setAddingNote] = useState(false);
  const [newNote, setNewNote] = useState("");
  const [savingNote, setSavingNote] = useState(false);

  if (loading) {
    return (
      <div className="w-[440px] shrink-0 rounded-lg border bg-card p-4 flex items-center justify-center min-h-[400px]">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  const realItems = (order.order_items ?? order.items ?? []).filter(
    (i) =>
      !i.product_name?.startsWith("Delivery Load") &&
      !i.product_name?.startsWith("Sales Tax") &&
      !i.product_name?.startsWith("Credit Card"),
  );

  const deliveryDate =
    order.delivery_date ||
    String((order.metadata as Record<string, unknown>)?.deliveryDate ?? "");

  const constraints = order.access_constraints as Record<string, unknown> | null;
  const constraintFlags = constraints
    ? Object.entries(constraints)
        .filter(([k, v]) => v === true && k !== "notes")
        .map(([k]) => CONSTRAINT_LABELS[k] || k)
    : [];
  const constraintNotes =
    constraints && typeof constraints.notes === "string" && constraints.notes.trim()
      ? constraints.notes.trim()
      : null;

  // Build timeline
  const timeline = buildTimeline(order, notes);

  async function handleSaveNote() {
    if (!newNote.trim()) return;
    setSavingNote(true);
    await onAddNote(order.id, newNote.trim());
    setNewNote("");
    setAddingNote(false);
    setSavingNote(false);
  }

  return (
    <div className="w-[440px] shrink-0 rounded-lg border bg-card overflow-y-auto max-h-[calc(100vh-180px)]">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-card border-b p-4 flex items-center justify-between">
        <div>
          <h2 className="font-bold text-base">Order #{order.id.slice(0, 8)}</h2>
          <p className="text-xs text-muted-foreground">{formatOrderDateTime(order.placed_at || order.created_at)}</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge className={`text-[10px] ${SOURCE_COLORS[order.source] || "bg-gray-100"}`}>
            {SOURCE_LABELS[order.source] || order.source}
          </Badge>
          <Badge className={`text-[10px] ${STATUS_COLORS[order.status] || "bg-gray-100"}`}>
            {order.status.replace(/_/g, " ")}
          </Badge>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground ml-1">
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="p-4 space-y-5">
        {/* Customer */}
        <Section title="Customer">
          <p className="text-sm font-semibold">{order.customer_name || "Walk-in"}</p>
          {order.customer_phone && (
            <a
              href={`tel:${order.customer_phone}`}
              className="flex items-center gap-1.5 text-sm text-primary hover:underline"
            >
              <Phone className="h-3.5 w-3.5" /> {formatPhone(order.customer_phone)}
            </a>
          )}
          {order.customer_email && (
            <a
              href={`mailto:${order.customer_email}`}
              className="flex items-center gap-1.5 text-sm text-muted-foreground hover:underline"
            >
              <Mail className="h-3.5 w-3.5" /> {order.customer_email}
            </a>
          )}
          {customerHistory?.customer && (
            <p className="text-xs text-muted-foreground mt-1">
              {customerHistory.customer.total_orders} orders &middot;{" "}
              {formatUsd(customerHistory.customer.total_spent_cents)} lifetime
            </p>
          )}
        </Section>

        {/* Items */}
        <Section title="Items">
          {realItems.length === 0 ? (
            <p className="text-sm text-muted-foreground">No items recorded</p>
          ) : (
            realItems.map((item, i) => {
              const unit = item.unit === "unit" || !item.unit ? "cu. yard" : item.unit;
              const unitPlural = unit.endsWith("s") ? unit : `${unit}s`;
              return (
                <div key={i} className="flex justify-between text-sm py-1.5 border-b border-border/50 last:border-0">
                  <div>
                    <p className="font-medium">
                      {item.quantity} {item.quantity === 1 ? unit : unitPlural} of {item.product_name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      @ {formatUsd(item.unit_price_cents)} per {unit}
                    </p>
                  </div>
                  <span className="font-medium whitespace-nowrap">{formatUsd(item.line_subtotal_cents)}</span>
                </div>
              );
            })
          )}
        </Section>

        {/* Delivery */}
        {order.delivery_method === "delivery" && (
          <Section title="Delivery" bg>
            {order.delivery_address && (
              <div className="flex items-start gap-1.5 text-sm">
                <MapPin className="h-3.5 w-3.5 mt-0.5 shrink-0 text-muted-foreground" />
                <span>{order.delivery_address}</span>
              </div>
            )}
            {deliveryDate && (
              <div className="flex items-center gap-1.5 text-sm">
                <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                <span>{formatDeliveryDate(deliveryDate)}</span>
              </div>
            )}
            {order.delivery_time_window && (
              <div className="flex items-center gap-1.5 text-sm">
                <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                <span>{formatTimeWindow(order.delivery_time_window)}</span>
              </div>
            )}
            <div className="flex items-center gap-1.5 text-sm">
              <Truck className="h-3.5 w-3.5 text-muted-foreground" />
              <span>Fee: {formatUsd(order.delivery_total_cents ?? 0)}</span>
            </div>
            {(constraintFlags.length > 0 || constraintNotes) && (
              <div className="flex items-start gap-1.5 text-xs text-amber-700 bg-amber-50 rounded-md p-2 mt-1">
                <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                <span>{[...constraintFlags, constraintNotes].filter(Boolean).join(" · ")}</span>
              </div>
            )}
            {order.delivery_notes && (
              <p className="text-xs text-muted-foreground mt-1">Notes: {order.delivery_notes}</p>
            )}

            {/* Delivery assignments */}
            {deliveryAssignments.length > 0 && (
              <div className="mt-2 pt-2 border-t border-border/50">
                <p className="text-xs font-semibold text-muted-foreground mb-1">Loads</p>
                {deliveryAssignments.map((da) => (
                  <div key={da.id} className="text-xs text-muted-foreground py-0.5">
                    Load {da.load_number}: {da.material_summary}
                    {da.total_yards ? ` — ${da.total_yards} yd` : ""}
                    {da.truck_type ? ` (${da.truck_type})` : ""}
                    {da.driver_name ? ` · ${da.driver_name}` : ""}
                  </div>
                ))}
              </div>
            )}
          </Section>
        )}

        {/* Delivery Confirmation Photos */}
        {(() => {
          const meta = order.metadata as Record<string, unknown> | null;
          const photos = meta?.delivery_photos as string[] | undefined;
          const confirmedAt = meta?.delivery_confirmed_at as string | undefined;
          const cashCollected = meta?.cash_collected as boolean | undefined;
          if (!photos?.length && !confirmedAt) return null;
          return (
            <Section title="Delivery Confirmation" bg>
              {confirmedAt && (
                <p className="text-xs text-muted-foreground">
                  Confirmed: {new Date(confirmedAt).toLocaleString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" })}
                  {cashCollected ? " · Cash collected" : ""}
                </p>
              )}
              {photos && photos.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-1">
                  {photos.map((url, i) => (
                    <a key={i} href={url} target="_blank" rel="noopener noreferrer">
                      <img
                        src={url}
                        alt={`Delivery photo ${i + 1}`}
                        className="w-28 h-28 object-cover rounded-lg border hover:opacity-80 transition-opacity cursor-pointer"
                      />
                    </a>
                  ))}
                </div>
              )}
              {(!photos || photos.length === 0) && confirmedAt && (
                <p className="text-xs text-muted-foreground italic">Confirmed without photos</p>
              )}
            </Section>
          );
        })()}

        {/* Totals */}
        <Section title="Totals">
          <div className="space-y-1 text-sm">
            <Row label="Materials" value={formatUsd(order.materials_subtotal_cents ?? 0)} />
            {(order.discount_amount_cents ?? 0) > 0 && (
              <div className="flex justify-between text-green-700">
                <span>Discount{order.discount_reason ? ` (${order.discount_reason})` : ""}</span>
                <span>-{formatUsd(order.discount_amount_cents!)}</span>
              </div>
            )}
            {(order.delivery_total_cents ?? 0) > 0 && (
              <Row label="Delivery" value={formatUsd(order.delivery_total_cents)} />
            )}
            <Row label={order.tax_exempt ? "Tax (exempt)" : "Tax (8.75%)"} value={order.tax_exempt ? "$0.00" : formatUsd(order.tax_cents ?? 0)} />
            {(order.cc_surcharge_cents ?? 0) > 0 && (
              <Row label="CC Fee (3%)" value={formatUsd(order.cc_surcharge_cents)} />
            )}
            {(order.store_credit_applied_cents ?? 0) > 0 && (
              <div className="flex justify-between text-green-700">
                <span>Store Credit</span>
                <span>-{formatUsd(order.store_credit_applied_cents!)}</span>
              </div>
            )}
            <div className="flex justify-between border-t pt-1.5 font-bold text-base">
              <span>Total</span>
              <span>{formatUsd(order.grand_total_cents)}</span>
            </div>
          </div>
        </Section>

        {/* Payment */}
        <Section title="Payment">
          <p className="text-sm">{formatPaymentMethod(order.payment_method)}</p>
          {order.stripe_checkout_session_id && (
            <a
              href={`https://dashboard.stripe.com/payments/${order.stripe_payment_intent_id || order.stripe_checkout_session_id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-xs text-primary hover:underline mt-0.5"
            >
              <ExternalLink className="h-3 w-3" />
              {(order.stripe_payment_intent_id || order.stripe_checkout_session_id || "").slice(0, 20)}...
            </a>
          )}
          {/* Refund history */}
          {order.refunds && order.refunds.length > 0 && (
            <div className="mt-2 pt-2 border-t border-border/50">
              <p className="text-xs font-semibold text-red-600 mb-1">Refunds</p>
              {order.refunds.map((r, i) => (
                <div key={i} className="text-xs text-muted-foreground">
                  {formatUsd(r.amount_cents)} — {r.reason}
                  {r.stripe_refund_id ? ` (${r.stripe_refund_id.slice(0, 12)}...)` : ""}
                </div>
              ))}
            </div>
          )}
        </Section>

        {/* Actions */}
        <Section title="Actions">
          <div className="grid grid-cols-2 gap-2">
            <Button size="sm" variant="outline" className="text-xs justify-start" onClick={onPrintReceipt}>
              <Printer className="mr-1.5 h-3.5 w-3.5" /> Receipt
            </Button>
            {order.delivery_method === "delivery" && (
              <Button size="sm" variant="outline" className="text-xs justify-start" onClick={onPrintDeliveryTicket}>
                <Truck className="mr-1.5 h-3.5 w-3.5" /> Delivery Ticket
              </Button>
            )}
            <Button size="sm" variant="outline" className="text-xs justify-start" onClick={onEmailReceipt}>
              <Mail className="mr-1.5 h-3.5 w-3.5" /> Email Receipt
            </Button>
            <Button size="sm" variant="outline" className="text-xs justify-start" onClick={onSendSms}>
              <MessageSquare className="mr-1.5 h-3.5 w-3.5" /> Send SMS
            </Button>
            <Button size="sm" variant="outline" className="text-xs justify-start" onClick={onEdit}>
              <Pencil className="mr-1.5 h-3.5 w-3.5" /> Edit Order
            </Button>
            <Button size="sm" variant="outline" className="text-xs justify-start" onClick={onRefund}>
              <RotateCcw className="mr-1.5 h-3.5 w-3.5" /> Refund
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="text-xs justify-start text-red-600 hover:text-red-700 col-span-2"
              onClick={onCancel}
            >
              <XCircle className="mr-1.5 h-3.5 w-3.5" /> Cancel Order
            </Button>
          </div>
        </Section>

        {/* Status Change */}
        <Section title="Status">
          <div className="flex flex-wrap gap-1">
            {STATUS_OPTIONS.map((s) => (
              <Button
                key={s}
                size="sm"
                variant={order.status === s ? "default" : "outline"}
                className="text-xs h-7"
                onClick={() => onStatusChange(order.id, s)}
              >
                {s.replace(/_/g, " ")}
              </Button>
            ))}
          </div>
        </Section>

        {/* Notes */}
        <Section title="Notes">
          <div className="space-y-2">
            {notes.map((note) => (
              <div key={note.id} className="text-sm">
                <span className="text-xs text-muted-foreground">
                  {formatShortDateTime(note.created_at)}
                  {note.created_by ? ` — ${note.created_by}` : ""}:
                </span>
                <p className="mt-0.5">{note.note}</p>
              </div>
            ))}

            {addingNote ? (
              <div className="flex gap-2">
                <input
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  placeholder="Add a note..."
                  className="flex-1 h-9 rounded-lg border px-3 text-sm"
                  autoFocus
                  onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSaveNote()}
                />
                <Button size="sm" onClick={handleSaveNote} disabled={savingNote || !newNote.trim()}>
                  {savingNote ? "..." : "Save"}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setAddingNote(false);
                    setNewNote("");
                  }}
                >
                  Cancel
                </Button>
              </div>
            ) : (
              <button
                onClick={() => setAddingNote(true)}
                className="text-sm text-primary hover:underline"
              >
                + Add Note
              </button>
            )}
          </div>
        </Section>

        {/* Timeline */}
        <Section title="Timeline">
          <div className="space-y-1.5">
            {timeline.map((entry, i) => (
              <div key={i} className="flex gap-2 text-xs">
                <span className="text-muted-foreground whitespace-nowrap w-20 shrink-0">
                  {new Date(entry.time).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                </span>
                <span>{entry.description}</span>
              </div>
            ))}
          </div>
        </Section>

        {/* Recent orders from same customer */}
        {customerHistory?.recentOrders && customerHistory.recentOrders.length > 0 && (
          <Section title="Customer History">
            {customerHistory.recentOrders.slice(0, 5).map((o) => (
              <div key={o.id} className="flex justify-between items-center text-xs py-1 text-muted-foreground">
                <span>
                  {new Date(o.created_at).toLocaleDateString("en-US", { weekday: "short", month: "numeric", day: "numeric" })}
                </span>
                <span className="font-medium">{formatUsd(o.grand_total_cents)}</span>
                <Badge className={`text-[9px] ${STATUS_COLORS[o.status] || ""}`}>{o.status}</Badge>
              </div>
            ))}
          </Section>
        )}
      </div>
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────

function Section({
  title,
  children,
  bg,
}: {
  title: string;
  children: React.ReactNode;
  bg?: boolean;
}) {
  return (
    <div className={bg ? "rounded-lg bg-muted/50 p-3 space-y-1.5" : "space-y-1.5"}>
      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{title}</p>
      {children}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span>{value}</span>
    </div>
  );
}

function buildTimeline(order: OrderFull, notes: OrderNote[]): TimelineEntry[] {
  const entries: TimelineEntry[] = [];

  entries.push({
    time: order.placed_at || order.created_at,
    type: "created",
    description: `Order placed (${order.source || "web"})`,
  });

  if (["paid", "delivered", "scheduled", "confirmed"].includes(order.status) || order.stripe_checkout_session_id) {
    entries.push({
      time: order.placed_at || order.created_at,
      type: "payment",
      description: `Payment received — ${formatPaymentMethod(order.payment_method)}`,
    });
  }

  for (const note of notes) {
    entries.push({
      time: note.created_at,
      type: "note",
      description: `${note.created_by || "Staff"}: "${note.note}"`,
    });
  }

  return entries.sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());
}
