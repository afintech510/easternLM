"use client";

import { useState } from "react";
import { X, Loader2, CreditCard, Lock } from "lucide-react";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, CardElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { formatUsd } from "@/lib/format";

const stripePromise = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
  ? loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY)
  : null;

interface Props {
  quoteId: string;
  quoteNumber: string;
  customerName: string;
  onClose: () => void;
  onSuccess: (orderId: string) => void;
}

interface Amounts {
  baseCents: number;
  surchargeCents: number;
  amountCents: number;
}

function CardForm({
  quoteId, clientSecret, paymentIntentId, amounts, onSuccess, onError,
}: {
  quoteId: string;
  clientSecret: string;
  paymentIntentId: string;
  amounts: Amounts;
  onSuccess: (orderId: string) => void;
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
      onError("Payment timed out. Check the Stripe dashboard for status before retrying.");
    }, 30000);

    try {
      const { error, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
        payment_method: { card },
      });
      clearTimeout(timeout);

      if (error) {
        onError(error.message ?? "Payment failed.");
        setProcessing(false);
        return;
      }
      if (paymentIntent?.status !== "succeeded") {
        onError(`Payment status: ${paymentIntent?.status ?? "unknown"}. Check Stripe dashboard.`);
        setProcessing(false);
        return;
      }

      // Payment captured — finalize: create the paid order from the quote.
      const res = await fetch(`/api/admin/quotes/${quoteId}/charge`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentIntentId }),
      });
      const data = await res.json();
      if (!res.ok) { onError(data.error ?? "Card charged but order creation failed."); setProcessing(false); return; }
      onSuccess(data.orderId);
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
        {processing ? "Processing..." : `Charge ${formatUsd(amounts.amountCents)}`}
      </button>
      <p className="text-center text-[10px] text-zinc-500">Secured by Stripe · 256-bit encryption · No Link or wallet options</p>
    </form>
  );
}

export function ChargeQuoteModal({ quoteId, quoteNumber, customerName, onClose, onSuccess }: Props) {
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [paymentIntentId, setPaymentIntentId] = useState<string | null>(null);
  const [amounts, setAmounts] = useState<Amounts | null>(null);
  const [error, setError] = useState("");
  const [creating, setCreating] = useState(false);

  async function createPaymentIntent() {
    setCreating(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/quotes/${quoteId}/charge`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to start payment");
      setClientSecret(data.clientSecret);
      setPaymentIntentId(data.paymentIntentId);
      setAmounts({ baseCents: data.baseCents, surchargeCents: data.surchargeCents, amountCents: data.amountCents });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="relative w-full max-w-md rounded-2xl border border-zinc-700 bg-zinc-900 shadow-2xl">
        <div className="flex items-center justify-between border-b border-zinc-800 px-5 py-4">
          <div className="flex items-center gap-2">
            <CreditCard className="size-5 text-amber-400" />
            <h2 className="text-lg font-semibold text-zinc-100">Charge Card — {quoteNumber}</h2>
          </div>
          <button onClick={onClose} className="text-zinc-500 hover:text-zinc-300"><X className="size-5" /></button>
        </div>

        <div className="space-y-4 px-5 py-4">
          <div className="space-y-1 rounded-lg border border-zinc-800 bg-zinc-800/50 p-3">
            <div className="flex justify-between text-sm">
              <span className="text-zinc-400">Customer:</span>
              <span className="text-zinc-200">{customerName || "—"}</span>
            </div>
            {amounts ? (
              <>
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-400">Quote total:</span>
                  <span className="text-zinc-200">{formatUsd(amounts.baseCents)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-400">3.5% card fee:</span>
                  <span className="text-zinc-200">{formatUsd(amounts.surchargeCents)}</span>
                </div>
                <div className="flex justify-between border-t border-zinc-700 pt-1 text-sm font-bold">
                  <span className="text-zinc-400">Charge:</span>
                  <span className="text-amber-400">{formatUsd(amounts.amountCents)}</span>
                </div>
              </>
            ) : (
              <p className="text-xs text-zinc-500">Full quote amount + 3.5% card fee will be charged.</p>
            )}
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
          ) : stripePromise && amounts ? (
            <Elements stripe={stripePromise} options={{
              clientSecret,
              appearance: {
                theme: "night",
                variables: { colorPrimary: "#d97706", borderRadius: "8px", fontFamily: "system-ui, sans-serif" },
              },
            }}>
              <CardForm
                quoteId={quoteId}
                clientSecret={clientSecret}
                paymentIntentId={paymentIntentId!}
                amounts={amounts}
                onSuccess={onSuccess}
                onError={setError}
              />
            </Elements>
          ) : (
            <p className="text-center text-sm text-zinc-500">Stripe not configured</p>
          )}

          <p className="text-center text-[10px] text-zinc-600">
            Use only with the cardholder&apos;s authorization. Charges the full quote amount and creates a paid order.
          </p>
        </div>
      </div>
    </div>
  );
}
