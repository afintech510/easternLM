"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
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

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isValidPhone(phone: string) {
  const digits = phone.replace(/\D/g, "");
  return digits.length >= 10;
}

export function CheckoutPageClient() {
  const items = useCartStore((s) => s.items);
  const calculation = useCartStore((s) => s.deliveryCalculation);
  const deliveryAddress = useCartStore((s) => s.deliveryAddress);
  const deliveryMethod = useCartStore((s) => s.deliveryMethod);
  const combineLoads = useCartStore((s) => s.combineLoads);
  const promoCode = useCartStore((s) => s.promoCode);
  const accessConstraints = useCartStore((s) => s.accessConstraints);
  const customerInfo = useCartStore((s) => s.customerInfo);
  const setCustomerInfo = useCartStore((s) => s.setCustomerInfo);
  const isCalculating = useCartStore((s) => s.isCalculating);
  const setDeliveryAddress = useCartStore((s) => s.setDeliveryAddress);
  const loadDeliveryConfig = useCartStore((s) => s.loadDeliveryConfig);

  const [fullName, setFullName] = useState(customerInfo?.fullName || "");
  const [email, setEmail] = useState(customerInfo?.email || "");
  const [phone, setPhone] = useState(customerInfo?.phone || "");
  const [deliveryDate, setDeliveryDate] = useState(defaultDeliveryDate());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [optInSms, setOptInSms] = useState(true);
  const [optInEmail, setOptInEmail] = useState(true);
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  // Load delivery config on mount
  useEffect(() => { loadDeliveryConfig(); }, [loadDeliveryConfig]);

  // Auto-recalculate when delivery address exists but calculation is missing
  useEffect(() => {
    if (deliveryMethod === "delivery" && deliveryAddress && !calculation && !isCalculating) {
      setDeliveryAddress(deliveryAddress);
    }
  }, [deliveryMethod, deliveryAddress, calculation, isCalculating, setDeliveryAddress]);

  // Persist customer info as they type
  const persistName = useCallback((v: string) => { setFullName(v); setCustomerInfo({ fullName: v }); }, [setCustomerInfo]);
  const persistEmail = useCallback((v: string) => { setEmail(v); setCustomerInfo({ email: v }); }, [setCustomerInfo]);
  const persistPhone = useCallback((v: string) => { setPhone(v); setCustomerInfo({ phone: v }); }, [setCustomerInfo]);

  // Validation
  const nameError = touched.name && fullName.trim().length < 2 ? "Name is required" : null;
  const emailError = touched.email && !isValidEmail(email) ? "Valid email required" : null;
  const phoneError = touched.phone && !isValidPhone(phone) ? "Valid 10-digit phone required" : null;
  const addressError = deliveryMethod === "delivery" && !deliveryAddress ? "Delivery address required" : null;

  const formValid = fullName.trim().length >= 2 && isValidEmail(email) && isValidPhone(phone) &&
    (deliveryMethod !== "delivery" || !!deliveryAddress);

  const canCheckout = useMemo(() => {
    if (!calculation || items.length === 0) return false;
    if (!formValid) return false;
    return !calculation.checkoutBlocked;
  }, [calculation, formValid, items.length]);

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
    // Mark all fields as touched to show validation
    setTouched({ name: true, email: true, phone: true });

    if (!formValid) {
      setError("Please fill in all required fields correctly.");
      return;
    }

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
          customer: { fullName, email, phone, optInSms, optInEmail },
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
        {/* Left: form */}
        <div className="space-y-5">
          {/* Customer info */}
          <div className="rounded-xl border bg-card p-5 space-y-4">
            <h2 className="text-sm font-semibold">Your Information</h2>
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-sm font-medium" htmlFor="co-name">Full name <span className="text-destructive">*</span></label>
                <Input id="co-name" value={fullName} onChange={(e) => persistName(e.target.value)} onBlur={() => setTouched((t) => ({ ...t, name: true }))} placeholder="Your name" className={nameError ? "border-destructive" : ""} />
                {nameError && <p className="mt-1 text-xs text-destructive">{nameError}</p>}
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium" htmlFor="co-email">Email <span className="text-destructive">*</span></label>
                  <Input id="co-email" type="email" value={email} onChange={(e) => persistEmail(e.target.value)} onBlur={() => setTouched((t) => ({ ...t, email: true }))} placeholder="you@example.com" className={emailError ? "border-destructive" : ""} />
                  {emailError && <p className="mt-1 text-xs text-destructive">{emailError}</p>}
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium" htmlFor="co-phone">Phone <span className="text-destructive">*</span></label>
                  <Input id="co-phone" type="tel" value={phone} onChange={(e) => persistPhone(e.target.value)} onBlur={() => setTouched((t) => ({ ...t, phone: true }))} placeholder="(631) 555-1234" className={phoneError ? "border-destructive" : ""} />
                  {phoneError && <p className="mt-1 text-xs text-destructive">{phoneError}</p>}
                </div>
              </div>

              {/* Marketing opt-in */}
              <div className="mt-3 space-y-2 border-t pt-3">
                <label className="flex items-start gap-2 text-sm cursor-pointer">
                  <input type="checkbox" checked={optInSms} onChange={(e) => setOptInSms(e.target.checked)} className="mt-0.5 h-4 w-4 rounded border-gray-300" />
                  <span className="text-muted-foreground leading-snug">
                    Send me order updates and seasonal deals via text. Msg &amp; data rates apply. Reply STOP to opt out.{" "}
                    <a href="/privacy-policy" className="underline">Privacy Policy</a> | <a href="/terms#sms-terms" className="underline">SMS Terms</a>
                  </span>
                </label>
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="checkbox" checked={optInEmail} onChange={(e) => setOptInEmail(e.target.checked)} className="h-4 w-4 rounded border-gray-300" />
                  <span className="text-muted-foreground">Send me deals and seasonal updates via email</span>
                </label>
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
                {deliveryAddress ? (
                  <div className="rounded-lg bg-muted/50 p-3 text-sm">
                    <p className="font-medium">{deliveryAddress.fullAddress}</p>
                    {deliveryAddress.zip && <p className="text-xs text-muted-foreground">ZIP: {deliveryAddress.zip}</p>}
                  </div>
                ) : (
                  <p className="text-sm text-destructive">{addressError || "Please set a delivery address in your cart."}</p>
                )}
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
            disabled={!canCheckout || isSubmitting}
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

        {/* Right: order summary */}
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
