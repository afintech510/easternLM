"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { ConfirmationView } from "@/components/bulk-app/confirmation-view";
import { useBulkOrderStore } from "@/stores/bulk-order-store";
import { Loader2 } from "lucide-react";

/**
 * Client component that reads session_id from URL params.
 * Spec §6.3, §9
 */
export function ConfirmationClient() {
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

    clearOrder();

    setOrderData({
      orderNumber: `ELM-${sessionId.slice(-8).toUpperCase()}`,
      deliveryDate: "To be confirmed",
      deliveryAddress: "Address on file",
      totalCents: 0,
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
        <p className="text-sm text-bulk-muted">
          No order found.{" "}
          <a href="/app" className="text-bulk-sage hover:underline">
            Return to catalog
          </a>
        </p>
      </div>
    );
  }

  return <ConfirmationView {...orderData} />;
}
