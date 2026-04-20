"use client";

import { useState } from "react";
import { X, Loader2, Mail, MessageSquare, Save, MapPin, Truck, AlertTriangle, Clock } from "lucide-react";
import { formatUsd } from "@/lib/format";

const TAX_RATE = 0.0875;
const CC_RATE = 0.035;

const SERVICE_INTERESTS = [
  { value: "none", label: "None" },
  { value: "mulch-spreading", label: "Mulch Spreading / Installation" },
  { value: "gravel-install", label: "Gravel / Driveway Installation" },
  { value: "topsoil-grading", label: "Topsoil Grading / Lawn Prep" },
  { value: "driveway-resurface", label: "Driveway Resurfacing" },
  { value: "landscaping", label: "Landscaping Services" },
  { value: "masonry", label: "Masonry / Patio / Walkway" },
  { value: "property-maintenance", label: "Property Maintenance" },
  { value: "other", label: "Other — see notes" },
];

interface CartItem {
  id: string;
  product: { id: string; name: string; slug: string };
  quantity: number;
  price_cents: number;
  unit?: string;
}

interface Props {
  items: CartItem[];
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  customerId: string | null;
  deliveryMethod: string;
  deliveryAddress: string;
  deliveryFeeCents: number;
  deliveryDate: string;
  deliveryTimeWindow: string;
  deliveryNotes: string;
  accessConstraints: Record<string, boolean>;
  routeInfo: { roundTripMiles: number; roundTripMinutes: number } | null;
  defaultMode: "send" | "hold";
  onClose: () => void;
  onSuccess: (result: { mode: string; quoteNumber: string; quoteUrl: string }) => void;
}

const CONSTRAINT_LABELS: Record<string, string> = {
  low_wires: "Low Wires",
  narrow_driveway: "Narrow Driveway",
  soft_ground: "Soft Ground",
  gated: "Gated",
  steep: "Steep Approach",
  backyard: "Backyard Access",
};

