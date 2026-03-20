"use client";

import { useState } from "react";
import { X, Loader2, CreditCard, Lock } from "lucide-react";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { formatUsd } from "@/lib/format";

const stripePromise = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
  ? loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY)
  : null;

interface Props {
  amountCents: number;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  onClose: () => void;
  onSuccess: (paymentIntentId: string) => void;
}

function PhonePaymentForm({ amountCents, onSuccess, onError }: {
  amountCents: number;
  onSuccess: (piId: string) => void;
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
      confirmParams: { return_url: window.location.href },
      redirect: "if_required",
    });

    if (error) {
      onError(error.message ?? "Payment failed.");
      setProcessing(false);
    } else if (paymentIntent) {
      onSuccess(paymentIntent.id);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <PaymentElement options={{
        layout: "tabs",
        wallets: { applePay: "never", googlePay: "never" },
        fields: { billingDetails: { address: { country: "never", postalCode: "auto" } } },
      }} />
      <button
        type="submit"
        disabled={!stripe || processing}
        className="flex w-full items-center justify-center gap-2 rounded-lg bg-green-600 py-3 text-sm font-bold text-white hover:bg-green-500 disabled:opacity-50"
      >
        {processing ? <Loader2 className="size-4 animate-spin" /> : <Lock className="size-4" />}
        {processing ? "Processing..." : `Charge ${formatUsd(amountCents)}`}
      </button>
      <p className="text-center text-[10px] text-zinc-500">Secured by Stripe · 256-bit encryption</p>
    </form>
  );
}

export function PhoneOrderModal({ amountCents, customerName, customerPhone, customerEmail, onClose, onSuccess }: Props) {
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [creating, setCreating] = useState(false);
  const [done, setDone] = useState(false);

  async function createPaymentIntent() {
    setCreating(true);
    setError("");
    try {
      const res = await fetch("/api/pos/terminal/create-payment-intent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amountCents,
          metadata: {
            source: "phone_order",
            customer_name: customerName,
            customer_phone: customerPhone,
          },
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to create payment");
      setClientSecret(data.clientSecret);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setCreating(false);
    }
  }

  if (done) {
    return (
      <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/60 backdrop-blur-sm">
        <div className="rounded-2xl border border-green-600/40 bg-zinc-900 p-8 text-center shadow-2xl">
          <div className="mx-auto mb-3 flex size-14 items-center justify-center rounded-full bg-green-600">
            <CreditCard className="size-6 text-white" />
          </div>
          <p className="text-lg font-semibold text-zinc-100">Payment Successful!</p>
          <p className="mt-1 text-sm text-zinc-400">{formatUsd(amountCents)} charged for {customerName}</p>
          <button onClick={onClose} className="mt-4 rounded-lg bg-zinc-800 px-6 py-2 text-sm text-zinc-300 hover:bg-zinc-700">Close</button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="relative w-full max-w-md rounded-2xl border border-zinc-700 bg-zinc-900 shadow-2xl">
        <div className="flex items-center justify-between border-b border-zinc-800 px-5 py-4">
          <div className="flex items-center gap-2">
            <CreditCard className="size-5 text-amber-400" />
            <h2 className="text-lg font-semibold text-zinc-100">Phone Order — Card Entry</h2>
          </div>
          <button onClick={onClose} className="text-zinc-500 hover:text-zinc-300"><X className="size-5" /></button>
        </div>

        <div className="px-5 py-4 space-y-4">
          <div className="rounded-lg border border-zinc-800 bg-zinc-800/50 p-3 space-y-1">
            <div className="flex justify-between text-sm">
              <span className="text-zinc-400">Customer:</span>
              <span className="text-zinc-200">{customerName || "—"}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-zinc-400">Phone:</span>
              <span className="text-zinc-200">{customerPhone || "—"}</span>
            </div>
            <div className="flex justify-between text-sm font-bold">
              <span className="text-zinc-400">Amount:</span>
              <span className="text-amber-400">{formatUsd(amountCents)}</span>
            </div>
          </div>

          {error && <p className="text-sm text-red-400">{error}</p>}

          {!clientSecret ? (
            <button
              onClick={createPaymentIntent}
              disabled={creating || !stripePromise}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-amber-600 py-3 text-sm font-bold text-white hover:bg-amber-500 disabled:opacity-50"
            >
              {creating ? <Loader2 className="size-4 animate-spin" /> : <CreditCard className="size-4" />}
              {creating ? "Preparing..." : "Enter Card Details"}
            </button>
          ) : stripePromise ? (
            <Elements stripe={stripePromise} options={{
              clientSecret,
              appearance: {
                theme: "night",
                variables: {
                  colorPrimary: "#d97706",
                  borderRadius: "8px",
                  fontFamily: "system-ui, sans-serif",
                },
              },
            }}>
              <PhonePaymentForm
                amountCents={amountCents}
                onSuccess={(piId) => { setDone(true); onSuccess(piId); }}
                onError={setError}
              />
            </Elements>
          ) : (
            <p className="text-sm text-zinc-500 text-center">Stripe not configured</p>
          )}

          <p className="text-[10px] text-zinc-600 text-center">
            Read card number, expiry, and CVC from the customer over the phone.
            This is PCI-compliant via Stripe Elements.
          </p>
        </div>
      </div>
    </div>
  );
}
