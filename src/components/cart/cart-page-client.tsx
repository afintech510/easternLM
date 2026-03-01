"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Truck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCartStore } from "@/stores/cartStore";

function formatUsd(cents: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(cents / 100);
}

function getDefaultDeliveryDate() {
  const now = new Date();
  const candidate = new Date(now);
  if (now.getDay() >= 1 && now.getDay() <= 5 && now.getHours() < 11) {
    return candidate.toISOString().slice(0, 10);
  }

  candidate.setDate(candidate.getDate() + 1);
  while (candidate.getDay() === 0) {
    candidate.setDate(candidate.getDate() + 1);
  }
  return candidate.toISOString().slice(0, 10);
}

export function CartPageClient() {
  const items = useCartStore((state) => state.items);
  const deliveryAddress = useCartStore((state) => state.deliveryAddress);
  const deliveryMethod = useCartStore((state) => state.deliveryMethod);
  const promoCode = useCartStore((state) => state.promoCode);
  const combineLoads = useCartStore((state) => state.combineLoads);
  const accessConstraints = useCartStore((state) => state.accessConstraints);
  const calculation = useCartStore((state) => state.deliveryCalculation);
  const isCalculating = useCartStore((state) => state.isCalculating);
  const error = useCartStore((state) => state.error);
  const addItem = useCartStore((state) => state.addItem);
  const removeItem = useCartStore((state) => state.removeItem);
  const updateQuantity = useCartStore((state) => state.updateQuantity);
  const setDeliveryAddress = useCartStore((state) => state.setDeliveryAddress);
  const toggleDeliveryMethod = useCartStore((state) => state.toggleDeliveryMethod);
  const toggleCombineLoads = useCartStore((state) => state.toggleCombineLoads);
  const applyPromoCode = useCartStore((state) => state.applyPromoCode);
  const setAccessConstraints = useCartStore((state) => state.setAccessConstraints);
  const loadDeliveryConfig = useCartStore((state) => state.loadDeliveryConfig);

  const [addressInput, setAddressInput] = useState(deliveryAddress?.fullAddress ?? "");
  const [zipInput, setZipInput] = useState(deliveryAddress?.zip ?? "");
  const [promoInput, setPromoInput] = useState(promoCode);
  const [deliveryDate, setDeliveryDate] = useState(getDefaultDeliveryDate());

  const bulkItems = items.filter((item) => item.deliveryType === "bulk");
  const nonBulkItems = items.filter((item) => item.deliveryType === "non-bulk");

  const totals = useMemo(() => {
    if (!calculation) {
      return null;
    }

    return [
      { label: "Materials subtotal", value: calculation.subtotalCents },
      { label: "Pro discount", value: -calculation.proDiscountCents },
      { label: "Delivery", value: calculation.deliveryFeeCents },
      { label: "Tax (8.75%)", value: calculation.taxCents },
      { label: "Credit card surcharge (3%)", value: calculation.ccSurchargeCents },
      { label: "Grand total", value: calculation.grandTotalCents, emphasize: true },
    ];
  }, [calculation]);

  useEffect(() => {
    loadDeliveryConfig().catch(() => undefined);
  }, [loadDeliveryConfig]);

  return (
    <div className="mx-auto grid max-w-6xl gap-6 px-4 py-12 md:grid-cols-[1.2fr_1fr] md:py-16">
      <section className="space-y-5">
        <header>
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-muted-foreground">Cart</p>
          <h1 className="[font-family:var(--font-display)] text-4xl text-primary">Materials and Delivery</h1>
        </header>

        {items.length === 0 ? (
          <article className="rounded-2xl border bg-card p-6 text-center">
            <p className="text-sm text-muted-foreground">
              Your cart is empty.
            </p>
            <Button asChild className="mt-4">
              <Link href="/shop">Browse Materials</Link>
            </Button>
          </article>
        ) : (
          <article className="space-y-3 rounded-2xl border bg-card p-6">
            {bulkItems.length > 0 ? (
              <div className="rounded-xl border bg-background p-3">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  Bulk Items (Load Assigned)
                </p>
                <div className="mt-2 space-y-1 text-xs text-muted-foreground">
                  {bulkItems.map((item) => (
                    <p key={`bulk-${item.id}`}>
                      {item.name}: {item.quantity} ({item.materialClass})
                    </p>
                  ))}
                </div>
              </div>
            ) : null}

            {nonBulkItems.length > 0 ? (
              <div className="rounded-xl border bg-background p-3">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  Non-bulk Items (Ride Free)
                </p>
                <div className="mt-2 space-y-1 text-xs text-muted-foreground">
                  {nonBulkItems.map((item) => (
                    <p key={`nonbulk-${item.id}`}>
                      {item.name}: {item.quantity}
                    </p>
                  ))}
                </div>
              </div>
            ) : null}

            {items.map((item) => (
              <div key={item.id} className="rounded-xl border bg-background p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold">{item.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {item.deliveryType === "bulk" ? "Bulk material" : "Bagged / packaged"}
                    </p>
                    <p className="text-xs text-muted-foreground">Unit: {formatUsd(item.unitPriceCents)}</p>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => removeItem(item.id)}>
                    Remove
                  </Button>
                </div>
                <div className="mt-3 flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => updateQuantity(item.id, Number((item.quantity - 1).toFixed(2)))}
                  >
                    -
                  </Button>
                  <Input
                    value={String(item.quantity)}
                    onChange={(event) => {
                      const nextQuantity = Number(event.target.value);
                      if (!Number.isFinite(nextQuantity)) {
                        return;
                      }
                      updateQuantity(item.id, nextQuantity).catch(() => undefined);
                    }}
                    className="w-24 text-center"
                    inputMode="decimal"
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => updateQuantity(item.id, Number((item.quantity + 1).toFixed(2)))}
                  >
                    +
                  </Button>
                </div>
              </div>
            ))}
          </article>
        )}

        <article className="space-y-4 rounded-2xl border bg-card p-6">
          <h2 className="text-lg font-semibold">Delivery Method</h2>
          <div className="flex flex-wrap gap-2">
            <Button
              variant={deliveryMethod === "delivery" ? "default" : "outline"}
              onClick={() => toggleDeliveryMethod("delivery")}
            >
              Delivery
            </Button>
            <Button
              variant={deliveryMethod === "pickup" ? "default" : "outline"}
              onClick={() => toggleDeliveryMethod("pickup")}
            >
              Pickup
            </Button>
          </div>

          {deliveryMethod === "delivery" ? (
            <div className="space-y-2">
              <label className="text-sm font-semibold">Delivery address</label>
              <Input value={addressInput} onChange={(event) => setAddressInput(event.target.value)} />
              <label className="text-sm font-semibold">ZIP code</label>
              <Input value={zipInput} onChange={(event) => setZipInput(event.target.value)} />
              <Button onClick={() => setDeliveryAddress({ fullAddress: addressInput, zip: zipInput })}>
                Validate Address
              </Button>
              <label className="block text-sm font-semibold">Requested delivery date</label>
              <Input type="date" value={deliveryDate} onChange={(event) => setDeliveryDate(event.target.value)} />
              <p className="text-xs text-muted-foreground">
                Same-day delivery default applies before 11:00 AM on weekdays when available.
              </p>
            </div>
          ) : null}

          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={combineLoads} onChange={() => toggleCombineLoads()} />
            Combine bulk loads when possible
          </label>
        </article>

        <article className="space-y-4 rounded-2xl border bg-card p-6">
          <h2 className="text-lg font-semibold">Promo and Access Constraints</h2>
          <div className="flex gap-2">
            <Input value={promoInput} onChange={(event) => setPromoInput(event.target.value)} placeholder="PRO5" />
            <Button variant="outline" onClick={() => applyPromoCode(promoInput)}>
              Apply
            </Button>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={accessConstraints.lowWires}
                onChange={(event) => setAccessConstraints({ lowWires: event.target.checked })}
              />
              Low wires
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={accessConstraints.narrowDriveway}
                onChange={(event) => setAccessConstraints({ narrowDriveway: event.target.checked })}
              />
              Narrow driveway
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={accessConstraints.softGround}
                onChange={(event) => setAccessConstraints({ softGround: event.target.checked })}
              />
              Soft ground
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={accessConstraints.gated}
                onChange={(event) => setAccessConstraints({ gated: event.target.checked })}
              />
              Gated
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={accessConstraints.steep}
                onChange={(event) => setAccessConstraints({ steep: event.target.checked })}
              />
              Steep approach
            </label>
          </div>
          <Input
            placeholder="Driver notes"
            value={accessConstraints.notes}
            onChange={(event) => setAccessConstraints({ notes: event.target.value })}
          />
        </article>
      </section>

      <aside className="space-y-4 rounded-2xl border bg-card p-6">
        <h2 className="text-lg font-semibold">Summary</h2>
        {isCalculating ? <p className="text-sm text-muted-foreground">Calculating...</p> : null}
        {error ? (
          <p className="flex items-start gap-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
            <AlertTriangle className="mt-0.5 size-4" />
            <span>{error}</span>
          </p>
        ) : null}

        {calculation?.totalDeliveryDays && calculation.totalDeliveryDays > 1 ? (
          <div className="rounded-xl border border-primary/25 bg-primary/10 p-3">
            <p className="flex items-center gap-2 text-sm font-semibold text-primary">
              <Truck className="size-4" />
              Delivery spans {calculation.totalDeliveryDays} days ({calculation.totalLoads} loads)
            </p>
          </div>
        ) : null}

        {calculation?.loads.length ? (
          <details className="rounded-lg border bg-background p-3">
            <summary className="cursor-pointer text-sm font-semibold">
              Delivery: {formatUsd(calculation.deliveryFeeCents)} - {calculation.totalLoads} truck loads
            </summary>
            <div className="mt-3 space-y-2">
              {calculation.loads.map((load, index) => (
                <div key={`${load.truckName}-${index}`} className="rounded-lg border bg-card p-3 text-sm">
                  <p className="font-semibold">
                    Day {load.day}: {load.truckName}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {load.materialClass} | Qty {load.quantity}
                  </p>
                  <p className="text-xs text-muted-foreground">Fee: {formatUsd(load.feeCents)}</p>
                </div>
              ))}
            </div>
          </details>
        ) : null}

        {totals ? (
          <div className="space-y-2">
            {totals.map((line) => (
              <div
                key={line.label}
                className={`flex items-center justify-between text-sm ${
                  line.emphasize ? "pt-2 text-base font-semibold text-primary" : ""
                }`}
              >
                <span>{line.label}</span>
                <span>{formatUsd(line.value)}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Add items to view delivery totals.</p>
        )}

        {calculation ? (
          <Button asChild className="w-full bg-accent text-accent-foreground hover:bg-accent/90">
            <Link href="/checkout">Proceed to Checkout</Link>
          </Button>
        ) : null}
        <Button asChild variant="ghost" className="w-full">
          <Link href="/shop">Continue Shopping</Link>
        </Button>
        <p className="text-xs text-muted-foreground">
          Credit card processing fee is shown as a separate line item at checkout.
        </p>
      </aside>
    </div>
  );
}
