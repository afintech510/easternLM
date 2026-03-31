"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { useBulkOrderStore } from "@/stores/bulk-order-store";
import { calcCoverageSqFt } from "@/lib/bulk-coverage";
import { calcTotalCents } from "@/lib/bulk-pricing";
import { formatUsd } from "@/lib/format";

/**
 * Floating bottom bar showing order summary.
 * Appears when items > 0. Tapping opens /app/order.
 * Spec §9.2
 */
export function OrderBar() {
  const items = useBulkOrderStore((s) => s.items);

  if (items.length === 0) return null;

  const totalQty = items.reduce((s, i) => s + i.qty, 0);
  const totalCents = items.reduce((s, i) => s + calcTotalCents(i.qty, i.priceCents), 0);
  const totalSqFt = items.reduce((s, i) => s + calcCoverageSqFt(i.qty, i.options.depth), 0);

  return (
    <div data-testid="order-bar" className="fixed bottom-4 left-1/2 z-40 w-full max-w-[400px] -translate-x-1/2 px-4">
      <Link
        href="/app/order"
        className="flex items-center justify-between rounded-2xl bg-gradient-to-r from-bulk-primary to-bulk-medium p-4 shadow-2xl shadow-bulk-dark/30"
      >
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-bulk-sage">
            Your Order · {items.length} item{items.length > 1 ? "s" : ""}
          </p>
          <p className="mt-0.5 text-[13px] text-white/70">
            {totalQty} cu yds · ~{totalSqFt.toLocaleString()} sq ft
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="font-bulk-mono text-lg font-bold text-white">
            {formatUsd(totalCents)}
          </span>
          <ChevronRight className="size-5 text-white/60" />
        </div>
      </Link>
    </div>
  );
}
