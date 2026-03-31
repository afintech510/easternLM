"use client";

import { Suspense, useState, useEffect, useRef, useCallback } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Image from "next/image";
import { loadStripe } from "@stripe/stripe-js";
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import {
  Loader2, Phone, Mail, MessageSquare, Lock, Shield, User,
  CheckCircle, XCircle, MapPin, Calendar, Clock,
  Truck, AlertTriangle, FileText, Package, ShieldCheck,
  TreePine, Mountain, Droplets, Wrench, Box,
} from "lucide-react";

// ─── Stripe ─────────────────────────────────────────────────────────────────

const stripePromise = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
  ? loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY)
  : null;

const stripeAppearance = {
  theme: "stripe" as const,
  variables: {
    colorPrimary: "#d58300",
    colorBackground: "#ffffff",
    colorText: "#18181b",
    colorDanger: "#dc2626",
    fontFamily: "system-ui, -apple-system, sans-serif",
    borderRadius: "10px",
    spacingUnit: "4px",
  },
  rules: {
    ".Input": {
      border: "1.5px solid #e4e4e7",
      boxShadow: "none",
      padding: "12px 14px",
      fontSize: "16px",
    },
    ".Input:focus": {
      border: "1.5px solid #002e44",
      boxShadow: "0 0 0 3px rgba(0,46,68,0.1)",
    },
    ".Label": { fontSize: "13px", fontWeight: "600", color: "#71717a" },
  },
};

