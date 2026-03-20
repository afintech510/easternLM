"use client";

import { Suspense } from "react";
import { useEffect, useRef, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import SignaturePad from "signature_pad";
import { Loader2, CheckCircle, XCircle, Phone, Printer, MessageSquare, Lock, CreditCard, Truck, Shield } from "lucide-react";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { Button } from "@/components/ui/button";
import Image from "next/image";

const stripePromise = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
  ? loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY) : null;

interface LineItem {
  description: string;
  quantity: number;
  unit: string;
  unit_price_cents: number;
  total_cents: number;
  notes?: string;
}

interface Quote {
  id: string;
  quote_number: string;
  public_token: string;
  customer_name: string;
  customer_address: string | null;
  title: string;
  description: string | null;
  line_items: LineItem[];
  subtotal_cents: number;
  tax_cents: number;
  total_cents: number;
  deposit_required_cents: number;
  deposit_paid_cents: number;
  valid_until: string | null;
  estimated_timeline: string | null;
  terms: string | null;
  cc_surcharge_cents?: number;
  delivery_fee_cents?: number;
  delivery_address?: string;
  type?: string;
  status: string;
  accepted_at: string | null;
  deposit_paid_at: string | null;
  photo_urls?: string[];
}

const fmt = (c: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(c / 100);

function PublicQuoteInner() {
  const { token } = useParams<{ token: string }>();
  const searchParams = useSearchParams();
  const depositSuccess = searchParams.get("deposit") === "success";

  const [quote, setQuote] = useState<Quote | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [step, setStep] = useState<"view" | "sign" | "done" | "declined">("view");
  const [accepting, setAccepting] = useState(false);
  const [declining, setDeclining] = useState(false);
  const [declineReason, setDeclineReason] = useState("");
  const [showDeclineForm, setShowDeclineForm] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sigPadRef = useRef<SignaturePad | null>(null);

  useEffect(() => {
    fetch(`/api/quote/${token}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.quote) setQuote(d.quote);
        else setError("Quote not found or has expired.");
      })
      .catch(() => setError("Failed to load quote."))
      .finally(() => setLoading(false));
  }, [token]);

  useEffect(() => {
    if (step === "sign" && canvasRef.current) {
      sigPadRef.current = new SignaturePad(canvasRef.current, {
        backgroundColor: "rgba(255,255,255,0)",
        penColor: "#1e3a5f",
      });
      const canvas = canvasRef.current;
      const ratio = window.devicePixelRatio || 1;
      canvas.width = canvas.offsetWidth * ratio;
      canvas.height = canvas.offsetHeight * ratio;
      const ctx = canvas.getContext("2d");
      if (ctx) ctx.scale(ratio, ratio);
      sigPadRef.current.clear();
    }
    return () => { sigPadRef.current?.off(); sigPadRef.current = null; };
  }, [step]);

  async function handleAccept() {
    if (!sigPadRef.current || sigPadRef.current.isEmpty()) {
      alert("Please sign before accepting.");
      return;
    }
    setAccepting(true);
    const signatureDataUrl = sigPadRef.current.toDataURL("image/png");
    const r = await fetch(`/api/quote/${token}/accept`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ signatureDataUrl }),
    });
    const d = await r.json();
    if (!r.ok) { alert(d.error ?? "Something went wrong"); setAccepting(false); return; }
    if (d.needsDeposit && quote?.deposit_required_cents && quote.deposit_required_cents > 0) {
      const dep = await fetch(`/api/quote/${token}/deposit`, { method: "POST" });
      const depData = await dep.json();
      if (depData.url) { window.location.href = depData.url; return; }
    }
    setStep("done");
    setAccepting(false);
  }

  async function handleDecline() {
    setDeclining(true);
    await fetch(`/api/quote/${token}/decline`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason: declineReason }),
    });
    setStep("declined");
    setDeclining(false);
  }

  if (loading) return <div className="flex min-h-screen items-center justify-center"><Loader2 className="size-6 animate-spin text-gray-400" /></div>;

  if (error || !quote) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-8 text-center">
        <XCircle className="size-12 text-red-500" />
        <h1 className="text-xl font-semibold">Quote Not Found</h1>
        <p className="text-gray-500">{error || "This quote link is invalid or has expired."}</p>
        <a href="tel:6318746244" className="text-blue-600 hover:underline">(631) 874-6244</a>
      </div>
    );
  }

  if (quote.status === "accepted" || step === "done" || depositSuccess) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-8 text-center">
        <CheckCircle className="size-16 text-green-500" />
        <h1 className="text-2xl font-bold">Quote Accepted!</h1>
        <p className="text-gray-500 max-w-sm">
          Thank you, {quote.customer_name}. We&apos;ve received your acceptance
          {depositSuccess ? " and your deposit payment" : ""}.
          We&apos;ll be in touch shortly to schedule your project.
        </p>
        {quote.estimated_timeline && <p className="text-sm font-medium">Timeline: {quote.estimated_timeline}</p>}
        <div className="flex gap-3">
          <a href="tel:6318746244"><Button variant="outline"><Phone className="mr-2 size-4" />Call</Button></a>
          <a href="sms:6318746244"><Button variant="outline"><MessageSquare className="mr-2 size-4" />Text</Button></a>
        </div>
      </div>
    );
  }

  if (quote.status === "declined" || step === "declined") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-8 text-center">
        <p className="text-gray-500 max-w-sm">We&apos;ve noted your decision. Please don&apos;t hesitate to reach out if circumstances change.</p>
        <div className="flex gap-3">
          <a href="tel:6318746244"><Button variant="outline"><Phone className="mr-2 size-4" />Call</Button></a>
          <a href="sms:6318746244"><Button variant="outline"><MessageSquare className="mr-2 size-4" />Text</Button></a>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Print-optimized styles */}
      <style>{`
        @media print {
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .no-print { display: none !important; }
          .print-break { page-break-inside: avoid; }
          @page { margin: 0.5in; size: letter; }
        }
      `}</style>

      <div className="min-h-screen bg-gray-100 print:bg-white">
        {/* Print / Save PDF button */}
        <div className="no-print fixed right-4 top-4 z-50">
          <Button variant="outline" size="sm" className="bg-white shadow-md" onClick={() => window.print()}>
            <Printer className="size-4 mr-1.5" /> Save PDF
          </Button>
        </div>

        <div className="mx-auto max-w-[700px] print:max-w-none">
          {/* ── HEADER ── */}
          <div className="bg-[#1a3a5c] px-8 py-6 text-white print:py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Image src="/logo-blue.png" alt="Eastern LM" width={140} height={37} className="brightness-0 invert" />
              </div>
              <div className="text-right text-[13px] leading-relaxed">
                <p className="font-semibold">Eastern Landscape & Mason Supply</p>
                <p>110 Frowein Road, Center Moriches, NY 11934</p>
                <p>(631) 874-6244 &middot; sales@easternlm.com</p>
              </div>
            </div>
          </div>

          {/* ── QUOTE INFO BAR ── */}
          <div className="bg-white border-b px-8 py-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="space-y-3">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-gray-400">Prepared For</p>
                  <p className="text-lg font-bold text-gray-900">{quote.customer_name}</p>
                  {quote.customer_address && <p className="text-sm text-gray-500">{quote.customer_address}</p>}
                </div>
              </div>
              <div className="text-right space-y-2">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-gray-400">Quote Number</p>
                  <p className="font-mono text-lg font-bold text-[#1a3a5c]">{quote.quote_number}</p>
                </div>
                <div className="flex gap-6 justify-end">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-gray-400">Date</p>
                    <p className="text-sm">{new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</p>
                  </div>
                  {quote.valid_until && (
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-gray-400">Valid Until</p>
                      <p className="text-sm">{quote.valid_until}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* ── BODY ── */}
          <div className="bg-white px-8 py-6 space-y-6 print-break">
            {/* Title & description */}
            <div>
              <h1 className="text-xl font-bold text-gray-900">{quote.title}</h1>
              {quote.description && (
                <p className="mt-2 text-sm leading-relaxed text-gray-600 whitespace-pre-wrap">{quote.description}</p>
              )}
            </div>

            {/* ── LINE ITEMS TABLE ── */}
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b-2 border-gray-200">
                  <th className="pb-2.5 text-left text-[10px] font-bold uppercase tracking-[0.15em] text-gray-400 w-[50%]">Description</th>
                  <th className="pb-2.5 text-center text-[10px] font-bold uppercase tracking-[0.15em] text-gray-400 w-[12%]">Qty</th>
                  <th className="pb-2.5 text-center text-[10px] font-bold uppercase tracking-[0.15em] text-gray-400 w-[12%]">Unit</th>
                  <th className="pb-2.5 text-right text-[10px] font-bold uppercase tracking-[0.15em] text-gray-400 w-[13%]">Rate</th>
                  <th className="pb-2.5 text-right text-[10px] font-bold uppercase tracking-[0.15em] text-gray-400 w-[13%]">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {quote.line_items.map((item, i) => (
                  <tr key={i} className="group">
                    <td className="py-3 pr-3">
                      <p className="font-medium text-gray-900">{item.description}</p>
                      {item.notes && <p className="mt-0.5 text-xs text-gray-400 leading-relaxed">{item.notes}</p>}
                    </td>
                    <td className="py-3 text-center text-gray-700">{item.quantity}</td>
                    <td className="py-3 text-center text-gray-500">{item.unit}</td>
                    <td className="py-3 text-right text-gray-700">{fmt(item.unit_price_cents)}</td>
                    <td className="py-3 text-right font-medium text-gray-900">{fmt(item.total_cents)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* ── TOTALS ── */}
            <div className="flex justify-end">
              <div className="w-64 space-y-1.5 text-sm">
                <div className="flex justify-between text-gray-500">
                  <span>Subtotal</span>
                  <span>{fmt(quote.subtotal_cents)}</span>
                </div>
                <div className="flex justify-between text-gray-500">
                  <span>Tax (8.75%)</span>
                  <span>{fmt(quote.tax_cents)}</span>
                </div>
                <div className="flex justify-between border-t-2 border-gray-900 pt-2 text-lg font-bold text-gray-900">
                  <span>Total</span>
                  <span>{fmt(quote.total_cents)}</span>
                </div>
                {quote.deposit_required_cents > 0 && (
                  <div className="flex justify-between rounded-md bg-amber-50 border border-amber-200 px-3 py-2 font-semibold text-amber-800">
                    <span>Deposit Due</span>
                    <span>{fmt(quote.deposit_required_cents)}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Timeline */}
            {quote.estimated_timeline && (
              <div className="rounded-lg border border-blue-100 bg-blue-50 px-4 py-3 text-sm">
                <span className="font-semibold text-blue-900">Estimated Timeline:</span>{" "}
                <span className="text-blue-800">{quote.estimated_timeline}</span>
              </div>
            )}

            {/* Terms */}
            {quote.terms && (
              <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 print-break">
                <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-gray-400 mb-1.5">Terms & Conditions</p>
                <p className="text-xs leading-relaxed text-gray-600 whitespace-pre-wrap">{quote.terms}</p>
              </div>
            )}
          </div>

          {/* ── ACTION SECTION (hidden on print) ── */}
          <QuoteActions
            quote={quote}
            token={token}
            onAccepted={() => setStep("done")}
            onDeclined={() => setStep("declined")}
          />

          {/* ── FOOTER ── */}
          <div className="bg-gray-50 print:bg-white border-t px-8 py-4 text-center text-xs text-gray-400">
            <p>Questions? Call <a href="tel:6318746244" className="text-blue-600 font-medium">(631) 874-6244</a> or text <a href="sms:6318746244" className="text-blue-600 font-medium">(631) 874-6244</a></p>
            <p className="mt-1">Eastern Landscape & Mason Supply &middot; 110 Frowein Road, Center Moriches, NY 11934</p>
          </div>
        </div>
      </div>
    </>
  );
}

/** Embedded payment form for quotes */
function QuotePaymentForm({ amountCents, onSuccess, onError }: {
  amountCents: number; onSuccess: () => void; onError: (msg: string) => void;
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
      confirmParams: { return_url: window.location.href + "?deposit=success" },
      redirect: "if_required",
    });
    if (error) { onError(error.message ?? "Payment failed."); setProcessing(false); }
    else onSuccess();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <PaymentElement options={{ layout: "tabs", wallets: { applePay: "auto", googlePay: "auto" } }} />
      <button type="submit" disabled={!stripe || processing}
        className="flex w-full items-center justify-center gap-2 rounded-lg bg-green-700 py-3.5 text-base font-bold text-white hover:bg-green-600 disabled:opacity-50">
        {processing ? <><Loader2 className="size-4 animate-spin" /> Processing...</> : <><Lock className="size-4" /> Pay {fmt(amountCents)}</>}
      </button>
      <p className="flex items-center justify-center gap-1.5 text-xs text-gray-400"><Shield className="size-3" /> Secured by Stripe · 256-bit encryption</p>
    </form>
  );
}

/** Quote action section — payment choice, embedded checkout, COD, decline */
function QuoteActions({ quote, token, onAccepted, onDeclined }: {
  quote: Quote; token: string; onAccepted: () => void; onDeclined: () => void;
}) {
  const [mode, setMode] = useState<"choose" | "card" | "cod-confirm" | "decline">("choose");
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [chargeAmount, setChargeAmount] = useState(0);
  const [email, setEmail] = useState(quote.customer_address ? "" : "");
  const [error, setError] = useState("");
  const [processing, setProcessing] = useState(false);

  const isService = quote.type === "service" && quote.deposit_required_cents > 0;
  const ccSurcharge = Math.round((isService ? quote.deposit_required_cents : quote.total_cents) * 0.03);
  const cardTotal = (isService ? quote.deposit_required_cents : quote.total_cents) + ccSurcharge;

  async function startCardPayment() {
    setProcessing(true); setError("");
    try {
      const res = await fetch(`/api/quote/${token}/payment-intent`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed");
      setClientSecret(data.clientSecret);
      setChargeAmount(data.chargeAmountCents);
      setMode("card");
    } catch (err) { setError(err instanceof Error ? err.message : "Failed"); }
    finally { setProcessing(false); }
  }

  async function confirmCod() {
    setProcessing(true);
    const res = await fetch(`/api/quote/${token}/confirm-cod`, { method: "POST" });
    if (res.ok) onAccepted();
    else { const d = await res.json(); setError(d.error ?? "Failed"); }
    setProcessing(false);
  }

  async function handleDecline(reason: string) {
    setProcessing(true);
    await fetch(`/api/quote/${token}/decline`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason }),
    });
    onDeclined();
    setProcessing(false);
  }

  return (
    <div className="no-print bg-white border-t px-8 py-6 space-y-4">
      {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-2">{error}</p>}

      {mode === "choose" && (
        <>
          <p className="text-sm font-semibold text-gray-700 text-center">How would you like to pay?</p>

          {/* Card payment */}
          <button onClick={startCardPayment} disabled={processing}
            className="flex w-full items-center gap-4 rounded-xl border-2 border-green-200 bg-green-50 p-4 text-left hover:border-green-400 transition-colors disabled:opacity-50">
            <CreditCard className="size-8 text-green-700 shrink-0" />
            <div className="flex-1">
              <p className="font-semibold text-green-900">Pay by Card — {fmt(cardTotal)}</p>
              <p className="text-xs text-green-700">Includes 3% processing fee · Secure checkout</p>
            </div>
            {processing && <Loader2 className="size-5 animate-spin text-green-600" />}
          </button>

          {/* COD option */}
          <button onClick={() => setMode("cod-confirm")}
            className="flex w-full items-center gap-4 rounded-xl border-2 border-gray-200 bg-gray-50 p-4 text-left hover:border-amber-300 transition-colors">
            <Truck className="size-8 text-amber-700 shrink-0" />
            <div className="flex-1">
              <p className="font-semibold text-gray-900">Cash on Delivery — {fmt(quote.total_cents)}</p>
              <p className="text-xs text-gray-500">Pay when materials arrive · No processing fee</p>
            </div>
          </button>

          <button onClick={() => setMode("decline")} className="w-full text-center text-sm text-gray-400 hover:text-gray-600 pt-2">
            Decline this quote
          </button>
        </>
      )}

      {mode === "card" && clientSecret && stripePromise && (
        <div className="space-y-4">
          <p className="text-sm font-semibold text-center text-gray-700">Enter payment details</p>
          <Elements stripe={stripePromise} options={{
            clientSecret,
            appearance: { theme: "stripe", variables: { colorPrimary: "#1e3a5f", borderRadius: "8px" } },
          }}>
            <QuotePaymentForm
              amountCents={chargeAmount}
              onSuccess={async () => {
                // Confirm server-side
                try {
                  await fetch("/api/checkout/confirm", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ paymentIntentId: clientSecret.split("_secret_")[0] }),
                  });
                } catch {}
                onAccepted();
              }}
              onError={setError}
            />
          </Elements>
          <button onClick={() => { setMode("choose"); setClientSecret(null); }} className="w-full text-center text-sm text-gray-400 hover:text-gray-600">
            ← Back to payment options
          </button>
        </div>
      )}

      {mode === "cod-confirm" && (
        <div className="space-y-4">
          <div className="rounded-xl border-2 border-amber-300 bg-amber-50 p-5 text-center">
            <p className="text-lg font-bold text-amber-900">Cash on Delivery</p>
            <p className="text-3xl font-bold text-amber-800 mt-2">{fmt(quote.total_cents)}</p>
            <p className="text-sm text-amber-700 mt-2">Due when your materials are delivered</p>
          </div>
          <button onClick={confirmCod} disabled={processing}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-amber-600 py-3.5 text-base font-bold text-white hover:bg-amber-500 disabled:opacity-50">
            {processing ? <Loader2 className="size-4 animate-spin" /> : <Truck className="size-4" />}
            Confirm COD Order
          </button>
          <button onClick={() => setMode("choose")} className="w-full text-center text-sm text-gray-400 hover:text-gray-600">
            ← Back to payment options
          </button>
        </div>
      )}

      {mode === "decline" && (
        <div className="space-y-3">
          <p className="font-medium text-sm">Why are you declining?</p>
          {["Too expensive", "Going with someone else", "Timing doesn't work", "Other"].map((r) => (
            <button key={r} onClick={() => handleDecline(r)} disabled={processing}
              className="flex w-full items-center rounded-lg border px-4 py-3 text-sm hover:bg-gray-50 disabled:opacity-50">
              {r}
            </button>
          ))}
          <button onClick={() => setMode("choose")} className="w-full text-center text-sm text-gray-400 hover:text-gray-600 pt-2">
            ← Back
          </button>
        </div>
      )}
    </div>
  );
}

export default function PublicQuotePage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center text-gray-400">Loading…</div>}>
      <PublicQuoteInner />
    </Suspense>
  );
}
