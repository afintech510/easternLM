"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import {
  X, Search, Plus, Minus, Trash2,
  Loader2, Mail, MessageSquare, Save, Printer,
} from "lucide-react";
import { formatUsd } from "@/lib/format";

// ─── Types ─────────────────────────────────────────────────────────────────

type PosProduct = {
  id: string;
  name: string;
  slug: string;
  price_per_unit_cents: number;
  unit_label: string;
  category_slug: string;
  category_name: string;
  delivery_type: string;
  min_qty: number;
  qty_step: number;
  pallet_qty: number | null;
  pallet_price_cents: number | null;
  half_yard_enabled: boolean;
  half_yard_adder_cents: number;
  image_url?: string | null;
};

type LineItem = {
  id: string;
  product: PosProduct;
  quantity: number;
  price_cents: number;
  note?: string;
};

type RouteInfo = { roundTripMiles: number; roundTripMinutes: number };

export type QuoteCustomer = {
  name: string;
  phone: string;
  email: string;
  id: string | null;
};

export type QuoteDelivery = {
  method: "pickup" | "delivery";
  address: string;
  feeCents: number;
  date: string;
  timeWindow: string;
  notes: string;
  constraints: Record<string, boolean>;
  routeInfo: RouteInfo | null;
};

// ─── Constants ──────────────────────────────────────────────────────────────

const TAX_RATE = 0.0875;
const CC_RATE = 0.035;

const ACCESS_CONSTRAINTS = [
  { key: "low_wires", label: "Low Wires" },
  { key: "narrow_driveway", label: "Narrow" },
  { key: "soft_ground", label: "Soft Ground" },
  { key: "gated", label: "Gated" },
  { key: "steep", label: "Steep" },
  { key: "backyard", label: "Backyard" },
];

const TIME_WINDOWS = [
  { value: "morning", label: "Morning (7-10 AM)" },
  { value: "midday", label: "Mid-day (10 AM-1 PM)" },
  { value: "afternoon", label: "Afternoon (1-4 PM)" },
  { value: "flexible", label: "Flexible" },
];

const SERVICE_INTERESTS = [
  { value: "none", label: "None — material order only" },
  { value: "mulch-spreading", label: "Mulch Spreading / Installation" },
  { value: "gravel-install", label: "Gravel / Driveway Installation" },
  { value: "topsoil-grading", label: "Topsoil Grading / Lawn Prep" },
  { value: "driveway-resurface", label: "Driveway Resurfacing" },
  { value: "landscaping", label: "Landscaping Services" },
  { value: "masonry", label: "Masonry / Patio / Walkway" },
  { value: "property-maintenance", label: "Property Maintenance" },
  { value: "other", label: "Other — see notes" },
];

// ─── Props ──────────────────────────────────────────────────────────────────

interface Props {
  open: boolean;
  onClose: () => void;
  onSuccess: (result: { mode: string; quoteNumber: string; quoteUrl: string }) => void;
  onPrint?: (quoteData: { id: string; quoteNumber: string; items: LineItem[]; customer: QuoteCustomer; delivery: QuoteDelivery; subtotalCents: number; deliveryFeeCents: number; taxCents: number; totalCents: number }) => void;
  // Catalog
  products: PosProduct[];
  // Cart
  items: LineItem[];
  onAddItem: (product: PosProduct, qty?: number) => void;
  onUpdateQty: (itemId: string, qty: number) => void;
  onRemoveItem: (itemId: string) => void;
  onUpdateItemPrice: (itemId: string, priceCents: number) => void;
  // Customer (controlled)
  customer: QuoteCustomer;
  onCustomerChange: (patch: Partial<QuoteCustomer>) => void;
  // Delivery (controlled)
  delivery: QuoteDelivery;
  onDeliveryChange: (patch: Partial<QuoteDelivery>) => void;
}

// ─── Component ──────────────────────────────────────────────────────────────

