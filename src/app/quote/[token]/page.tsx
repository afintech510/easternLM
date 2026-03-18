"use client";

import { Suspense } from "react";
import { useEffect, useRef, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import SignaturePad from "signature_pad";
import { Loader2, CheckCircle, XCircle, Phone, Printer, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import Image from "next/image";

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
          <div className="no-print bg-white border-t px-8 py-6 space-y-4">
            {step === "view" && (
              <>
                <Button className="w-full bg-[#c8952e] hover:bg-[#b5842a] text-white" size="lg" onClick={() => setStep("sign")}>
                  Accept & Sign Quote
                </Button>
                <Button variant="outline" className="w-full" onClick={() => setShowDeclineForm(true)}>
                  Decline Quote
                </Button>

                {showDeclineForm && (
                  <div className="rounded-lg border p-4 space-y-3">
                    <p className="font-medium text-sm">Why are you declining?</p>
                    <div className="space-y-2">
                      {["Too expensive", "Going with someone else", "Timing doesn't work", "Other"].map((r) => (
                        <label key={r} className="flex items-center gap-2 cursor-pointer">
                          <input type="radio" name="reason" value={r} checked={declineReason === r} onChange={() => setDeclineReason(r)} className="accent-[#c8952e]" />
                          <span className="text-sm">{r}</span>
                        </label>
                      ))}
                    </div>
                    <Button variant="destructive" size="sm" onClick={handleDecline} disabled={declining}>
                      {declining ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}Confirm Decline
                    </Button>
                  </div>
                )}
              </>
            )}

            {step === "sign" && (
              <div className="space-y-4">
                <div>
                  <p className="font-semibold text-center mb-1">Sign below to accept this quote</p>
                  <p className="text-xs text-center text-gray-400 mb-3">Use your finger or mouse</p>
                  <div className="relative rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 overflow-hidden" style={{ height: 160 }}>
                    <canvas ref={canvasRef} className="absolute inset-0 w-full h-full touch-none" style={{ touchAction: "none" }} />
                  </div>
                  <button className="mt-1 text-xs text-gray-400 underline" onClick={() => sigPadRef.current?.clear()}>Clear signature</button>
                </div>
                <Button className="w-full bg-[#c8952e] hover:bg-[#b5842a] text-white" size="lg" onClick={handleAccept} disabled={accepting}>
                  {accepting ? <><Loader2 className="mr-2 size-4 animate-spin" />Processing…</> : <>Accept & {quote.deposit_required_cents > 0 ? `Pay ${fmt(quote.deposit_required_cents)} Deposit` : "Confirm"}</>}
                </Button>
                <Button variant="ghost" className="w-full" onClick={() => setStep("view")}>Back</Button>
              </div>
            )}
          </div>

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

export default function PublicQuotePage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center text-gray-400">Loading…</div>}>
      <PublicQuoteInner />
    </Suspense>
  );
}
