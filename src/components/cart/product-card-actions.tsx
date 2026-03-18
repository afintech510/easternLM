"use client";

import { useState } from "react";
import { Check, ShoppingCart, Minus, Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import type { DeliveryType, MaterialClass } from "@/lib/delivery";
import { useCartStore } from "@/stores/cartStore";

const BULK_PRESETS = [3, 5, 10, 15, 20];

function formatUsd(cents: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);
}

interface Props {
  productId: string;
  name: string;
  unitPriceCents: number;
  deliveryType: DeliveryType;
  materialClass: MaterialClass;
  unit?: string;
}

export function ProductCardActions({
  productId,
  name,
  unitPriceCents,
  deliveryType,
  materialClass,
  unit = "yard",
}: Props) {
  const addItem = useCartStore((state) => state.addItem);
  const [qty, setQty] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [justAdded, setJustAdded] = useState(false);

  const isBulk = deliveryType === "bulk";

  async function handleAdd(overrideQty?: number) {
    const q = overrideQty ?? qty;
    setIsSubmitting(true);
    await addItem({
      id: productId,
      name,
      quantity: q,
      unitPriceCents,
      deliveryType,
      materialClass,
    });
    setIsSubmitting(false);
    setJustAdded(true);
    setTimeout(() => setJustAdded(false), 2000);

    toast.success(`${name} added to cart`, {
      description: `${q} × ${formatUsd(unitPriceCents)} = ${formatUsd(unitPriceCents * q)}`,
      action: { label: "View Cart", onClick: () => { window.location.href = "/cart"; } },
      duration: 3000,
    });
  }

  if (justAdded) {
    return (
      <div className="space-y-2">
        <Button className="w-full bg-green-600 text-white hover:bg-green-600" size="sm" disabled>
          <Check className="size-4" /> Added
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {/* Quick qty presets for bulk */}
      {isBulk && (
        <div className="flex gap-1">
          {BULK_PRESETS.map((p) => (
            <button
              key={p}
              onClick={() => handleAdd(p)}
              disabled={isSubmitting}
              className="flex-1 rounded-md border bg-muted/50 py-1 text-xs font-medium text-foreground/70 hover:bg-accent/10 hover:text-accent hover:border-accent/30 transition-colors"
            >
              {p}
            </button>
          ))}
        </div>
      )}

      {/* Qty selector + add button */}
      <div className="flex gap-1.5">
        <div className="flex items-center rounded-md border bg-background">
          <button
            onClick={() => setQty(Math.max(1, qty - 1))}
            className="px-2 py-1.5 text-muted-foreground hover:text-foreground"
          >
            <Minus className="size-3" />
          </button>
          <input
            type="number"
            min={1}
            value={qty}
            onChange={(e) => setQty(Math.max(1, parseInt(e.target.value) || 1))}
            className="w-10 border-x bg-transparent py-1.5 text-center text-xs font-medium focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
          />
          <button
            onClick={() => setQty(qty + 1)}
            className="px-2 py-1.5 text-muted-foreground hover:text-foreground"
          >
            <Plus className="size-3" />
          </button>
        </div>
        <Button
          className="flex-1"
          size="sm"
          disabled={isSubmitting}
          onClick={() => handleAdd()}
        >
          {isSubmitting ? "Adding..." : <><ShoppingCart className="size-3.5" /> Add</>}
        </Button>
      </div>
    </div>
  );
}
