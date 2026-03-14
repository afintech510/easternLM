"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { AlertTriangle, Lock, Phone, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCartStore } from "@/stores/cartStore";
import { siteConfig } from "@/config/site";

function formatUsd(cents: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2 }).format(cents / 100);
}

function defaultDeliveryDate() {
  const now = new Date();
  const target = new Date(now);
  if (now.getDay() >= 1 && now.getDay() <= 5 && now.getHours() < 11) return target.toISOString().slice(0, 10);
  target.setDate(target.getDate() + 1);
  while (target.getDay() === 0) target.setDate(target.getDate() + 1);
  return target.toISOString().slice(0, 10);
}

export function CheckoutPageClient() {
  const items = useCartStore((s) => s.items);
  const calculation = useCartStore((s) => s.deliveryCalculation);
  const deliveryAddress = useCartStore((s) => s.deliveryAddress);
  const deliveryMethod = useCartStore((s) => s.deliveryMethod);
  const combineLoads = useCartStore((s) => s.combineLoads);
  const promoCode = useCartStore((s) => s.promoCode);
  const accessConstraints = useCartStore((s) => s.accessConstraints);

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [deliveryDate, setDeliveryDate] = useState(defaultDeliveryDate());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canCheckout = useMemo(() => {
    if (!calculation || items.length === 0) return false;
    if (deliveryMethod === "delivery" && !deliveryAddress) return false;
    return !calculation.checkoutBlocked;
  }, [calculation, deliveryAddress, deliveryMethod, items.length]);

  if (!calculation || items.length === 0) {
    return (
      <div className="mx-auto max-w-lg space-y-4 px-4 py-20 text-center">
        <h1 className="[font-family:var(--font-display)] text-3xl text-primary">Checkout</h1>
        <p className="text-muted-foreground">Your cart is empty or needs a delivery calculation.</p>
        <Button asChild><Link href="/cart">Back to Cart</Link></Button>
      </div>
    );
  }

  async function handleCheckout() {
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
          clientGrandTotalCents: calculation!.grandTotalCents,
          customer: { fullName, email, phone },
          createAccount: false,
        }),
      });
      const body = (await response.json()) as { error?: string; sessionUrl?: string };
      if (!response.ok || !body.sessionUrl) throw new Error(body.error ?? "Checkout failed.");
      window.location.href = body.sessionUrl;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Checkout failed.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 md:py-14">
      <h1 className="mb-6 [font-family:var(--font-display)] text-3xl text-primary">Checkout</h1>

      <div className="grid gap-8 lg:grid-cols-[1.2fr_1fr]">
        {/* ── Left: form ──────────────────────────────────── */}
        <div className="space-y-5">
          {/* Customer info */}
          <div className="rounded-xl border bg-card p-5 space-y-4">
            <h2 className="text-sm font-semibold">Your Information</h2>
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-sm font-medium" htmlFor="co-name">Full name</label>
                <Input id="co-name" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Your name" />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium" htmlFor="co-email">Email</label>
                  <Input id="co-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium" htmlFor="co-phone">Phone</label>
                  <Input id="co-phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(631) 555-1234" />
                </div>
              </div>
            </div>
          </div>

          {/* Delivery confirmation */}
          <div className="rounded-xl border bg-card p-5 space-y-3">
            <h2 className="text-sm font-semibold">
              {deliveryMethod === "delivery" ? "Delivery Details" : "Pickup Details"}
            </h2>
            {deliveryMethod === "delivery" ? (
              <>
                <div className="rounded-lg bg-muted/50 p-3 text-sm">
                  <p className="font-medium">{deliveryAddress?.fullAddress}</p>
                  <p className="text-xs text-muted-foreground">ZIP: {deliveryAddress?.zip}</p>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium" htmlFor="co-date">Preferred delivery date</label>
                  <Input id="co-date" type="date" value={deliveryDate} onChange={(e) => setDeliveryDate(e.target.value)} className="w-48" />
                  <p className="mt-1 text-xs text-muted-foreground">Orders before 11 AM on weekdays may ship same day.</p>
                </div>
                <Button asChild variant="ghost" size="sm">
                  <Link href="/cart">Change address or method</Link>
                </Button>
              </>
            ) : (
              <div className="rounded-lg bg-muted/50 p-3 text-sm">
                <p className="font-medium">Pickup at yard</p>
                <p className="text-xs text-muted-foreground">110 Frowein Road, Center Moriches, NY 11934</p>
                <p className="text-xs text-muted-foreground">Mon-Fri 7-5, Sat 7-3</p>
              </div>
            )}
          </div>

          {/* Error */}
          {error && (
            <p className="flex items-start gap-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
              <AlertTriangle className="mt-0.5 size-4 shrink-0" /> {error}
            </p>
          )}

          {/* Pay button */}
          <Button
            onClick={handleCheckout}
            disabled={!canCheckout || isSubmitting || !fullName.trim() || !email.trim()}
            size="lg"
            className="w-full bg-accent text-accent-foreground text-base hover:bg-accent/90"
          >
            <Lock className="size-4" />
            {isSubmitting ? "Redirecting to Stripe..." : `Pay ${formatUsd(calculation.grandTotalCents)}`}
          </Button>

          <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1"><Shield className="size-3" /> Secure checkout via Stripe</span>
            <span>256-bit encryption</span>
          </div>
        </div>

        {/* ── Right: order summary ────────────────────────── */}
        <div className="lg:sticky lg:top-28 lg:self-start">
          <div className="rounded-xl border bg-card p-5 space-y-4">
            <h2 className="text-sm font-semibold">Order Summary</h2>

            {/* Items */}
            <div className="space-y-2">
              {items.map((item) => (
                <div key={item.id} className="flex justify-between text-sm">
                  <div>
                    <p className="font-medium">{item.name}</p>
                    <p className="text-xs text-muted-foreground">Qty {item.quantity} &times; {formatUsd(item.unitPriceCents)}</p>
                  </div>
                  <span className="font-medium">{formatUsd(Math.round(item.quantity * item.unitPriceCents))}</span>
                </div>
              ))}
            </div>

            {/* Delivery loads */}
            {calculation.loads.length > 0 && (
              <details className="rounded-lg border bg-background p-3 text-sm">
                <summary className="cursor-pointer font-semibold">
                  Delivery: {formatUsd(calculation.deliveryFeeCents)} ({calculation.totalLoads} load{calculation.totalLoads > 1 ? "s" : ""})
                </summary>
                <div className="mt-2 space-y-1">
                  {calculation.loads.map((load, i) => (
                    <p key={`${load.truckName}-${i}`} className="text-xs text-muted-foreground">
                      Day {load.day}: {load.truckName} — {formatUsd(load.feeCents)}
                    </p>
                  ))}
                </div>
              </details>
            )}

            {/* Totals */}
            <div className="space-y-1.5 border-t pt-3 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Materials</span><span>{formatUsd(calculation.subtotalCents)}</span></div>
              {calculation.proDiscountCents > 0 && (
                <div className="flex justify-between"><span className="text-muted-foreground">Pro discount</span><span className="text-green-600">-{formatUsd(calculation.proDiscountCents)}</span></div>
              )}
              <div className="flex justify-between"><span className="text-muted-foreground">Delivery</span><span>{formatUsd(calculation.deliveryFeeCents)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Tax (8.75%)</span><span>{formatUsd(calculation.taxCents)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">CC processing fee (3%)</span><span>{formatUsd(calculation.ccSurchargeCents)}</span></div>
              <div className="flex justify-between border-t pt-2 text-lg font-bold text-primary">
                <span>Total</span>
                <span>{formatUsd(calculation.grandTotalCents)}</span>
              </div>
              <p className="text-xs text-muted-foreground">
                A 3% credit card surcharge is applied per New York State law and disclosed here before payment.
              </p>
            </div>

            <a href={siteConfig.phoneHref} className="flex items-center justify-center gap-2 pt-2 text-sm text-muted-foreground hover:text-accent">
              <Phone className="size-4" /> Questions? {siteConfig.phoneDisplay}
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
