"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CheckCircle2, Loader2, Lock, Shield, ArrowLeft } from "lucide-react";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, CardElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { Button } from "@/components/ui/button";
import type { CartItem } from "@/lib/book-now/types";

const stripePromise = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
  ? loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY)
  : null;

const CC_SURCHARGE_RATE = 0.03;

function formatUsd(cents: number) {
  return `$${(cents / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function BookNowCheckoutClient() {
  const [cart, setCart] = useState<CartItem[] | null>(null);

  useEffect(() => {
    const raw = sessionStorage.getItem("elm_book_now_cart");
    if (!raw) {
      setCart([]);
      return;
    }
    try {
      setCart(JSON.parse(raw));
    } catch {
      setCart([]);
    }
  }, []);

  if (cart === null) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (cart.length === 0) {
    return (
      <div className="mx-auto max-w-lg space-y-4 px-4 py-20 text-center">
        <h1 className="text-3xl font-semibold">Your booking is empty</h1>
        <p className="text-muted-foreground">Add services before checking out.</p>
        <Button asChild>
          <Link href="/services/book-now">Back to Services</Link>
        </Button>
      </div>
    );
  }

  const subtotal = cart.reduce((s, i) => s + i.lineTotalCents, 0);
  const ccSurcharge = Math.round(subtotal * CC_SURCHARGE_RATE);
  const total = subtotal + ccSurcharge;

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 md:py-14">
      <Link href="/services/book-now" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> Back to services
      </Link>
      <h1 className="[font-family:var(--font-display)] text-3xl text-primary md:text-4xl">Review & Reserve Your Booking</h1>
      <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
        Your card will be <strong>authorized but not charged</strong>. We'll confirm scheduling within 24 hours, then capture payment when the crew is dispatched. Cancel anytime before — no fees.
      </p>

      <div className="mt-8 grid gap-8 lg:grid-cols-[1.3fr_1fr]">
        <div>
          {stripePromise ? (
            <Elements
              stripe={stripePromise}
              options={{
                appearance: {
                  theme: "stripe",
                  variables: { colorPrimary: "#1e3a5f", borderRadius: "8px", fontFamily: "system-ui, sans-serif" },
                },
              }}
            >
              <CheckoutForm cart={cart} totalCents={total} />
            </Elements>
          ) : (
            <div className="rounded-xl border bg-card p-6 text-center text-muted-foreground">
              Payment system not available. Please call (631) 874-6244.
            </div>
          )}
        </div>

        <aside>
          <div className="sticky top-24 rounded-xl border bg-card p-5">
            <h2 className="mb-3 font-semibold">Your Booking</h2>
            <div className="space-y-2">
              {cart.map((item, i) => (
                <div key={i} className="flex justify-between gap-2 text-sm">
                  <div>
                    <p className="font-medium">{item.serviceName}</p>
                    <p className="text-xs text-muted-foreground">
                      {item.packageName}{item.quantity > 1 ? ` × ${item.quantity}` : ""}
                    </p>
                  </div>
                  <span className="shrink-0 font-semibold">{formatUsd(item.lineTotalCents)}</span>
                </div>
              ))}
            </div>
            <div className="mt-4 space-y-1.5 border-t pt-3 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>{formatUsd(subtotal)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Processing (3%)</span><span>{formatUsd(ccSurcharge)}</span></div>
              <div className="flex justify-between border-t pt-2 text-lg font-bold text-primary">
                <span>Authorization Total</span>
                <span>{formatUsd(total)}</span>
              </div>
            </div>
            <p className="mt-3 rounded-md bg-amber-50 p-2.5 text-xs text-amber-900">
              🔒 Card held for up to 7 days. We confirm within 24 hours. Cancel any time before capture = zero fees.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}

function CheckoutForm({ cart, totalCents }: { cart: CartItem[]; totalCents: number }) {
  const stripe = useStripe();
  const elements = useElements();
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [preferredDate, setPreferredDate] = useState("");
  const [notes, setNotes] = useState("");
  const [smsOptIn, setSmsOptIn] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);

  const nameValid = name.trim().length >= 2;
  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const phoneValid = phone.replace(/\D/g, "").length >= 10;
  const addressValid = address.trim().length >= 5;

  const formValid = nameValid && emailValid && phoneValid && addressValid && smsOptIn && termsAccepted;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!formValid || !stripe || !elements) return;

    setProcessing(true);
    setError(null);

    try {
      const card = elements.getElement(CardElement);
      if (!card) throw new Error("Card element not ready");

      // Create PaymentMethod from card
      const pmResult = await stripe.createPaymentMethod({
        type: "card",
        card,
        billing_details: { name, email, phone },
      });

      if (pmResult.error) throw new Error(pmResult.error.message || "Card validation failed");

      // Call our server to create PaymentIntent with manual capture + order
      const res = await fetch("/api/services/book-now/book", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: cart,
          customer: { name, email, phone },
          address,
          preferredDate,
          notes,
          paymentMethodId: pmResult.paymentMethod.id,
          clientTotalCents: totalCents,
        }),
      });

      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Booking failed");

      // Clear cart
      sessionStorage.removeItem("elm_book_now_cart");

      // Redirect to success
      window.location.href = `/services/book-now/success?orderId=${body.orderId}`;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Booking failed. Please try again.");
      setProcessing(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="space-y-4 rounded-xl border bg-card p-5">
        <h2 className="text-sm font-semibold">Your Information</h2>
        <div>
          <label className="mb-1 block text-sm font-medium">Full name *</label>
          <input value={name} onChange={(e) => setName(e.target.value)}
            className="w-full rounded-md border px-3 py-2 text-sm" placeholder="Your name" />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium">Email *</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-md border px-3 py-2 text-sm" placeholder="you@example.com" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Phone *</label>
            <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)}
              className="w-full rounded-md border px-3 py-2 text-sm" placeholder="(631) 555-1234" />
          </div>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Service Address *</label>
          <input value={address} onChange={(e) => setAddress(e.target.value)}
            className="w-full rounded-md border px-3 py-2 text-sm" placeholder="123 Main St, Town, NY ZIP" />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium">Preferred date</label>
            <input type="date" value={preferredDate} onChange={(e) => setPreferredDate(e.target.value)}
              min={new Date().toISOString().split("T")[0]}
              className="w-full rounded-md border px-3 py-2 text-sm" />
          </div>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Notes (optional)</label>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)}
            rows={3} className="w-full rounded-md border px-3 py-2 text-sm"
            placeholder="Gate codes, pet info, access instructions, anything we should know" />
        </div>
        <label className="flex items-start gap-2 text-sm">
          <input type="checkbox" checked={smsOptIn} onChange={(e) => setSmsOptIn(e.target.checked)}
            className="mt-0.5 size-4 accent-primary" required />
          <span className="text-muted-foreground">
            Text me scheduling and dispatch updates. Message & data rates may apply. Reply STOP to cancel.
          </span>
        </label>
      </div>

      <div className="space-y-3 rounded-xl border bg-card p-5">
        <h2 className="text-sm font-semibold">Payment — Authorization Hold</h2>
        <p className="text-xs text-muted-foreground">
          Your card will be authorized for {formatUsd(totalCents)} (commitment only — <strong>not charged</strong>).
          Once you confirm date, time, and sign our terms, we capture <strong>only the platform booking fee</strong> (non-refundable).
          The remaining balance is paid directly to the Provider in cash: <strong>50% before service</strong>, <strong>50% after completion</strong>.
        </p>
        <div className="rounded-md border bg-background px-3 py-3">
          <CardElement options={{ style: { base: { fontSize: "16px" } } }} />
        </div>
      </div>

      <div className="rounded-xl border bg-card p-5">
        <label className="flex items-start gap-2 text-sm">
          <input type="checkbox" checked={termsAccepted} onChange={(e) => setTermsAccepted(e.target.checked)}
            className="mt-0.5 size-4 accent-primary" required />
          <span className="text-muted-foreground">
            I understand Eastern LM operates a <strong>booking platform</strong> connecting me with a certified local service Provider (not always Eastern LM's direct crew). I agree to the{" "}
            <a href="/services/book-now/terms" target="_blank" rel="noopener noreferrer" className="text-primary underline hover:no-underline">
              Platform Terms
            </a>{" "}
            including the payment flow (platform fee captured, balance paid to Provider in cash), Non-Compete, and Liability Waiver to be signed on confirmation. *
          </span>
        </label>
      </div>

      {error && (
        <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <Button
        type="submit"
        disabled={!formValid || !stripe || processing}
        size="lg"
        className="w-full bg-accent text-accent-foreground hover:bg-accent/90"
      >
        {processing ? (
          <><Loader2 className="size-4 animate-spin" /> Authorizing...</>
        ) : (
          <><Lock className="size-4" /> Authorize & Book — {formatUsd(totalCents)}</>
        )}
      </Button>
      <div className="flex items-center justify-center gap-3 text-xs text-muted-foreground">
        <span className="flex items-center gap-1"><Shield className="size-3" /> Secured by Stripe</span>
        <span>·</span>
        <span className="flex items-center gap-1"><CheckCircle2 className="size-3 text-green-600" /> Cancel anytime = no fees</span>
      </div>
    </form>
  );
}
