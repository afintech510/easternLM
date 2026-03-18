"use client";

import { useState } from "react";
import { ArrowLeft, Banknote, CreditCard, Truck, Building2, SplitSquareHorizontal, X, Loader2 } from "lucide-react";
import { formatUsd } from "@/lib/format";

type PaymentMethod = "cash" | "cod" | "card_terminal" | "account";

interface CartSummary {
  itemCount: number;
  customerName: string;
  subtotalCents: number;
  deliveryFeeCents: number;
  taxCents: number;
  cashTotalCents: number;
  ccFeeCents: number;
  cardTotalCents: number;
  deliveryAddress?: string;
  isChargeAccount: boolean;
  accountName?: string;
  accountBalance?: number;
  itemsSummary: string;
}

interface PaymentResult {
  method: PaymentMethod;
  amountCents: number;
  tenderedCents?: number;
  changeCents?: number;
  stripePaymentIntentId?: string;
}

interface Props {
  cart: CartSummary;
  onComplete: (payments: PaymentResult[]) => void;
  onCancel: () => void;
  onProcessCard: (amountCents: number) => Promise<{ success: boolean; paymentIntentId?: string; error?: string }>;
  processing: boolean;
}

export function CheckoutOverlay({ cart, onComplete, onCancel, onProcessCard, processing }: Props) {
  const [step, setStep] = useState<"select" | "cash" | "cod" | "card" | "account" | "split">("select");
  const [cashTendered, setCashTendered] = useState("");
  const [splitEnabled, setSplitEnabled] = useState(false);
  const [splitMethod1, setSplitMethod1] = useState<PaymentMethod>("cash");
  const [splitAmount1, setSplitAmount1] = useState("");
  const [splitMethod2, setSplitMethod2] = useState<PaymentMethod>("card_terminal");
  const [cardProcessing, setCardProcessing] = useState(false);
  const [cardError, setCardError] = useState("");

  const tenderedCents = Math.round((parseFloat(cashTendered) || 0) * 100);
  const changeCents = Math.max(0, tenderedCents - cart.cashTotalCents);

  // Split calculations
  const split1Cents = Math.round((parseFloat(splitAmount1) || 0) * 100);
  const split2Cents = cart.cashTotalCents - split1Cents;
  const splitCardPortion = splitMethod1 === "card_terminal" ? split1Cents : splitMethod2 === "card_terminal" ? split2Cents : 0;
  const splitCcFee = Math.round(splitCardPortion * 0.03);
  const splitTotal = cart.cashTotalCents + splitCcFee;

  async function handleCashComplete() {
    if (tenderedCents < cart.cashTotalCents) return;
    onComplete([{ method: "cash", amountCents: cart.cashTotalCents, tenderedCents, changeCents }]);
  }

  function handleCodComplete() {
    onComplete([{ method: "cod", amountCents: cart.cashTotalCents }]);
  }

  async function handleCardComplete() {
    setCardProcessing(true);
    setCardError("");
    const result = await onProcessCard(cart.cardTotalCents);
    setCardProcessing(false);
    if (result.success) {
      onComplete([{ method: "card_terminal", amountCents: cart.cardTotalCents, stripePaymentIntentId: result.paymentIntentId }]);
    } else {
      setCardError(result.error ?? "Card payment failed");
    }
  }

  function handleAccountComplete() {
    onComplete([{ method: "account", amountCents: cart.cashTotalCents }]);
  }

  async function handleSplitComplete() {
    if (split1Cents <= 0 || split2Cents <= 0) return;
    const payments: PaymentResult[] = [];

    // Process card first if present
    const methods = [
      { method: splitMethod1, amount: split1Cents },
      { method: splitMethod2, amount: split2Cents },
    ].sort((a, b) => (a.method === "card_terminal" ? -1 : b.method === "card_terminal" ? 1 : 0));

    setCardProcessing(true);
    for (const { method, amount } of methods) {
      if (method === "card_terminal") {
        const ccFee = Math.round(amount * 0.03);
        const result = await onProcessCard(amount + ccFee);
        if (!result.success) {
          setCardError(result.error ?? "Card failed");
          setCardProcessing(false);
          return;
        }
        payments.push({ method: "card_terminal", amountCents: amount + ccFee, stripePaymentIntentId: result.paymentIntentId });
      } else {
        payments.push({ method, amountCents: amount });
      }
    }
    setCardProcessing(false);
    onComplete(payments);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80" onClick={onCancel}>
      <div className="w-full max-w-lg rounded-2xl bg-zinc-900 border border-zinc-700 p-6 space-y-5 shadow-2xl" onClick={(e) => e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-white">Checkout</h2>
            <p className="text-sm text-zinc-400">{cart.customerName} — {cart.itemCount} item{cart.itemCount !== 1 ? "s" : ""}</p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-amber-400">{formatUsd(cart.cashTotalCents)}</p>
            <p className="text-xs text-zinc-500">Card: {formatUsd(cart.cardTotalCents)} (+3%)</p>
          </div>
        </div>

        {/* Items summary (collapsible) */}
        <p className="text-xs text-zinc-500 truncate">{cart.itemsSummary}</p>

        {/* Payment type selection */}
        {step === "select" && (
          <>
            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => setStep("cash")}
                className="flex flex-col items-center gap-2 rounded-xl border border-zinc-700 bg-zinc-800 p-5 text-center hover:border-green-500/50 hover:bg-green-950/20 transition-colors">
                <Banknote className="size-8 text-green-400" />
                <span className="text-sm font-semibold text-white">Cash</span>
                <span className="text-xs text-zinc-500">{formatUsd(cart.cashTotalCents)}</span>
              </button>

              <button onClick={() => setStep("cod")} disabled={!cart.deliveryAddress}
                className="flex flex-col items-center gap-2 rounded-xl border border-zinc-700 bg-zinc-800 p-5 text-center hover:border-orange-500/50 hover:bg-orange-950/20 transition-colors disabled:opacity-30">
                <Truck className="size-8 text-orange-400" />
                <span className="text-sm font-semibold text-white">COD</span>
                <span className="text-xs text-zinc-500">Driver collects</span>
              </button>

              <button onClick={() => setStep("card")}
                className="flex flex-col items-center gap-2 rounded-xl border border-zinc-700 bg-zinc-800 p-5 text-center hover:border-blue-500/50 hover:bg-blue-950/20 transition-colors">
                <CreditCard className="size-8 text-blue-400" />
                <span className="text-sm font-semibold text-white">Card</span>
                <span className="text-xs text-zinc-500">{formatUsd(cart.cardTotalCents)} (+3%)</span>
              </button>

              <button onClick={() => setStep("account")} disabled={!cart.isChargeAccount}
                className="flex flex-col items-center gap-2 rounded-xl border border-zinc-700 bg-zinc-800 p-5 text-center hover:border-indigo-500/50 hover:bg-indigo-950/20 transition-colors disabled:opacity-30">
                <Building2 className="size-8 text-indigo-400" />
                <span className="text-sm font-semibold text-white">Account</span>
                <span className="text-xs text-zinc-500">{cart.isChargeAccount ? cart.accountName : "No account"}</span>
              </button>
            </div>

            {/* Split toggle */}
            <button onClick={() => setStep("split")}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-zinc-700 bg-zinc-800 py-3 text-sm text-zinc-400 hover:border-purple-500/50 hover:text-purple-300 transition-colors">
              <SplitSquareHorizontal className="size-4" /> Split payment — two methods
            </button>
          </>
        )}

        {/* Cash dialog */}
        {step === "cash" && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm text-zinc-400">
              <button onClick={() => setStep("select")}><ArrowLeft className="size-4" /></button>
              <span>Cash Payment</span>
            </div>
            <div className="text-center">
              <p className="text-sm text-zinc-500">Total Due</p>
              <p className="text-3xl font-bold text-white">{formatUsd(cart.cashTotalCents)}</p>
            </div>
            <div>
              <label className="text-xs text-zinc-500">Amount Tendered</label>
              <input type="number" step="0.01" value={cashTendered} onChange={(e) => setCashTendered(e.target.value)} autoFocus
                className="mt-1 w-full rounded-xl bg-zinc-800 border border-zinc-700 px-4 py-3 text-2xl font-mono text-center text-white focus:outline-none focus:border-amber-500" />
            </div>
            {tenderedCents >= cart.cashTotalCents && (
              <div className="text-center">
                <p className="text-sm text-zinc-500">Change Due</p>
                <p className="text-2xl font-bold text-green-400">{formatUsd(changeCents)}</p>
              </div>
            )}
            <button onClick={handleCashComplete} disabled={tenderedCents < cart.cashTotalCents || processing}
              className="w-full rounded-xl bg-green-600 py-3 text-lg font-bold text-white hover:bg-green-500 disabled:opacity-30">
              {processing ? "Processing..." : "Complete — Cash"}
            </button>
          </div>
        )}

        {/* COD dialog */}
        {step === "cod" && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm text-zinc-400">
              <button onClick={() => setStep("select")}><ArrowLeft className="size-4" /></button>
              <span>Cash on Delivery</span>
            </div>
            <div className="rounded-xl bg-zinc-800 border border-zinc-700 p-4 space-y-2 text-sm">
              <p className="text-zinc-400">Driver collects: <span className="text-white font-bold">{formatUsd(cart.cashTotalCents)}</span></p>
              {cart.deliveryAddress && <p className="text-zinc-500">Deliver to: {cart.deliveryAddress}</p>}
            </div>
            <button onClick={handleCodComplete} disabled={processing}
              className="w-full rounded-xl bg-orange-600 py-3 text-lg font-bold text-white hover:bg-orange-500 disabled:opacity-30">
              Confirm COD Order
            </button>
          </div>
        )}

        {/* Card dialog */}
        {step === "card" && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm text-zinc-400">
              <button onClick={() => setStep("select")}><ArrowLeft className="size-4" /></button>
              <span>Card Payment</span>
            </div>
            <div className="text-center space-y-1">
              <p className="text-sm text-zinc-500">3% CC surcharge: {formatUsd(cart.ccFeeCents)}</p>
              <p className="text-3xl font-bold text-white">{formatUsd(cart.cardTotalCents)}</p>
            </div>
            {cardError && <p className="rounded-lg bg-red-900/30 border border-red-800 px-3 py-2 text-sm text-red-300">{cardError}</p>}
            <button onClick={handleCardComplete} disabled={cardProcessing || processing}
              className="w-full rounded-xl bg-blue-600 py-3 text-lg font-bold text-white hover:bg-blue-500 disabled:opacity-30">
              {cardProcessing ? <><Loader2 className="inline size-5 animate-spin mr-2" />Waiting for card...</> : "Tap / Insert Card"}
            </button>
          </div>
        )}

        {/* Account dialog */}
        {step === "account" && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm text-zinc-400">
              <button onClick={() => setStep("select")}><ArrowLeft className="size-4" /></button>
              <span>Charge Account</span>
            </div>
            <div className="rounded-xl bg-zinc-800 border border-indigo-600/30 p-4 space-y-2 text-sm">
              <p className="font-semibold text-indigo-300">{cart.accountName}</p>
              <p className="text-zinc-400">Current balance: <span className="text-amber-400">{formatUsd(cart.accountBalance ?? 0)}</span></p>
              <p className="text-zinc-400">This order: <span className="text-white font-bold">{formatUsd(cart.cashTotalCents)}</span></p>
              <p className="text-zinc-400">New balance: <span className="text-amber-400">{formatUsd((cart.accountBalance ?? 0) + cart.cashTotalCents)}</span></p>
            </div>
            <button onClick={handleAccountComplete} disabled={processing}
              className="w-full rounded-xl bg-indigo-600 py-3 text-lg font-bold text-white hover:bg-indigo-500 disabled:opacity-30">
              Confirm Charge
            </button>
          </div>
        )}

        {/* Split dialog */}
        {step === "split" && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm text-zinc-400">
              <button onClick={() => setStep("select")}><ArrowLeft className="size-4" /></button>
              <span>Split Payment — Total: {formatUsd(cart.cashTotalCents)}</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs text-zinc-500">Payment 1</label>
                <select value={splitMethod1} onChange={(e) => setSplitMethod1(e.target.value as PaymentMethod)}
                  className="w-full rounded-lg bg-zinc-800 border border-zinc-700 px-3 py-2 text-sm text-white">
                  <option value="cash">Cash</option>
                  <option value="card_terminal">Card (+3%)</option>
                  <option value="cod">COD</option>
                  {cart.isChargeAccount && <option value="account">Account</option>}
                </select>
                <input type="number" step="0.01" value={splitAmount1} onChange={(e) => setSplitAmount1(e.target.value)}
                  placeholder="Amount" className="w-full rounded-lg bg-zinc-800 border border-zinc-700 px-3 py-2 text-sm text-white" />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-zinc-500">Payment 2 (remainder)</label>
                <select value={splitMethod2} onChange={(e) => setSplitMethod2(e.target.value as PaymentMethod)}
                  className="w-full rounded-lg bg-zinc-800 border border-zinc-700 px-3 py-2 text-sm text-white">
                  <option value="cash">Cash</option>
                  <option value="card_terminal">Card (+3%)</option>
                  <option value="cod">COD</option>
                  {cart.isChargeAccount && <option value="account">Account</option>}
                </select>
                <div className="rounded-lg bg-zinc-800 border border-zinc-700 px-3 py-2 text-sm text-zinc-400">
                  {split2Cents > 0 ? formatUsd(split2Cents) : "$0.00"}
                </div>
              </div>
            </div>
            {splitCcFee > 0 && <p className="text-xs text-zinc-500">CC fee on card portion: {formatUsd(splitCcFee)} — Total: {formatUsd(splitTotal)}</p>}
            {cardError && <p className="text-sm text-red-300">{cardError}</p>}
            <button onClick={handleSplitComplete} disabled={split1Cents <= 0 || split2Cents <= 0 || cardProcessing || processing}
              className="w-full rounded-xl bg-purple-600 py-3 text-lg font-bold text-white hover:bg-purple-500 disabled:opacity-30">
              {cardProcessing ? "Processing card..." : "Process Split Payment"}
            </button>
          </div>
        )}

        {/* Back / Cancel */}
        {step === "select" && (
          <button onClick={onCancel} className="w-full rounded-xl bg-zinc-800 py-2.5 text-sm text-zinc-400 hover:bg-zinc-700">
            Back to cart
          </button>
        )}
      </div>
    </div>
  );
}
