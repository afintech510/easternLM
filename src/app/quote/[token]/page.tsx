"use client";

import { Suspense } from "react";
import { useEffect, useRef, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import SignaturePad from "signature_pad";
import { Loader2, CheckCircle, XCircle, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import Image from "next/image";

interface LineItem {
  description: string;
  quantity: number;
  unit: string;
  unit_price_cents: number;
  total_cents: number;
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
  status: string;
  accepted_at: string | null;
  deposit_paid_at: string | null;
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

  // Initialize signature pad when step changes to 'sign'
  useEffect(() => {
    if (step === "sign" && canvasRef.current) {
      sigPadRef.current = new SignaturePad(canvasRef.current, {
        backgroundColor: "rgba(255,255,255,0)",
        penColor: "#1e3a5f",
      });

      // Resize canvas properly
      const canvas = canvasRef.current;
      const ratio = window.devicePixelRatio || 1;
      canvas.width = canvas.offsetWidth * ratio;
      canvas.height = canvas.offsetHeight * ratio;
      const ctx = canvas.getContext("2d");
      if (ctx) ctx.scale(ratio, ratio);
      sigPadRef.current.clear();
    }
    return () => {
      if (sigPadRef.current) {
        sigPadRef.current.off();
        sigPadRef.current = null;
      }
    };
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

    if (!r.ok) {
      alert(d.error ?? "Something went wrong");
      setAccepting(false);
      return;
    }

    if (d.needsDeposit && quote?.deposit_required_cents && quote.deposit_required_cents > 0) {
      // Redirect to Stripe
      const dep = await fetch(`/api/quote/${token}/deposit`, { method: "POST" });
      const depData = await dep.json();
      if (depData.url) {
        window.location.href = depData.url;
        return;
      }
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

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !quote) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-8 text-center">
        <XCircle className="size-12 text-destructive" />
        <h1 className="text-xl font-semibold">Quote Not Found</h1>
        <p className="text-muted-foreground">{error || "This quote link is invalid or has expired."}</p>
        <a href="tel:6318746244" className="text-blue-600 hover:underline">(631) 874-6244</a>
      </div>
    );
  }

  // Already accepted/declined states
  if (quote.status === "accepted" || step === "done" || depositSuccess) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-8 text-center">
        <CheckCircle className="size-16 text-green-500" />
        <h1 className="text-2xl font-bold">Quote Accepted!</h1>
        <p className="text-muted-foreground max-w-sm">
          Thank you, {quote.customer_name}. We{`'`}ve received your acceptance
          {depositSuccess ? " and your deposit payment" : ""}.
          We{`'`}ll be in touch shortly to schedule your project.
        </p>
        {quote.estimated_timeline && (
          <p className="text-sm font-medium">Timeline: {quote.estimated_timeline}</p>
        )}
        <a href="tel:6318746244">
          <Button variant="outline">
            <Phone className="mr-2 size-4" />Call (631) 874-6244
          </Button>
        </a>
      </div>
    );
  }

  if (quote.status === "declined" || step === "declined") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-8 text-center">
        <p className="text-muted-foreground max-w-sm">
          We{`'`}ve noted your decision. Please don{`'`}t hesitate to reach out if you have questions or if circumstances change.
        </p>
        <a href="tel:6318746244">
          <Button variant="outline">
            <Phone className="mr-2 size-4" />Call (631) 874-6244
          </Button>
        </a>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-2xl">
        {/* Header */}
        <div className="bg-[#1e3a5f] px-8 py-6 text-white">
          <div className="flex items-start gap-4">
            <Image src="/logo-blue.png" alt="Eastern LM" width={120} height={32} className="mt-1 brightness-0 invert" />
            <div className="ml-auto text-right text-sm">
              <p>110 Frowein Road</p>
              <p>Center Moriches, NY 11934</p>
              <p>(631) 874-6244</p>
            </div>
          </div>
        </div>

        {/* Quote info bar */}
        <div className="bg-white px-8 py-5 border-b">
          <div className="flex flex-wrap gap-6 text-sm">
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide">Quote</p>
              <p className="font-mono font-semibold">{quote.quote_number}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide">Date</p>
              <p>{new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</p>
            </div>
            {quote.valid_until && (
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide">Valid Until</p>
                <p>{quote.valid_until}</p>
              </div>
            )}
            <div className="ml-auto">
              <p className="text-xs text-gray-500 uppercase tracking-wide">Prepared For</p>
              <p className="font-semibold">{quote.customer_name}</p>
              {quote.customer_address && <p className="text-gray-600">{quote.customer_address}</p>}
            </div>
          </div>
        </div>

        <div className="bg-white px-8 py-6 space-y-6">
          {/* Title */}
          <div>
            <h1 className="text-2xl font-bold uppercase tracking-wide">{quote.title}</h1>
            {quote.description && (
              <p className="mt-2 text-gray-600">{quote.description}</p>
            )}
          </div>

          <hr />

          {/* Line items */}
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="pb-2 text-left font-medium text-gray-500">Description</th>
                <th className="pb-2 text-right font-medium text-gray-500">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {quote.line_items.map((item, i) => (
                <tr key={i}>
                  <td className="py-3 pr-4">
                    <p>{item.description}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {item.quantity} {item.unit} × {fmt(item.unit_price_cents)}
                    </p>
                  </td>
                  <td className="py-3 text-right font-medium">{fmt(item.total_cents)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t">
                <td className="pt-3 text-right text-gray-500">Subtotal</td>
                <td className="pt-3 text-right">{fmt(quote.subtotal_cents)}</td>
              </tr>
              <tr>
                <td className="py-1 text-right text-gray-500">Tax (8.75%)</td>
                <td className="py-1 text-right">{fmt(quote.tax_cents)}</td>
              </tr>
              <tr className="border-t">
                <td className="pt-3 text-right font-bold text-lg">TOTAL</td>
                <td className="pt-3 text-right font-bold text-lg">{fmt(quote.total_cents)}</td>
              </tr>
              {quote.deposit_required_cents > 0 && (
                <tr>
                  <td className="pt-2 text-right font-medium text-amber-700">Deposit Required</td>
                  <td className="pt-2 text-right font-medium text-amber-700">{fmt(quote.deposit_required_cents)}</td>
                </tr>
              )}
            </tfoot>
          </table>

          {quote.estimated_timeline && (
            <p className="text-sm"><strong>Timeline:</strong> {quote.estimated_timeline}</p>
          )}

          {quote.terms && (
            <div className="rounded-lg bg-gray-50 border p-4 text-sm text-gray-600">
              <p className="font-medium text-gray-700 mb-1">Terms & Conditions</p>
              {quote.terms}
            </div>
          )}

          <hr />

          {/* Signature / Action section */}
          {step === "view" && (
            <div className="space-y-4">
              <p className="text-center text-gray-600 font-medium">Ready to proceed?</p>
              <Button
                className="w-full"
                size="lg"
                onClick={() => setStep("sign")}
              >
                Accept & Sign Quote
              </Button>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => setShowDeclineForm(true)}
              >
                Decline Quote
              </Button>

              {showDeclineForm && (
                <div className="rounded-lg border p-4 space-y-3">
                  <p className="font-medium">Why are you declining?</p>
                  <div className="space-y-2">
                    {["Too expensive", "Going with someone else", "Timing doesn't work", "Other"].map((r) => (
                      <label key={r} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="reason"
                          value={r}
                          checked={declineReason === r}
                          onChange={() => setDeclineReason(r)}
                          className="accent-accent"
                        />
                        <span className="text-sm">{r}</span>
                      </label>
                    ))}
                  </div>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={handleDecline}
                    disabled={declining}
                  >
                    {declining ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
                    Confirm Decline
                  </Button>
                </div>
              )}
            </div>
          )}

          {step === "sign" && (
            <div className="space-y-4">
              <div>
                <p className="font-semibold text-center mb-2">Sign below to accept</p>
                <p className="text-xs text-center text-gray-500 mb-3">Use your finger or mouse to sign</p>
                <div className="relative rounded-lg border-2 border-gray-200 bg-gray-50 overflow-hidden" style={{ height: 160 }}>
                  <canvas
                    ref={canvasRef}
                    className="absolute inset-0 w-full h-full touch-none"
                    style={{ touchAction: "none" }}
                  />
                </div>
                <button
                  className="mt-1 text-xs text-gray-400 underline"
                  onClick={() => sigPadRef.current?.clear()}
                >
                  Clear
                </button>
              </div>

              <Button
                className="w-full"
                size="lg"
                onClick={handleAccept}
                disabled={accepting}
              >
                {accepting ? (
                  <><Loader2 className="mr-2 size-4 animate-spin" />Processing…</>
                ) : (
                  <>Accept & {quote.deposit_required_cents > 0 ? `Pay ${fmt(quote.deposit_required_cents)} Deposit` : "Confirm"}</>
                )}
              </Button>
              <Button variant="ghost" className="w-full" onClick={() => setStep("view")}>
                Back
              </Button>
            </div>
          )}

          {/* Footer */}
          <div className="border-t pt-4 text-center text-sm text-gray-500">
            Questions? Call{" "}
            <a href="tel:6318746244" className="text-blue-600 hover:underline font-medium">
              (631) 874-6244
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function PublicQuotePage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center text-muted-foreground">Loading…</div>}>
      <PublicQuoteInner />
    </Suspense>
  );
}
