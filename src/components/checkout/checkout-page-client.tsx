"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, ArrowLeft, CheckCircle, Lock, Phone, Shield, Truck, Store, Loader2 } from "lucide-react";
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

/** Get current time in America/New_York */
function nyNow(): Date {
  return new Date(new Date().toLocaleString("en-US", { timeZone: "America/New_York" }));
}

/** Can the customer select today for delivery? (before 1 PM NY time, Mon-Sat) */
function canSelectToday(): boolean {
  const now = nyNow();
  const day = now.getDay();
  return day >= 1 && day <= 6 && now.getHours() < 13;
}

/** Get the minimum selectable delivery date (YYYY-MM-DD) */
function minDeliveryDate(): string {
  const now = nyNow();
  if (canSelectToday()) return formatLocalDate(now);
  const next = new Date(now);
  next.setDate(next.getDate() + 1);
  while (next.getDay() === 0) next.setDate(next.getDate() + 1); // skip Sunday
  return formatLocalDate(next);
}

function defaultDeliveryDate(): string {
  return minDeliveryDate();
}

function formatLocalDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Is a date string a Sunday? */
function isSunday(dateStr: string): boolean {
  const d = new Date(dateStr + "T12:00:00");
  return d.getDay() === 0;
}

/** Is the selected date today? */
function isToday(dateStr: string): boolean {
  return dateStr === formatLocalDate(nyNow());
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
  const deliveryTimeWindow = useCartStore((s) => s.deliveryTimeWindow);
  const customerInfo = useCartStore((s) => s.customerInfo);
  const setCustomerInfo = useCartStore((s) => s.setCustomerInfo);
  const isCalculating = useCartStore((s) => s.isCalculating);
  const setDeliveryAddress = useCartStore((s) => s.setDeliveryAddress);
  const loadDeliveryConfig = useCartStore((s) => s.loadDeliveryConfig);

  // Read directly from store — no local useState so Zustand hydration timing never causes stale values
  const fullName = customerInfo?.fullName ?? "";
  const email = customerInfo?.email ?? "";
  const phone = customerInfo?.phone ?? "";
  const optInSms = customerInfo?.smsOptIn ?? false;

  const [deliveryDate, setDeliveryDate] = useState(defaultDeliveryDate());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [paymentIntentId, setPaymentIntentId] = useState<string | null>(null);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<"card" | "cod">("card");
  const autoTriggered = useRef(false);

  // Client-side COD total preview: applies 3% discount on (subtotal + delivery + tax),
  // removes CC surcharge. Server recomputes for authoritative total.
  const codPreview = useMemo(() => {
    if (!calculation) return null;
    const preCcTotal =
      calculation.discountedSubtotalCents +
      calculation.deliveryFeeCents +
      calculation.taxCents;
    const codDiscountCents = Math.round(preCcTotal * 0.03);
    return {
      codDiscountCents,
      grandTotalCents: preCcTotal - codDiscountCents,
    };
  }, [calculation]);

  const displayTotalCents =
    paymentMethod === "cod" && codPreview
      ? codPreview.grandTotalCents
      : calculation?.grandTotalCents ?? 0;

  useEffect(() => { loadDeliveryConfig(); }, [loadDeliveryConfig]);

  useEffect(() => {
    if (deliveryMethod === "delivery" && deliveryAddress && !calculation && !isCalculating) {
      setDeliveryAddress(deliveryAddress);
    }
  }, [deliveryMethod, deliveryAddress, calculation, isCalculating, setDeliveryAddress]);

  const persistName = useCallback((v: string) => setCustomerInfo({ fullName: v }), [setCustomerInfo]);
  const persistEmail = useCallback((v: string) => setCustomerInfo({ email: v }), [setCustomerInfo]);
  const persistPhone = useCallback((v: string) => setCustomerInfo({ phone: v }), [setCustomerInfo]);
  const persistSmsOptIn = useCallback((v: boolean) => setCustomerInfo({ smsOptIn: v }), [setCustomerInfo]);

  const nameError = touched.name && fullName.trim().length < 2 ? "Name is required" : null;
  const emailError = touched.email && !isValidEmail(email) ? "Valid email required" : null;
  const phoneError = touched.phone && !isValidPhone(phone) ? "Valid 10-digit phone required" : null;

  const smsOptInError = touched.smsOptIn && !optInSms ? "SMS consent is required to proceed" : null;

  const formValid = fullName.trim().length >= 2 && isValidEmail(email) && isValidPhone(phone) &&
    optInSms &&
    (deliveryMethod !== "delivery" || !!deliveryAddress);

  const canCheckout = useMemo(() => {
    if (!calculation || items.length === 0) return false;
    if (!formValid) return false;
    return !calculation.checkoutBlocked;
  }, [calculation, formValid, items.length]);

  // Auto-proceed to payment if all fields are already filled from cart.
  // Only auto-triggers for card payment — COD requires explicit click.
  useEffect(() => {
    if (
      !autoTriggered.current &&
      canCheckout &&
      !clientSecret &&
      !isSubmitting &&
      paymentMethod === "card"
    ) {
      autoTriggered.current = true;
      handleContinueToPayment();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canCheckout, paymentMethod]);

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
    setTouched({ name: true, email: true, phone: true, smsOptIn: true });
    if (!formValid) {
      if (!optInSms) setError("Please agree to receive SMS order updates to continue.");
      else if (deliveryMethod === "delivery" && !deliveryAddress) setError("Please enter a delivery address.");
      else setError("Please fill in all required fields.");
      return;
    }

    setError(null);
    setIsSubmitting(true);
    try {
      const clientGrandTotal =
        paymentMethod === "cod" && codPreview
          ? codPreview.grandTotalCents
          : calculation!.grandTotalCents;

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
          deliveryTimeWindow,
          clientGrandTotalCents: clientGrandTotal,
          customer: { fullName, email, phone, optInSms },
          deliverySequence: bulkItems.map((item, i) => ({
            deliveryNumber: i + 1,
            productId: item.id,
            productName: item.name,
            quantity: item.quantity,
            feeCents: calculation!.loads?.[i]?.feeCents ?? 0,
          })),
          mode: "embedded",
          createAccount: false,
          paymentMethod,
        }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "Checkout failed.");

      // COD: order created and notifications sent — redirect to success page
      if (body.codConfirmed && body.orderId) {
        useCartStore.getState().clearCart();
        window.location.href = `/checkout/success?orderId=${body.orderId}&cod=1`;
        return;
      }

      // Card: continue to Stripe payment
      if (!body.clientSecret) throw new Error("Checkout failed.");
      setClientSecret(body.clientSecret);
      setPaymentIntentId(body.paymentIntentId ?? null);
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
              <div className="mt-3 border-t pt-3">
                <label className={`flex items-start gap-2.5 text-xs cursor-pointer rounded-lg border p-3 hover:bg-muted/30 ${smsOptInError ? "border-destructive bg-destructive/5" : ""}`}>
                  <input type="checkbox" checked={optInSms} onChange={(e) => persistSmsOptIn(e.target.checked)} className="mt-0.5 size-4 shrink-0 rounded" />
                  <span className="text-muted-foreground leading-relaxed">
                    I agree to receive order updates, delivery notifications, and promotional messages from Eastern Landscape &amp; Mason Supply via SMS to the phone number provided. Message frequency varies. Message and data rates may apply. Reply STOP to cancel, HELP for help. View our <a href="/terms#sms-terms" className="underline text-accent">SMS Terms</a> and <a href="/privacy-policy" className="underline text-accent">Privacy Policy</a>.
                    <span className="text-destructive font-medium"> *Required</span>
                  </span>
                </label>
                {smsOptInError && <p className="mt-1 text-xs text-destructive">{smsOptInError}</p>}
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
                  <Input
                    id="co-date"
                    type="date"
                    value={deliveryDate}
                    min={minDeliveryDate()}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (isSunday(val)) return; // block Sunday selection
                      setDeliveryDate(val);
                    }}
                    className="w-48"
                  />
                  {deliveryDate && isSunday(deliveryDate) && (
                    <p className="mt-1 text-xs text-destructive font-medium">We do not deliver on Sundays. Please select another date.</p>
                  )}
                  {deliveryDate && isToday(deliveryDate) && canSelectToday() && (
                    <div className="mt-1.5 rounded-md border border-amber-200 bg-amber-50 p-2">
                      <p className="text-xs text-amber-800 font-medium">Same-day delivery is not guaranteed.</p>
                      <p className="text-xs text-amber-700">Please call (631) 874-6244 to confirm availability with dispatch.</p>
                    </div>
                  )}
                  {(!deliveryDate || (!isToday(deliveryDate) && !isSunday(deliveryDate))) && (
                    <p className="mt-1 text-xs text-muted-foreground">Mon–Sat delivery. Same-day available if ordered before 1 PM.</p>
                  )}
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

                <Link
                  href="/cart"
                  className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-medium text-muted-foreground hover:border-accent hover:text-accent transition-colors"
                >
                  <ArrowLeft className="size-4" /> Return to Cart / Change Address
                </Link>
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
              {/* Payment method toggle */}
              <div className="rounded-xl border border-blue-800/40 bg-card p-5 shadow-[0_0_12px_-3px_rgba(37,99,235,0.2)] space-y-3">
                <h2 className="text-sm font-semibold">Payment Method</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <label
                    className={`flex cursor-pointer flex-col gap-1 rounded-lg border-2 p-3 transition-colors ${
                      paymentMethod === "card"
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-border/80"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="paymentMethod"
                        value="card"
                        checked={paymentMethod === "card"}
                        onChange={() => setPaymentMethod("card")}
                        className="size-4 accent-primary"
                      />
                      <span className="text-sm font-semibold">Credit Card</span>
                    </div>
                    <p className="ml-6 text-xs text-muted-foreground">
                      Pay now with Visa, Mastercard, Amex. Secure via Stripe.
                    </p>
                  </label>
                  <label
                    className={`flex cursor-pointer flex-col gap-1 rounded-lg border-2 p-3 transition-colors ${
                      paymentMethod === "cod"
                        ? "border-accent bg-accent/5"
                        : "border-border hover:border-border/80"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="paymentMethod"
                        value="cod"
                        checked={paymentMethod === "cod"}
                        onChange={() => setPaymentMethod("cod")}
                        className="size-4 accent-primary"
                      />
                      <span className="text-sm font-semibold">Cash on Delivery</span>
                      <span className="ml-auto rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-semibold text-green-700">
                        SAVE 3%
                      </span>
                    </div>
                    <p className="ml-6 text-xs text-muted-foreground">
                      Pay driver on arrival (cash or check). Get 3% off and no processing fee.
                    </p>
                  </label>
                </div>
              </div>

              <Button
                onClick={handleContinueToPayment}
                disabled={!canCheckout || isSubmitting}
                size="lg"
                className="w-full bg-accent text-accent-foreground text-base hover:bg-accent/90"
              >
                {isSubmitting ? (
                  <><Loader2 className="size-4 animate-spin" /> {paymentMethod === "cod" ? "Placing order..." : "Preparing payment..."}</>
                ) : paymentMethod === "cod" ? (
                  <><CheckCircle className="size-4" /> Place Order — {formatUsd(displayTotalCents)} on delivery</>
                ) : (
                  <><Lock className="size-4" /> Continue to Payment — {formatUsd(calculation.grandTotalCents)}</>
                )}
              </Button>
              <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground">
                {paymentMethod === "cod" ? (
                  <span className="flex items-center gap-1"><CheckCircle className="size-3 text-green-600" /> No payment now · Pay driver on delivery</span>
                ) : (
                  <>
                    <span className="flex items-center gap-1"><Shield className="size-3" /> Secure checkout via Stripe</span>
                    <span>256-bit encryption</span>
                  </>
                )}
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
                  paymentIntentId={paymentIntentId ?? undefined}
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
              {paymentMethod === "cod" && codPreview && codPreview.codDiscountCents > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">COD discount (3%)</span>
                  <span className="text-green-600">-{formatUsd(codPreview.codDiscountCents)}</span>
                </div>
              )}
              <div className="flex justify-between border-t pt-2 text-lg font-bold text-primary">
                <span>{paymentMethod === "cod" ? "Due on Delivery" : "Total"}</span>
                <span>{formatUsd(displayTotalCents)}</span>
              </div>
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
function EmbeddedPaymentForm({ totalCents, paymentIntentId, onSuccess, onError }: {
  totalCents: number;
  paymentIntentId?: string;
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

    const { error, paymentIntent } = await stripe.confirmPayment({
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
      // Payment succeeded — confirm server-side (send emails, mark paid)
      const piId = paymentIntent?.id || paymentIntentId;
      if (piId) {
        try {
          await fetch("/api/checkout/confirm", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ paymentIntentId: piId }),
          });
        } catch {}
      }
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
