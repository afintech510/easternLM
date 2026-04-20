"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useParams } from "next/navigation";
import { CheckCircle2, AlertTriangle, Loader2, FileSignature } from "lucide-react";

type OrderData = {
  id: string;
  customerName: string;
  address: string;
  confirmedDate: string | null;
  grandTotalCents: number;
  platformFeeCents: number;
  items: Array<{ serviceName: string; inputs: Record<string, string | number>; subtotalCents: number }>;
  timeline: string;
  status: string;
  providerName: string | null;
  alreadySigned: boolean;
};

export default function ConfirmBookingPage() {
  const { token } = useParams<{ token: string }>();
  const [order, setOrder] = useState<OrderData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  // Signature state
  const [nonCompeteSig, setNonCompeteSig] = useState("");
  const [liabilitySig, setLiabilitySig] = useState("");
  const [signatureMode, setSignatureMode] = useState<"type" | "draw">("type");
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawingRef = useRef(false);
  const [canvasSignature, setCanvasSignature] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    fetch(`/api/services/book-now/confirm/lookup?token=${encodeURIComponent(token)}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) setError(data.error);
        else if (data.order.alreadySigned) {
          setOrder(data.order);
          setDone(true);
        } else {
          setOrder(data.order);
        }
      })
      .catch(() => setError("Failed to load booking"))
      .finally(() => setLoading(false));
  }, [token]);

  // Canvas drawing handlers
  const startDraw = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    drawingRef.current = true;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    const x = "touches" in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = "touches" in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top;
    ctx.beginPath();
    ctx.moveTo(x, y);
  }, []);

  const draw = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (!drawingRef.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    const x = "touches" in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = "touches" in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top;
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.strokeStyle = "#002e44";
    ctx.lineTo(x, y);
    ctx.stroke();
  }, []);

  const endDraw = useCallback(() => {
    drawingRef.current = false;
    const canvas = canvasRef.current;
    if (canvas) setCanvasSignature(canvas.toDataURL("image/png"));
  }, []);

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
    setCanvasSignature(null);
  };

  const handleSubmit = async () => {
    if (submitting || done) return;

    const ncSig = signatureMode === "type" ? nonCompeteSig : canvasSignature;
    const lwSig = signatureMode === "type" ? liabilitySig : canvasSignature;

    if (!ncSig || !lwSig) return;

    setSubmitting(true);
    try {
      const res = await fetch("/api/services/book-now/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          nonCompeteSignature: ncSig,
          liabilitySignature: lwSig,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to confirm");
      } else {
        setDone(true);
      }
    } catch {
      setError("Network error — please try again");
    } finally {
      setSubmitting(false);
    }
  };

  const formatUsd = (cents: number) => `$${(cents / 100).toFixed(2)}`;

  const isValid = signatureMode === "type"
    ? nonCompeteSig.trim().length >= 2 && liabilitySig.trim().length >= 2
    : !!canvasSignature;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error && !order) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="max-w-md text-center">
          <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h1 className="text-xl font-bold mb-2">Link Invalid or Expired</h1>
          <p className="text-muted-foreground">{error}</p>
          <p className="text-sm text-muted-foreground mt-4">
            Please contact us at (631) 874-6244 if you need a new link.
          </p>
        </div>
      </div>
    );
  }

  if (done) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="max-w-md text-center">
          <CheckCircle2 className="h-16 w-16 text-green-600 mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2" style={{ fontFamily: "var(--font-display)" }}>
            Booking Confirmed!
          </h1>
          <p className="text-muted-foreground mb-4">
            Your crew is scheduled{order?.confirmedDate ? ` for ${order.confirmedDate}` : ""}.
            We&apos;ve sent you a confirmation email with your crew&apos;s contact info.
          </p>
          {order?.providerName && (
            <p className="font-semibold">Your crew: {order.providerName}</p>
          )}
          <p className="text-sm text-muted-foreground mt-6">
            Remember: 50% payment to your crew before work begins, 50% upon completion.
          </p>
        </div>
      </div>
    );
  }

  if (!order) return null;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-primary text-primary-foreground py-6 px-4 text-center">
        <h1 className="text-xl font-bold" style={{ fontFamily: "var(--font-display)" }}>
          Confirm Your Booking
        </h1>
        <p className="text-sm opacity-80 mt-1">Eastern Landscape & Mason Supply</p>
      </div>

      <div className="max-w-lg mx-auto px-4 py-8 space-y-6">
        {error && (
          <div className="bg-red-50 text-red-700 px-4 py-3 rounded-lg text-sm">{error}</div>
        )}

        {/* Booking Summary */}
        <section className="bg-card border rounded-[0.625rem] p-5">
          <h2 className="font-bold text-lg mb-3" style={{ fontFamily: "var(--font-display)" }}>
            Booking Summary
          </h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Address</span>
              <span className="text-right font-medium">{order.address}</span>
            </div>
            {order.confirmedDate && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Confirmed Date</span>
                <span className="font-medium">{order.confirmedDate}</span>
              </div>
            )}
            {order.providerName && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Crew</span>
                <span className="font-medium">{order.providerName}</span>
              </div>
            )}
          </div>

          <div className="mt-4 pt-3 border-t space-y-1.5">
            {order.items.map((item, i) => (
              <div key={i} className="flex justify-between text-sm">
                <span>{item.serviceName}</span>
                <span className="font-medium">{formatUsd(item.subtotalCents)}</span>
              </div>
            ))}
            <div className="flex justify-between font-bold pt-2 border-t text-sm">
              <span>Authorized Total</span>
              <span>{formatUsd(order.grandTotalCents)}</span>
            </div>
          </div>

          <div className="mt-3 bg-amber-50 text-amber-800 text-xs px-3 py-2 rounded-lg">
            <strong>Platform fee charged now:</strong> {formatUsd(order.platformFeeCents)}.
            The remaining balance ({formatUsd(order.grandTotalCents - order.platformFeeCents)}) is released back to your card —
            you pay the crew directly on-site.
          </div>
        </section>

        {/* Non-Compete Agreement */}
        <section className="bg-card border rounded-[0.625rem] p-5">
          <h2 className="font-bold text-lg mb-3 flex items-center gap-2" style={{ fontFamily: "var(--font-display)" }}>
            <FileSignature className="h-5 w-5" /> Non-Compete Agreement
          </h2>
          <div className="text-xs text-muted-foreground bg-muted/50 p-3 rounded-lg mb-4 max-h-32 overflow-y-auto">
            <p className="mb-2">
              By signing below, I agree that for a period of <strong>12 months</strong> following
              the completion of any service arranged through Eastern Landscape & Mason Supply
              (&ldquo;Platform&rdquo;), I will not directly hire, contract, or engage any service
              provider (&ldquo;Crew&rdquo;) introduced to me through the Platform for services
              similar to those originally booked.
            </p>
            <p>
              Violation of this agreement entitles the Platform to a fee equal to 20% of the
              contract value for any work performed in circumvention of this agreement.
            </p>
          </div>

          {signatureMode === "type" ? (
            <div>
              <label className="text-sm font-medium">Type your full name to sign</label>
              <input
                type="text"
                value={nonCompeteSig}
                onChange={(e) => setNonCompeteSig(e.target.value)}
                placeholder="Your full name"
                className="mt-1 w-full h-10 rounded-lg border px-3 text-sm italic"
                style={{ fontFamily: "cursive" }}
              />
            </div>
          ) : null}
        </section>

        {/* Liability Waiver */}
        <section className="bg-card border rounded-[0.625rem] p-5">
          <h2 className="font-bold text-lg mb-3 flex items-center gap-2" style={{ fontFamily: "var(--font-display)" }}>
            <FileSignature className="h-5 w-5" /> Liability Waiver
          </h2>
          <div className="text-xs text-muted-foreground bg-muted/50 p-3 rounded-lg mb-4 max-h-32 overflow-y-auto">
            <p className="mb-2">
              I acknowledge that Eastern Landscape & Mason Supply operates as a booking platform
              and does not directly perform the services. The Platform connects customers with
              independent service providers (&ldquo;Crews&rdquo;).
            </p>
            <p className="mb-2">
              I release and hold harmless Eastern Landscape & Mason Supply, its owners, employees,
              and agents from any and all claims, damages, or liability arising from the performance
              or non-performance of services by the Crew, including but not limited to property
              damage, personal injury, or financial loss.
            </p>
            <p>
              I understand that any disputes regarding service quality are to be resolved directly
              with the Crew, and that the Platform&apos;s role is limited to initial booking and
              crew matching.
            </p>
          </div>

          {signatureMode === "type" ? (
            <div>
              <label className="text-sm font-medium">Type your full name to sign</label>
              <input
                type="text"
                value={liabilitySig}
                onChange={(e) => setLiabilitySig(e.target.value)}
                placeholder="Your full name"
                className="mt-1 w-full h-10 rounded-lg border px-3 text-sm italic"
                style={{ fontFamily: "cursive" }}
              />
            </div>
          ) : null}
        </section>

        {/* Draw signature mode */}
        {signatureMode === "draw" && (
          <section className="bg-card border rounded-[0.625rem] p-5">
            <h2 className="font-bold text-sm mb-2">Draw Your Signature</h2>
            <p className="text-xs text-muted-foreground mb-3">
              This signature applies to both agreements above.
            </p>
            <div className="border-2 border-dashed rounded-lg overflow-hidden">
              <canvas
                ref={canvasRef}
                width={400}
                height={150}
                className="w-full touch-none bg-white cursor-crosshair"
                onMouseDown={startDraw}
                onMouseMove={draw}
                onMouseUp={endDraw}
                onMouseLeave={endDraw}
                onTouchStart={startDraw}
                onTouchMove={draw}
                onTouchEnd={endDraw}
              />
            </div>
            <button
              onClick={clearCanvas}
              className="text-xs text-muted-foreground underline mt-1"
            >
              Clear
            </button>
          </section>
        )}

        {/* Toggle signature mode */}
        <div className="text-center">
          <button
            onClick={() => setSignatureMode(signatureMode === "type" ? "draw" : "type")}
            className="text-xs text-primary underline"
          >
            {signatureMode === "type" ? "Prefer to draw your signature?" : "Prefer to type your name?"}
          </button>
        </div>

        {/* Submit */}
        <button
          onClick={handleSubmit}
          disabled={!isValid || submitting}
          className="w-full h-12 rounded-[0.625rem] bg-amber-500 hover:bg-amber-600 text-primary-foreground font-bold text-base disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-colors"
          style={{ fontFamily: "var(--font-display)" }}
        >
          {submitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> Processing...
            </>
          ) : (
            <>Confirm & Sign</>
          )}
        </button>

        <p className="text-xs text-center text-muted-foreground">
          By clicking &ldquo;Confirm & Sign&rdquo;, the platform fee of {formatUsd(order.platformFeeCents)} will
          be charged to your card. The remaining authorization will be released.
        </p>
      </div>
    </div>
  );
}
