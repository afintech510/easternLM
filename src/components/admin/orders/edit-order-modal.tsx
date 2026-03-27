"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { formatUsd } from "@/lib/format";

const TIME_WINDOWS = [
  { value: "morning", label: "Morning (7-10 AM)" },
  { value: "midday", label: "Midday (10 AM-1 PM)" },
  { value: "afternoon", label: "Afternoon (1-5 PM)" },
  { value: "flexible", label: "Flexible" },
];

const CONSTRAINT_KEYS = [
  { key: "narrowDriveway", label: "Narrow Driveway" },
  { key: "gated", label: "Gated" },
  { key: "softGround", label: "Soft Ground" },
  { key: "lowWires", label: "Low Wires" },
  { key: "steep", label: "Steep Grade" },
  { key: "backyard", label: "Backyard Access" },
];

export interface EditOrderData {
  id: string;
  customer_name: string | null;
  customer_phone: string | null;
  customer_email: string | null;
  delivery_method: string;
  delivery_address: string | null;
  delivery_date: string | null;
  delivery_time_window: string | null;
  delivery_notes: string | null;
  delivery_total_cents: number;
  access_constraints: Record<string, unknown> | null;
  items: Array<{
    id: string;
    product_name: string;
    quantity: number;
    unit: string;
    unit_price_cents: number;
    line_subtotal_cents: number;
  }>;
}

interface Props {
  order: EditOrderData;
  onClose: () => void;
  onSave: (orderId: string, updates: Record<string, unknown>) => Promise<void>;
}

export function EditOrderModal({ order, onClose, onSave }: Props) {
  const [customerName, setCustomerName] = useState(order.customer_name || "");
  const [customerPhone, setCustomerPhone] = useState(order.customer_phone || "");
  const [customerEmail, setCustomerEmail] = useState(order.customer_email || "");
  const [deliveryAddress, setDeliveryAddress] = useState(order.delivery_address || "");
  const [deliveryDate, setDeliveryDate] = useState(order.delivery_date || "");
  const [deliveryTimeWindow, setDeliveryTimeWindow] = useState(order.delivery_time_window || "");
  const [deliveryNotes, setDeliveryNotes] = useState(order.delivery_notes || "");
  const [deliveryFeeDollars, setDeliveryFeeDollars] = useState(
    ((order.delivery_total_cents || 0) / 100).toFixed(2),
  );
  const [constraints, setConstraints] = useState<Record<string, boolean>>(() => {
    const c = (order.access_constraints || {}) as Record<string, unknown>;
    const result: Record<string, boolean> = {};
    for (const { key } of CONSTRAINT_KEYS) {
      result[key] = c[key] === true;
    }
    return result;
  });
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    const updates: Record<string, unknown> = {
      customer_name: customerName || null,
      customer_phone: customerPhone || null,
      customer_email: customerEmail || null,
    };

    if (order.delivery_method === "delivery") {
      updates.delivery_address = deliveryAddress || null;
      updates.delivery_date = deliveryDate || null;
      updates.delivery_time_window = deliveryTimeWindow || null;
      updates.delivery_notes = deliveryNotes || null;
      updates.delivery_total_cents = Math.round(parseFloat(deliveryFeeDollars || "0") * 100);
      updates.access_constraints = {
        ...constraints,
        notes: (order.access_constraints as Record<string, unknown>)?.notes || "",
      };
    }

    await onSave(order.id, updates);
    setSaving(false);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div
        className="bg-card rounded-xl border shadow-xl w-full max-w-lg max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b sticky top-0 bg-card z-10">
          <h2 className="font-bold text-lg">Edit Order #{order.id.slice(0, 8)}</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-4 space-y-5">
          {/* Customer */}
          <section>
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">Customer</h3>
            <div className="grid gap-3">
              <div>
                <label className="text-xs text-muted-foreground">Name</label>
                <input
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full h-9 rounded-lg border px-3 text-sm mt-0.5"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground">Phone</label>
                  <input
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    className="w-full h-9 rounded-lg border px-3 text-sm mt-0.5"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Email</label>
                  <input
                    value={customerEmail}
                    onChange={(e) => setCustomerEmail(e.target.value)}
                    className="w-full h-9 rounded-lg border px-3 text-sm mt-0.5"
                  />
                </div>
              </div>
            </div>
          </section>

          {/* Delivery */}
          {order.delivery_method === "delivery" && (
            <section>
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">Delivery</h3>
              <div className="grid gap-3">
                <div>
                  <label className="text-xs text-muted-foreground">Address</label>
                  <input
                    value={deliveryAddress}
                    onChange={(e) => setDeliveryAddress(e.target.value)}
                    className="w-full h-9 rounded-lg border px-3 text-sm mt-0.5"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-muted-foreground">Date</label>
                    <input
                      type="date"
                      value={deliveryDate}
                      onChange={(e) => setDeliveryDate(e.target.value)}
                      className="w-full h-9 rounded-lg border px-3 text-sm mt-0.5"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">Time Window</label>
                    <select
                      value={deliveryTimeWindow}
                      onChange={(e) => setDeliveryTimeWindow(e.target.value)}
                      className="w-full h-9 rounded-lg border px-3 text-sm mt-0.5"
                    >
                      <option value="">Select...</option>
                      {TIME_WINDOWS.map((tw) => (
                        <option key={tw.value} value={tw.value}>{tw.label}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Notes</label>
                  <textarea
                    value={deliveryNotes}
                    onChange={(e) => setDeliveryNotes(e.target.value)}
                    className="w-full rounded-lg border px-3 py-2 text-sm mt-0.5"
                    rows={2}
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Access Constraints</label>
                  <div className="flex flex-wrap gap-3">
                    {CONSTRAINT_KEYS.map(({ key, label }) => (
                      <label key={key} className="flex items-center gap-1.5 text-sm">
                        <input
                          type="checkbox"
                          checked={constraints[key] || false}
                          onChange={(e) => setConstraints((prev) => ({ ...prev, [key]: e.target.checked }))}
                          className="h-4 w-4 rounded"
                        />
                        {label}
                      </label>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Delivery Fee ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={deliveryFeeDollars}
                    onChange={(e) => setDeliveryFeeDollars(e.target.value)}
                    className="w-full h-9 rounded-lg border px-3 text-sm mt-0.5"
                  />
                </div>
              </div>
            </section>
          )}

          {/* Items (read-only with quantities) */}
          <section>
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">Items</h3>
            <div className="space-y-1">
              {order.items
                .filter((i) => !i.product_name?.startsWith("Delivery Load") && !i.product_name?.startsWith("Sales Tax") && !i.product_name?.startsWith("Credit Card"))
                .map((item) => {
                  const unit = item.unit === "unit" || !item.unit ? "cu. yard" : item.unit;
                  return (
                    <div key={item.id} className="flex justify-between text-sm py-1.5 border-b border-border/50">
                      <span>
                        {item.quantity} {unit}{item.quantity !== 1 ? "s" : ""} {item.product_name}
                      </span>
                      <span className="font-medium">{formatUsd(item.line_subtotal_cents)}</span>
                    </div>
                  );
                })}
            </div>
          </section>
        </div>

        <div className="flex items-center justify-end gap-2 p-4 border-t sticky bottom-0 bg-card">
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </div>
    </div>
  );
}
