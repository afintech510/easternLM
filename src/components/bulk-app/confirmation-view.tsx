"use client";

import { CheckCircle, Phone, Truck, Camera } from "lucide-react";
import { formatUsd } from "@/lib/format";

export interface ConfirmationViewProps {
  orderNumber: string;
  deliveryDate: string;
  deliveryAddress: string;
  totalCents: number;
}

/**
 * Order confirmed view with delivery schedule and upsell.
 * Spec §6.3, §9
 */
export function ConfirmationView({
  orderNumber,
  deliveryDate,
  deliveryAddress,
  totalCents,
}: ConfirmationViewProps) {
  return (
    <div data-testid="confirmation-view" className="space-y-6 px-5 py-8">
      {/* Success */}
      <div className="text-center">
        <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-green-100">
          <CheckCircle className="size-8 text-green-600" />
        </div>
        <h1 className="mt-4 font-bulk-display text-2xl font-bold text-bulk-text">
          Order Confirmed!
        </h1>
        <p className="mt-1 font-bulk-mono text-sm text-bulk-muted">{orderNumber}</p>
        <p className="mt-2 text-sm text-bulk-muted">
          Delivery: {deliveryDate} · {deliveryAddress}
        </p>
        <p className="mt-1 font-bulk-mono text-lg font-bold text-bulk-text">
          {formatUsd(totalCents)}
        </p>
      </div>

      {/* Touch 3 — Upsell (50% off next delivery) */}
      <div className="rounded-2xl bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 p-5">
        <p className="text-center text-lg font-bold text-amber-900">
          🚛 50% Off Your Next Delivery
        </p>
        <p className="mt-2 text-center text-sm text-amber-800">
          Pick a material, pick a date, done.
        </p>
        <button className="mt-4 w-full rounded-xl bg-orange-600 py-3.5 text-center font-semibold text-white shadow-lg transition-transform active:scale-[0.98]">
          + Book My Next Delivery — 50% Off
        </button>
        <p className="mt-2 text-center text-xs text-amber-700/60">Maybe next time</p>
      </div>

      {/* What to expect */}
      <div className="rounded-xl border border-bulk-border bg-white p-4 space-y-3">
        <p className="text-xs font-bold uppercase tracking-wider text-bulk-faded">What to Expect</p>
        <div className="flex items-start gap-3">
          <Phone className="mt-0.5 size-4 shrink-0 text-bulk-sage" />
          <p className="text-sm text-bulk-muted">We&apos;ll call to confirm your delivery window</p>
        </div>
        <div className="flex items-start gap-3">
          <Truck className="mt-0.5 size-4 shrink-0 text-bulk-sage" />
          <p className="text-sm text-bulk-muted">You&apos;ll get a text when we&apos;re 30 min away</p>
        </div>
        <div className="flex items-start gap-3">
          <Camera className="mt-0.5 size-4 shrink-0 text-bulk-sage" />
          <p className="text-sm text-bulk-muted">Driver will photo-confirm the drop</p>
        </div>
      </div>

      {/* Call us */}
      <div className="text-center">
        <a
          href="tel:+16318746244"
          className="inline-flex items-center gap-2 rounded-xl border border-bulk-border bg-white px-6 py-3 text-sm font-medium text-bulk-text"
        >
          <Phone className="size-4 text-bulk-sage" />
          Questions? Call (631) 874-6244
        </a>
      </div>
    </div>
  );
}
