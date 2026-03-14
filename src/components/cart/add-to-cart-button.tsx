"use client";

import { useState } from "react";
import { Check, ShoppingCart } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import type { DeliveryType, MaterialClass } from "@/lib/delivery";
import { useCartStore } from "@/stores/cartStore";

type AddToCartButtonProps = {
  productId: string;
  name: string;
  unitPriceCents: number;
  deliveryType: DeliveryType;
  materialClass: MaterialClass;
  quantity?: number;
};

function formatUsd(cents: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);
}

export function AddToCartButton({
  productId,
  name,
  unitPriceCents,
  deliveryType,
  materialClass,
  quantity = 1,
}: AddToCartButtonProps) {
  const addItem = useCartStore((state) => state.addItem);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [justAdded, setJustAdded] = useState(false);

  async function handleClick() {
    setIsSubmitting(true);
    await addItem({
      id: productId,
      name,
      quantity,
      unitPriceCents,
      deliveryType,
      materialClass,
    });
    setIsSubmitting(false);
    setJustAdded(true);
    setTimeout(() => setJustAdded(false), 2000);

    toast.success(`${name} added to cart`, {
      description: `${quantity} × ${formatUsd(unitPriceCents)} = ${formatUsd(unitPriceCents * quantity)}`,
      action: {
        label: "View Cart",
        onClick: () => { window.location.href = "/cart"; },
      },
      duration: 3000,
    });
  }

  return (
    <Button
      className={`mt-3 w-full transition-colors ${justAdded ? "bg-green-600 text-white hover:bg-green-600" : ""}`}
      size="sm"
      disabled={isSubmitting || justAdded}
      onClick={handleClick}
    >
      {isSubmitting ? (
        "Adding..."
      ) : justAdded ? (
        <><Check className="size-4" /> Added</>
      ) : (
        <><ShoppingCart className="size-4" /> Add to Cart</>
      )}
    </Button>
  );
}