export function SaveQuoteModal({
  items, customerName, customerPhone, customerEmail, customerId,
  deliveryMethod, deliveryAddress, deliveryFeeCents,
  deliveryDate, deliveryTimeWindow, deliveryNotes,
  accessConstraints, routeInfo,
  defaultMode, onClose, onSuccess,
}: Props) {
  const [notes, setNotes] = useState("");
  const [serviceInterest, setServiceInterest] = useState("none");
  const [sending, setSending] = useState(false);

  const subtotalCents = items.reduce((s, i) => s + i.quantity * i.price_cents, 0);
  const isDelivery = deliveryMethod === "delivery";
  const materialsPlusDel = subtotalCents + (isDelivery ? deliveryFeeCents : 0);
  const taxCents = Math.round(materialsPlusDel * TAX_RATE);
  const cashTotal = materialsPlusDel + taxCents;
  const ccSurcharge = Math.round(cashTotal * CC_RATE);
  const cardTotal = cashTotal + ccSurcharge;

  const canSend = !!(customerPhone || customerEmail);
  const activeConstraints = Object.entries(accessConstraints).filter(([, v]) => v).map(([k]) => CONSTRAINT_LABELS[k] || k);

  async function handleSave(send: boolean, sendVia: "email" | "sms" | "both" = "email") {
    setSending(true);
    try {
      const res = await fetch("/api/pos/save-quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: items.map((i) => ({
            name: i.product.name,
            quantity: i.quantity,
            unitPriceCents: i.price_cents,
            unit: i.unit ?? "yard",
            categorySlug: (i.product as any).category_slug,
          })),
          customer: { id: customerId, name: customerName, phone: customerPhone, email: customerEmail },
          delivery: isDelivery ? { address: deliveryAddress, feeCents: deliveryFeeCents, date: deliveryDate, timeWindow: deliveryTimeWindow, notes: deliveryNotes } : null,
          accessConstraints,
          notes,
          serviceInterest,
          send,
          sendVia,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Failed to save");
        setSending(false);
        return;
      }
      onSuccess({
        mode: send ? "sent" : "held",
        quoteNumber: data.quote.quoteNumber,
        quoteUrl: data.quote.quoteUrl,
      });
    } catch {
      alert("Network error");
      setSending(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="relative w-full max-w-lg max-h-[92vh] flex flex-col rounded-2xl border border-zinc-700 bg-zinc-900 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-800 px-5 py-3">
          <h2 className="text-lg font-semibold text-zinc-100">Quick Quote</h2>
          <button onClick={onClose} className="text-zinc-500 hover:text-zinc-300"><X className="size-5" /></button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-3 space-y-3" style={{ scrollbarWidth: "thin", scrollbarColor: "#d97706 transparent" }}>
          {/* Customer */}
          <section>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500 mb-1">Customer</p>
            <div className="text-sm text-zinc-200">
              <p className="font-medium">{customerName || "Walk-in"}</p>
              {customerPhone && <p className="text-xs text-zinc-400">{customerPhone}</p>}
              {customerEmail && <p className="text-xs text-zinc-400">{customerEmail}</p>}
            </div>
            {!canSend && (
              <p className="mt-1 text-[10px] text-amber-400">Add phone or email on the Delivery tab to send quote</p>
            )}
          </section>

          {/* Delivery */}
          {isDelivery && (
            <section>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500 mb-1">Delivery</p>
              <div className="rounded-lg border border-zinc-800 bg-zinc-800/50 p-2.5 space-y-1 text-xs">
                {deliveryAddress && (
                  <div className="flex items-start gap-1.5">
                    <MapPin className="size-3.5 text-zinc-500 mt-0.5 shrink-0" />
                    <span className="text-zinc-300">{deliveryAddress}</span>
                  </div>
                )}
                {routeInfo && (
                  <div className="flex items-center gap-1.5">
                    <Truck className="size-3.5 text-zinc-500 shrink-0" />
                    <span className="text-zinc-400">{routeInfo.roundTripMiles} mi · ~{routeInfo.roundTripMinutes} min · Fee: {formatUsd(deliveryFeeCents)}</span>
                  </div>
                )}
                {(deliveryDate || deliveryTimeWindow) && (
                  <div className="flex items-center gap-1.5">
                    <Clock className="size-3.5 text-zinc-500 shrink-0" />
                    <span className="text-zinc-400">{deliveryDate || ""} · {deliveryTimeWindow || "Flexible"}</span>
                  </div>
                )}
                {activeConstraints.length > 0 && (
                  <div className="flex items-center gap-1.5">
                    <AlertTriangle className="size-3.5 text-amber-500 shrink-0" />
                    <span className="text-amber-400">{activeConstraints.join(", ")}</span>
                  </div>
                )}
                {deliveryNotes && <p className="text-zinc-500 pl-5">"{deliveryNotes}"</p>}
              </div>
            </section>
          )}

          {/* Items */}
          <section>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500 mb-1">Items</p>
            <div className="space-y-1">
              {items.map((item) => (
                <div key={item.id} className="flex justify-between text-sm">
                  <span className="text-zinc-300">{item.quantity} {item.unit ?? "yd"} {item.product.name}</span>
                  <span className="text-zinc-400 shrink-0 ml-2">{formatUsd(item.quantity * item.price_cents)}</span>
                </div>
              ))}
            </div>
          </section>

          {/* Totals */}
          <section className="rounded-lg border border-zinc-800 bg-zinc-800/50 p-3">
            <div className="space-y-1 text-sm">
              <div className="flex justify-between"><span className="text-zinc-400">Materials</span><span>{formatUsd(subtotalCents)}</span></div>
              {isDelivery && deliveryFeeCents > 0 && (
                <div className="flex justify-between"><span className="text-zinc-400">Delivery</span><span>{formatUsd(deliveryFeeCents)}</span></div>
              )}
              <div className="flex justify-between"><span className="text-zinc-400">Tax (8.75%)</span><span>{formatUsd(taxCents)}</span></div>
              <div className="border-t border-zinc-700 pt-1 mt-1" />
              <div className="flex justify-between font-semibold"><span>Cash / COD Total</span><span className="text-amber-400">{formatUsd(cashTotal)}</span></div>
              <div className="flex justify-between text-zinc-400"><span>Card Total (+ 3.5% CC)</span><span>{formatUsd(cardTotal)}</span></div>
            </div>
          </section>

          {/* Service Interest */}
          <section>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500 mb-1">Service Interest</p>
            <select
              value={serviceInterest}
              onChange={(e) => setServiceInterest(e.target.value)}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-amber-500"
            >
              {SERVICE_INTERESTS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </section>

          {/* Notes */}
          <section>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500 mb-1">Notes</p>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Call notes, customer preferences, follow-up reminders..."
              rows={2}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-amber-500"
            />
          </section>
        </div>

        {/* Footer — action buttons */}
        <div className="border-t border-zinc-800 px-5 py-3 space-y-2">
          <div className="flex gap-2">
            {canSend && customerEmail && (
              <button
                onClick={() => handleSave(true, "email")}
                disabled={sending}
                className="flex-1 flex items-center justify-center gap-1.5 rounded-lg bg-green-700 py-2.5 text-sm font-semibold text-white hover:bg-green-600 disabled:opacity-50"
              >
                {sending ? <Loader2 className="size-4 animate-spin" /> : <Mail className="size-4" />}
                Email Quote
              </button>
            )}
            {canSend && customerEmail && customerPhone && (
              <button
                onClick={() => handleSave(true, "both")}
                disabled={sending}
                className="flex-1 flex items-center justify-center gap-1.5 rounded-lg bg-green-700 py-2.5 text-sm font-semibold text-white hover:bg-green-600 disabled:opacity-50"
              >
                {sending ? <Loader2 className="size-4 animate-spin" /> : <><Mail className="size-3.5" /><MessageSquare className="size-3.5" /></>}
                Both
              </button>
            )}
            <button
              onClick={() => handleSave(false)}
              disabled={sending}
              className="flex-1 flex items-center justify-center gap-1.5 rounded-lg border border-zinc-600 py-2.5 text-sm font-medium text-zinc-300 hover:bg-zinc-800 disabled:opacity-50"
            >
              {sending ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
              Hold
            </button>
          </div>
          <button onClick={onClose} className="w-full text-center text-xs text-zinc-500 hover:text-zinc-300 py-1">Cancel</button>
        </div>
      </div>
    </div>
  );
}
