"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCartStore } from "@/stores/cartStore";

function formatUsd(cents: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(cents / 100);
}

function defaultDeliveryDate() {
  const now = new Date();
  const weekday = now.getDay();
  const hour = now.getHours();
  const isWeekday = weekday >= 1 && weekday <= 5;

  const target = new Date(now);
  if (isWeekday && hour < 11) {
    return target.toISOString().slice(0, 10);
  }

  target.setDate(target.getDate() + 1);
  while (target.getDay() === 0) {
    target.setDate(target.getDate() + 1);
  }
  return target.toISOString().slice(0, 10);
}

export function CheckoutPageClient() {
  const items = useCartStore((state) => state.items);
  const calculation = useCartStore((state) => state.deliveryCalculation);
  const deliveryAddress = useCartStore((state) => state.deliveryAddress);
  const deliveryMethod = useCartStore((state) => state.deliveryMethod);
  const combineLoads = useCartStore((state) => state.combineLoads);
  const promoCode = useCartStore((state) => state.promoCode);
  const accessConstraints = useCartStore((state) => state.accessConstraints);

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [createAccount, setCreateAccount] = useState(false);
  const [deliveryDate, setDeliveryDate] = useState(defaultDeliveryDate());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canCheckout = useMemo(() => {
    if (!calculation || items.length === 0) {
      return false;
    }
    if (deliveryMethod === "delivery" && !deliveryAddress) {
      return false;
    }
    return !calculation.checkoutBlocked;
  }, [calculation, deliveryAddress, deliveryMethod, items.length]);

  if (!calculation || items.length === 0) {
    return (
      <div className="mx-auto max-w-4xl space-y-4 px-4 py-12">
        <h1 className="[font-family:var(--font-display)] text-4xl text-primary">Checkout</h1>
        <p className="text-sm text-muted-foreground">
          Your cart is empty or missing a delivery calculation. Return to cart to continue.
        </p>
        <Button asChild>
          <Link href="/cart">Back to Cart</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto grid max-w-6xl gap-6 px-4 py-12 md:grid-cols-[1.1fr_1fr]">
      <section className="space-y-5">
        <header>
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-muted-foreground">Checkout</p>
          <h1 className="[font-family:var(--font-display)] text-4xl text-primary">Guest Checkout</h1>
        </header>

        <article className="space-y-3 rounded-2xl border bg-card p-5">
          <h2 className="text-lg font-semibold">Customer Info</h2>
          <Input placeholder="Full name" value={fullName} onChange={(event) => setFullName(event.target.value)} />
          <div className="grid gap-2 sm:grid-cols-2">
            <Input placeholder="Email" value={email} onChange={(event) => setEmail(event.target.value)} />
            <Input placeholder="Phone" value={phone} onChange={(event) => setPhone(event.target.value)} />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={createAccount} onChange={(event) => setCreateAccount(event.target.checked)} />
            Create account after checkout
          </label>
        </article>

        <article className="space-y-3 rounded-2xl border bg-card p-5">
          <h2 className="text-lg font-semibold">Delivery Confirmation</h2>
          <p className="text-sm text-muted-foreground">
            Method: <span className="font-semibold text-foreground">{deliveryMethod}</span>
          </p>
          {deliveryMethod === "delivery" ? (
            <>
              <p className="text-sm text-muted-foreground">
                Address: <span className="font-semibold text-foreground">{deliveryAddress?.fullAddress}</span>
              </p>
              <p className="text-sm text-muted-foreground">
                ZIP: <span className="font-semibold text-foreground">{deliveryAddress?.zip}</span>
              </p>
              <label className="block text-sm font-semibold">Preferred delivery date</label>
              <Input type="date" value={deliveryDate} onChange={(event) => setDeliveryDate(event.target.value)} />
            </>
          ) : (
            <p className="text-sm text-muted-foreground">Pickup at yard: 543 Montauk Hwy, East Moriches, NY 11940.</p>
          )}
        </article>

        {error ? (
          <p className="flex items-start gap-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
            <AlertTriangle className="mt-0.5 size-4" />
            <span>{error}</span>
          </p>
        ) : null}

        <Button
          disabled={!canCheckout || isSubmitting}
          onClick={async () => {
            setError(null);
            setIsSubmitting(true);
            try {
              const response = await fetch("/api/checkout", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  cartItems: items,
                  deliveryMethod,
                  deliveryAddress,
                  combineLoads,
                  promoCode,
                  accessConstraints,
                  deliveryDate,
                  clientGrandTotalCents: calculation.grandTotalCents,
                  customer: {
                    fullName,
                    email,
                    phone,
                  },
                  createAccount,
                }),
              });

              const body = (await response.json()) as { error?: string; sessionUrl?: string };
              if (!response.ok || !body.sessionUrl) {
                throw new Error(body.error ?? "Checkout failed.");
              }

              window.location.href = body.sessionUrl;
            } catch (submitError) {
              setError(submitError instanceof Error ? submitError.message : "Checkout failed.");
            } finally {
              setIsSubmitting(false);
            }
          }}
        >
          {isSubmitting ? "Redirecting to Stripe..." : "Proceed to Secure Payment"}
        </Button>
      </section>

      <aside className="space-y-4 rounded-2xl border bg-card p-5">
        <h2 className="text-lg font-semibold">Order Summary</h2>
        <div className="space-y-2">
          {items.map((item) => (
            <div key={item.id} className="rounded-lg border bg-background p-3">
              <p className="text-sm font-semibold">{item.name}</p>
              <p className="text-xs text-muted-foreground">
                Qty {item.quantity} • {formatUsd(item.unitPriceCents)} each
              </p>
              <p className="text-xs text-muted-foreground">
                Line total: {formatUsd(Math.round(item.quantity * item.unitPriceCents))}
              </p>
            </div>
          ))}
        </div>

        <details className="rounded-lg border bg-background p-3" open>
          <summary className="cursor-pointer text-sm font-semibold">
            Delivery: {formatUsd(calculation.deliveryFeeCents)} - {calculation.totalLoads} truck loads
          </summary>
          <div className="mt-2 space-y-2">
            {calculation.loads.map((load, index) => (
              <p key={`${load.truckName}-${index}`} className="text-xs text-muted-foreground">
                Day {load.day}: {load.truckName} ({load.materialClass}) - {formatUsd(load.feeCents)}
              </p>
            ))}
          </div>
        </details>

        <div className="space-y-1 text-sm">
          <div className="flex items-center justify-between">
            <span>Materials</span>
            <span>{formatUsd(calculation.subtotalCents)}</span>
          </div>
          {calculation.proDiscountCents > 0 ? (
            <div className="flex items-center justify-between">
              <span>Pro discount</span>
              <span>-{formatUsd(calculation.proDiscountCents)}</span>
            </div>
          ) : null}
          <div className="flex items-center justify-between">
            <span>Delivery</span>
            <span>{formatUsd(calculation.deliveryFeeCents)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span>Tax (8.75%)</span>
            <span>{formatUsd(calculation.taxCents)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span>Credit Card Processing Fee (3%)</span>
            <span>{formatUsd(calculation.ccSurchargeCents)}</span>
          </div>
          <div className="flex items-center justify-between pt-2 text-base font-semibold text-primary">
            <span>Total</span>
            <span>{formatUsd(calculation.grandTotalCents)}</span>
          </div>
          <p className="pt-1 text-xs text-muted-foreground">
            Credit card processing fee is disclosed as a separate line item.
          </p>
        </div>
      </aside>
    </div>
  );
}
