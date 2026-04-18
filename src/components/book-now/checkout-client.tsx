"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, Loader2, Shield } from "lucide-react";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, CardElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { Button } from "@/components/ui/button";
import type { Quote } from "@/lib/book-now/types";
import { TIMELINE_CONFIG } from "@/lib/book-now/types";
import { formatUsd } from "@/lib/book-now/pricing";

const stripePromise = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
  ? loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY)
  : null;

const CC_SURCHARGE_RATE = 0.03;

export function BookNowCheckoutClient() {
  const [quote, setQuote] = useState<Quote | null | undefined>(undefined);

  useEffect(() => {
    const raw = sessionStorage.getItem("elm_book_now_quote");
    if (!raw) { setQuote(null); return; }
    try { setQuote(JSON.parse(raw)); } catch { setQuote(null); }
  }, []);

  if (quote === undefined) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!quote || quote.items.length === 0) {
    return (
      <div className="mx-auto max-w-lg space-y-4 px-4 py-20 text-center">
        <h1 className="text-3xl font-semibold">Your quote is empty</h1>
        <p className="text-muted-foreground">Head back and pick what you need.</p>
        <Button asChild><Link href="/services/book-now">Back to Services</Link></Button>
      </div>
    );
  }

  const ccSurcharge = Math.round(quote.totalCents * CC_SURCHARGE_RATE);
  const finalTotal = quote.totalCents + ccSurcharge;

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 md:py-14">
      <Link href="/services/book-now" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> Back to quote
      </Link>
      <h1 className="[font-family:var(--font-display)] text-3xl text-primary md:text-4xl">Lock in your crew</h1>
      <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
        One quick step. Your card secures the slot — nothing charges until we confirm your crew and date.
      </p>

      <div className="mt-8 grid gap-8 lg:grid-cols-[1.3fr_1fr]">
        {/* Form */}
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
              <CheckoutForm quote={quote} finalTotalCents={finalTotal} />
            </Elements>
          ) : (
            <div className="rounded-xl border bg-card p-6 text-center text-muted-foreground">
              Payment system not available. Call (631) 874-6244.
            </div>
          )}
        </div>

        {/* Summary */}
        <aside>
          <div className="sticky top-24 rounded-xl border bg-card p-5">
            <h2 className="mb-3 font-semibold">Your quote</h2>

            <div className="mb-3 rounded-lg bg-muted/40 p-3 text-xs">
              <p className="font-semibold text-foreground">{quote.property.address}</p>
              <p className="mt-0.5 text-muted-foreground">
                {TIMELINE_CONFIG[quote.timeline].label} · {TIMELINE_CONFIG[quote.timeline].days}
              </p>
            </div>

            <div className="space-y-2">
              {quote.items.map((item, i) => (
                <div key={i} className="flex justify-between gap-2 text-sm">
                  <div className="min-w-0">
                    <p className="font-medium">{item.serviceName}</p>
                  </div>
                  <span className="shrink-0 font-semibold">{formatUsd(item.subtotalCents)}</span>
                </div>
              ))}
            </div>

            <div className="mt-4 space-y-1.5 border-t pt-3 text-sm">
              {quote.timelineMultiplier !== 1 && (
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>{quote.timelineMultiplier > 1 ? "Rush scheduling" : "Flexible discount"}</span>
                  <span>×{quote.timelineMultiplier}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-muted-foreground">Services</span>
                <span>{formatUsd(quote.totalCents)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Processing</span>
                <span>{formatUsd(ccSurcharge)}</span>
              </div>
              <div className="flex justify-between border-t pt-2 text-lg font-bold text-primary">
                <span>Total</span>
                <span>{formatUsd(finalTotal)}</span>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

function CheckoutForm({ quote, finalTotalCents }: { quote: Quote; finalTotalCents: number }) {
  const stripe = useStripe();
  const elements = useElements();
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [preferredDate, setPreferredDate] = useState("");
  const [notes, setNotes] = useState("");
  const [smsOptIn, setSmsOptIn] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);

  const nameValid = name.trim().length >= 2;
  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const phoneValid = phone.replace(/\D/g, "").length >= 10;

  const formValid = nameValid && emailValid && phoneValid && smsOptIn && termsAccepted;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!formValid || !stripe || !elements) return;

    setProcessing(true);
    setError(null);

    try {
      const card = elements.getElement(CardElement);
      if (!card) throw new Error("Card element not ready");

      const pmResult = await stripe.createPaymentMethod({
        type: "card",
        card,
        billing_details: { name, email, phone, address: { line1: quote.property.address } },
      });

      if (pmResult.error) throw new Error(pmResult.error.message || "Card validation failed");

      const res = await fetch("/api/services/book-now/book", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          quote,
          customer: { name, email, phone },
          preferredDate,
          notes,
          paymentMethodId: pmResult.paymentMethod.id,
          termsAccepted,
        }),
      });

      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Booking failed");

      sessionStorage.removeItem("elm_book_now_quote");
      window.location.href = `/services/book-now/success?orderId=${body.orderId}`;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Booking failed");
      setProcessing(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Contact */}
      <section className="space-y-4 rounded-xl border bg-card p-5">
        <h2 className="text-sm font-semibold">Contact info</h2>
        <div>
          <label className="mb-1 block text-sm font-medium">Full name</label>
          <input value={name} onChange={(e) => setName(e.target.value)}
            className="w-full rounded-md border px-3 py-2 text-sm" placeholder="Your name" />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium">Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-md border px-3 py-2 text-sm" placeholder="you@example.com" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Mobile phone</label>
            <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)}
              className="w-full rounded-md border px-3 py-2 text-sm" placeholder="(631) 555-1234" />
          </div>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Preferred date (optional)</label>
          <input type="date" value={preferredDate} onChange={(e) => setPreferredDate(e.target.value)}
            min={new Date().toISOString().split("T")[0]}
            className="w-full rounded-md border px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Notes (optional)</label>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)}
            rows={2} className="w-full rounded-md border px-3 py-2 text-sm"
            placeholder="Gate codes, pets, access details — anything we should know" />
        </div>
        <label className="flex items-start gap-2 text-sm">
          <input type="checkbox" checked={smsOptIn} onChange={(e) => setSmsOptIn(e.target.checked)}
            className="mt-0.5 size-4 accent-primary" required />
          <span className="text-muted-foreground">
            Text me scheduling updates. Reply STOP to cancel.
          </span>
        </label>
      </section>

      {/* Payment */}
      <section className="space-y-3 rounded-xl border bg-card p-5">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold">Secure your booking</h2>
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <Shield className="size-3" /> Secured by Stripe
          </span>
        </div>
        <div className="rounded-md border bg-background px-3 py-3">
          <CardElement options={{ style: { base: { fontSize: "16px" } } }} />
        </div>
        <p className="text-xs text-muted-foreground">
          We place a hold on your card to secure the slot — nothing is charged until we confirm your crew. Final payment can be by card or cash, your choice.
        </p>
      </section>

      {/* Terms */}
      <section className="rounded-xl border bg-card p-5">
        <label className="flex items-start gap-2 text-sm">
          <input type="checkbox" checked={termsAccepted} onChange={(e) => setTermsAccepted(e.target.checked)}
            className="mt-0.5 size-4 accent-primary" required />
          <span className="text-muted-foreground">
            I agree to the{" "}
            <a href="/services/book-now/terms" target="_blank" rel="noopener noreferrer" className="text-primary underline hover:no-underline">
              booking terms
            </a>
            , including the standard non-compete and liability waiver signed on confirmation.
          </span>
        </label>
      </section>

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
          <><Loader2 className="size-4 animate-spin" /> Securing your booking...</>
        ) : (
          <>Reserve for {formatUsd(finalTotalCents)}</>
        )}
      </Button>
      <p className="flex items-center justify-center gap-1 text-xs text-muted-foreground">
        <CheckCircle2 className="size-3 text-green-600" />
        Cancel before we confirm = zero fees
      </p>
    </form>
  );
}
