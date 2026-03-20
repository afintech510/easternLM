"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle, CheckCircle, Lock, Phone, Shield, Truck, Store, Loader2 } from "lucide-react";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCartStore } from "@/stores/cartStore";
import { siteConfig } from "@/config/site";

const stripePromise = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
  ? loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY)
  : null;

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
  return phone.replace(/\D/g, "").length >= 10;
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

  // Pre-fill from cart store (customer info persisted from cart page)
  const [fullName, setFullName] = useState(customerInfo?.fullName || "");
  const [email, setEmail] = useState(customerInfo?.email || "");
  const [phone, setPhone] = useState(customerInfo?.phone || "");
  const [deliveryDate, setDeliveryDate] = useState(defaultDeliveryDate());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [optInSms, setOptInSms] = useState(false);
  const [optInEmail, setOptInEmail] = useState(false);
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [paymentSuccess, setPaymentSuccess] = useState(false);

  useEffect(() => { loadDeliveryConfig(); }, [loadDeliveryConfig]);

  useEffect(() => {
    if (deliveryMethod === "delivery" && deliveryAddress && !calculation && !isCalculating) {
      setDeliveryAddress(deliveryAddress);
    }
  }, [deliveryMethod, deliveryAddress, calculation, isCalculating, setDeliveryAddress]);

  const persistName = useCallback((v: string) => { setFullName(v); setCustomerInfo({ fullName: v }); }, [setCustomerInfo]);
  const persistEmail = useCallback((v: string) => { setEmail(v); setCustomerInfo({ email: v }); }, [setCustomerInfo]);
  const persistPhone = useCallback((v: string) => { setPhone(v); setCustomerInfo({ phone: v }); }, [setCustomerInfo]);

  const nameError = touched.name && fullName.trim().length < 2 ? "Name is required" : null;
  const emailError = touched.email && !isValidEmail(email) ? "Valid email required" : null;
  const phoneError = touched.phone && !isValidPhone(phone) ? "Valid 10-digit phone required" : null;

  const formValid = fullName.trim().length >= 2 && isValidEmail(email) && isValidPhone(phone) &&
    (deliveryMethod !== "delivery" || !!deliveryAddress);

  const canCheckout = useMemo(() => {
    if (!calculation || items.length === 0) return false;
    if (!formValid) return false;
    return !calculation.checkoutBlocked;
  }, [calculation, formValid, items.length]);

  // Split items for display
  const bulkItems = items.filter((i) => i.deliveryType === "bulk");
  const nonBulkItems = items.filter((i) => i.deliveryType !== "bulk");

  if (!calculation || items.length === 0) {
    return (
      <div className="mx-auto max-w-lg space-y-4 px-4 py-20 text-center">
        <h1 className="[font-family:var(--font-display)] text-3xl text-primary">Checkout</h1>
        <p className="text-muted-foreground">Your cart is empty or needs a delivery calculation.</p>
        <Button asChild><Link href="/cart">Back to Cart</Link></Button>
      </div>
    );
  }

  async function handleContinueToPayment() {
    setTouched({ name: true, email: true, phone: true });
    if (!formValid) { setError("Please fill in all required fields."); return; }

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
          deliverySequence: bulkItems.map((item, i) => ({
            deliveryNumber: i + 1,
            productId: item.id,
            productName: item.name,
            quantity: item.quantity,
            feeCents: calculation!.loads?.[i]?.feeCents ?? 0,
          })),
          mode: "embedded",
          createAccount: false,
        }),
      });
      const body = await response.json();
      if (!response.ok || !body.clientSecret) throw new Error(body.error ?? "Checkout failed.");
      setClientSecret(body.clientSecret);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Checkout failed.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-6xl overflow-x-hidden px-4 py-10 md:py-14">
      <h1 className="mb-6 [font-family:var(--font-display)] text-3xl text-primary">Checkout</h1>

      <div className="grid gap-8 lg:grid-cols-[1.2fr_1fr]">
        {/* Left: form */}
        <div className="space-y-5">
          {/* Customer info */}
          <div className="rounded-xl border border-blue-800/40 bg-card p-5 shadow-[0_0_12px_-3px_rgba(37,99,235,0.2)] space-y-4">
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

              {/* 10DLC compliant SMS opt-in */}
              <div className="mt-3 space-y-2 border-t pt-3">
                <label className="flex items-start gap-2.5 text-xs cursor-pointer rounded-lg border p-3 hover:bg-muted/30">
                  <input type="checkbox" checked={optInSms} onChange={(e) => setOptInSms(e.target.checked)} className="mt-0.5 size-4 shrink-0 rounded" />
                  <span className="text-muted-foreground leading-relaxed">
                    I agree to receive order updates, delivery notifications, and promotional messages from Eastern Landscape &amp; Mason Supply via SMS to the phone number provided. Message frequency varies. Message and data rates may apply. Reply STOP to cancel, HELP for help. View our <a href="/terms#sms-terms" className="underline text-accent">SMS Terms</a> and <a href="/privacy-policy" className="underline text-accent">Privacy Policy</a>.
                  </span>
                </label>
                <label className="flex items-center gap-2.5 text-xs cursor-pointer rounded-lg border p-3 hover:bg-muted/30">
                  <input type="checkbox" checked={optInEmail} onChange={(e) => setOptInEmail(e.target.checked)} className="size-4 shrink-0 rounded" />
                  <span className="text-muted-foreground">Send me deals and seasonal updates via email</span>
                </label>
              </div>
            </div>
          </div>

          {/* Delivery details + sequence */}
          <div className="rounded-xl border border-blue-800/40 bg-card p-5 shadow-[0_0_12px_-3px_rgba(37,99,235,0.2)] space-y-3">
            <h2 className="text-sm font-semibold">
              {deliveryMethod === "delivery" ? "Delivery Details" : "Pickup Details"}
            </h2>
            {deliveryMethod === "delivery" ? (
              <>
                {deliveryAddress ? (
                  <div className="rounded-lg bg-muted/50 p-3 text-sm">
                    <p className="font-medium">{deliveryAddress.fullAddress}</p>
                  </div>
                ) : (
                  <p className="text-sm text-destructive">Please set a delivery address in your cart.</p>
                )}
                <div>
                  <label className="mb-1 block text-sm font-medium" htmlFor="co-date">Preferred delivery date</label>
                  <Input id="co-date" type="date" value={deliveryDate} onChange={(e) => setDeliveryDate(e.target.value)} className="w-48" />
                  <p className="mt-1 text-xs text-muted-foreground">Orders before 11 AM on weekdays may ship same day.</p>
                </div>

                {/* Delivery sequence — always visible */}
                {bulkItems.length > 0 && (
                  <div className="space-y-2 rounded-lg border bg-background p-3">
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Delivery Sequence</p>
                    {bulkItems.map((item, i) => (
                      <div key={item.id} className="flex items-center justify-between text-sm">
                        <div>
                          <span className="font-medium">Delivery {i + 1}:</span>{" "}
                          <span className="text-muted-foreground">{item.name} — {item.quantity} yd</span>
                        </div>
                        <span className="font-medium whitespace-nowrap">
                          {formatUsd(Math.round(item.quantity * item.unitPriceCents))}
                          {calculation.loads?.[i] && (
                            <span className="text-xs text-muted-foreground ml-1">+ {formatUsd(calculation.loads[i].feeCents)}</span>
                          )}
                        </span>
                      </div>
                    ))}
                    {nonBulkItems.length > 0 && (
                      <p className="text-xs text-muted-foreground pt-1 border-t">
                        + {nonBulkItems.length} additional item{nonBulkItems.length > 1 ? "s" : ""} (ride with delivery)
                      </p>
                    )}
                    {calculation.totalLoads > 1 && (
                      <p className="text-[10px] text-muted-foreground">(Load 2+ discounted 25%)</p>
                    )}
                  </div>
                )}

                <Button asChild variant="ghost" size="sm">
                  <Link href="/cart">Change address or delivery order</Link>
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

          {/* Payment section */}
          {paymentSuccess ? (
            <div className="rounded-xl border border-green-600/40 bg-green-50 dark:bg-green-950/20 p-6 text-center space-y-3">
              <CheckCircle className="mx-auto size-12 text-green-600" />
              <h2 className="text-xl font-bold text-green-700 dark:text-green-400">Payment Successful!</h2>
              <p className="text-sm text-muted-foreground">Your order has been placed. Check your email for confirmation.</p>
              <Button asChild><Link href="/checkout/success">View Order Confirmation</Link></Button>
            </div>
          ) : !clientSecret ? (
            <>
              <Button
                onClick={handleContinueToPayment}
                disabled={!canCheckout || isSubmitting}
                size="lg"
                className="w-full bg-accent text-accent-foreground text-base hover:bg-accent/90"
              >
                {isSubmitting ? <><Loader2 className="size-4 animate-spin" /> Preparing payment...</> : <><Lock className="size-4" /> Continue to Payment — {formatUsd(calculation.grandTotalCents)}</>}
              </Button>
              <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1"><Shield className="size-3" /> Secure checkout via Stripe</span>
                <span>256-bit encryption</span>
              </div>
            </>
          ) : stripePromise ? (
            <div className="rounded-xl border border-blue-800/40 bg-card p-5 shadow-[0_0_12px_-3px_rgba(37,99,235,0.2)]">
              <h2 className="text-sm font-semibold mb-4">Payment Details</h2>
              <Elements stripe={stripePromise} options={{
                clientSecret,
                appearance: {
                  theme: "stripe",
                  variables: {
                    colorPrimary: "#1e3a5f",
                    borderRadius: "8px",
                    fontFamily: "system-ui, sans-serif",
                  },
                },
              }}>
                <EmbeddedPaymentForm
                  totalCents={calculation.grandTotalCents}
                  onSuccess={() => {
                    setPaymentSuccess(true);
                    // Clear cart after successful payment
                    useCartStore.getState().recalculateDelivery();
                  }}
                  onError={(msg) => setError(msg)}
                />
              </Elements>
            </div>
          ) : (
            /* Fallback: Stripe publishable key not configured — show message */
            <div className="rounded-xl border bg-card p-5 text-center space-y-3">
              <p className="text-sm text-muted-foreground">Payment system loading...</p>
              <p className="text-xs text-muted-foreground">If this persists, call (631) 874-6244 to place your order.</p>
            </div>
          )}
        </div>

        {/* Right: order summary */}
        <div className="lg:sticky lg:top-28 lg:self-start">
          <div className="rounded-xl border border-blue-800/40 bg-card p-5 shadow-[0_0_12px_-3px_rgba(37,99,235,0.2)] space-y-4">
            <h2 className="text-sm font-semibold">Order Summary</h2>

            {/* Items with delivery fees */}
            <div className="space-y-2">
              {bulkItems.map((item, i) => (
                <div key={item.id} className="text-sm">
                  <div className="flex justify-between">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium">{deliveryMethod === "delivery" ? `Delivery ${i + 1}:` : `Pickup ${i + 1}:`} {item.name}</p>
                      <p className="text-xs text-muted-foreground">{item.quantity} yd × {formatUsd(item.unitPriceCents)}</p>
                    </div>
                    <span className="font-medium whitespace-nowrap ml-2">{formatUsd(Math.round(item.quantity * item.unitPriceCents))}</span>
                  </div>
                  {deliveryMethod === "delivery" && calculation.loads?.[i] && (
                    <div className="flex justify-between text-xs text-muted-foreground ml-2">
                      <span>Delivery fee</span>
                      <span>{formatUsd(calculation.loads[i].feeCents)}</span>
                    </div>
                  )}
                </div>
              ))}
              {nonBulkItems.map((item) => (
                <div key={item.id} className="flex justify-between text-sm">
                  <div>
                    <p className="font-medium">{item.name}</p>
                    <p className="text-xs text-muted-foreground">{item.quantity} × {formatUsd(item.unitPriceCents)}</p>
                  </div>
                  <span className="font-medium">{formatUsd(Math.round(item.quantity * item.unitPriceCents))}</span>
                </div>
              ))}
            </div>

            {/* Totals */}
            <div className="space-y-1.5 border-t pt-3 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Materials</span><span>{formatUsd(calculation.subtotalCents)}</span></div>
              {calculation.proDiscountCents > 0 && (
                <div className="flex justify-between"><span className="text-muted-foreground">Pro discount</span><span className="text-green-600">-{formatUsd(calculation.proDiscountCents)}</span></div>
              )}
              {deliveryMethod === "delivery" && (
                <div className="flex justify-between"><span className="text-muted-foreground">Delivery ({calculation.totalLoads} load{calculation.totalLoads > 1 ? "s" : ""})</span><span>{formatUsd(calculation.deliveryFeeCents)}</span></div>
              )}
              <div className="flex justify-between"><span className="text-muted-foreground">Tax (8.75%)</span><span>{formatUsd(calculation.taxCents)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">CC processing fee (3%)</span><span>{formatUsd(calculation.ccSurchargeCents)}</span></div>
              <div className="flex justify-between border-t pt-2 text-lg font-bold text-primary">
                <span>Total</span>
                <span>{formatUsd(calculation.grandTotalCents)}</span>
              </div>
              <p className="text-xs text-muted-foreground">
                A 3% credit card surcharge is applied per New York State law.
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

/** Embedded Stripe Payment Form — renders inside <Elements> */
function EmbeddedPaymentForm({ totalCents, onSuccess, onError }: {
  totalCents: number;
  onSuccess: () => void;
  onError: (msg: string) => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [processing, setProcessing] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!stripe || !elements) return;

    setProcessing(true);

    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/checkout/success`,
      },
      redirect: "if_required",
    });

    if (error) {
      onError(error.message ?? "Payment failed.");
      setProcessing(false);
    } else {
      // Payment succeeded without redirect
      onSuccess();
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <PaymentElement options={{
        layout: "tabs",
      }} />
      <Button
        type="submit"
        disabled={!stripe || processing}
        size="lg"
        className="w-full bg-accent text-accent-foreground text-base hover:bg-accent/90"
      >
        {processing ? (
          <><Loader2 className="size-4 animate-spin" /> Processing...</>
        ) : (
          <><Lock className="size-4" /> Pay {formatUsd(totalCents)}</>
        )}
      </Button>
      <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1"><Shield className="size-3" /> Secured by Stripe</span>
        <span>256-bit encryption</span>
      </div>
    </form>
  );
}
