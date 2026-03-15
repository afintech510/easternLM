"use client";

import Link from "next/link";
import { type ReactNode } from "react";
import { ArrowRight, Phone, ShoppingCart } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useCartStore } from "@/stores/cartStore";

function formatUsd(cents: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);
}

export type CalculatorResult = {
  yards: number;
  exact: number;
  label: string;
  formula: string;
  recommendation?: string;
  pricePerYardCents: number;
  productSlug: string;
  productName: string;
  productId?: string;
  // Optional secondary material (e.g., driveway base + surface)
  secondary?: {
    yards: number;
    label: string;
    pricePerYardCents: number;
    productSlug: string;
    productName: string;
  };
};

type CalculatorShellProps = {
  title: string;
  description: string;
  inputs: ReactNode;
  result: CalculatorResult | null;
};

export function CalculatorShell({ title, description, inputs, result }: CalculatorShellProps) {
  const addItem = useCartStore((s) => s.addItem);

  function handleAddToCart(name: string, slug: string, yards: number, priceCents: number) {
    addItem({
      id: slug,
      name,
      quantity: yards,
      unitPriceCents: priceCents,
      deliveryType: "bulk",
      materialClass: "default",
    });
    toast.success(`${name} added to cart`, {
      description: `${yards} yd × ${formatUsd(priceCents)} = ${formatUsd(Math.round(yards * priceCents))}`,
      action: { label: "View Cart", onClick: () => { window.location.href = "/cart"; } },
    });
  }

  const totalCost = result
    ? Math.round(result.yards * result.pricePerYardCents) + (result.secondary ? Math.round(result.secondary.yards * result.secondary.pricePerYardCents) : 0)
    : 0;

  return (
    <div className="rounded-xl border bg-card">
      <div className="border-b p-5">
        <h2 className="text-lg font-semibold">{title}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </div>

      <div className="p-5 space-y-5">
        {/* Inputs */}
        {inputs}

        {/* Results */}
        {result && result.yards > 0 && (
          <div className="space-y-4 rounded-lg border-2 border-accent/25 bg-accent/5 p-4">
            {/* Show the math */}
            <p className="text-xs text-muted-foreground">{result.formula}</p>

            {/* Primary material */}
            <div className="flex items-baseline justify-between">
              <div>
                <p className="text-sm font-medium">{result.productName}</p>
                <p className="text-3xl font-bold text-accent">{result.yards.toFixed(1)} <span className="text-base font-normal text-muted-foreground">cubic yards</span></p>
              </div>
              <p className="text-lg font-semibold">{formatUsd(Math.round(result.yards * result.pricePerYardCents))}</p>
            </div>

            {/* Secondary material (driveway base) */}
            {result.secondary && (
              <div className="flex items-baseline justify-between border-t pt-3">
                <div>
                  <p className="text-sm font-medium">{result.secondary.productName}</p>
                  <p className="text-xl font-bold">{result.secondary.yards.toFixed(1)} <span className="text-sm font-normal text-muted-foreground">cubic yards</span></p>
                </div>
                <p className="text-sm font-semibold">{formatUsd(Math.round(result.secondary.yards * result.secondary.pricePerYardCents))}</p>
              </div>
            )}

            {/* Total */}
            <div className="flex items-center justify-between border-t pt-3 text-lg font-bold">
              <span>Material total</span>
              <span className="text-accent">{formatUsd(totalCost)}</span>
            </div>
            <p className="text-xs text-muted-foreground">+ delivery fee and tax calculated at checkout</p>

            {/* Recommendation */}
            {result.recommendation && (
              <p className="rounded-md bg-muted/50 p-3 text-sm text-muted-foreground">{result.recommendation}</p>
            )}

            {/* Actions */}
            <div className="space-y-2 pt-1">
              <Button
                className="w-full bg-accent text-accent-foreground hover:bg-accent/90"
                size="lg"
                onClick={() => {
                  handleAddToCart(result.productName, result.productSlug, result.yards, result.pricePerYardCents);
                  if (result.secondary) {
                    handleAddToCart(result.secondary.productName, result.secondary.productSlug, result.secondary.yards, result.secondary.pricePerYardCents);
                  }
                }}
              >
                <ShoppingCart className="size-4" /> Add to Cart — {formatUsd(totalCost)}
              </Button>
              <Button asChild variant="outline" className="w-full" size="lg">
                <Link href={`/shop/${result.productSlug}`}>View Product Details <ArrowRight className="size-4" /></Link>
              </Button>
            </div>
          </div>
        )}

        {/* Phone fallback */}
        <a href="tel:+16318746244" className="flex items-center justify-center gap-2 text-sm text-muted-foreground hover:text-accent">
          <Phone className="size-4" /> Not sure? Call (631) 874-6244
        </a>
      </div>
    </div>
  );
}

// ─── Shared input components ──────────────────────────────────────

export function CalcInput({ label, value, onChange, unit, hint }: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  unit?: string;
  hint?: string;
}) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium">{label}</label>
      <div className="flex items-center gap-2">
        <input
          type="text"
          inputMode="decimal"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-10 w-full rounded-md border border-input bg-background px-3 text-lg font-semibold"
        />
        {unit && <span className="shrink-0 text-sm text-muted-foreground">{unit}</span>}
      </div>
      {hint && <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

export function CalcSelect({ label, value, onChange, options }: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: Array<{ value: string; label: string }>;
}) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
      >
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );
}
