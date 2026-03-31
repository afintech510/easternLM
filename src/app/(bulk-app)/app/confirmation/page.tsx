"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { ConfirmationView } from "@/components/bulk-app/confirmation-view";
import { useBulkOrderStore } from "@/stores/bulk-order-store";
import { Loader2 } from "lucide-react";

/**
 * /app/confirmation — Post-Purchase Confirmation + Upsell
 * Reads session_id from URL to verify Stripe payment.
 * Spec §6.3, §9
 */
export default function BulkConfirmationPage() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session_id");
  const clearOrder = useBulkOrderStore((s) => s.clearOrder);

  const [orderData, setOrderData] = useState<{
    orderNumber: string;
    deliveryDate: string;
    deliveryAddress: string;
    totalCents: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!sessionId) {
      setLoading(false);
      return;
    }

    // Clear the cart after successful purchase
    clearOrder();

    // For now, show a generic confirmation.
    // Phase 04+ will verify the Stripe session and pull real order data.
    setOrderData({
      orderNumber: `ELM-${sessionId.slice(-8).toUpperCase()}`,
      deliveryDate: "To be confirmed",
      deliveryAddress: "Address on file",
      totalCents: 0, // Will be populated from Stripe session in Phase 04
    });
    setLoading(false);
  }, [sessionId, clearOrder]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="size-6 animate-spin text-bulk-sage" />
      </div>
    );
  }

  if (!orderData) {
    return (
      <div className="flex min-h-screen items-center justify-center px-6">
        <p className="text-sm text-bulk-muted">No order found. <a href="/app" className="text-bulk-sage hover:underline">Return to catalog</a></p>
      </div>
    );
  }

  return <ConfirmationView {...orderData} />;
}
