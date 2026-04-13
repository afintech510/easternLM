"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { AlertTriangle, ArrowLeft, ArrowUpDown, Loader2 as Spin, Minus, Phone, Plus, RefreshCw, ShoppingCart, Trash2, Truck, Store, FileText, MessageSquare, Wrench } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AddressAutocomplete } from "@/components/ui/address-autocomplete";
import { useCartStore } from "@/stores/cartStore";
import { siteConfig } from "@/config/site";

function formatUsd(cents: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);
}

function nyNow(): Date {
  return new Date(new Date().toLocaleString("en-US", { timeZone: "America/New_York" }));
}
function canSelectToday(): boolean {
  const now = nyNow();
  return now.getDay() >= 1 && now.getDay() <= 6 && now.getHours() < 13;
}
function fmtDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function minDeliveryDate(): string {
  const now = nyNow();
  if (canSelectToday()) return fmtDate(now);
  const next = new Date(now);
  next.setDate(next.getDate() + 1);
  while (next.getDay() === 0) next.setDate(next.getDate() + 1);
  return fmtDate(next);
}
function isSunday(dateStr: string): boolean { return new Date(dateStr + "T12:00:00").getDay() === 0; }
function isToday(dateStr: string): boolean { return dateStr === fmtDate(nyNow()); }
function getDefaultDeliveryDate() { return minDeliveryDate(); }

