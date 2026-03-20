"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, ArrowLeft, ArrowUpDown, Loader2 as Spin, Minus, Phone, Plus, ShoppingCart, Trash2, Truck, Store, FileText, MessageSquare } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AddressAutocomplete } from "@/components/ui/address-autocomplete";
import { useCartStore } from "@/stores/cartStore";
import { siteConfig } from "@/config/site";

function formatUsd(cents: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);
}

function getDefaultDeliveryDate() {
  const now = new Date();
  const candidate = new Date(now);
  if (now.getDay() >= 1 && now.getDay() <= 5 && now.getHours() < 11) return candidate.toISOString().slice(0, 10);
  candidate.setDate(candidate.getDate() + 1);
  while (candidate.getDay() === 0) candidate.setDate(candidate.getDate() + 1);
  return candidate.toISOString().slice(0, 10);
}

const TIME_WINDOWS = [
  { value: "early", label: "Early Morning (7:30 AM – 9:00 AM)" },
  { value: "morning", label: "Morning (8:00 AM – 12:00 PM)" },
  { value: "afternoon", label: "Afternoon (12:00 PM – 5:00 PM)" },
  { value: "flexible", label: "Flexible — anytime during business hours" },
];

export function CartPageClient() {
  const items = useCartStore((s) => s.items);
  const deliveryAddress = useCartStore((s) => s.deliveryAddress);
  const deliveryMethod = useCartStore((s) => s.deliveryMethod);
  const promoCode = useCartStore((s) => s.promoCode);
  const combineLoads = useCartStore((s) => s.combineLoads);
  const accessConstraints = useCartStore((s) => s.accessConstraints);
  const calculation = useCartStore((s) => s.deliveryCalculation);
  const isCalculating = useCartStore((s) => s.isCalculating);
  const error = useCartStore((s) => s.error);
  const removeItem = useCartStore((s) => s.removeItem);
  const updateQuantity = useCartStore((s) => s.updateQuantity);
  const setDeliveryAddress = useCartStore((s) => s.setDeliveryAddress);
  const toggleDeliveryMethod = useCartStore((s) => s.toggleDeliveryMethod);
  const toggleCombineLoads = useCartStore((s) => s.toggleCombineLoads);
  const applyPromoCode = useCartStore((s) => s.applyPromoCode);
  const setAccessConstraints = useCartStore((s) => s.setAccessConstraints);
  const loadDeliveryConfig = useCartStore((s) => s.loadDeliveryConfig);
  const addItem = useCartStore((s) => s.addItem);
  const swapItems = useCartStore((s) => s.swapItems);
  const setCustomerInfo = useCartStore((s) => s.setCustomerInfo);
  const storedCustomer = useCartStore((s) => s.customerInfo);

  const [addressInput, setAddressInput] = useState(deliveryAddress?.fullAddress ?? "");
  const [promoInput, setPromoInput] = useState(promoCode);
  const [deliveryDate, setDeliveryDate] = useState(getDefaultDeliveryDate());
  const [timeWindow, setTimeWindow] = useState("flexible");

  // Lead capture
  const [custName, setCustNameLocal] = useState(storedCustomer?.fullName || "");
  const [custPhone, setCustPhoneLocal] = useState(storedCustomer?.phone || "");
  const [custEmail, setCustEmailLocal] = useState(storedCustomer?.email || "");
  const setCustName = (v: string) => { setCustNameLocal(v); setCustomerInfo({ fullName: v }); };
  const setCustPhone = (v: string) => { setCustPhoneLocal(v); setCustomerInfo({ phone: v }); };
  const setCustEmail = (v: string) => { setCustEmailLocal(v); setCustomerInfo({ email: v }); };
  const [smsOptIn, setSmsOptIn] = useState(false);
  const [savingQuote, setSavingQuote] = useState(false);

  useEffect(() => { loadDeliveryConfig().catch(() => undefined); }, [loadDeliveryConfig]);

  // Restore saved cart from ?restore=TOKEN
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("restore");
    if (!token) return;
    fetch(`/api/cart/restore?token=${token}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.items?.length) {
          data.items.forEach((item: any) => addItem(item));
          toast.success("Cart restored!", { description: `${data.items.length} items loaded.` });
          window.history.replaceState({}, "", "/cart");
        }
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-calculate delivery fee when address changes
  function handleAddressSelect(addr: string) {
    setAddressInput(addr);
    const zip = addr.match(/\b(\d{5})\b/)?.[1] ?? "";
    setDeliveryAddress({ fullAddress: addr, zip });
  }

  // Minimum order fee
  const minOrderFeeCents = useMemo(() => {
    if (!calculation || deliveryMethod !== "delivery") return 0;
    if (calculation.belowMinimum && calculation.subtotalCents < 12500) {
      return 12500 - calculation.subtotalCents;
    }
    return 0;
  }, [calculation, deliveryMethod]);

  // Split items: bulk materials (separate deliveries) vs non-bulk (ride along)
  const bulkItems = items.filter((i) => i.deliveryType === "bulk");
  const nonBulkItems = items.filter((i) => i.deliveryType !== "bulk");

  // Totals — remove CC surcharge from display
  const totals = useMemo(() => {
    if (!calculation) return null;
    const lines = [
      { label: "Materials", value: calculation.subtotalCents },
      ...(minOrderFeeCents > 0 ? [{ label: "Min. order fee", value: minOrderFeeCents }] : []),
      ...(calculation.proDiscountCents > 0 ? [{ label: "Pro discount", value: -calculation.proDiscountCents }] : []),
    ];
    if (deliveryMethod === "delivery") {
      lines.push({ label: "Delivery", value: calculation.deliveryFeeCents });
    }
    lines.push({ label: "Tax (8.75%)", value: calculation.taxCents });
    return lines;
  }, [calculation, minOrderFeeCents, deliveryMethod]);

  const cashTotal = calculation ? calculation.grandTotalCents - (calculation.ccSurchargeCents ?? 0) : 0;

  // Save as Quote handler
  async function handleSaveQuote() {
    if (!custName && !custPhone && !custEmail) {
      toast.error("Enter your name and phone or email to save a quote.");
      return;
    }
    setSavingQuote(true);
    try {
      const res = await fetch("/api/quotes/quick", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: items.map((i) => ({
            name: i.name,
            quantity: i.quantity,
            unitPriceCents: i.unitPriceCents,
            unit: i.deliveryType === "bulk" ? "yard" : "each",
          })),
          customer: { name: custName, phone: custPhone, email: custEmail },
          deliveryFeeCents: deliveryMethod === "delivery" ? (calculation?.deliveryFeeCents ?? 0) : 0,
          sendVia: custEmail ? (custPhone ? ["email", "sms"] : ["email"]) : custPhone ? ["sms"] : undefined,
        }),
      });
      if (res.ok) {
        toast.success("Quote sent!", {
          description: custEmail ? `Check ${custEmail} for your quote.` : "Check your phone for the quote link.",
          duration: 6000,
        });
      } else {
        toast.error("Could not save quote. Try again.");
      }
    } catch {
      toast.error("Network error.");
    } finally {
      setSavingQuote(false);
    }
  }

  // ── Empty cart ─────────────────────────────────────────
  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-lg space-y-6 px-4 py-20 text-center">
        <ShoppingCart className="mx-auto size-16 text-muted-foreground/30" />
        <h1 className="[font-family:var(--font-display)] text-3xl text-primary">Your Cart is Empty</h1>
        <p className="text-muted-foreground">Browse our landscaping &amp; masonry materials and add items to get started.</p>
        <Button asChild size="lg" className="bg-accent text-accent-foreground hover:bg-accent/90">
          <Link href="/shop">Shop Materials</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl overflow-x-hidden px-4 py-10 md:py-14">
      {/* Header */}
      <div className="mb-8 flex items-center gap-4">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" className="size-14 md:size-16 shrink-0">
          <line x1="40" y1="440" x2="472" y2="440" stroke="#1F2937" strokeWidth="14" strokeLinecap="round" />
          <path d="M 50,180 C 50,110 110,90 150,100 C 190,40 270,60 300,120 C 330,130 330,170 330,180 Z" fill="#4B5563" stroke="#1F2937" strokeWidth="14" strokeLinejoin="round" />
          <rect x="190" y="320" width="90" height="50" fill="#9CA3AF" stroke="#1F2937" strokeWidth="14" strokeLinejoin="round" />
          <path d="M 20,180 L 340,180 L 310,320 L 70,320 Z" fill="#1E3A8A" stroke="#1F2937" strokeWidth="14" strokeLinejoin="round" />
          <line x1="45" y1="250" x2="325" y2="250" stroke="#1F2937" strokeWidth="14" strokeLinecap="round" />
          <path d="M 320,150 L 440,150 L 440,170 L 420,170 L 420,220 L 480,220 L 480,360 L 320,360 Z" fill="#1E3A8A" stroke="#1F2937" strokeWidth="14" strokeLinejoin="round" />
          <rect x="330" y="165" width="20" height="24" fill="#BAE6FD" stroke="#1F2937" strokeWidth="14" strokeLinejoin="round" />
          <rect x="365" y="165" width="20" height="24" fill="#BAE6FD" stroke="#1F2937" strokeWidth="14" strokeLinejoin="round" />
          <rect x="400" y="165" width="20" height="24" fill="#BAE6FD" stroke="#1F2937" strokeWidth="14" strokeLinejoin="round" />
          <rect x="460" y="240" width="20" height="15" fill="#E5E7EB" stroke="#1F2937" strokeWidth="14" strokeLinejoin="round" />
          <rect x="460" y="275" width="20" height="15" fill="#E5E7EB" stroke="#1F2937" strokeWidth="14" strokeLinejoin="round" />
          <rect x="460" y="310" width="20" height="15" fill="#E5E7EB" stroke="#1F2937" strokeWidth="14" strokeLinejoin="round" />
          <circle cx="140" cy="370" r="56" fill="#374151" stroke="#1F2937" strokeWidth="14" />
          <circle cx="140" cy="370" r="20" fill="#E5E7EB" stroke="#1F2937" strokeWidth="14" />
          <circle cx="390" cy="370" r="56" fill="#374151" stroke="#1F2937" strokeWidth="14" />
          <circle cx="390" cy="370" r="20" fill="#E5E7EB" stroke="#1F2937" strokeWidth="14" />
        </svg>
        <div>
          <h1 className="[font-family:var(--font-display)] text-3xl md:text-4xl text-primary">Dump Truck Deliveries</h1>
          <p className="mt-1 text-muted-foreground">Materials delivered from our yard to your site</p>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-[1.3fr_1fr]">
        {/* ── Left: Items + Customer + Delivery ─────────────── */}
        <div className="space-y-5">
          {/* Bulk materials — one card per delivery with swap buttons */}
          <div className="flex flex-col gap-0">
          {bulkItems.map((item, i) => (
            <div key={item.id}>
            {/* Swap button centered between delivery cards */}
            {i > 0 && (
              <div className="flex justify-center py-1 relative z-10" style={{ marginTop: "-18px", marginBottom: "-18px" }}>
                <button
                  onClick={() => {
                    const prevItem = bulkItems[i - 1];
                    const idxA = items.findIndex((it) => it.id === prevItem.id);
                    const idxB = items.findIndex((it) => it.id === item.id);
                    if (idxA >= 0 && idxB >= 0) swapItems(idxA, idxB);
                  }}
                  className="flex size-9 items-center justify-center rounded-full border-2 border-blue-800/40 bg-card shadow-md hover:bg-muted hover:border-accent/50 transition-colors"
                  title="Swap delivery order"
                >
                  <ArrowUpDown className="size-4 text-muted-foreground" />
                </button>
              </div>
            )}
            <div className="rounded-xl border border-blue-800/40 bg-card p-3 sm:p-4 shadow-[0_0_12px_-3px_rgba(37,99,235,0.2)]">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {deliveryMethod === "delivery" ? "Delivery" : "Pickup"} {i + 1}
                </p>
                <button className="text-muted-foreground hover:text-destructive p-1" onClick={() => removeItem(item.id)} title="Remove">
                  <Trash2 className="size-4" />
                </button>
              </div>
              <p className="font-semibold text-base sm:text-lg leading-tight mb-1 break-words">{item.name}</p>
              <div className="flex flex-wrap items-center justify-between gap-2 mt-2">
                <div className="flex items-center gap-1.5">
                  <button className="flex size-10 items-center justify-center rounded-lg border text-lg hover:bg-muted" onClick={() => updateQuantity(item.id, Math.max(0, Number((item.quantity - 1).toFixed(2))))}>−</button>
                  <Input
                    value={String(item.quantity)}
                    onChange={(e) => { const n = Number(e.target.value); if (Number.isFinite(n)) updateQuantity(item.id, n); }}
                    className="w-16 h-10 text-center text-lg font-semibold"
                    inputMode="decimal"
                  />
                  <button className="flex size-10 items-center justify-center rounded-lg border text-lg hover:bg-muted" onClick={() => updateQuantity(item.id, Number((item.quantity + 1).toFixed(2)))}>+</button>
                  <span className="text-sm text-muted-foreground ml-1">cubic yards</span>
                </div>
                <div className="text-right">
                  <span className="font-bold text-lg">{formatUsd(Math.round(item.quantity * item.unitPriceCents))}</span>
                  {deliveryMethod === "delivery" && calculation && calculation.loads?.[i] && (
                    <p className="text-xs text-muted-foreground">+ {formatUsd(calculation.loads[i].feeCents)} delivery</p>
                  )}
                </div>
              </div>
            </div>
            </div>
          ))}
          </div>

          {/* Non-bulk items */}
          {nonBulkItems.length > 0 && (
            <div className="rounded-xl border border-blue-800/40 bg-card p-4 shadow-[0_0_12px_-3px_rgba(37,99,235,0.2)]">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                Additional Items {deliveryMethod === "delivery" ? "(included with delivery)" : ""}
              </p>
              {nonBulkItems.map((item) => (
                <div key={item.id} className="flex flex-wrap items-center gap-2 py-2.5 border-t first:border-0">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{item.name}</p>
                    <p className="text-xs text-muted-foreground">{formatUsd(item.unitPriceCents)} each</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button className="flex size-9 items-center justify-center rounded-md border hover:bg-muted" onClick={() => updateQuantity(item.id, Math.max(0, item.quantity - 1))}>
                      <Minus className="size-3.5" />
                    </button>
                    <Input value={String(item.quantity)} onChange={(e) => { const n = Number(e.target.value); if (Number.isFinite(n)) updateQuantity(item.id, n); }} className="w-12 h-9 text-center text-sm" inputMode="numeric" />
                    <button className="flex size-9 items-center justify-center rounded-md border hover:bg-muted" onClick={() => updateQuantity(item.id, item.quantity + 1)}>
                      <Plus className="size-3.5" />
                    </button>
                  </div>
                  <span className="text-sm font-semibold whitespace-nowrap">{formatUsd(Math.round(item.quantity * item.unitPriceCents))}</span>
                  <button className="text-muted-foreground hover:text-destructive p-1" onClick={() => removeItem(item.id)}><Trash2 className="size-4" /></button>
                </div>
              ))}
            </div>
          )}

          {/* Customer Info — lead capture */}
          <div className="rounded-xl border border-blue-800/40 bg-card p-5 shadow-[0_0_12px_-3px_rgba(37,99,235,0.2)] space-y-3">
            <h2 className="text-sm font-semibold">Your Information</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Input placeholder="Name" value={custName} onChange={(e) => setCustName(e.target.value)} />
              <Input placeholder="Phone" type="tel" value={custPhone} onChange={(e) => setCustPhone(e.target.value)} />
              <Input placeholder="Email" type="email" value={custEmail} onChange={(e) => setCustEmail(e.target.value)} />
            </div>
            <label className="flex items-start gap-2.5 text-xs text-muted-foreground cursor-pointer rounded-lg border p-3 hover:bg-muted/30">
              <input type="checkbox" checked={smsOptIn} onChange={(e) => setSmsOptIn(e.target.checked)} className="mt-0.5 rounded size-4 shrink-0" />
              <span>
                I agree to receive order updates, delivery notifications, and promotional messages from Eastern Landscape &amp; Mason Supply via SMS to the phone number provided. Message frequency varies. Message and data rates may apply. Reply STOP to cancel, HELP for help. View our <a href="/terms#sms-terms" className="underline text-accent">SMS Terms</a> and <a href="/privacy-policy" className="underline text-accent">Privacy Policy</a>.
              </span>
            </label>

            {/* Save Quote — lead capture */}
            <button
              onClick={handleSaveQuote}
              disabled={savingQuote || (!custPhone && !custEmail)}
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-accent/50 py-2.5 text-sm text-accent hover:bg-accent/5 disabled:opacity-40"
            >
              {savingQuote ? <Spin className="size-4 animate-spin" /> : <FileText className="size-4" />}
              Save Quote for Later — send to my phone/email
            </button>
          </div>

          {/* Delivery or Pickup */}
          <div className="rounded-xl border border-blue-800/40 bg-card p-5 shadow-[0_0_12px_-3px_rgba(37,99,235,0.2)] space-y-4">
            <h2 className="text-sm font-semibold">Delivery or Pickup</h2>
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => toggleDeliveryMethod("delivery")} className={`flex items-center justify-center gap-2 rounded-lg border py-3 text-sm font-medium transition-colors ${deliveryMethod === "delivery" ? "border-accent bg-accent/10 text-accent" : "text-muted-foreground hover:bg-muted"}`}>
                <Truck className="size-4" /> Delivery
              </button>
              <button onClick={() => toggleDeliveryMethod("pickup")} className={`flex items-center justify-center gap-2 rounded-lg border py-3 text-sm font-medium transition-colors ${deliveryMethod === "pickup" ? "border-accent bg-accent/10 text-accent" : "text-muted-foreground hover:bg-muted"}`}>
                <Store className="size-4" /> Pickup at Yard
              </button>
            </div>

            {deliveryMethod === "delivery" && (
              <div className="space-y-3">
                <div>
                  <label className="mb-1 block text-sm font-medium">Delivery Address</label>
                  <AddressAutocomplete
                    value={addressInput}
                    onChange={setAddressInput}
                    onSelect={handleAddressSelect}
                    placeholder="Start typing an address..."
                  />
                </div>

                {/* Auto-calculated fee display */}
                {isCalculating && (
                  <p className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Spin className="size-4 animate-spin" /> Calculating delivery fee...
                  </p>
                )}
                {calculation && !isCalculating && deliveryAddress?.fullAddress && (
                  <p className="text-sm text-green-700 dark:text-green-400">
                    ✅ {calculation.oneWayMiles ? `${calculation.oneWayMiles.toFixed(1)} mi` : ""} · Fee: {formatUsd(calculation.deliveryFeeCents)} {calculation.totalLoads > 1 ? `(${calculation.totalLoads} loads)` : "/load"}
                  </p>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 block text-sm font-medium">Preferred Date</label>
                    <Input type="date" value={deliveryDate} onChange={(e) => setDeliveryDate(e.target.value)} />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium">Time Window</label>
                    <select value={timeWindow} onChange={(e) => setTimeWindow(e.target.value)} className="w-full rounded-md border bg-background px-3 py-2 text-sm">
                      {TIME_WINDOWS.map((tw) => <option key={tw.value} value={tw.value}>{tw.label}</option>)}
                    </select>
                  </div>
                </div>

                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={combineLoads} onChange={() => toggleCombineLoads()} className="rounded" />
                  Combine loads when possible (materials may touch — saves on delivery fees)
                </label>

                {/* Access constraints — always visible */}
                <div>
                  <p className="mb-1.5 text-sm font-medium">Access Constraints</p>
                  <div className="grid grid-cols-1 min-[400px]:grid-cols-2 sm:grid-cols-3 gap-1.5">
                    {[
                      { key: "lowWires" as const, label: "Low Wires" },
                      { key: "narrowDriveway" as const, label: "Narrow Driveway" },
                      { key: "softGround" as const, label: "Soft Ground" },
                      { key: "gated" as const, label: "Gated" },
                      { key: "steep" as const, label: "Steep Approach" },
                    ].map(({ key, label }) => (
                      <label key={key} className="flex items-center gap-2 rounded-md border px-2.5 py-2 text-sm cursor-pointer hover:bg-muted/50">
                        <input type="checkbox" checked={accessConstraints[key]} onChange={(e) => setAccessConstraints({ [key]: e.target.checked })} className="rounded" />
                        {label}
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium">Delivery Notes</label>
                  <Input placeholder="Gate code, driveway instructions, landmarks..." value={accessConstraints.notes} onChange={(e) => setAccessConstraints({ notes: e.target.value })} />
                </div>
              </div>
            )}
          </div>

          <Button asChild variant="ghost" size="sm">
            <Link href="/shop"><ArrowLeft className="size-4" /> Continue Shopping</Link>
          </Button>
        </div>

        {/* ── Right: Order Summary (sticky) ──────────────────── */}
        <div className="lg:sticky lg:top-28 lg:self-start">
          <div className="rounded-xl border border-blue-800/40 bg-card p-5 shadow-[0_0_12px_-3px_rgba(37,99,235,0.2)] space-y-4">
            <h2 className="text-lg font-semibold">Order Summary</h2>

            {isCalculating && <p className="text-sm text-muted-foreground"><Spin className="inline size-3 animate-spin mr-1" />Calculating...</p>}
            {error && (
              <p className="flex items-start gap-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
                <AlertTriangle className="mt-0.5 size-4 shrink-0" /> {error}
              </p>
            )}
            {calculation?.belowMinimum && minOrderFeeCents > 0 && (
              <p className="flex items-start gap-2 rounded-lg bg-amber-50 border border-amber-200 p-3 text-sm text-amber-800">
                <AlertTriangle className="mt-0.5 size-4 shrink-0" /> $125 minimum for delivery. A {formatUsd(minOrderFeeCents)} fee has been added.
              </p>
            )}
            {calculation?.outsideServiceArea && (
              <p className="flex items-start gap-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
                <AlertTriangle className="mt-0.5 size-4 shrink-0" /> Outside our service area. Call (631) 874-6244.
              </p>
            )}

            {/* Delivery breakdown — always expanded */}
            {calculation?.loads.length ? (
              <div className="rounded-lg border bg-background p-3 text-sm space-y-1.5">
                <p className="font-semibold text-xs uppercase tracking-wider text-muted-foreground">Delivery Breakdown</p>
                {calculation.loads.map((load, i) => (
                  <div key={`load-${i}`} className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Delivery {load.day}: {load.materialClass === "mulch" ? "Mulch" : "Material"} — {load.quantity} yd</span>
                    <span>{formatUsd(load.feeCents)}</span>
                  </div>
                ))}
                {calculation.totalLoads > 1 && (
                  <p className="text-[10px] text-muted-foreground">(Load 2+ discounted 25%)</p>
                )}
              </div>
            ) : null}

            {/* Totals */}
            {totals ? (
              <div className="space-y-2 text-sm">
                {totals.map((line) => (
                  <div key={line.label} className="flex justify-between">
                    <span className="text-muted-foreground">{line.label}</span>
                    <span>{line.value < 0 ? `-${formatUsd(Math.abs(line.value))}` : formatUsd(line.value)}</span>
                  </div>
                ))}
                <div className="flex justify-between border-t pt-2 text-lg font-bold text-primary">
                  <span>Total</span>
                  <span>{formatUsd(cashTotal)}</span>
                </div>
                <p className="text-[11px] text-muted-foreground">A 3% credit card processing fee will be added at checkout.</p>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                {deliveryMethod === "delivery" ? "Enter a delivery address to see totals." : "Select pickup to see totals."}
              </p>
            )}

            {/* Promo code */}
            <div className="flex gap-2">
              <Input value={promoInput} onChange={(e) => setPromoInput(e.target.value)} placeholder="Promo code" className="flex-1" />
              <Button variant="outline" size="sm" onClick={() => applyPromoCode(promoInput)}>Apply</Button>
            </div>

            {/* Checkout CTA */}
            {calculation && !calculation.checkoutBlocked ? (
              <Button asChild size="lg" className="w-full bg-accent text-accent-foreground text-base hover:bg-accent/90">
                <Link href="/checkout">Proceed to Checkout →</Link>
              </Button>
            ) : null}

            {/* Save as Quote — lead capture CTA */}
            <div className="flex items-center justify-center gap-3 text-sm text-muted-foreground">
              <a href={siteConfig.phoneHref} className="flex items-center gap-1.5 hover:text-accent">
                <Phone className="size-4" /> {siteConfig.phoneDisplay}
              </a>
              <span className="text-border">|</span>
              <a href={siteConfig.smsHref} className="flex items-center gap-1.5 hover:text-accent">
                <MessageSquare className="size-4" /> Text Us
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* ── Mobile sticky bottom bar ──────────────────────── */}
      {calculation && !calculation.checkoutBlocked && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t bg-card p-3 shadow-lg lg:hidden">
          <div className="mx-auto flex max-w-lg items-center justify-between gap-3">
            <div>
              <p className="text-xs text-muted-foreground">Total</p>
              <p className="text-lg font-bold text-primary">{formatUsd(cashTotal)}</p>
            </div>
            <Button asChild size="lg" className="bg-accent text-accent-foreground hover:bg-accent/90">
              <Link href="/checkout">Checkout →</Link>
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
