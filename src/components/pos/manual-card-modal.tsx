"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { X, Loader2, CreditCard, Lock } from "lucide-react";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, CardElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { formatUsd } from "@/lib/format";

const stripePromise = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
  ? loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY)
  : null;

interface Props {
  amountCents: number;
  /** Shown under the header, e.g. "Payment 1 of 2 — split payment" */
  subtitle?: string;
  customerName?: string;
  customerPhone?: string;
  onCancel: () => void;
  onSuccess: (paymentIntentId: string) => void;
}

function ManualCardForm({ amountCents, clientSecret, onSuccess, onError }: {
  amountCents: number;
  clientSecret: string;
  onSuccess: (piId: string) => void;
  onError: (msg: string) => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [processing, setProcessing] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!stripe || !elements) return;
    const card = elements.getElement(CardElement);
    if (!card) { onError("Card element not ready"); return; }

    setProcessing(true);
    const timeout = setTimeout(() => {
      setProcessing(false);
      onError("Payment timed out. Check Stripe dashboard for status.");
    }, 30000);

    try {
      const { error, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
        payment_method: { card },
      });
      clearTimeout(timeout);

      if (error) {
        onError(error.message ?? "Payment failed.");
        setProcessing(false);
      } else if (paymentIntent?.status === "succeeded") {
        onSuccess(paymentIntent.id);
      } else {
        onError(`Payment status: ${paymentIntent?.status ?? "unknown"}. Check Stripe dashboard.`);
        setProcessing(false);
      }
    } catch (err) {
      clearTimeout(timeout);
      onError(err instanceof Error ? err.message : "Payment error");
      setProcessing(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="rounded-lg border border-zinc-700 bg-zinc-800 p-4">
        <CardElement options={{
          style: {
            base: {
              fontSize: "16px",
              color: "#e4e4e7",
              "::placeholder": { color: "#71717a" },
              iconColor: "#d97706",
            },
            invalid: { color: "#ef4444", iconColor: "#ef4444" },
          },
          hidePostalCode: false,
        }} />
      </div>
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

/**
 * Keyed-in (manually entered) card payment for an arbitrary amount.
 * Used by the checkout overlay both for standalone card entry and for the
 * card leg of a split payment, so it must never assume it owns the whole sale.
 */
export function ManualCardModal({ amountCents, subtitle, customerName, customerPhone, onCancel, onSuccess }: Props) {
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [creating, setCreating] = useState(false);
  const created = useRef(false);

  const createPaymentIntent = useCallback(async () => {
    setCreating(true);
    setError("");
    try {
      const res = await fetch("/api/pos/terminal/create-payment-intent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amountCents,
          metadata: {
            source: "pos_manual_card",
            customer_name: customerName ?? "",
            customer_phone: customerPhone ?? "",
          },
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to create payment");
      setClientSecret(data.clientSecret);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start card payment");
    } finally {
      setCreating(false);
    }
  }, [amountCents, customerName, customerPhone]);

  useEffect(() => {
    if (created.current) return;
    created.current = true;
    createPaymentIntent();
  }, [createPaymentIntent]);

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="relative w-full max-w-md rounded-2xl border border-zinc-700 bg-zinc-900 shadow-2xl">
        <div className="flex items-center justify-between border-b border-zinc-800 px-5 py-4">
          <div className="flex items-center gap-2">
            <CreditCard className="size-5 text-amber-400" />
            <div>
              <h2 className="text-lg font-semibold text-zinc-100">Manual Card Entry</h2>
              {subtitle && <p className="text-xs text-zinc-500">{subtitle}</p>}
            </div>
          </div>
          <button onClick={onCancel} className="text-zinc-500 hover:text-zinc-300"><X className="size-5" /></button>
        </div>

        <div className="space-y-4 px-5 py-4">
          <div className="rounded-lg border border-zinc-800 bg-zinc-800/50 p-3">
            <div className="flex justify-between text-sm font-bold">
              <span className="text-zinc-400">Amount to charge:</span>
              <span className="text-amber-400">{formatUsd(amountCents)}</span>
            </div>
          </div>

          {error && <p className="text-sm text-red-400">{error}</p>}

          {creating && (
            <p className="flex items-center justify-center gap-2 py-4 text-sm text-zinc-400">
              <Loader2 className="size-4 animate-spin" /> Preparing card entry...
            </p>
          )}

          {!creating && !clientSecret && (
            <button
              onClick={createPaymentIntent}
              disabled={!stripePromise}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-amber-600 py-3 text-sm font-bold text-white hover:bg-amber-500 disabled:opacity-50"
            >
              <CreditCard className="size-4" />
              {stripePromise ? "Retry" : "Stripe not configured"}
            </button>
          )}

          {clientSecret && stripePromise && (
            <Elements stripe={stripePromise} options={{
              clientSecret,
              appearance: {
                theme: "night",
                variables: { colorPrimary: "#d97706", borderRadius: "8px", fontFamily: "system-ui, sans-serif" },
              },
            }}>
              <ManualCardForm
                amountCents={amountCents}
                clientSecret={clientSecret}
                onSuccess={onSuccess}
                onError={setError}
              />
            </Elements>
          )}

          <button onClick={onCancel} className="w-full rounded-lg bg-zinc-800 py-2 text-sm text-zinc-400 hover:bg-zinc-700">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