const TIME_WINDOWS = [
  { value: "morning", label: "Morning (7 AM – 10 AM)" },
  { value: "midday", label: "Midday (10 AM – 1 PM)" },
  { value: "afternoon", label: "Afternoon (1 PM – 5 PM)" },
  { value: "flexible", label: "Flexible (7 AM – 5 PM)" },
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
  const timeWindow = useCartStore((s) => s.deliveryTimeWindow);
  const setTimeWindow = useCartStore((s) => s.setDeliveryTimeWindow);

  const [addressInput, setAddressInput] = useState(deliveryAddress?.fullAddress ?? "");
  const searchParams = useSearchParams();
  const restoredRef = useRef(false);

  // Restore saved cart from ?restore=token
  useEffect(() => {
    const restoreToken = searchParams.get("restore");
    if (!restoreToken || restoredRef.current) return;
    restoredRef.current = true;
    (async () => {
      try {
        const res = await fetch(`/api/cart/restore?token=${restoreToken}`);
        if (!res.ok) return;
        const { cartData } = await res.json();
        if (!cartData) return;
        // Restore items
        if (cartData.items) {
          for (const item of cartData.items) await addItem(item);
        }
        // Restore delivery
        if (cartData.deliveryMethod) toggleDeliveryMethod(cartData.deliveryMethod);
        if (cartData.deliveryAddress) setDeliveryAddress(cartData.deliveryAddress);
        if (cartData.customerInfo) setCustomerInfo(cartData.customerInfo);
        if (cartData.promoCode) applyPromoCode(cartData.promoCode);
        toast.success("Your saved cart has been restored!");
      } catch {}
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  // Sync address input when Zustand hydrates from localStorage (avoids blank field on refresh)
  useEffect(() => {
    if (deliveryAddress?.fullAddress && !addressInput) {
      setAddressInput(deliveryAddress.fullAddress);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deliveryAddress?.fullAddress]);
  const [promoInput, setPromoInput] = useState(promoCode);
  const [deliveryDate, setDeliveryDate] = useState(getDefaultDeliveryDate());

  // Lead capture — read directly from store (no local useState so hydration timing never matters)
  const custName = storedCustomer?.fullName ?? "";
  const custPhone = storedCustomer?.phone ?? "";
  const custEmail = storedCustomer?.email ?? "";
  const smsOptIn = storedCustomer?.smsOptIn ?? false;
  const setCustName = (v: string) => setCustomerInfo({ fullName: v });
  const setCustPhone = (v: string) => setCustomerInfo({ phone: v });
  const setCustEmail = (v: string) => setCustomerInfo({ email: v });
  const setSmsOptIn = (v: boolean) => setCustomerInfo({ smsOptIn: v });
  const [savingQuote, setSavingQuote] = useState(false);

  useEffect(() => { loadDeliveryConfig().catch(() => undefined); }, [loadDeliveryConfig]);

  // Auto-recalc if address is already in store but calculation is missing (e.g. after page reload)
  useEffect(() => {
    if (deliveryMethod === "delivery" && deliveryAddress && !calculation && !isCalculating) {
      setDeliveryAddress(deliveryAddress);
    }
  }, [deliveryMethod, deliveryAddress, calculation, isCalculating, setDeliveryAddress]);

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

  // Installation / service items in cart (split from materials for display)
  const installItems = items.filter((i) => i.id.startsWith("install-") || i.id.startsWith("fabric-"));
  const installTotalCents = installItems.reduce((s, i) => s + Math.round(i.quantity * i.unitPriceCents), 0);

  const cashTotal = calculation ? calculation.grandTotalCents - (calculation.ccSurchargeCents ?? 0) : 0;

  // Save cart handler
  async function handleSaveCart() {
    if (!custPhone && !custEmail) {
      toast.error("Enter your phone or email to save your cart.");
      return;
    }
    setSavingQuote(true);
    try {
      const res = await fetch("/api/cart/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cartData: {
            items,
            deliveryMethod,
            deliveryAddress,
            customerInfo: { fullName: custName, phone: custPhone, email: custEmail, smsOptIn },
            promoCode,
            accessConstraints,
            grandTotalCents: calculation?.grandTotalCents ?? 0,
          },
          customer: { name: custName, phone: custPhone, email: custEmail },
          sendVia: custEmail ? (custPhone ? ["email", "sms"] : ["email"]) : custPhone ? ["sms"] : undefined,
        }),
      });
      if (res.ok) {
        toast.success("Cart saved!", {
          description: custEmail ? `Check ${custEmail} for your link.` : "Check your phone for the cart link.",
          duration: 6000,
        });
      } else {
        toast.error("Could not save cart. Try again.");
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

          {/* Weed block upsell — for mulch and gravel orders */}
          {bulkItems.some((i) => { const lo = i.name.toLowerCase(); return lo.includes("mulch") || lo.includes("gravel") || lo.includes("stone") || lo.includes("bluestone") || lo.includes("rca") || lo.includes("rock"); }) && (
            <WeedBlockUpsell />
          )}

          {/* Installation upsell — always show for delivery orders */}
          {deliveryMethod === "delivery" && (
            <InstallationUpsell items={bulkItems} />
          )}

          {/* Non-bulk items */}
          {nonBulkItems.length > 0 && (
            <div className="rounded-xl border border-blue-800/40 bg-card p-4 shadow-[0_0_12px_-3px_rgba(37,99,235,0.2)]">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                Additional Items {deliveryMethod === "delivery" ? "(included with delivery)" : ""}
              </p>
              {nonBulkItems.map((item) => {
                const isService = item.id.startsWith("install-") || item.id.startsWith("fabric-");
                return (
                  <div key={item.id} className="py-2.5 border-t first:border-0 space-y-1.5">
                    <p className="font-medium text-sm">{item.name}</p>
                    <div className="flex items-center justify-between gap-2">
                      {isService ? (
                        <span className="text-xs text-muted-foreground">Service</span>
                      ) : (
                        <div className="flex items-center gap-1">
                          <button className="flex size-9 items-center justify-center rounded-md border hover:bg-muted" onClick={() => updateQuantity(item.id, Math.max(0, item.quantity - 1))}>
                            <Minus className="size-3.5" />
                          </button>
                          <Input value={String(item.quantity)} onChange={(e) => { const n = Number(e.target.value); if (Number.isFinite(n)) updateQuantity(item.id, n); }} className="w-12 h-9 text-center text-sm" inputMode="numeric" />
                          <button className="flex size-9 items-center justify-center rounded-md border hover:bg-muted" onClick={() => updateQuantity(item.id, item.quantity + 1)}>
                            <Plus className="size-3.5" />
                          </button>
                        </div>
                      )}
                      <span className="text-sm font-semibold whitespace-nowrap">{formatUsd(Math.round(item.quantity * item.unitPriceCents))}</span>
                      <button className="text-muted-foreground hover:text-destructive p-1" onClick={() => removeItem(item.id)}><Trash2 className="size-4" /></button>
                    </div>
                  </div>
                );
              })}
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

            {/* Save Cart for Later */}
            <button
              onClick={handleSaveCart}
              disabled={savingQuote || (!custPhone && !custEmail)}
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-accent/50 py-2.5 text-sm text-accent hover:bg-accent/5 disabled:opacity-40"
            >
              {savingQuote ? <Spin className="size-4 animate-spin" /> : <FileText className="size-4" />}
              Save Your Cart — send link to my phone/email
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

            {deliveryMethod === "pickup" && (
              <div className="rounded-lg bg-muted/50 border p-3 text-sm">
                <p className="font-medium">110 Frowein Road, Center Moriches, NY 11934</p>
                <p className="text-xs text-muted-foreground mt-0.5">Mon–Fri 7 AM – 5 PM · Sat 7 AM – 3 PM</p>
              </div>
            )}

            {deliveryMethod === "delivery" && (
              <div className="space-y-3">
                <div>
                  <label className="mb-1 block text-sm font-medium">Delivery Address</label>
                  <div className="flex w-full gap-2">
                    <div className="flex-1 min-w-0">
                      <AddressAutocomplete
                        value={addressInput}
                        onChange={setAddressInput}
                        onSelect={handleAddressSelect}
                        placeholder="Start typing an address..."
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => { if (addressInput) handleAddressSelect(addressInput); }}
                      title="Recalculate delivery fee"
                      className="flex shrink-0 items-center justify-center size-10 rounded-md border hover:bg-muted text-muted-foreground hover:text-accent transition-colors"
                    >
                      <RefreshCw className="size-4" />
                    </button>
                  </div>
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
                    <Input
                      type="date"
                      value={deliveryDate}
                      min={minDeliveryDate()}
                      onChange={(e) => { if (!isSunday(e.target.value)) setDeliveryDate(e.target.value); }}
                    />
                    {deliveryDate && isToday(deliveryDate) && canSelectToday() && (
                      <p className="mt-1 text-xs text-amber-700 font-medium">Same-day not guaranteed — call or text <a href="sms:+16318746244" className="underline">(631) 874-6244</a></p>
                    )}
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
        <div className="lg:sticky lg:top-4 lg:self-start">
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

            {/* Fully itemized breakdown */}
            {calculation ? (
              <div className="space-y-3 text-sm">
                {/* Materials */}
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">Materials</p>
                  {items.filter((i) => !i.id.startsWith("install-") && !i.id.startsWith("fabric-")).map((item) => (
                    <div key={item.id} className="flex justify-between text-xs py-0.5">
                      <span className="text-muted-foreground truncate mr-2">{item.name} × {item.quantity}</span>
                      <span className="shrink-0">{formatUsd(Math.round(item.quantity * item.unitPriceCents))}</span>
                    </div>
                  ))}
                </div>

                {/* Installation & Supplies */}
                {installItems.length > 0 && (
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">Installation &amp; Supplies</p>
                    {installItems.map((item) => (
                      <div key={item.id} className="flex justify-between text-xs py-0.5">
                        <span className="text-muted-foreground truncate mr-2">{item.name}{item.quantity > 1 ? ` × ${item.quantity}` : ""}</span>
                        <span className="shrink-0">{formatUsd(Math.round(item.quantity * item.unitPriceCents))}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Delivery */}
                {deliveryMethod === "delivery" && calculation.loads.length > 0 && (
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">Delivery</p>
                    {calculation.loads.map((load, i) => (
                      <div key={`load-${i}`} className="flex justify-between text-xs py-0.5">
                        <span className="text-muted-foreground">Load {i + 1}: {load.materialClass === "mulch" ? "Mulch" : "Material"} — {load.quantity} yd</span>
                        <span>{formatUsd(load.feeCents)}</span>
                      </div>
                    ))}
                    {calculation.totalLoads > 1 && (
                      <p className="text-[10px] text-green-700">(Load 2+ discounted 25%)</p>
                    )}
                  </div>
                )}

                {/* Discounts */}
                {(calculation.proDiscountCents > 0 || minOrderFeeCents > 0) && (
                  <div>
                    {minOrderFeeCents > 0 && (
                      <div className="flex justify-between text-xs py-0.5">
                        <span className="text-muted-foreground">Min. order fee</span>
                        <span>{formatUsd(minOrderFeeCents)}</span>
                      </div>
                    )}
                    {calculation.proDiscountCents > 0 && (
                      <div className="flex justify-between text-xs py-0.5 text-green-700">
                        <span>Pro discount</span>
                        <span>-{formatUsd(calculation.proDiscountCents)}</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Tax + Total */}
                <div className="border-t pt-2 space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Tax (8.75%)</span>
                    <span>{formatUsd(calculation.taxCents)}</span>
                  </div>
                  <div className="flex justify-between text-lg font-bold text-primary pt-1">
                    <span>Total</span>
                    <span>{formatUsd(cashTotal)}</span>
                  </div>
                </div>
                <p className="text-[11px] text-muted-foreground">All major credit and debit cards accepted.</p>
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

            {/* Payment logos */}
            <div className="flex flex-wrap items-center justify-center gap-2.5 py-1">
              <img src="/logos/visa.svg" alt="Visa" className="h-6" />
              <img src="/logos/mastercard.svg" alt="Mastercard" className="h-6" />
              <img src="/logos/amex.svg" alt="Amex" className="h-8 rounded" />
              <img src="/logos/discover.svg" alt="Discover" className="h-8 rounded" />
              <img src="/logos/amazon-pay.svg" alt="Amazon Pay" className="h-5" style={{ minWidth: "70px" }} />
              <img src="/logos/affirm.svg" alt="Affirm" className="h-4" />
              <img src="/logos/klarna.svg" alt="Klarna" className="h-5 rounded" />
              <img src="/logos/afterpay.svg" alt="Afterpay" className="h-3.5" />
            </div>

            {/* Save Cart for later */}
            <button
              onClick={handleSaveCart}
              disabled={savingQuote || (!custPhone && !custEmail)}
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-muted-foreground/30 py-2 text-xs text-muted-foreground hover:bg-muted/50 disabled:opacity-40"
            >
              {savingQuote ? <Spin className="size-3.5 animate-spin" /> : <FileText className="size-3.5" />}
              Save Cart for Later
            </button>

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

// ─── Installation Upsell Component ──────────────────────────

const WEED_BLOCK_OPTIONS = [
  { id: "fabric-300", name: "Landscape Fabric 3'×100' (300 sq ft)", label: "300 sq ft", priceCents: 2900 },
  { id: "fabric-900", name: "Landscape Fabric 3'×300' (900 sq ft)", label: "900 sq ft", priceCents: 6000 },
  { id: "fabric-1800", name: "Landscape Fabric 6'×300' (1,800 sq ft)", label: "1,800 sq ft", priceCents: 9500 },
];

// ─── Pricing formulas (all round up to nearest $5) ──────────
function roundUp5(cents: number): number {
  return Math.ceil(cents / 500) * 500;
}
function calcMulchBasic(yards: number): number {
  const base = 35000;
  return roundUp5(base + Math.max(0, yards - 5) * 6500);
}
function calcBedRejuvenation(yards: number): number {
  return roundUp5(Math.round(calcMulchBasic(yards) * 0.65));
}
function calcGravelInstall(yards: number): number {
  return roundUp5(12500 + Math.max(0, yards - 1) * 7500);
}
function calcTopsoilInstall(yards: number): number {
  if (yards <= 5) return 35000;
  if (yards <= 20) {
    const slope = (100000 - 35000) / (20 - 5);
    return roundUp5(Math.round(35000 + (yards - 5) * slope));
  }
  return roundUp5(100000 + (yards - 20) * 2000);
}

function InstallationUpsell({ items }: { items: Array<{ name: string; quantity: number }> }) {
  const addItem = useCartStore((s) => s.addItem);
  const removeItem = useCartStore((s) => s.removeItem);
  const updateQuantity = useCartStore((s) => s.updateQuantity);
  const cartItems = useCartStore((s) => s.items);

  const fmt = (c: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(c / 100);
  const getCartQty = (id: string) => cartItems.find((i) => i.id === id)?.quantity ?? 0;

  // Detect material types
  const n = (s: string) => s.toLowerCase();
  const mulchItems = items.filter((i) => n(i.name).includes("mulch"));
  const gravelItems = items.filter((i) => {
    const lo = n(i.name);
    return lo.includes("gravel") || lo.includes("rca") || lo.includes("pea") || lo.includes("drainage")
      || lo.includes("stone") || lo.includes("bluestone") || lo.includes("whitestone") || lo.includes("burgundy")
      || lo.includes("river rock") || lo.includes("pocono") || lo.includes("screenings");
  });
  const soilItems = items.filter((i) => n(i.name).includes("topsoil") || n(i.name).includes("compost") || n(i.name).includes("fill"));
  const hasMulch = mulchItems.length > 0;
  const hasGravel = gravelItems.length > 0;
  const hasSoil = soilItems.length > 0;

  // Always show — cleanup services are available for all orders

  const totalMulchYds = mulchItems.reduce((s, i) => s + i.quantity, 0);
  const totalGravelYds = gravelItems.reduce((s, i) => s + i.quantity, 0);
  const totalSoilYds = soilItems.reduce((s, i) => s + i.quantity, 0);

  function doAdd(id: string, name: string, cost: number) {
    addItem({ id, name, quantity: 1, unitPriceCents: cost, deliveryType: "non-bulk", materialClass: "default" });
  }
  function doRemove(id: string) { removeItem(id); }

  // Service tile helper
  function ServiceTile({ id, title, subtitle, desc, cost }: {
    id: string; title: string; subtitle: string; desc: string; cost: number
  }) {
    const inCart = getCartQty(id) > 0;
    return (
      <div
        className={`rounded-lg border-2 p-3 transition-colors ${inCart ? "border-green-500 bg-green-100" : "border-green-200 bg-white/70 hover:border-green-400 cursor-pointer"}`}
        onClick={() => !inCart && doAdd(id, subtitle, cost)}
      >
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-green-900">{title}</p>
            <p className="text-xs text-green-700">{desc}</p>
          </div>
          {inCart ? (
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-sm font-bold text-green-800">{fmt(cost)}</span>
              <button className="flex size-8 items-center justify-center rounded-lg border-2 border-red-300 text-red-500 text-lg hover:bg-red-50" onClick={(e) => { e.stopPropagation(); doRemove(id); }}>×</button>
            </div>
          ) : (
            <span className="text-sm font-bold text-green-800 shrink-0">{fmt(cost)}</span>
          )}
        </div>
      </div>
    );
  }

  const basicId = "install-mulch-basic";
  const rejuvId = "install-bed-rejuvenation";
  const gravelId = "install-gravel-spread";
  const soilId = "install-topsoil-grade";

  const basicCost = calcMulchBasic(totalMulchYds);
  const rejuvCost = calcBedRejuvenation(totalMulchYds);
  const gravelCost = calcGravelInstall(totalGravelYds);
  const soilCost = calcTopsoilInstall(totalSoilYds);

  return (
    <div className="rounded-xl border-2 border-green-400/50 bg-green-50/30 p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Wrench className="size-5 text-green-700" />
          <div>
            <p className="font-semibold text-green-900 text-sm">Need it installed?</p>
            <p className="text-xs text-green-700">Professional installation across Suffolk County</p>
          </div>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-[9px] font-medium text-muted-foreground mb-1">Buy Now &amp; Pay Later</p>
          <div className="flex items-center gap-1.5">
            <img src="/logos/affirm.svg" alt="Affirm" className="h-3.5" />
            <img src="/logos/klarna.svg" alt="Klarna" className="h-3.5 rounded-sm" />
            <img src="/logos/afterpay.svg" alt="Afterpay" className="h-3" />
          </div>
        </div>
      </div>

      <div className="space-y-2">
        {/* Mulch services */}
        {hasMulch && (
          <>
            <ServiceTile
              id={basicId}
              title="Basic Mulch Spreading"
              subtitle={`Basic Mulch Spreading — ${totalMulchYds} yds`}
              desc={`Mulch placed evenly in beds — ${totalMulchYds} yds`}
              cost={basicCost}
            />
            <ServiceTile
              id={rejuvId}
              title={`Bed Rejuvenation`}
              subtitle={`Bed Rejuvenation — ${totalMulchYds} yds`}
              desc="Beds fully cleansed, old mulch &amp; leaves removed, dead plants cleared, fresh edges cut. Weed block installed if added to order."
              cost={rejuvCost}
            />
          </>
        )}

        {/* Gravel */}
        {hasGravel && (
          <ServiceTile
            id={gravelId}
            title="Gravel Spreading &amp; Grading"
            subtitle={`Gravel Install — ${totalGravelYds} yds`}
            desc={`Driveway and pathway spreading, leveling, compaction — ${totalGravelYds} yds`}
            cost={gravelCost}
          />
        )}

        {/* Topsoil */}
        {hasSoil && (
          <ServiceTile
            id={soilId}
            title="Topsoil Spread &amp; Grade"
            subtitle={`Topsoil Spread & Grade — ${totalSoilYds} yds`}
            desc={`Grade and spread for lawns, gardens, and beds — ${totalSoilYds} yds`}
            cost={soilCost}
          />
        )}

        {/* Yard Cleanup — always shown */}
        <div className="border-t border-green-200 pt-3 mt-1">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-green-800 mb-2">Yard Cleanup Services</p>
          <ServiceTile
            id="install-cleanup-half"
            title="Full Yard Cleanup — Half Day"
            subtitle="Yard Cleanup — Half Day (4 hrs)"
            desc="2 landscapers for 4 hours, fully equipped. Clean up last season&apos;s mess and haul it away."
            cost={75000}
          />
          <div className="h-2" />
          <ServiceTile
            id="install-cleanup-full"
            title="Full Yard Cleanup — Full Day"
            subtitle="Yard Cleanup — Full Day (8 hrs)"
            desc="2 landscapers for 8 hours, fully equipped. Complete seasonal cleanup with debris removal."
            cost={125000}
          />
        </div>
      </div>

      {/* Scheduling disclaimer — shown when any service is in cart */}
      {(getCartQty(basicId) > 0 || getCartQty(rejuvId) > 0 || getCartQty(gravelId) > 0 || getCartQty(soilId) > 0 || getCartQty("install-cleanup-half") > 0 || getCartQty("install-cleanup-full") > 0) && (
        <p className="text-[10px] text-muted-foreground text-center border-t border-green-200 pt-2">
          We will call you within 24 hours to schedule your service.
        </p>
      )}
    </div>
  );
}

// ─── Weed Block Upsell (standalone module) ──────────────────
function WeedBlockUpsell() {
  const addItem = useCartStore((s) => s.addItem);
  const removeItem = useCartStore((s) => s.removeItem);
  const updateQuantity = useCartStore((s) => s.updateQuantity);
  const cartItems = useCartStore((s) => s.items);
  const getQty = (id: string) => cartItems.find((i) => i.id === id)?.quantity ?? 0;
  const fmt = (c: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(c / 100);

  function add(opt: typeof WEED_BLOCK_OPTIONS[0]) {
    addItem({ id: opt.id, name: opt.name, quantity: 1, unitPriceCents: opt.priceCents, deliveryType: "non-bulk", materialClass: "default" });
  }

  return (
    <div className="rounded-xl border-2 border-amber-300/60 bg-amber-50/30 p-4 space-y-2">
      <p className="text-sm font-semibold text-amber-900">Add Weed Block Fabric</p>
      <p className="text-xs text-amber-700">Prevent weeds under mulch, gravel, and stone — professional grade fabric</p>
      <div className="grid grid-cols-3 gap-2">
        {WEED_BLOCK_OPTIONS.map((opt) => {
          const qty = getQty(opt.id);
          return qty ? (
            <div key={opt.id} className="flex flex-col items-center rounded-xl border-2 border-amber-500 bg-amber-100 p-3 text-center">
              <span className="text-sm font-bold text-amber-900">{opt.label}</span>
              <span className="text-xs text-amber-700 mb-2">{fmt(opt.priceCents)}</span>
              <div className="flex items-center gap-2">
                <button className="flex size-9 items-center justify-center rounded-lg border-2 border-amber-300 text-lg font-bold hover:bg-white transition-colors" onClick={() => qty <= 1 ? removeItem(opt.id) : updateQuantity(opt.id, qty - 1)}>−</button>
                <span className="text-lg font-bold w-6 text-center">{qty}</span>
                <button className="flex size-9 items-center justify-center rounded-lg border-2 border-amber-300 text-lg font-bold hover:bg-white transition-colors" onClick={() => updateQuantity(opt.id, qty + 1)}>+</button>
              </div>
            </div>
          ) : (
            <button
              key={opt.id}
              onClick={() => add(opt)}
              className="flex flex-col items-center justify-center rounded-xl border-2 border-amber-200 bg-white/70 p-3 text-center hover:border-amber-400 hover:bg-amber-50 transition-colors cursor-pointer"
            >
              <span className="text-sm font-bold text-amber-900">{opt.label}</span>
              <span className="text-xs text-amber-700">{fmt(opt.priceCents)}</span>
              <span className="mt-1.5 text-xs font-semibold text-amber-600 bg-amber-100 rounded-full px-3 py-0.5">+ Add</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
