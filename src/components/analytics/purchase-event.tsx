"use client";

import { useEffect, useRef } from "react";
import { trackPurchase } from "@/lib/bulk-analytics";

type Props = {
  orderId: string;
  valueCents: number;
  items: Array<{ id: string; name: string; qty: number }>;
};

export function PurchaseEvent({ orderId, valueCents, items }: Props) {
  const fired = useRef(false);

  useEffect(() => {
    if (fired.current) return;
    fired.current = true;
    trackPurchase(orderId, valueCents, items);
  }, [orderId, valueCents, items]);

  return null;
}
