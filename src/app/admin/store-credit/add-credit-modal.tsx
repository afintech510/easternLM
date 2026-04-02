"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { formatUsd } from "@/lib/format";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, CardElement, useStripe, useElements } from "@stripe/react-stripe-js";

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

interface Props {
  customerId: string;
  customerName: string;
  currentBalance: number;
  onClose: () => void;
  onSuccess: () => void;
}

export function AddCreditModal(props: Props) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={props.onClose}>
      <div className="w-full max-w-md rounded-lg border bg-background p-6 shadow-lg" onClick={(e) => e.stopPropagation()}>
        <Elements stripe={stripePromise} options={{ appearance: { theme: "night", variables: { colorPrimary: "#d97706" } } }}>
          <ChargeForm {...props} />
        </Elements>
      </div>
    </div>
  );
}

function ChargeForm({ customerId, customerName, currentBalance, onClose, onSuccess }: Props) {
  const stripe = useStripe();
  const elements = useElements();
  const [amount, setAmount] = useState("500.00");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [newBalance, setNewBalance] = useState(0);

  const amountCents = Math.round(parseFloat(amount) * 100) || 0;

  async function handleSubmit() {
    if (!stripe || !elements || amountCents < 100) return;
    setLoading(true);
    setError("");

    try {
      // Step 1: Create PaymentIntent on the server
      const piRes = await fetch("/api/admin/credit/charge-and-post", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customer_id: customerId,
          amount_cents: amountCents,
          note: note || `Card prepayment`,
          created_by: "admin",
        }),
      });

      const piData = await piRes.json();
      if (!piRes.ok) {
        setError(piData.error || "Failed to create payment");
        setLoading(false);
        return;
      }

      // If the server already confirmed (saved card), we're done
      if (piData.ledger_id) {
        setNewBalance(piData.new_balance_cents);
        setSuccess(true);
        setLoading(false);
        onSuccess();
        return;
      }

      // Step 2: Confirm with Stripe Elements card
      const cardElement = elements.getElement(CardElement);
      if (!cardElement) { setError("Card element not ready"); setLoading(false); return; }

      const { error: stripeError, paymentIntent } = await stripe.confirmCardPayment(piData.client_secret, {
        payment_method: { card: cardElement },
      });

      if (stripeError) {
        setError(stripeError.message || "Card payment failed");
        setLoading(false);
        return;
      }

      if (paymentIntent?.status !== "succeeded") {
        setError(`Payment status: ${paymentIntent?.status}`);
        setLoading(false);
        return;
      }

      // Step 3: Post credit with confirmed PI
      const postRes = await fetch("/api/admin/credit/charge-and-post", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customer_id: customerId,
          amount_cents: amountCents,
          payment_intent_id: paymentIntent.id,
          note: note || `Card prepayment`,
          created_by: "admin",
        }),
      });

      const postData = await postRes.json();
      if (postRes.ok) {
        setNewBalance(postData.new_balance_cents);
        setSuccess(true);
        onSuccess();
      } else {
        setError(postData.error || "Failed to post credit");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    }
    setLoading(false);
  }

  if (success) {
    return (
      <div className="space-y-4 text-center">
        <div className="text-4xl">✓</div>
        <p className="text-lg font-bold text-emerald-600">{formatUsd(amountCents)} charged and credit posted</p>
        <p className="text-sm text-muted-foreground">New balance: {formatUsd(newBalance)}</p>
        <button onClick={onClose} className="rounded-lg bg-primary px-6 py-2 text-sm font-semibold text-primary-foreground">Close</button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-bold">Charge Card & Add Credit</h3>
      <p className="text-sm text-muted-foreground">{customerName} — Balance: {formatUsd(currentBalance)}</p>

      {/* Amount */}
      <div>
        <label className="text-xs text-muted-foreground">Amount ($, min $1.00)</label>
        <input type="number" step="0.01" min="1" value={amount} onChange={(e) => setAmount(e.target.value)}
          className="mt-1 w-full rounded-lg border bg-background px-4 py-3 text-xl font-mono text-center focus:outline-none focus:ring-2 focus:ring-ring" />
      </div>

      {/* Note */}
      <div>
        <label className="text-xs text-muted-foreground">Note (optional)</label>
        <input type="text" value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g., Phone prepayment per customer request"
          className="mt-1 w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
      </div>

      {/* Card Element */}
      <div>
        <label className="text-xs text-muted-foreground">Card Details</label>
        <div className="mt-1 rounded-lg border p-3">
          <CardElement options={{
            style: {
              base: { fontSize: "16px", color: "#e4e4e7", "::placeholder": { color: "#71717a" } },
              invalid: { color: "#ef4444" },
            },
          }} />
        </div>
      </div>

      {error && <p className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-600 dark:bg-red-900/20 dark:border-red-800 dark:text-red-400">{error}</p>}

      <div className="flex gap-3">
        <button onClick={handleSubmit} disabled={loading || !stripe || amountCents < 100}
          className="flex-1 rounded-lg bg-blue-600 py-2.5 text-sm font-semibold text-white hover:bg-blue-500 disabled:opacity-30 flex items-center justify-center gap-2">
          {loading && <Loader2 className="size-4 animate-spin" />}
          Charge {amountCents >= 100 ? formatUsd(amountCents) : "$0.00"} and Add Credit
        </button>
        <button onClick={onClose} disabled={loading} className="rounded-lg border px-4 py-2.5 text-sm hover:bg-muted">Cancel</button>
      </div>
    </div>
  );
}
