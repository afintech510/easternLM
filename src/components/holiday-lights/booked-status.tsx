"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { trackEvent, trackMetaEvent, trackPurchase } from "@/lib/bulk-analytics";

/**
 * On the confirmation page: while the Stripe webhook hasn't landed yet, refresh a
 * few times; once reserved, fire the purchase/lights_reserved events once.
 */
export function BookedStatus({ token, reserved, depositCents }: { token: string; reserved: boolean; depositCents: number }) {
  const router = useRouter();

  useEffect(() => {
    if (reserved) {
      const key = `tt-booked-${token}`;
      try {
        if (sessionStorage.getItem(key)) return;
        sessionStorage.setItem(key, "1");
      } catch {
        /* ignore */
      }
      trackPurchase(token, depositCents, [{ id: "holiday_lights_deposit", name: "Install deposit", qty: 1 }]);
      trackEvent("lights_reserved", { value: depositCents / 100 });
      trackMetaEvent("Purchase", { value: depositCents / 100, currency: "USD" });
      return;
    }
    let n = 0;
    const id = setInterval(() => {
      n += 1;
      router.refresh();
      if (n >= 12) clearInterval(id);
    }, 3000);
    return () => clearInterval(id);
  }, [reserved, token, depositCents, router]);

  return null;
}
