"use client";

import { useState, useEffect } from "react";
import { Check, ShoppingCart, Minus, Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import type { DeliveryType, MaterialClass } from "@/lib/delivery";
import { useCartStore, useCartHydrated } from "@/stores/cartStore";

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
  slug?: string;
}

export function ProductCardActions({
  productId,
  name,
  unitPriceCents,
  deliveryType,
  materialClass,
  unit = "yard",
  slug,
}: Props) {
  const hydrated = useCartHydrated();
  const addItem = useCartStore((state) => state.addItem);
  const cartItems = useCartStore((state) => state.items);
  const updateQuantity = useCartStore((state) => state.updateQuantity);

  const cartItem = hydrated ? cartItems.find((i) => i.id === productId) : undefined;
  const isInCart = !!cartItem;

  const [qty, setQty] = useState(cartItem?.quantity ?? 1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [justAdded, setJustAdded] = useState(false);

  const isBulk = deliveryType === "bulk";

  // Sync local qty if cart changes externally
  useEffect(() => {
    if (cartItem) setQty(cartItem.quantity);
  }, [cartItem?.quantity]);

  async function handleAdd() {
    if (qty <= 0) return;
    setIsSubmitting(true);

    try {
      if (isInCart) {
        await updateQuantity(productId, qty);
        toast.success(`${name} updated`, {
          description: `${qty} ${unit} × ${formatUsd(unitPriceCents)} = ${formatUsd(unitPriceCents * qty)}`,
          duration: 2000,
        });
      } else {
        await addItem({ id: productId, name, quantity: qty, unitPriceCents, deliveryType, materialClass });
        toast.success(`${name} added to cart`, {
          description: `${qty} ${unit} × ${formatUsd(unitPriceCents)} = ${formatUsd(unitPriceCents * qty)}`,
          action: { label: "View Cart", onClick: () => { window.location.href = "/cart"; } },
          duration: 3000,
        });
      }

      setJustAdded(true);
      setTimeout(() => setJustAdded(false), 2000);
    } catch {
      toast.error("Failed to update cart. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (justAdded) {
    return (
      <div className="space-y-2 px-1">
        <Button className="w-full bg-green-600 text-white hover:bg-green-600 h-11" disabled>
          <Check className="size-4" /> {isInCart ? "Updated" : "Added"}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-2 px-1 pb-1">
      {/* In-cart indicator */}
      {isInCart && (
        <p className="text-center text-xs font-medium text-green-600">
          ✓ In cart: {cartItem.quantity} {unit}
        </p>
      )}

      {/* Row 1: Preset buttons — SET qty only, don't add to cart */}
      {isBulk && (
        <div className="flex gap-1">
          {BULK_PRESETS.map((p) => (
            <button
              key={p}
              onClick={() => setQty(p)}
              className={`flex-1 rounded-lg border h-10 text-sm font-semibold transition-colors ${
                qty === p
                  ? "bg-accent/15 text-accent border-accent/40"
                  : "bg-muted/50 text-foreground/70 border-border hover:bg-accent/10 hover:text-accent"
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      )}

      {/* Row 2: Qty selector */}
      <div className="flex items-center justify-center gap-2">
        <button
          onClick={() => setQty(Math.max(isBulk ? 1 : 1, qty - (isBulk ? 1 : 1)))}
          className="flex h-10 w-11 items-center justify-center rounded-lg border bg-muted/50 text-lg font-bold hover:bg-muted"
        >
          −
        </button>
        <input
          type="number"
          min={1}
          value={qty}
          onChange={(e) => {
            const val = parseFloat(e.target.value);
            if (!isNaN(val) && val > 0) setQty(val);
          }}
          className="h-10 w-16 rounded-lg border bg-background text-center text-lg font-bold focus:outline-none focus:ring-2 focus:ring-accent/50 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
          inputMode="decimal"
        />
        <button
          onClick={() => setQty(qty + (isBulk ? 1 : 1))}
          className="flex h-10 w-11 items-center justify-center rounded-lg border bg-muted/50 text-lg font-bold hover:bg-muted"
        >
          +
        </button>
      </div>

      {/* Row 3: Add to Cart */}
      <Button
        className="w-full h-11 text-sm font-semibold"
        disabled={isSubmitting || qty <= 0}
        onClick={handleAdd}
      >
        {isSubmitting ? "Adding..." : (
          <>
            <ShoppingCart className="size-4" />
            {isInCart ? `Update Cart — ${qty} ${unit}` : `Add to Cart — ${qty} ${unit}`}
          </>
        )}
      </Button>
    </div>
  );
}