export function QuoteBuilder({
  open, onClose, onSuccess, onPrint,
  products, items, onAddItem, onUpdateQty, onRemoveItem, onUpdateItemPrice,
  customer, onCustomerChange,
  delivery, onDeliveryChange,
}: Props) {
  const [searchQuery, setSearchQuery] = useState("");
  const [editingPriceId, setEditingPriceId] = useState<string | null>(null);
  const [editingPriceVal, setEditingPriceVal] = useState("");
  const [serviceInterest, setServiceInterest] = useState("none");
  const [callNotes, setCallNotes] = useState("");
  const [sending, setSending] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [customerMatch, setCustomerMatch] = useState<{ name: string; totalOrders: number } | null | undefined>(undefined);
  const [calcingFee, setCalcingFee] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  // Reset local state when opened
  useEffect(() => {
    if (open) {
      setSearchQuery("");
      setServiceInterest("none");
      setCallNotes("");
      setSending(false);
      setErrors([]);
      setCustomerMatch(undefined);
    }
  }, [open]);

  // Keyboard shortcuts
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      const inField = tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";
      if (e.key === "Escape") { onClose(); return; }
      if (!inField && (e.key === "/" || (e.ctrlKey && e.key === "k"))) {
        e.preventDefault();
        searchRef.current?.focus();
      }
      if (e.ctrlKey && !e.shiftKey && e.key === "Enter") { e.preventDefault(); handleSend(true, "email"); }
      if (e.ctrlKey && e.shiftKey && e.key === "Enter") { e.preventDefault(); handleSend(true, "both"); }
      if (e.ctrlKey && e.key === "s") { e.preventDefault(); handleSend(false); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, customer, delivery, items, serviceInterest, callNotes]);

  // Product search
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase();
    return products
      .filter(p => p.name.toLowerCase().includes(q) || p.slug.includes(q))
      .slice(0, 8);
  }, [products, searchQuery]);

  // Customer phone lookup
  async function lookupCustomer(phone: string) {
    if (phone.replace(/\D/g, "").length < 10) { setCustomerMatch(undefined); return; }
    try {
      const res = await fetch(`/api/admin/customers/search?q=${encodeURIComponent(phone)}`);
      if (res.ok) {
        const data = await res.json();
        const found = data.customers?.[0];
        if (found) {
          const name = [found.first_name, found.last_name].filter(Boolean).join(" ") || found.company_name || "";
          setCustomerMatch({ name, totalOrders: found.total_orders });
          const patch: Partial<QuoteCustomer> = { id: found.id };
          if (!customer.name || customer.name === "Walk-in") patch.name = name;
          if (!customer.email && found.email) patch.email = found.email;
          onCustomerChange(patch);
        } else {
          setCustomerMatch(null);
        }
      }
    } catch { setCustomerMatch(undefined); }
  }

  // Address → delivery fee
  async function calcDeliveryFee(address: string) {
    if (!address.trim()) return;
    setCalcingFee(true);
    try {
      const res = await fetch("/api/delivery/distance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address }),
      });
      if (res.ok) {
        const data = await res.json();
        const oneWayMiles = data.distanceMeters / 1609.344;
        const roundTripMiles = Math.round(oneWayMiles * 2 * 10) / 10;
        const roundTripMinutes = Math.round((data.durationSeconds * 2 + 5 * 60) / 60);
        const routeInfo = { roundTripMiles, roundTripMinutes };
        const fuelCost = (roundTripMiles / 6) * 5;
        const laborCost = (roundTripMinutes / 60) * 32;
        const withProfit = (fuelCost + laborCost) * 2;
        const fee = Math.max(Math.ceil(withProfit / 5) * 5, 25);
        onDeliveryChange({ routeInfo, feeCents: fee * 100 });
      }
    } catch { /* silently fail */ }
    setCalcingFee(false);
  }

  // Price override commit
  function commitPriceEdit(itemId: string) {
    const cents = Math.round(parseFloat(editingPriceVal) * 100);
    if (!isNaN(cents) && cents > 0) onUpdateItemPrice(itemId, cents);
    setEditingPriceId(null);
  }

  // Totals
  const subtotalCents = useMemo(
    () => items.reduce((s, i) => s + i.quantity * i.price_cents, 0),
    [items],
  );
  const isDelivery = delivery.method === "delivery";
  const deliveryTotal = isDelivery ? delivery.feeCents : 0;
  const taxCents = Math.round((subtotalCents + deliveryTotal) * TAX_RATE);
  const cashTotal = subtotalCents + deliveryTotal + taxCents;
  const cardTotal = cashTotal + Math.round(cashTotal * CC_RATE);

  // Validation
  function validate(send: boolean, via: "email" | "sms" | "both"): string[] {
    const errs: string[] = [];
    if (items.length === 0) errs.push("Add at least one item");
    if (send) {
      if (!customer.email && !customer.phone) errs.push("Add customer phone or email to send");
      if (via === "email" && !customer.email) errs.push("Add email address to send email");
      if (via === "both" && !customer.phone) errs.push("Add phone to send SMS");
    }
    if (isDelivery && !delivery.address) errs.push("Enter a delivery address");
    if (isDelivery && delivery.address && !delivery.feeCents) errs.push("Delivery fee not calculated yet");
    return errs;
  }

  async function handleSend(send: boolean, via: "email" | "sms" | "both" = "email") {
    const errs = validate(send, via);
    if (errs.length) { setErrors(errs); return; }
    setErrors([]);
    setSending(true);
    try {
      const res = await fetch("/api/pos/save-quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: items.map(i => ({
            name: i.product.name,
            quantity: i.quantity,
            unitPriceCents: i.price_cents,
            unit: i.product.unit_label || "yard",
            categorySlug: i.product.category_slug,
          })),
          customer: { id: customer.id, name: customer.name, phone: customer.phone, email: customer.email },
          delivery: isDelivery ? {
            address: delivery.address,
            feeCents: delivery.feeCents,
            date: delivery.date,
            timeWindow: delivery.timeWindow,
            notes: delivery.notes,
          } : null,
          accessConstraints: delivery.constraints,
          routeInfo: delivery.routeInfo,
          notes: callNotes,
          serviceInterest,
          send,
          sendVia: via,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setErrors([data.error || "Failed to save"]); setSending(false); return; }
      onSuccess({ mode: send ? "sent" : "held", quoteNumber: data.quote.quoteNumber, quoteUrl: data.quote.quoteUrl });
    } catch {
      setErrors(["Network error — check connection"]);
      setSending(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-zinc-950 flex flex-col overflow-hidden">

      {/* ── Header ── */}
      <div className="shrink-0 flex items-center justify-between px-6 py-3 border-b border-zinc-800 bg-zinc-900">
        <div>
          <h1 className="text-lg font-bold text-zinc-100">Quote Builder</h1>
          <p className="text-[11px] text-zinc-600">/ search · Ctrl+Enter email · Ctrl+Shift+Enter email+SMS · Ctrl+S hold · Esc close</p>
        </div>
        <button
          onClick={onClose}
          className="size-9 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 flex items-center justify-center transition-colors"
        >
          <X className="size-5" />
        </button>
      </div>

      {/* ── Body ── */}
      <div className="flex-1 flex overflow-hidden min-h-0">

        {/* LEFT: Product search + cart items */}
        <div className="w-[60%] flex flex-col border-r border-zinc-800 overflow-hidden">
          <div
            className="flex-1 overflow-y-auto px-5 py-4 space-y-5"
            style={{ scrollbarWidth: "thin", scrollbarColor: "#3f3f46 transparent" }}
          >

            {/* Product search */}
            <div className="space-y-2">
              <p className="text-[11px] font-bold uppercase tracking-wider text-zinc-500">Add Products</p>
              <div className="relative">
                <Search className="absolute left-3 top-3 size-5 text-zinc-500 pointer-events-none" />
                <input
                  ref={searchRef}
                  type="text"
                  placeholder="Search products to add..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full h-11 rounded-xl border border-zinc-700 bg-zinc-900 text-white pl-10 pr-9 text-sm focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-3 top-3.5 text-zinc-500 hover:text-zinc-300"
                  >
                    <X className="size-4" />
                  </button>
                )}
              </div>

              {searchResults.length > 0 && (
                <div className="rounded-xl border border-zinc-700 bg-zinc-900 overflow-hidden divide-y divide-zinc-800">
                  {searchResults.map(product => (
                    <div
                      key={product.id}
                      className="flex items-center justify-between px-3 py-2.5 hover:bg-zinc-800 cursor-pointer transition-colors"
                      onClick={() => {
                        onAddItem(product, product.min_qty || 1);
                        setSearchQuery("");
                      }}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {product.image_url ? (
                          <img src={product.image_url} alt="" className="size-10 rounded-lg object-cover shrink-0" />
                        ) : (
                          <div className="size-10 rounded-lg bg-zinc-800 shrink-0" />
                        )}
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-zinc-100 truncate">{product.name}</p>
                          <p className="text-xs text-zinc-500">
                            {formatUsd(product.price_per_unit_cents)} / {product.unit_label}
                          </p>
                        </div>
                      </div>
                      <div className="size-9 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0 hover:bg-amber-500/30 transition-colors">
                        <Plus className="size-4" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Quote items */}
            <div className="space-y-2">
              <p className="text-[11px] font-bold uppercase tracking-wider text-zinc-500">
                Quote Items{items.length > 0 && <span className="text-zinc-600 ml-1">({items.length})</span>}
              </p>

              {items.length === 0 ? (
                <div className="rounded-xl border border-dashed border-zinc-800 py-12 text-center text-sm text-zinc-600">
                  Search for products above to add to this quote
                </div>
              ) : (
                <div className="rounded-xl border border-zinc-800 overflow-hidden divide-y divide-zinc-800">
                  {items.map(item => {
                    const step = item.product.qty_step || 1;
                    const isPriceCustom = item.price_cents !== item.product.price_per_unit_cents;
                    return (
                      <div key={item.id} className="flex items-center gap-3 p-3 bg-zinc-900">
                        {item.product.image_url ? (
                          <img src={item.product.image_url} alt="" className="size-14 rounded-lg object-cover shrink-0" />
                        ) : (
                          <div className="size-14 rounded-lg bg-zinc-800 shrink-0" />
                        )}

                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-zinc-100 truncate">{item.product.name}</p>
                          {editingPriceId === item.id ? (
                            <div className="flex items-center gap-1 mt-0.5">
                              <span className="text-xs text-zinc-500">$</span>
                              <input
                                type="number"
                                value={editingPriceVal}
                                onChange={e => setEditingPriceVal(e.target.value)}
                                onBlur={() => commitPriceEdit(item.id)}
                                onKeyDown={e => {
                                  if (e.key === "Enter") commitPriceEdit(item.id);
                                  if (e.key === "Escape") setEditingPriceId(null);
                                }}
                                className="w-24 h-6 bg-zinc-800 border border-amber-500 rounded px-1.5 text-xs text-amber-400 focus:outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none"
                                autoFocus
                              />
                              <span className="text-xs text-zinc-500">/ {item.product.unit_label}</span>
                            </div>
                          ) : (
                            <p
                              className={`text-xs mt-0.5 cursor-pointer hover:text-amber-400 transition-colors ${isPriceCustom ? "text-amber-400" : "text-zinc-500"}`}
                              title="Double-click to override price"
                              onDoubleClick={() => {
                                setEditingPriceId(item.id);
                                setEditingPriceVal((item.price_cents / 100).toFixed(2));
                              }}
                            >
                              {formatUsd(item.price_cents)} / {item.product.unit_label}
                              {isPriceCustom && <span className="ml-1.5 text-[10px] opacity-70">✏ custom</span>}
                            </p>
                          )}
                        </div>

                        {/* Qty controls */}
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            onClick={() => onUpdateQty(item.id, Math.max(0, item.quantity - step))}
                            className="size-8 rounded-lg bg-zinc-800 text-zinc-300 hover:bg-zinc-700 flex items-center justify-center transition-colors"
                          >
                            <Minus className="size-3.5" />
                          </button>
                          <input
                            type="number"
                            value={item.quantity}
                            onChange={e => {
                              const v = parseFloat(e.target.value);
                              if (!isNaN(v)) onUpdateQty(item.id, v);
                            }}
                            className="w-20 h-8 rounded-lg border border-zinc-700 bg-zinc-900 text-center text-sm font-bold text-zinc-100 focus:outline-none focus:border-amber-500 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none"
                          />
                          <button
                            onClick={() => onUpdateQty(item.id, item.quantity + step)}
                            className="size-8 rounded-lg bg-zinc-800 text-zinc-300 hover:bg-zinc-700 flex items-center justify-center transition-colors"
                          >
                            <Plus className="size-3.5" />
                          </button>
                        </div>

                        <p className="w-28 text-right text-sm font-bold text-zinc-100 shrink-0 tabular-nums">
                          {formatUsd(item.quantity * item.price_cents)}
                        </p>

                        <button
                          onClick={() => onRemoveItem(item.id)}
                          className="size-8 rounded-lg text-zinc-600 hover:text-red-400 hover:bg-red-500/10 flex items-center justify-center transition-colors shrink-0"
                        >
                          <Trash2 className="size-4" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* RIGHT: Customer + Delivery + Notes */}
        <div
          className="w-[40%] overflow-y-auto px-5 py-4 space-y-5"
          style={{ scrollbarWidth: "thin", scrollbarColor: "#3f3f46 transparent" }}
        >

          {/* Customer */}
          <div className="space-y-2">
            <p className="text-[11px] font-bold uppercase tracking-wider text-zinc-500">Customer</p>
            <input
              placeholder="Name"
              value={customer.name === "Walk-in" ? "" : customer.name}
              onChange={e => onCustomerChange({ name: e.target.value || "Walk-in" })}
              className="w-full h-11 rounded-lg border border-zinc-700 bg-zinc-900 text-white px-3 text-sm focus:outline-none focus:ring-1 focus:ring-amber-500"
            />
            <div>
              <input
                placeholder="Phone"
                value={customer.phone}
                onChange={e => { onCustomerChange({ phone: e.target.value }); setCustomerMatch(undefined); }}
                onBlur={e => lookupCustomer(e.target.value)}
                className="w-full h-11 rounded-lg border border-zinc-700 bg-zinc-900 text-white px-3 text-sm focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
              {customerMatch !== undefined && (
                <p className={`text-xs mt-1 ${customerMatch ? "text-green-400" : "text-amber-400"}`}>
                  {customerMatch
                    ? `✓ Found: ${customerMatch.name} — ${customerMatch.totalOrders} order${customerMatch.totalOrders !== 1 ? "s" : ""}`
                    : "New customer — will be created on send"}
                </p>
              )}
            </div>
            <input
              placeholder="Email (optional)"
              type="email"
              value={customer.email}
              onChange={e => onCustomerChange({ email: e.target.value })}
              className="w-full h-11 rounded-lg border border-zinc-700 bg-zinc-900 text-white px-3 text-sm focus:outline-none focus:ring-1 focus:ring-amber-500"
            />
          </div>

          {/* Delivery */}
          <div className="space-y-2">
            <p className="text-[11px] font-bold uppercase tracking-wider text-zinc-500">Delivery</p>
            <div className="flex gap-2">
              {(["pickup", "delivery"] as const).map(m => (
                <button
                  key={m}
                  onClick={() => onDeliveryChange({ method: m })}
                  className={`flex-1 h-10 rounded-lg text-sm font-medium capitalize transition-colors ${
                    delivery.method === m
                      ? m === "delivery"
                        ? "bg-amber-600 text-white"
                        : "bg-zinc-700 text-white"
                      : "bg-zinc-900 text-zinc-500 border border-zinc-700 hover:border-zinc-500"
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>

            {isDelivery && (
              <>
                <div>
                  <input
                    placeholder="Delivery address"
                    value={delivery.address}
                    onChange={e => onDeliveryChange({ address: e.target.value, feeCents: 0, routeInfo: null })}
                    onBlur={e => calcDeliveryFee(e.target.value)}
                    className="w-full h-11 rounded-lg border border-zinc-700 bg-zinc-900 text-white px-3 text-sm focus:outline-none focus:ring-1 focus:ring-amber-500"
                  />
                  {calcingFee && (
                    <p className="text-xs text-zinc-500 mt-1 flex items-center gap-1.5">
                      <Loader2 className="size-3 animate-spin" /> Calculating fee...
                    </p>
                  )}
                  {!calcingFee && delivery.routeInfo && delivery.feeCents > 0 && (
                    <p className="text-xs text-green-400 mt-1">
                      ✅ {delivery.routeInfo.roundTripMiles} mi · ~{delivery.routeInfo.roundTripMinutes} min · {formatUsd(delivery.feeCents)}/load
                    </p>
                  )}
                </div>

                <div className="flex gap-2">
                  <input
                    type="date"
                    value={delivery.date}
                    onChange={e => onDeliveryChange({ date: e.target.value })}
                    className="flex-1 h-11 rounded-lg border border-zinc-700 bg-zinc-900 text-white px-3 text-sm focus:outline-none focus:ring-1 focus:ring-amber-500"
                  />
                  <select
                    value={delivery.timeWindow}
                    onChange={e => onDeliveryChange({ timeWindow: e.target.value })}
                    className="flex-1 h-11 rounded-lg border border-zinc-700 bg-zinc-900 text-white px-3 text-sm focus:outline-none focus:ring-1 focus:ring-amber-500"
                  >
                    {TIME_WINDOWS.map(w => <option key={w.value} value={w.value}>{w.label}</option>)}
                  </select>
                </div>

                <div className="grid grid-cols-3 gap-y-2 gap-x-3">
                  {ACCESS_CONSTRAINTS.map(c => (
                    <label key={c.key} className="flex items-center gap-1.5 text-xs text-zinc-400 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={!!delivery.constraints[c.key]}
                        onChange={e => onDeliveryChange({
                          constraints: { ...delivery.constraints, [c.key]: e.target.checked },
                        })}
                        className="size-3.5 rounded border-zinc-600 accent-amber-500"
                      />
                      {c.label}
                    </label>
                  ))}
                </div>

                <textarea
                  placeholder="Delivery notes (gate code, driveway instructions...)"
                  value={delivery.notes}
                  onChange={e => onDeliveryChange({ notes: e.target.value })}
                  rows={2}
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-900 text-white px-3 py-2 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </>
            )}
          </div>

          {/* Service Interest */}
          <div className="space-y-2">
            <p className="text-[11px] font-bold uppercase tracking-wider text-zinc-500">Service Interest</p>
            <select
              value={serviceInterest}
              onChange={e => setServiceInterest(e.target.value)}
              className="w-full h-11 rounded-lg border border-zinc-700 bg-zinc-900 text-white px-3 text-sm focus:outline-none focus:ring-1 focus:ring-amber-500"
            >
              {SERVICE_INTERESTS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>

          {/* Call Notes */}
          <div className="space-y-2">
            <p className="text-[11px] font-bold uppercase tracking-wider text-zinc-500">Call Notes</p>
            <textarea
              placeholder="Notes from the call (internal — customer won't see this)..."
              value={callNotes}
              onChange={e => setCallNotes(e.target.value)}
              rows={4}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-900 text-white px-3 py-2 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-amber-500"
            />
          </div>
        </div>
      </div>

      {/* ── Bottom Bar ── */}
      <div className="shrink-0 border-t border-zinc-800 bg-zinc-900 px-6 py-3">
        {errors.length > 0 && (
          <div className="mb-2 flex flex-wrap gap-x-4 gap-y-1">
            {errors.map((e, i) => (
              <span key={i} className="text-xs text-amber-400">⚠ {e}</span>
            ))}
          </div>
        )}
        <div className="flex items-center justify-between gap-4">
          {/* Totals */}
          <div className="flex items-center gap-5 flex-wrap text-sm">
            <div>
              <span className="text-zinc-500">Materials:</span>
              <span className="ml-1.5 font-bold text-zinc-100">{formatUsd(subtotalCents)}</span>
            </div>
            {isDelivery && delivery.feeCents > 0 && (
              <div>
                <span className="text-zinc-500">Delivery:</span>
                <span className="ml-1.5 font-bold text-zinc-100">{formatUsd(deliveryTotal)}</span>
              </div>
            )}
            <div>
              <span className="text-zinc-500">Tax:</span>
              <span className="ml-1.5 font-bold text-zinc-100">{formatUsd(taxCents)}</span>
            </div>
            <div className="border-l border-zinc-700 pl-5">
              <span className="text-zinc-400">Cash:</span>
              <span className="ml-1.5 font-bold text-zinc-100 text-base">{formatUsd(cashTotal)}</span>
            </div>
            <div>
              <span className="text-zinc-400">Card:</span>
              <span className="ml-1.5 font-bold text-amber-400 text-base">{formatUsd(cardTotal)}</span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={onClose}
              className="h-11 px-4 rounded-lg border border-zinc-600 text-zinc-400 text-sm hover:bg-zinc-800 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={() => handleSend(false)}
              disabled={sending}
              className="h-11 px-4 rounded-lg bg-zinc-700 text-white text-sm font-medium hover:bg-zinc-600 disabled:opacity-50 transition-colors flex items-center gap-2"
            >
              {sending ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
              Hold
            </button>
            {onPrint && (
              <button
                onClick={async () => {
                  const errs = validate(false, "email");
                  if (errs.length) { setErrors(errs); return; }
                  setErrors([]);
                  setSending(true);
                  try {
                    const res = await fetch("/api/pos/save-quote", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        items: items.map(i => ({ name: i.product.name, quantity: i.quantity, unitPriceCents: i.price_cents, unit: i.product.unit_label || "yard", categorySlug: i.product.category_slug })),
                        customer: { id: customer.id, name: customer.name, phone: customer.phone, email: customer.email },
                        delivery: isDelivery ? { address: delivery.address, feeCents: delivery.feeCents, date: delivery.date, timeWindow: delivery.timeWindow, notes: delivery.notes } : null,
                        accessConstraints: delivery.constraints,
                        routeInfo: delivery.routeInfo,
                        notes: callNotes,
                        serviceInterest,
                        send: false,
                      }),
                    });
                    const data = await res.json();
                    if (!res.ok) { setErrors([data.error || "Failed to save"]); setSending(false); return; }
                    onPrint({ id: data.quote.id, quoteNumber: data.quote.quoteNumber, items, customer, delivery, subtotalCents, deliveryFeeCents: deliveryTotal, taxCents, totalCents: cashTotal });
                    onSuccess({ mode: "print", quoteNumber: data.quote.quoteNumber, quoteUrl: data.quote.quoteUrl ?? "" });
                  } catch { setErrors(["Network error"]); }
                  setSending(false);
                }}
                disabled={sending || items.length === 0}
                className="h-11 px-4 rounded-lg bg-amber-700 text-white text-sm font-semibold hover:bg-amber-600 disabled:opacity-40 transition-colors flex items-center gap-2"
              >
                {sending ? <Loader2 className="size-4 animate-spin" /> : <Printer className="size-4" />}
                Print
              </button>
            )}
            <button
              onClick={() => handleSend(true, "email")}
              disabled={sending || !customer.email}
              className="h-11 px-5 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-500 disabled:opacity-40 transition-colors flex items-center gap-2"
            >
              {sending ? <Loader2 className="size-4 animate-spin" /> : <Mail className="size-4" />}
              Email
            </button>
            <button
              onClick={() => handleSend(true, "both")}
              disabled={sending || (!customer.email && !customer.phone)}
              className="h-11 px-5 rounded-lg bg-amber-600 text-white text-sm font-semibold hover:bg-amber-500 disabled:opacity-40 transition-colors flex items-center gap-2"
            >
              {sending ? <Loader2 className="size-4 animate-spin" /> : (
                <><Mail className="size-3.5" /><MessageSquare className="size-3.5" /></>
              )}
              Email + SMS
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