// ─── Types ───────────────────────────────────────────────────────────────────

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
  customer_phone?: string | null;
  customer_email?: string | null;
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
  status: string;
  accepted_at: string | null;
  deposit_paid_at: string | null;
  // Extended fields
  type?: string;
  cc_surcharge_cents?: number;
  delivery_address?: string | null;
  delivery_fee_cents?: number;
  delivery_date?: string | null;
  delivery_time_window?: string | null;
  delivery_notes?: string | null;
  access_constraints?: Record<string, boolean> | null;
  route_info?: { roundTripMiles: number; roundTripMinutes: number } | null;
  photo_urls?: string[];
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const fmt = (c: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(c / 100);

function formatDeliveryDate(d: string): string {
  try {
    return new Date(d + "T12:00:00").toLocaleDateString("en-US", {
      weekday: "long", month: "long", day: "numeric", year: "numeric",
    });
  } catch { return d; }
}

function formatTimeWindow(tw: string): string {
  const map: Record<string, string> = {
    early: "Morning (7:00 AM – 10:00 AM)",
    morning: "Morning (7:00 AM – 10:00 AM)",
    midday: "Midday (10:00 AM – 1:00 PM)",
    afternoon: "Afternoon (1:00 PM – 5:00 PM)",
    flexible: "Flexible (7:00 AM – 5:00 PM)",
  };
  return map[tw] ?? tw;
}

const CONSTRAINT_LABELS: Record<string, string> = {
  low_wires: "Low Wires", narrow_driveway: "Narrow Driveway",
  soft_ground: "Soft Ground", gated: "Gated",
  steep: "Steep Approach", backyard: "Backyard Access",
};

function getItemColors(desc: string, unit: string): { bg: string; text: string } {
  const d = desc.toLowerCase();
  if (d.includes("mulch")) return { bg: "bg-amber-100", text: "text-amber-700" };
  if (d.includes("topsoil") || d.includes("soil") || d.includes("loam")) return { bg: "bg-green-100", text: "text-green-700" };
  if (d.includes("gravel") || d.includes("stone") || d.includes("rock") || d.includes("bluestone") || d.includes("rca")) return { bg: "bg-slate-100", text: "text-slate-600" };
  if (d.includes("sand")) return { bg: "bg-yellow-100", text: "text-yellow-700" };
  if (d.includes("delivery") || unit === "trip") return { bg: "bg-blue-100", text: "text-blue-700" };
  if (d.includes("labor") || d.includes("install") || d.includes("service") || d.includes("grading") || d.includes("prep")) return { bg: "bg-purple-100", text: "text-purple-700" };
  return { bg: "bg-zinc-100", text: "text-zinc-500" };
}

function getItemIcon(desc: string, unit: string) {
  const d = desc.toLowerCase();
  if (d.includes("mulch")) return <TreePine className="size-6" />;
  if (d.includes("topsoil") || d.includes("soil") || d.includes("loam")) return <TreePine className="size-6" />;
  if (d.includes("gravel") || d.includes("stone") || d.includes("rock") || d.includes("bluestone") || d.includes("rca")) return <Mountain className="size-6" />;
  if (d.includes("sand")) return <Droplets className="size-6" />;
  if (d.includes("delivery") || unit === "trip") return <Truck className="size-6" />;
  if (d.includes("labor") || d.includes("install") || d.includes("grading") || d.includes("spread") || d.includes("excavat")) return <Wrench className="size-6" />;
  return <Box className="size-6" />;
}

// ─── Hero Header ─────────────────────────────────────────────────────────────

function HeroHeader({ name, quoteNumber }: { name: string; quoteNumber: string }) {
  return (
    <>
      {/* ── Print header (hidden on screen, visible on print) ── */}
      <div className="hidden print:block px-6 pt-6 pb-4 border-b border-zinc-200">
        <div className="flex items-start justify-between">
          <div>
            <Image
              src="/logo-blue.png"
              alt="Eastern Landscape & Mason Supply"
              width={180} height={48}
              className="h-12 w-auto object-contain"
            />
            <p className="text-[10px] text-zinc-400 font-medium mt-0.5">Landscape &amp; Mason Supply</p>
          </div>
          <div className="text-right text-xs text-zinc-600 leading-relaxed">
            <p className="font-semibold text-zinc-900">Eastern Landscape &amp; Mason Supply</p>
            <p>110 Frowein Road, Center Moriches, NY 11934</p>
            <p>(631) 874-6244 · easternlm.com</p>
          </div>
        </div>
        <div className="mt-4 pt-3 border-t border-zinc-100">
          <h1 className="text-lg font-bold text-zinc-900">Quote for {name}</h1>
          <p className="text-sm text-zinc-500 font-mono">{quoteNumber}</p>
        </div>
      </div>

      {/* ── Screen header (hidden on print) ── */}
      <header
        className="relative px-5 pt-10 pb-8 text-white text-center bg-primary print:hidden"
      >
        {/* Subtle topo texture */}
        <div
          className="absolute inset-0 opacity-[0.06]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cpath d='M0 100 Q50 60 100 100 Q150 140 200 100' fill='none' stroke='white' stroke-width='1.5'/%3E%3Cpath d='M0 70 Q50 30 100 70 Q150 110 200 70' fill='none' stroke='white' stroke-width='1.5'/%3E%3Cpath d='M0 130 Q50 90 100 130 Q150 170 200 130' fill='none' stroke='white' stroke-width='1.5'/%3E%3C/svg%3E")`,
          }}
        />
        <div className="relative">
          <Image
            src="/logo-white.png"
            alt="Eastern Landscape & Mason Supply"
            width={160} height={42}
            className="mx-auto mb-1 h-10 w-auto object-contain"
          />
          <p className="text-xs uppercase tracking-[0.2em] text-white/50 font-medium mb-7">
            Landscape &amp; Mason Supply
          </p>
          <h1 className="text-2xl font-bold tracking-tight">Quote for {name}</h1>
          <p className="text-sm text-white/40 mt-1.5 font-mono">{quoteNumber}</p>
        </div>
      </header>
    </>
  );
}

// ─── Confirmed View ───────────────────────────────────────────────────────────

function ConfirmedView({ quote, byCard }: { quote: Quote; byCard?: boolean }) {
  const addr = quote.delivery_address || quote.customer_address;
  return (
    <div className="min-h-screen" style={{ background: "var(--background)" }}>
      <HeroHeader name={quote.customer_name} quoteNumber={quote.quote_number} />
      <div className="mx-auto max-w-md md:max-w-2xl px-4 py-6">
        <div className="bg-white rounded-2xl p-6 shadow-sm text-center mb-4">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="size-9 text-green-600" />
          </div>
          <h2 className="text-xl font-bold text-zinc-900 mb-1">
            {byCard ? "Payment Received!" : "Order Confirmed!"}
          </h2>
          <p className="text-zinc-500 text-sm">
            Thank you, {quote.customer_name.split(" ")[0]}. We&apos;ll be in touch shortly to confirm your{" "}
            {(quote.deposit_required_cents ?? 0) > 0 ? "project schedule" : "delivery"}.
          </p>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm mb-4 space-y-3 text-sm">
          {quote.line_items.filter(i => i.unit !== "trip").slice(0, 3).map((item, i) => (
            <div key={i} className="flex items-center gap-3">
              <span className="text-xl">{getItemIcon(item.description, item.unit)}</span>
              <span className="text-zinc-700">{item.quantity} {item.unit} {item.description}</span>
            </div>
          ))}
          {addr && (
            <div className="flex items-center gap-3 pt-1 border-t border-zinc-100">
              <MapPin className="size-4 text-zinc-400 shrink-0" />
              <span className="text-zinc-600">{addr}</span>
            </div>
          )}
          {quote.delivery_date && (
            <div className="flex items-center gap-3">
              <Calendar className="size-4 text-zinc-400 shrink-0" />
              <span className="text-zinc-600">{formatDeliveryDate(quote.delivery_date)}</span>
            </div>
          )}
          {quote.delivery_time_window && (
            <div className="flex items-center gap-3">
              <Clock className="size-4 text-zinc-400 shrink-0" />
              <span className="text-zinc-600">{formatTimeWindow(quote.delivery_time_window)}</span>
            </div>
          )}
        </div>

        <p className="text-center text-xs text-zinc-400 mb-5">
          A confirmation has been sent to your phone{quote.customer_address ? " and email" : ""}.
        </p>

        <TrustFooter />
      </div>
    </div>
  );
}

// ─── Declined View ────────────────────────────────────────────────────────────

function DeclinedView({ quote }: { quote: Quote }) {
  return (
    <div className="min-h-screen" style={{ background: "var(--background)" }}>
      <HeroHeader name={quote.customer_name} quoteNumber={quote.quote_number} />
      <div className="mx-auto max-w-md md:max-w-2xl px-4 py-8 text-center">
        <XCircle className="size-12 text-zinc-300 mx-auto mb-4" />
        <h2 className="text-lg font-semibold text-zinc-700 mb-2">Quote Declined</h2>
        <p className="text-sm text-zinc-500 max-w-xs mx-auto">
          We&apos;ve noted your decision. If anything changes or you have questions, don&apos;t hesitate to reach out.
        </p>
        <div className="mt-8">
          <TrustFooter />
        </div>
      </div>
    </div>
  );
}

// ─── Trust Footer ─────────────────────────────────────────────────────────────

function TrustFooter() {
  return (
    <footer className="text-center py-6 space-y-4">
      <p className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Questions?</p>
      <div className="flex justify-center gap-3">
        <a
          href="tel:+16318746244"
          className="flex items-center gap-2 h-12 px-5 rounded-xl bg-accent text-white text-sm font-semibold active:bg-accent/80"
        >
          <Phone className="size-4" /> (631) 874-6244
        </a>
        <a
          href="sms:+16318746244"
          className="flex items-center gap-2 h-12 px-5 rounded-xl border border-primary bg-white text-primary text-sm font-semibold active:bg-primary/5"
        >
          <MessageSquare className="size-4" /> Text Us
        </a>
      </div>
      <div className="text-xs text-zinc-400 space-y-0.5 pt-2">
        <p className="font-medium text-zinc-500">Eastern Landscape &amp; Mason Supply</p>
        <p>110 Frowein Road · Center Moriches, NY 11934</p>
        <p>Family-owned · easternlm.com</p>
      </div>
    </footer>
  );
}

// ─── Stripe Payment Form ──────────────────────────────────────────────────────

function StripePaymentForm({
  amountCents, onSuccess, onError,
}: { amountCents: number; onSuccess: () => void; onError: (msg: string) => void }) {
  const stripe = useStripe();
  const elements = useElements();
  const [processing, setProcessing] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!stripe || !elements) return;
    setProcessing(true);
    // Clean return URL — strip existing query params so ?deposit=success lands cleanly
    const returnUrl = `${window.location.origin}${window.location.pathname}?deposit=success`;
    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: { return_url: returnUrl },
      redirect: "if_required",
    });
    if (error) { onError(error.message ?? "Payment failed."); setProcessing(false); }
    else onSuccess();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <PaymentElement
        options={{
          layout: { type: "accordion", defaultCollapsed: false, radios: false, spacedAccordionItems: true },
          wallets: { applePay: "auto", googlePay: "auto" },
        }}
      />
      <button
        type="submit"
        disabled={!stripe || processing}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-accent py-4 text-base font-bold text-white hover:bg-accent/90 active:bg-accent/80 disabled:opacity-50 transition-colors"
      >
        {processing
          ? <><Loader2 className="size-4 animate-spin" /> Processing…</>
          : <><Lock className="size-4" /> Pay {fmt(amountCents)}</>}
      </button>
      <p className="flex items-center justify-center gap-1.5 text-xs text-zinc-400">
        <Shield className="size-3" /> Secured by Stripe · 256-bit encryption
      </p>
    </form>
  );
}

// ─── Payment Section ──────────────────────────────────────────────────────────

function PaymentSection({
  quote, token, onAccepted, onDeclined,
}: { quote: Quote; token: string; onAccepted: () => void; onDeclined: () => void }) {
  const isService = (quote.deposit_required_cents ?? 0) > 0;
  const baseAmount = isService ? (quote.deposit_required_cents ?? 0) : quote.total_cents;
  // No CC surcharge — fee eliminated
  const cardTotal = baseAmount;

  const [mode, setMode] = useState<"choose" | "card" | "cod-confirm" | "accept-verify" | "decline">("choose");
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [chargeAmount, setChargeAmount] = useState(0);
  const [error, setError] = useState("");
  const [processing, setProcessing] = useState(false);
  const [payFullAmount, setPayFullAmount] = useState(false); // Pay full vs deposit

  // Accept verification state
  const [typedName, setTypedName] = useState("");
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [smsCode, setSmsCode] = useState("");
  const [smsSent, setSmsSent] = useState(false);
  const [smsVerified, setSmsVerified] = useState(false);
  const [sendingSms, setSendingSms] = useState(false);

  // Effective charge amount: full or deposit
  const effectiveCharge = isService && !payFullAmount ? baseAmount : quote.total_cents;

  async function startCardPayment() {
    setProcessing(true); setError("");
    try {
      const res = await fetch(`/api/quote/${token}/payment-intent`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ payFullAmount }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to initiate payment");
      setClientSecret(data.clientSecret);
      setChargeAmount(data.chargeAmountCents);
      setMode("card");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally { setProcessing(false); }
  }

  async function confirmCod() {
    setProcessing(true); setError("");
    const res = await fetch(`/api/quote/${token}/confirm-cod`, { method: "POST" });
    if (res.ok) { onAccepted(); }
    else { const d = await res.json(); setError(d.error ?? "Failed to confirm order"); setProcessing(false); }
  }

  async function sendSmsCode() {
    setSendingSms(true); setError("");
    try {
      const r = await fetch(`/api/quote/${token}/verify-sms`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "send" }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error ?? "Failed to send code");
      setSmsSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send verification code");
    } finally { setSendingSms(false); }
  }

  async function verifySmsCode() {
    setProcessing(true); setError("");
    try {
      const r = await fetch(`/api/quote/${token}/verify-sms`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "verify", code: smsCode }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error ?? "Invalid code");
      setSmsVerified(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Verification failed");
    } finally { setProcessing(false); }
  }

  async function submitAcceptAndPay() {
    if (!typedName.trim()) { setError("Please type your full name."); return; }
    if (!smsVerified) { setError("Please verify your phone number first."); return; }
    setProcessing(true); setError("");
    try {
      // Get IP/location for audit trail
      let ip = "";
      let location = "";
      try {
        const geo = await fetch("https://ipapi.co/json/").then(r => r.json());
        ip = geo.ip ?? "";
        location = [geo.city, geo.region, geo.country_name].filter(Boolean).join(", ");
      } catch { /* non-fatal */ }

      const r = await fetch(`/api/quote/${token}/accept`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ typedName: typedName.trim(), ip, location, smsVerified: true }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error ?? "Failed to accept quote");
      // Now create payment intent for deposit
      await startCardPayment();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setProcessing(false);
    }
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
    <section className="bg-white rounded-2xl shadow-sm mb-4 overflow-hidden">
      {error && (
        <div className="mx-5 mt-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-2.5">
          {error}
        </div>
      )}

      {/* ── Choose ── */}
      {mode === "choose" && (
        <div className="p-5 space-y-4">
          <h2 className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
            {isService ? "Accept & Pay Deposit" : "How would you like to pay?"}
          </h2>

          {/* Card option */}
          {isService ? (
            <div className="space-y-3">
              {/* Pay Deposit */}
              <button
                onClick={() => { setPayFullAmount(false); setMode("accept-verify"); }}
                className="w-full flex items-center gap-4 rounded-xl border-2 border-accent/30 bg-accent/5 p-4 text-left hover:border-accent/60 active:border-accent transition-colors"
              >
                <div className="w-10 h-10 rounded-full bg-accent flex items-center justify-center shrink-0">
                  <Lock className="size-5 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-zinc-900">Accept &amp; Pay Deposit</p>
                  <p className="text-xs text-accent mt-0.5">
                    {fmt(cardTotal)} by card · Deposit secures your project
                  </p>
                </div>
              </button>

              <div className="flex items-center gap-3">
                <div className="flex-1 h-px bg-zinc-200" />
                <span className="text-xs text-zinc-400 font-medium">or</span>
                <div className="flex-1 h-px bg-zinc-200" />
              </div>

              {/* Pay in Full */}
              <button
                onClick={() => { setPayFullAmount(true); setMode("accept-verify"); }}
                className="w-full flex items-center gap-4 rounded-xl border-2 border-zinc-200 bg-zinc-50 p-4 text-left hover:border-accent/40 active:border-accent transition-colors"
              >
                <div className="w-10 h-10 rounded-full bg-green-600 flex items-center justify-center shrink-0">
                  <CheckCircle className="size-5 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-zinc-900">Pay in Full — {fmt(quote.total_cents)}</p>
                  <p className="text-xs text-zinc-500 mt-0.5">
                    Pay the full project total now
                  </p>
                </div>
              </button>

              {/* BNPL teaser */}
              {quote.total_cents > 15000 && (
                <div className="rounded-xl border border-purple-100 bg-purple-50/50 px-4 py-3">
                  <p className="text-xs font-medium text-purple-700">
                    💳 Buy now, pay later available — split into 4 interest-free payments with Klarna, Affirm, or Afterpay at checkout.
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <button
                onClick={startCardPayment}
                disabled={processing}
                className="w-full flex items-center gap-4 rounded-xl border-2 border-accent/30 bg-accent/5 p-4 text-left hover:border-accent/60 active:border-accent transition-colors disabled:opacity-50"
              >
                <div className="w-10 h-10 rounded-full bg-accent flex items-center justify-center shrink-0">
                  {processing
                    ? <Loader2 className="size-5 text-white animate-spin" />
                    : <Lock className="size-5 text-white" />}
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-zinc-900">Pay by Card — {fmt(cardTotal)}</p>
                  <p className="text-xs text-accent mt-0.5">
                    Card · Apple Pay · Klarna · Affirm · Afterpay
                  </p>
                </div>
              </button>

              {/* BNPL teaser for material quotes */}
              {quote.total_cents > 15000 && (
                <div className="rounded-xl border border-purple-100 bg-purple-50/50 px-4 py-3">
                  <p className="text-xs font-medium text-purple-700">
                    💳 Buy now, pay later — split into 4 interest-free payments with Klarna, Affirm, or Afterpay.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* COD option — material quotes only */}
          {!isService && (
            <>
              <div className="flex items-center gap-3">
                <div className="flex-1 h-px bg-zinc-200" />
                <span className="text-xs text-zinc-400 font-medium">or</span>
                <div className="flex-1 h-px bg-zinc-200" />
              </div>
              <button
                onClick={() => setMode("cod-confirm")}
                className="w-full flex items-center gap-4 rounded-xl border-2 border-zinc-200 bg-zinc-50 p-4 text-left hover:border-amber-300 active:border-amber-400 transition-colors"
              >
                <div className="w-10 h-10 rounded-full bg-amber-600 flex items-center justify-center shrink-0">
                  <Truck className="size-5 text-white" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-zinc-900">Cash on Delivery — {fmt(quote.total_cents)}</p>
                  <p className="text-xs text-zinc-500 mt-0.5">Pay when materials arrive · No processing fee</p>
                </div>
              </button>
            </>
          )}

          <button
            onClick={() => setMode("decline")}
            className="w-full text-center text-xs text-zinc-400 hover:text-zinc-600 pt-1"
          >
            Decline this quote
          </button>
        </div>
      )}

      {/* ── Accept & Verify (service quotes) ── */}
      {mode === "accept-verify" && (
        <div className="p-5 space-y-5">
          <h2 className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
            {payFullAmount ? "Accept & Pay in Full" : "Accept Quote"}
          </h2>

          {/* Payment amount indicator */}
          <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-3 text-center">
            <p className="text-xs text-zinc-500">{payFullAmount ? "Paying full amount" : "Deposit amount"}</p>
            <p className="text-xl font-bold text-zinc-900 mt-0.5">{fmt(effectiveCharge)}</p>
            {!payFullAmount && isService && (
              <p className="text-[11px] text-zinc-400 mt-1">Balance of {fmt(quote.total_cents - baseAmount)} due on completion</p>
            )}
          </div>

          {/* Step 1: Type full name as signature */}
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1.5">
              Type your full legal name to accept
            </label>
            <input
              type="text"
              value={typedName}
              onChange={(e) => setTypedName(e.target.value)}
              placeholder={quote.customer_name || "Full Name"}
              className="w-full rounded-xl border border-zinc-200 px-4 py-3 text-sm focus:border-accent focus:ring-1 focus:ring-accent outline-none"
            />
            {typedName.trim() && (
              <p className="mt-1.5 font-serif text-lg italic text-zinc-600 px-1">{typedName}</p>
            )}
          </div>

          {/* Step 2: SMS verification */}
          <div className="rounded-xl border border-zinc-200 p-4 space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium text-zinc-700">
              <ShieldCheck className="size-4 text-zinc-400" />
              Phone Verification
            </div>
            {!smsSent ? (
              <button
                onClick={sendSmsCode}
                disabled={sendingSms}
                className="w-full flex items-center justify-center gap-2 rounded-lg border border-primary bg-primary/5 px-4 py-2.5 text-sm font-medium text-primary hover:bg-primary/10 disabled:opacity-50 transition-colors"
              >
                {sendingSms
                  ? <><Loader2 className="size-4 animate-spin" /> Sending…</>
                  : <><MessageSquare className="size-4" /> Send code to {quote.customer_phone}</>}
              </button>
            ) : !smsVerified ? (
              <div className="space-y-2">
                <p className="text-xs text-zinc-500">
                  Enter the 6-digit code sent to {quote.customer_phone}
                </p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    value={smsCode}
                    onChange={(e) => setSmsCode(e.target.value.replace(/\D/g, ""))}
                    placeholder="000000"
                    className="flex-1 rounded-lg border border-zinc-200 px-4 py-2.5 text-center text-lg font-mono tracking-[0.3em] focus:border-accent focus:ring-1 focus:ring-accent outline-none"
                  />
                  <button
                    onClick={verifySmsCode}
                    disabled={smsCode.length !== 6 || processing}
                    className="rounded-lg bg-accent px-5 py-2.5 text-sm font-bold text-white hover:bg-accent/90 disabled:opacity-50 transition-colors"
                  >
                    {processing ? <Loader2 className="size-4 animate-spin" /> : "Verify"}
                  </button>
                </div>
                <button onClick={sendSmsCode} disabled={sendingSms} className="text-xs text-zinc-400 hover:text-zinc-600">
                  {sendingSms ? "Sending…" : "Resend code"}
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 rounded-lg px-3 py-2">
                <CheckCircle className="size-4" /> Phone verified
              </div>
            )}
          </div>

          {/* Acceptance checkbox */}
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={acceptTerms}
              onChange={(e) => setAcceptTerms(e.target.checked)}
              className="mt-0.5 size-4 rounded border-zinc-300 text-accent focus:ring-accent shrink-0"
            />
            <span className="text-[12px] text-zinc-600 leading-relaxed">
              I accept the scope, terms, and pricing of this quote. I authorize Eastern Landscape &amp; Mason Supply to contact me by phone, text, and email regarding this project.
              {isService && !payFullAmount ? " I understand the deposit is non-refundable." : ""}
              {payFullAmount ? " I understand the full amount will be charged." : ""}
            </span>
          </label>

          {/* BNPL note */}
          {effectiveCharge > 15000 && (
            <div className="rounded-xl border border-purple-100 bg-purple-50/50 px-4 py-2.5">
              <p className="text-[11px] text-purple-700">
                💳 Pay later options available at checkout — split into 4 interest-free payments with Klarna, Affirm, or Afterpay.
              </p>
            </div>
          )}

          <button
            onClick={submitAcceptAndPay}
            disabled={processing || !typedName.trim() || !smsVerified || !acceptTerms}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-accent py-4 text-base font-bold text-white hover:bg-accent/90 disabled:opacity-50 transition-colors"
          >
            {processing ? <><Loader2 className="size-4 animate-spin" /> Processing…</> : <>Continue to Payment — {fmt(effectiveCharge)} →</>}
          </button>
          <button
            onClick={() => setMode("choose")}
            className="w-full text-center text-xs text-zinc-400 hover:text-zinc-600"
          >
            ← Back
          </button>
        </div>
      )}

      {/* ── Card payment (Stripe) ── */}
      {mode === "card" && clientSecret && (
        <div className="p-5 space-y-4">
          <h2 className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
            {isService && !payFullAmount ? `Pay ${fmt(chargeAmount)} Deposit` : `Pay ${fmt(chargeAmount)}`}
          </h2>
          {!stripePromise ? (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
              Payment unavailable — please call (631) 874-6244 to complete your order.
            </p>
          ) : (
            <Elements
              stripe={stripePromise}
              options={{ clientSecret, appearance: stripeAppearance }}
            >
              <StripePaymentForm
                amountCents={chargeAmount}
                onSuccess={() => {
                  fetch(`/api/quote/${token}/confirm-card`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ paymentIntentId: clientSecret.split("_secret_")[0] }),
                  }).catch(() => {});
                  onAccepted();
                }}
                onError={setError}
              />
            </Elements>
          )}
          {!isService && (
            <button
              onClick={() => { setMode("choose"); setClientSecret(null); }}
              className="w-full text-center text-xs text-zinc-400 hover:text-zinc-600"
            >
              ← Back to payment options
            </button>
          )}
        </div>
      )}

      {/* ── COD confirm ── */}
      {mode === "cod-confirm" && (
        <div className="p-5 space-y-4">
          <div className="rounded-xl border-2 border-amber-200 bg-amber-50 p-5 text-center">
            <Truck className="size-8 text-amber-600 mx-auto mb-2" />
            <p className="text-base font-bold text-amber-900">Cash on Delivery</p>
            <p className="text-3xl font-bold text-amber-800 mt-1">{fmt(quote.total_cents)}</p>
            <p className="text-sm text-amber-700 mt-1.5">Due when your materials arrive</p>
          </div>
          <button
            onClick={confirmCod}
            disabled={processing}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-amber-600 py-4 text-base font-bold text-white hover:bg-amber-500 active:bg-amber-700 disabled:opacity-50 transition-colors"
          >
            {processing
              ? <><Loader2 className="size-4 animate-spin" /> Confirming…</>
              : <><Truck className="size-4" /> Confirm COD Order</>}
          </button>
          <button
            onClick={() => setMode("choose")}
            className="w-full text-center text-xs text-zinc-400 hover:text-zinc-600"
          >
            ← Back to payment options
          </button>
        </div>
      )}

      {/* ── Decline ── */}
      {mode === "decline" && (
        <div className="p-5 space-y-3">
          <h2 className="text-sm font-semibold text-zinc-700">Why are you declining?</h2>
          {["Too expensive", "Going with someone else", "Timing doesn't work", "Project on hold", "Other"].map(reason => (
            <button
              key={reason}
              onClick={() => handleDecline(reason)}
              disabled={processing}
              className="flex w-full items-center rounded-xl border border-zinc-200 px-4 py-3 text-sm text-zinc-700 hover:bg-zinc-50 hover:border-zinc-300 disabled:opacity-50 transition-colors"
            >
              {reason}
            </button>
          ))}
          <button
            onClick={() => setMode("choose")}
            className="w-full text-center text-xs text-zinc-400 hover:text-zinc-600 pt-2"
          >
            ← Back
          </button>
        </div>
      )}
    </section>
  );
}

// ─── Main Quote View ──────────────────────────────────────────────────────────

function QuoteView({ quote, token, onAccepted, onDeclined }: {
  quote: Quote; token: string; onAccepted: () => void; onDeclined: () => void;
}) {
  const isService = (quote.deposit_required_cents ?? 0) > 0;
  // Separate delivery line items from material items first so we can derive fee from line items
  // Only match actual delivery FEE line items (unit="trip"), NOT labor like "Delivery & Installation"
  const deliveryItem = quote.line_items.find((i: any) => i.unit === "trip");
  const materialItems = quote.line_items.filter((i: any) => i !== deliveryItem);
  const deliveryFeeCents = quote.delivery_fee_cents ?? deliveryItem?.total_cents ?? 0;
  // Recalculate totals from components so the breakdown always adds up
  const materialSubtotal = materialItems.reduce((s: number, i: any) => s + (i.total_cents ?? 0), 0);
  const taxableAmount = materialSubtotal + deliveryFeeCents;
  const recalcTax = Math.round(taxableAmount * 0.0875);
  const displayTax = quote.tax_cents ?? recalcTax;
  const cashTotal = materialSubtotal + deliveryFeeCents + displayTax;
  // No CC surcharge — fee eliminated
  const ccSurchargeCents = 0;
  const cardTotal = cashTotal;
  const laborItems = materialItems.filter(i => {
    const d = i.description.toLowerCase();
    return d.includes("labor") || d.includes("install") || d.includes("service") ||
      d.includes("grading") || d.includes("excavat") || d.includes("prep") || d.includes("spread");
  });
  const productItems = materialItems.filter(i => !laborItems.includes(i));

  const activeConstraints = Object.entries(quote.access_constraints ?? {})
    .filter(([, v]) => v)
    .map(([k]) => CONSTRAINT_LABELS[k] ?? k);

  return (
    <div className="min-h-screen" style={{ background: "var(--background)" }}>
      <HeroHeader name={quote.customer_name.split(" ")[0]} quoteNumber={quote.quote_number} />

      <div className="mx-auto max-w-md md:max-w-2xl px-4 pt-5 pb-2">

        {/* ── Project Scope (service only) ── */}
        {isService && quote.description && (
          <section className="bg-white rounded-2xl p-5 shadow-sm mb-4">
            <h2 className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-3">
              <FileText className="size-3.5" /> Project Scope
            </h2>
            <h3 className="text-base font-semibold text-zinc-900 mb-2">{quote.title}</h3>
            <p className="text-sm text-zinc-600 leading-relaxed">{quote.description}</p>
            {quote.photo_urls && quote.photo_urls.length > 0 && (
              <div className="flex gap-2 mt-4 overflow-x-auto pb-1">
                {quote.photo_urls.map((url, i) => (
                  <img
                    key={i} src={url} alt={`Site photo ${i + 1}`}
                    className="h-20 w-20 rounded-xl object-cover flex-shrink-0 cursor-pointer"
                    onClick={() => window.open(url, "_blank")}
                  />
                ))}
              </div>
            )}
            {quote.estimated_timeline && (
              <div className="mt-3 flex items-center gap-2 text-xs text-blue-700 bg-blue-50 rounded-lg px-3 py-2">
                <Clock className="size-3.5" />
                <span>Estimated timeline: {quote.estimated_timeline}</span>
              </div>
            )}
          </section>
        )}

        {/* ── Materials ── */}
        <section className="bg-white rounded-2xl p-5 shadow-sm mb-4">
          <h2 className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-4">
            <Package className="size-3.5" /> {isService ? "Materials & Services" : "Your Materials"}
          </h2>

          <div className="space-y-4">
            {/* Product line items */}
            {productItems.map((item, i) => {
              const { bg, text } = getItemColors(item.description, item.unit);
              return (
                <div key={i} className="flex gap-3 items-start">
                  <div className={`size-14 flex-shrink-0 rounded-xl ${bg} ${text} flex items-center justify-center`}>
                    {getItemIcon(item.description, item.unit)}
                  </div>
                  <div className="flex-1 min-w-0 pt-0.5">
                    <p className="font-semibold text-zinc-900 text-sm leading-snug">{item.description}</p>
                    <p className={`text-xs mt-0.5 ${text}`}>
                      {item.quantity} {item.unit}
                      {item.unit_price_cents > 0 && ` · ${fmt(item.unit_price_cents)} / ${item.unit}`}
                    </p>
                  </div>
                  <p className="font-bold text-zinc-900 text-sm whitespace-nowrap pt-0.5">
                    {fmt(item.total_cents)}
                  </p>
                </div>
              );
            })}

            {/* Labor/service line items */}
            {laborItems.length > 0 && (
              <>
                <div className="border-t border-zinc-100 pt-3">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-3">
                    Labor &amp; Services
                  </p>
                  {laborItems.map((item, i) => (
                    <div key={i} className="flex gap-3 items-start mb-3 last:mb-0">
                      <div className="size-14 flex-shrink-0 rounded-xl bg-purple-100 flex items-center justify-center text-2xl">
                        🔧
                      </div>
                      <div className="flex-1 min-w-0 pt-0.5">
                        <p className="font-semibold text-zinc-900 text-sm leading-snug">{item.description}</p>
                        {item.notes && <p className="text-xs text-zinc-400 mt-0.5 leading-relaxed">{item.notes}</p>}
                      </div>
                      <p className="font-bold text-zinc-900 text-sm whitespace-nowrap pt-0.5">
                        {fmt(item.total_cents)}
                      </p>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </section>

        {/* ── Customer Info ── */}
        <section className="bg-white rounded-2xl p-5 shadow-sm mb-4">
          <h2 className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-3">
            <User className="size-3.5" /> Your Info
          </h2>
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-3">
              <User className="size-4 text-zinc-400 shrink-0" />
              <p className="font-semibold text-zinc-900">{quote.customer_name}</p>
            </div>
            {quote.customer_phone && (
              <div className="flex items-center gap-3">
                <Phone className="size-4 text-zinc-400 shrink-0" />
                <p className="text-zinc-700">{quote.customer_phone}</p>
              </div>
            )}
            {quote.customer_email && (
              <div className="flex items-center gap-3">
                <Mail className="size-4 text-zinc-400 shrink-0" />
                <p className="text-zinc-700">{quote.customer_email}</p>
              </div>
            )}
            {quote.customer_address && (
              <div className="flex items-center gap-3">
                <MapPin className="size-4 text-zinc-400 shrink-0" />
                <p className="text-zinc-700">{quote.customer_address}</p>
              </div>
            )}
          </div>
        </section>

        {/* ── Order Notes (material quotes) ── */}
        {!isService && quote.description && (
          <section className="bg-white rounded-2xl p-5 shadow-sm mb-4">
            <h2 className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-3">
              <FileText className="size-3.5" /> Order Notes
            </h2>
            <p className="text-sm text-zinc-600 leading-relaxed">{quote.description}</p>
          </section>
        )}

        {/* ── Delivery or Pickup ── */}
        {quote.delivery_address ? (
          <section className="bg-white rounded-2xl p-5 shadow-sm mb-4">
            <h2 className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-3">
              <Truck className="size-3.5" /> Delivery
            </h2>
            <div className="space-y-3 text-sm">
              <div className="flex items-start gap-3">
                <MapPin className="size-4 text-zinc-400 shrink-0 mt-0.5" />
                <p className="font-semibold text-zinc-900 leading-snug">{quote.delivery_address}</p>
              </div>
              {quote.delivery_date && (
                <div className="flex items-center gap-3">
                  <Calendar className="size-4 text-zinc-400 shrink-0" />
                  <p className="text-zinc-700">{formatDeliveryDate(quote.delivery_date)}</p>
                </div>
              )}
              {quote.delivery_time_window && (
                <div className="flex items-center gap-3">
                  <Clock className="size-4 text-zinc-400 shrink-0" />
                  <p className="text-zinc-700">{formatTimeWindow(quote.delivery_time_window)}</p>
                </div>
              )}
              {quote.route_info && (
                <div className="flex items-center gap-3">
                  <Truck className="size-4 text-zinc-400 shrink-0" />
                  <p className="text-zinc-500 text-xs">
                    ~{quote.route_info.roundTripMinutes} min from yard · {quote.route_info.roundTripMiles} miles round trip
                  </p>
                </div>
              )}
              {activeConstraints.length > 0 && (
                <div className="flex items-start gap-3">
                  <AlertTriangle className="size-4 text-amber-500 shrink-0 mt-0.5" />
                  <p className="text-amber-700 text-xs font-medium">{activeConstraints.join(" · ")}</p>
                </div>
              )}
              {quote.delivery_notes && (
                <div className="flex items-start gap-3 pt-1 border-t border-zinc-100">
                  <FileText className="size-4 text-zinc-400 shrink-0 mt-0.5" />
                  <p className="text-zinc-600 italic text-xs">{quote.delivery_notes}</p>
                </div>
              )}
            </div>
          </section>
        ) : (
          <section className="bg-white rounded-2xl p-5 shadow-sm mb-4">
            <h2 className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-3">
              <Truck className="size-3.5" /> Pickup at Yard
            </h2>
            <div className="space-y-1.5 text-sm">
              <p className="font-semibold text-zinc-900">110 Frowein Road</p>
              <p className="text-zinc-500">Center Moriches, NY 11934</p>
              <p className="text-zinc-400 text-xs mt-1">Mon–Sat 7 AM – 4 PM</p>
            </div>
          </section>
        )}

        {/* ── Order Total ── */}
        <section className="bg-white rounded-2xl p-5 shadow-sm mb-4">
          <h2 className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-3">
            {isService ? "Project Total" : "Order Total"}
          </h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-zinc-500">Materials</span>
              <span className="text-zinc-800">{fmt(materialItems.reduce((s, i) => s + i.total_cents, 0))}</span>
            </div>
            {deliveryFeeCents > 0 && (
              <div className="flex justify-between">
                <span className="text-zinc-500">Delivery</span>
                <span className="text-zinc-800">{fmt(deliveryFeeCents)}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-zinc-500">Tax (8.75%)</span>
              <span className="text-zinc-800">{fmt(displayTax)}</span>
            </div>

            <div className="border-t border-zinc-200 pt-2 mt-1 space-y-1.5">
              {isService ? (
                <>
                  <div className="flex justify-between font-bold text-base">
                    <span className="text-zinc-900">Project Total</span>
                    <span className="text-zinc-900">{fmt(cashTotal)}</span>
                  </div>
                  <div className="flex justify-between font-semibold text-accent">
                    <span>Deposit Required</span>
                    <span>{fmt(quote.deposit_required_cents)}</span>
                  </div>
                  <div className="flex justify-between text-zinc-400 text-xs">
                    <span>Balance due on completion</span>
                    <span>{fmt(cashTotal - quote.deposit_required_cents)}</span>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex justify-between font-bold text-base">
                    <span className="text-zinc-900">Total</span>
                    <span className="text-amber-700">{fmt(cashTotal)}</span>
                  </div>
                </>
              )}
            </div>
          </div>
        </section>

        {/* ── Payment (hidden on print) ── */}
        <div className="print:hidden">
          <PaymentSection
            quote={quote}
            token={token}
            onAccepted={onAccepted}
            onDeclined={onDeclined}
          />
        </div>

        {/* ── Terms ── */}
        {quote.terms && (
          <section className="rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 mb-4">
            <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1.5">Terms</p>
            <p className="text-xs text-zinc-500 leading-relaxed">{quote.terms}</p>
          </section>
        )}

        {/* ── Trust Footer (hidden on print) ── */}
        <div className="print:hidden">
          <TrustFooter />
        </div>
      </div>
    </div>
  );
}

// ─── Inner: data fetching + state ─────────────────────────────────────────────

function PublicQuoteInner() {
  const { token } = useParams<{ token: string }>();
  const searchParams = useSearchParams();
  const depositSuccess = searchParams.get("deposit") === "success";

  const [quote, setQuote] = useState<Quote | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState("");
  const [outcome, setOutcome] = useState<"accepted" | "declined" | null>(null);
  const [byCard, setByCard] = useState(false);

  useEffect(() => {
    fetch(`/api/quote/${token}`)
      .then(r => r.json())
      .then(d => { if (d.quote) setQuote(d.quote); else setFetchError("Quote not found or has expired."); })
      .catch(() => setFetchError("Failed to load quote."))
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center" style={{ background: "var(--background)" }}>
        <Loader2 className="size-7 animate-spin text-zinc-400" />
      </div>
    );
  }

  if (fetchError || !quote) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-8 text-center" style={{ background: "var(--background)" }}>
        <XCircle className="size-12 text-zinc-300" />
        <h1 className="text-lg font-semibold text-zinc-700">Quote Not Found</h1>
        <p className="text-sm text-zinc-500 max-w-xs">
          {fetchError || "This quote link is invalid or has expired."}
        </p>
        <a href="tel:+16318746244" className="text-sm text-accent font-semibold hover:underline mt-2">
          Call (631) 874-6244
        </a>
      </div>
    );
  }

  // Already-accepted / already-declined states (server-side or just completed)
  const isAccepted = quote.status === "accepted" || quote.status === "converted" ||
    outcome === "accepted" || depositSuccess;
  const isDeclined = quote.status === "declined" || outcome === "declined";

  if (isAccepted) return <ConfirmedView quote={quote} byCard={byCard || depositSuccess} />;
  if (isDeclined) return <DeclinedView quote={quote} />;

  return (
    <QuoteView
      quote={quote}
      token={token}
      onAccepted={() => { setOutcome("accepted"); setByCard(true); }}
      onDeclined={() => setOutcome("declined")}
    />
  );
}

// ─── Page export ──────────────────────────────────────────────────────────────

export default function PublicQuotePage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center" style={{ background: "var(--background)" }}>
          <Loader2 className="size-7 animate-spin text-zinc-400" />
        </div>
      }
    >
      <PublicQuoteInner />
    </Suspense>
  );
}
