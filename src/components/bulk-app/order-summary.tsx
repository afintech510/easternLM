"use client";

import { Trash2 } from "lucide-react";
import { useBulkOrderStore } from "@/stores/bulk-order-store";
import { calcTotalCents, calcSavingsCents } from "@/lib/bulk-pricing";
import { calcCoverageSqFt } from "@/lib/bulk-coverage";
import { formatUsd } from "@/lib/format";

const TAX_RATE = 0.0875;

/**
 * Full order summary with line items, savings, pricing.
 * Spec §9.3
 */
export function OrderSummary() {
  const items = useBulkOrderStore((s) => s.items);
  const removeItem = useBulkOrderStore((s) => s.removeItem);

  const totalQty = items.reduce((s, i) => s + i.qty, 0);
  const totalSqFt = items.reduce((s, i) => s + calcCoverageSqFt(i.qty, i.options.depth), 0);
  const materialsCents = items.reduce((s, i) => s + calcTotalCents(i.qty, i.priceCents), 0);
  const deliveryCents = 0; // Phase 04 — delivery fee placeholder
  const taxCents = Math.round((materialsCents + deliveryCents) * TAX_RATE);
  const grandTotalCents = materialsCents + deliveryCents + taxCents;

  if (items.length === 0) {
    return (
      <div data-testid="order-summary" className="py-12 text-center">
        <p className="text-bulk-muted">Your order is empty</p>
        <a href="/app" className="mt-2 inline-block text-sm font-medium text-bulk-sage hover:underline">
          ← Browse materials
        </a>
      </div>
    );
  }

  return (
    <div data-testid="order-summary" className="space-y-4">
      {/* Header */}
      <div>
        <h1 className="font-bulk-display text-[22px] font-bold text-bulk-text">Your Order</h1>
        <p className="text-sm text-bulk-muted">
          {items.length} item{items.length > 1 ? "s" : ""} · {totalQty} cu yds · ~{totalSqFt.toLocaleString()} sq ft
        </p>
      </div>

      {/* Line items */}
      <div className="divide-y divide-bulk-border rounded-xl border border-bulk-border bg-white">
        {items.map((item) => {
          const lineTotal = calcTotalCents(item.qty, item.priceCents);
          return (
            <div key={item.slug} className="flex items-start gap-3 p-3.5">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-bulk-text">{item.name}</p>
                <p className="mt-0.5 text-xs text-bulk-muted">
                  {item.qty} cu yds × {formatUsd(item.priceCents)} per cu. yard
                </p>
                {item.options.premium && (
                  <p className="mt-0.5 text-[10px] text-bulk-premium-text">+ Triple-Shredded</p>
                )}
                {item.options.crushed && (
                  <p className="mt-0.5 text-[10px] text-pink-600">+ Crushed</p>
                )}
              </div>
              <div className="flex items-center gap-2">
                <p className="font-bulk-mono text-sm font-bold text-bulk-text">
                  {formatUsd(lineTotal)}
                </p>
                <button
                  onClick={() => removeItem(item.slug)}
                  className="flex size-7 items-center justify-center rounded-lg text-bulk-faded hover:bg-red-50 hover:text-red-500"
                >
                  <Trash2 className="size-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Delivery placeholder */}
      <div className="rounded-xl border border-dashed border-bulk-border bg-bulk-card p-4 text-center text-sm text-bulk-muted">
        🚛 Delivery details — enter address below
      </div>

      {/* Price summary */}
      <div className="space-y-2 rounded-xl border border-bulk-border bg-white p-4">
        <div className="flex justify-between text-sm">
          <span className="text-bulk-muted">Materials</span>
          <span className="font-bulk-mono font-medium text-bulk-text">{formatUsd(materialsCents)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-bulk-muted">Delivery</span>
          <span className="font-bulk-mono text-bulk-faded">TBD</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-bulk-muted">Sales Tax (8.75%)</span>
          <span className="font-bulk-mono font-medium text-bulk-text">{formatUsd(taxCents)}</span>
        </div>
        <div className="flex justify-between border-t border-bulk-border pt-2">
          <span className="font-semibold text-bulk-text">Total</span>
          <span className="font-bulk-display text-xl font-bold text-bulk-text">{formatUsd(grandTotalCents)}</span>
        </div>
      </div>
    </div>
  );
}
