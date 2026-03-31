"use client";

import { useState } from "react";
import { ArrowLeft, Lock } from "lucide-react";
import Link from "next/link";
import { OrderSummary } from "@/components/bulk-app/order-summary";
import { DeliveryForm } from "@/components/bulk-app/delivery-form";
import { PaymentSelector } from "@/components/bulk-app/payment-selector";
import { useBulkOrderStore } from "@/stores/bulk-order-store";
import { calcTotalCents } from "@/lib/bulk-pricing";
import { formatUsd } from "@/lib/format";

const TAX_RATE = 0.0875;

/**
 * /app/order — Order Summary, Delivery, & Payment
 * Spec §9, §7
 */
export default function BulkOrderPage() {
  const items = useBulkOrderStore((s) => s.items);
  const [paymentMethod, setPaymentMethod] = useState<"card" | "klarna" | "afterpay">("card");
  const [loading, setLoading] = useState(false);

  const materialsCents = items.reduce(
    (s, i) => s + calcTotalCents(i.qty, i.priceCents),
    0
  );
  const deliveryCents = 0; // Phase 04
  const taxCents = Math.round((materialsCents + deliveryCents) * TAX_RATE);
  const grandTotalCents = materialsCents + deliveryCents + taxCents;

  async function handleCheckout() {
    if (items.length === 0) return;
    setLoading(true);
    try {
      const res = await fetch("/api/bulk-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: items.map((i) => ({
            slug: i.slug,
            name: i.name,
            qty: i.qty,
            priceCents: i.priceCents,
            options: i.options,
          })),
          paymentMethod,
          deliveryMethod: "delivery",
          clientTotalCents: grandTotalCents,
        }),
      });
      const data = await res.json();
      if (data.sessionUrl) {
        window.location.href = data.sessionUrl;
      } else {
        alert(data.error ?? "Checkout failed");
      }
    } catch {
      alert("Network error — please try again");
    }
    setLoading(false);
  }

  return (
    <div className="min-h-screen pb-32">
      {/* Back nav */}
      <div className="sticky top-0 z-30 flex items-center gap-3 border-b border-bulk-border bg-bulk-bg/95 px-5 py-3 backdrop-blur-sm">
        <Link href="/app" className="flex size-8 items-center justify-center rounded-lg bg-bulk-card text-bulk-muted">
          <ArrowLeft className="size-4" />
        </Link>
        <h1 className="font-bulk-display text-lg font-bold text-bulk-text">Your Order</h1>
      </div>

      <div className="space-y-6 px-5 py-5">
        <OrderSummary />

        {/* Delivery form */}
        <DeliveryForm />

        {/* Payment selector */}
        {items.length > 0 && (
          <>
            <PaymentSelector
              selected={paymentMethod}
              totalCents={grandTotalCents}
              onChange={setPaymentMethod}
            />

            {/* Checkout button */}
            <button
              onClick={handleCheckout}
              disabled={loading || items.length === 0}
              className="w-full rounded-xl bg-gradient-to-r from-bulk-primary to-bulk-medium py-4 text-center font-semibold text-white shadow-lg transition-transform active:scale-[0.98] disabled:opacity-50"
            >
              {loading ? "Processing..." : `PLACE ORDER — ${formatUsd(grandTotalCents)}`}
            </button>
            <p className="flex items-center justify-center gap-1 text-[11px] text-bulk-faded">
              <Lock className="size-3" />
              Secured by Stripe · 256-bit encryption
            </p>
          </>
        )}
      </div>
    </div>
  );
}
