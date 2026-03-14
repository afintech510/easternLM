"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, ArrowLeft, Minus, Phone, Plus, ShoppingCart, Trash2, Truck } from "lucide-react";
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

  const [addressInput, setAddressInput] = useState(deliveryAddress?.fullAddress ?? "");
  const [promoInput, setPromoInput] = useState(promoCode);
  const [deliveryDate, setDeliveryDate] = useState(getDefaultDeliveryDate());

  useEffect(() => { loadDeliveryConfig().catch(() => undefined); }, [loadDeliveryConfig]);

  const totals = useMemo(() => {
    if (!calculation) return null;
    return [
      { label: "Materials", value: calculation.subtotalCents },
      ...(calculation.proDiscountCents > 0 ? [{ label: "Pro discount", value: -calculation.proDiscountCents }] : []),
      { label: "Delivery", value: calculation.deliveryFeeCents },
      { label: "Tax (8.75%)", value: calculation.taxCents },
      { label: "CC processing fee (3%)", value: calculation.ccSurchargeCents },
    ];
  }, [calculation]);

  // ── Empty cart ─────────────────────────────────────────
  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-lg space-y-6 px-4 py-20 text-center">
        <ShoppingCart className="mx-auto size-16 text-muted-foreground/30" />
        <h1 className="[font-family:var(--font-display)] text-3xl text-primary">Your Cart is Empty</h1>
        <p className="text-muted-foreground">Browse our 280+ materials and add items to get started.</p>
        <Button asChild size="lg" className="bg-accent text-accent-foreground hover:bg-accent/90">
          <Link href="/shop">Shop Materials</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 md:py-14">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="[font-family:var(--font-display)] text-3xl text-primary">Your Cart</h1>
        <Button asChild variant="ghost" size="sm">
          <Link href="/shop"><ArrowLeft className="size-4" /> Continue Shopping</Link>
        </Button>
      </div>

      <div className="grid gap-8 lg:grid-cols-[1.3fr_1fr]">
        {/* ── Left: Items + Delivery ──────────────────────── */}
        <div className="space-y-5">
          {/* Line items */}
          <div className="rounded-xl border bg-card">
            {items.map((item, i) => (
              <div key={item.id} className={`flex gap-4 p-4 ${i > 0 ? "border-t" : ""}`}>
                <div className="flex-1">
                  <p className="font-semibold">{item.name}</p>
                  <p className="text-sm text-muted-foreground">{formatUsd(item.unitPriceCents)} each &middot; {item.deliveryType === "bulk" ? "Bulk" : "Bagged"}</p>
                </div>
                <div className="flex items-center gap-1.5">
                  <button className="flex size-8 items-center justify-center rounded-md border hover:bg-muted" onClick={() => updateQuantity(item.id, Number((item.quantity - 1).toFixed(2)))}>
                    <Minus className="size-3.5" />
                  </button>
                  <Input
                    value={String(item.quantity)}
                    onChange={(e) => { const n = Number(e.target.value); if (Number.isFinite(n)) updateQuantity(item.id, n); }}
                    className="w-16 text-center text-sm"
                    inputMode="decimal"
                  />
                  <button className="flex size-8 items-center justify-center rounded-md border hover:bg-muted" onClick={() => updateQuantity(item.id, Number((item.quantity + 1).toFixed(2)))}>
                    <Plus className="size-3.5" />
                  </button>
                </div>
                <div className="flex items-center gap-3">
                  <span className="w-20 text-right text-sm font-semibold">{formatUsd(Math.round(item.quantity * item.unitPriceCents))}</span>
                  <button className="text-muted-foreground hover:text-destructive" onClick={() => removeItem(item.id)} aria-label="Remove item">
                    <Trash2 className="size-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Delivery method */}
          <div className="rounded-xl border bg-card p-5 space-y-4">
            <h2 className="text-sm font-semibold">Delivery or Pickup</h2>
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => toggleDeliveryMethod("delivery")} className={`flex items-center justify-center gap-2 rounded-lg border py-3 text-sm font-medium ${deliveryMethod === "delivery" ? "border-accent bg-accent/10 text-accent" : "text-muted-foreground hover:bg-muted"}`}>
                <Truck className="size-4" /> Delivery
              </button>
              <button onClick={() => toggleDeliveryMethod("pickup")} className={`flex items-center justify-center gap-2 rounded-lg border py-3 text-sm font-medium ${deliveryMethod === "pickup" ? "border-accent bg-accent/10 text-accent" : "text-muted-foreground hover:bg-muted"}`}>
                Pickup at Yard
              </button>
            </div>

            {deliveryMethod === "delivery" && (
              <div className="space-y-3">
                <div>
                  <label className="mb-1 block text-sm font-medium">Delivery address</label>
                  <AddressAutocomplete value={addressInput} onChange={setAddressInput} placeholder="Start typing an address..." />
                </div>
                <Button size="sm" onClick={() => { const zip = addressInput.match(/\b(\d{5})\b/)?.[1] ?? ""; setDeliveryAddress({ fullAddress: addressInput, zip }); }}>
                  Calculate Delivery Fee
                </Button>
                <div>
                  <label className="mb-1 block text-sm font-medium">Preferred delivery date</label>
                  <Input type="date" value={deliveryDate} onChange={(e) => setDeliveryDate(e.target.value)} className="w-48" />
                </div>
              </div>
            )}

            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={combineLoads} onChange={() => toggleCombineLoads()} className="rounded" />
              Combine loads when possible
            </label>
          </div>

          {/* Access constraints */}
          <details className="rounded-xl border bg-card p-5">
            <summary className="cursor-pointer text-sm font-semibold">Access constraints &amp; promo code</summary>
            <div className="mt-4 space-y-4">
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {[
                  { key: "lowWires" as const, label: "Low wires" },
                  { key: "narrowDriveway" as const, label: "Narrow driveway" },
                  { key: "softGround" as const, label: "Soft ground" },
                  { key: "gated" as const, label: "Gated" },
                  { key: "steep" as const, label: "Steep approach" },
                ].map(({ key, label }) => (
                  <label key={key} className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={accessConstraints[key]} onChange={(e) => setAccessConstraints({ [key]: e.target.checked })} className="rounded" />
                    {label}
                  </label>
                ))}
              </div>
              <Input placeholder="Driver notes (gate code, landmarks...)" value={accessConstraints.notes} onChange={(e) => setAccessConstraints({ notes: e.target.value })} />
              <div className="flex gap-2">
                <Input value={promoInput} onChange={(e) => setPromoInput(e.target.value)} placeholder="Promo code" className="w-40" />
                <Button variant="outline" size="sm" onClick={() => applyPromoCode(promoInput)}>Apply</Button>
              </div>
            </div>
          </details>
        </div>

        {/* ── Right: Summary ──────────────────────────────── */}
        <div className="lg:sticky lg:top-28 lg:self-start">
          <div className="rounded-xl border bg-card p-5 space-y-4">
            <h2 className="text-lg font-semibold">Order Summary</h2>

            {isCalculating && <p className="text-sm text-muted-foreground">Calculating...</p>}
            {error && (
              <p className="flex items-start gap-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
                <AlertTriangle className="mt-0.5 size-4 shrink-0" /> {error}
              </p>
            )}

            {/* Delivery breakdown (collapsible) */}
            {calculation?.loads.length ? (
              <details className="rounded-lg border bg-background p-3 text-sm">
                <summary className="cursor-pointer font-semibold">
                  Delivery: {formatUsd(calculation.deliveryFeeCents)} ({calculation.totalLoads} load{calculation.totalLoads > 1 ? "s" : ""})
                </summary>
                <div className="mt-2 space-y-1.5">
                  {calculation.loads.map((load, i) => (
                    <p key={`${load.truckName}-${i}`} className="text-xs text-muted-foreground">
                      Day {load.day}: {load.truckName} — {load.quantity} yd ({load.materialClass}) — {formatUsd(load.feeCents)}
                    </p>
                  ))}
                </div>
              </details>
            ) : null}

            {/* Line items */}
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
                  <span>{formatUsd(calculation!.grandTotalCents)}</span>
                </div>
                <p className="text-xs text-muted-foreground">A 3% credit card processing fee is included per NY State law.</p>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Enter a delivery address to see totals.</p>
            )}

            {/* CTA */}
            {calculation && !calculation.checkoutBlocked ? (
              <Button asChild size="lg" className="w-full bg-accent text-accent-foreground text-base hover:bg-accent/90">
                <Link href="/checkout">Proceed to Checkout</Link>
              </Button>
            ) : null}

            <a href={siteConfig.phoneHref} className="flex items-center justify-center gap-2 text-sm text-muted-foreground hover:text-accent">
              <Phone className="size-4" /> Need help? Call {siteConfig.phoneDisplay}
            </a>
          </div>
        </div>
      </div>

      {/* ── Mobile sticky bottom bar ──────────────────────── */}
      {calculation && !calculation.checkoutBlocked && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t bg-card p-3 shadow-lg lg:hidden">
          <div className="mx-auto flex max-w-lg items-center justify-between gap-3">
            <div>
              <p className="text-xs text-muted-foreground">Total</p>
              <p className="text-lg font-bold text-primary">{formatUsd(calculation.grandTotalCents)}</p>
            </div>
            <Button asChild size="lg" className="bg-accent text-accent-foreground hover:bg-accent/90">
              <Link href="/checkout">Checkout</Link>
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
