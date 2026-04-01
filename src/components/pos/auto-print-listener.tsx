"use client";

/**
 * AutoPrintListener — listens for new orders via Supabase Realtime
 * and auto-prints receipts + delivery tickets through the local print server.
 *
 * Renders nothing. Mount once in the POS layout or register page.
 */

import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { printClient } from "@/lib/pos/print-client";
import { ReceiptPrinter } from "@/lib/pos/printer";
import { mapDatabaseOrderToUnified, toReceiptOrder } from "@/lib/print/order-print";

const printer = new ReceiptPrinter();

export function AutoPrintListener() {
  const processedOrders = useRef<Set<string>>(new Set());

  useEffect(() => {
    // Connect to local print server on mount
    printClient.connect();

    const supabase = getSupabaseBrowserClient();

    const channel = supabase
      .channel("pos-auto-print")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "orders" },
        async (payload) => {
          const order = payload.new as Record<string, unknown>;
          const orderId = order.id as string;

          // Don't double-print
          if (processedOrders.current.has(orderId)) return;
          processedOrders.current.add(orderId);

          // Cap the set at 500 to prevent memory leak
          if (processedOrders.current.size > 500) {
            const first = processedOrders.current.values().next().value;
            if (first) processedOrders.current.delete(first);
          }

          const source = order.source as string;
          const paymentMethod = order.payment_method as string;
          const status = order.status as string;

          // Auto-print rules:
          //   - All web orders
          //   - All COD orders
          //   - POS orders that are paid (card/cash/account) — these are already
          //     printed by afterSale(), so skip to avoid double-print
          const isPosOrder = source === "pos";
          if (isPosOrder) {
            // POS orders are printed by the register's afterSale() flow.
            // Only show a toast for non-current-register orders (e.g. web orders
            // that come in while the POS is open).
            return;
          }

          // Web orders, phone orders, quote-accepted orders — auto-print these
          const shouldAutoPrint =
            source === "web" ||
            source === "phone" ||
            source === "quote" ||
            paymentMethod === "cod";

          if (!shouldAutoPrint) return;

          // Wait for order_items to be inserted (they come after the order row)
          await new Promise((r) => setTimeout(r, 2500));

          // Fetch the full order with items
          const { data: fullOrder, error } = await supabase
            .from("orders")
            .select("*, order_items(*)")
            .eq("id", orderId)
            .single();

          if (error || !fullOrder) {
            console.error("[AutoPrint] Failed to fetch order:", error?.message);
            return;
          }

          // Check print server
          if (!printClient.isConnected) {
            const name = (fullOrder.customer_name as string) || "Unknown";
            toast.warning(
              `New ${source} order from ${name} — printer offline, reprint from Transactions`,
              { duration: 10000 }
            );
            return;
          }

          const printOrder = mapDatabaseOrderToUnified(fullOrder);
          const receiptOrder = toReceiptOrder(printOrder);

          try {
            // 1. Customer receipt + first delivery ticket
            await printer.printOrderDocuments(receiptOrder, orderId);

            // 2. Second delivery ticket copy (dispatch board)
            if (
              fullOrder.delivery_method === "delivery" &&
              fullOrder.delivery_address
            ) {
              await new Promise((r) => setTimeout(r, 800));
              await printer.printDeliveryTicketOnly(receiptOrder, orderId);
            }

            // Toast
            const sourceLabel =
              source === "web" ? "Web" : source === "phone" ? "Phone" : source === "quote" ? "Quote" : source;
            const name = (fullOrder.customer_name as string) || "Customer";
            const total = ((fullOrder.grand_total_cents as number) / 100).toFixed(2);
            toast.success(
              `${sourceLabel} order auto-printed: ${name} — $${total}`,
              { duration: 6000 }
            );
          } catch (err) {
            console.error("[AutoPrint] Print failed:", err);
            const name = (fullOrder.customer_name as string) || "Customer";
            toast.error(
              `Auto-print failed for ${name} — reprint from Transactions`,
              { duration: 10000 }
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return null;
}
