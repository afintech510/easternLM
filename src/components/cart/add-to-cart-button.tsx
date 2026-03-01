"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import type { DeliveryType, MaterialClass } from "@/lib/delivery";
import { useCartStore } from "@/stores/cartStore";

type AddToCartButtonProps = {
  productId: string;
  name: string;
  unitPriceCents: number;
  deliveryType: DeliveryType;
  materialClass: MaterialClass;
};

export function AddToCartButton({
  productId,
  name,
  unitPriceCents,
  deliveryType,
  materialClass,
}: AddToCartButtonProps) {
  const addItem = useCartStore((state) => state.addItem);
  const [isSubmitting, setIsSubmitting] = useState(false);

  return (
    <Button
      className="mt-3 w-full"
      size="sm"
      disabled={isSubmitting}
      onClick={async () => {
        setIsSubmitting(true);
        await addItem({
          id: productId,
          name,
          quantity: 1,
          unitPriceCents,
          deliveryType,
          materialClass,
        });
        setIsSubmitting(false);
      }}
    >
      {isSubmitting ? "Adding..." : "Add to Cart"}
    </Button>
  );
}
