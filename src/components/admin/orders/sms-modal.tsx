"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { formatUsd } from "@/lib/format";
import {
  formatDeliveryDate,
  formatTimeWindow,
  formatPhone,
} from "@/lib/format-date";
import { X } from "lucide-react";
import { toast } from "sonner";

// ─── Types ────────────────────────────────────────────────────

interface SmsOrder {
  id: string;
  customer_name: string | null;
  customer_phone: string | null;
  customer_email: string | null;
  grand_total_cents: number;
  status: string;
  payment_method: string;
  delivery_method: string;
  delivery_address: string | null;
  delivery_date: string | null;
  delivery_time_window: string | null;
  delivery_notes: string | null;
  items: Array<{
    product_name: string;
    quantity: number;
    unit: string;
    delivery_type?: string;
  }>;
}

interface Props {
  order: SmsOrder;
  onClose: () => void;
}

// ─── Templates ────────────────────────────────────────────────

const GOOGLE_REVIEW_URL = "https://g.page/easternlm";

function formatAddressShort(addr: string | null): string {
  if (!addr) return "";
  return addr
    .replace(/,?\s*(USA|US|United States)\s*$/i, "")
    .replace(/\s+/g, " ")
    .trim();
}

function getItemsSummary(items: SmsOrder["items"]): string {
  return items
    .filter(
      (i) =>
        !i.product_name?.startsWith("Delivery Load") &&
        !i.product_name?.startsWith("Sales Tax") &&
        !i.product_name?.startsWith("Credit Card"),
    )
    .map((i) => {
      const unit = i.delivery_type === "bulk" ? "cu yds" : "x";
      return i.delivery_type === "bulk"
        ? `${i.quantity} ${unit} of ${i.product_name}`
        : `${i.quantity} ${unit} ${i.product_name}`;
    })
    .join("\n");
}

function getItemsCompact(items: SmsOrder["items"]): string {
  return items
    .filter(
      (i) =>
        !i.product_name?.startsWith("Delivery Load") &&
        !i.product_name?.startsWith("Sales Tax") &&
        !i.product_name?.startsWith("Credit Card"),
    )
    .map((i) => {
      return i.delivery_type === "bulk"
        ? `${i.quantity} cu yds ${i.product_name}`
        : `${i.quantity}x ${i.product_name}`;
    })
    .join(" + ");
}

type TemplateKey = "order_confirmation" | "pre_delivery" | "post_delivery_review" | "custom";

interface TemplateOption {
  key: TemplateKey;
  icon: string;
  label: string;
}

const TEMPLATES: TemplateOption[] = [
  { key: "order_confirmation", icon: "check-icon", label: "Order Confirmation" },
  { key: "pre_delivery", icon: "truck-icon", label: "Pre-Delivery Notification" },
  { key: "post_delivery_review", icon: "star-icon", label: "Post-Delivery — Thank You + Review" },
  { key: "custom", icon: "edit-icon", label: "Custom Message" },
];

function generateTemplate(key: TemplateKey, order: SmsOrder): string {
  const firstName = (order.customer_name || "").split(" ")[0] || "there";

  switch (key) {
    case "order_confirmation": {
      const items = getItemsSummary(order.items);
      const deliveryInfo =
        order.delivery_method === "delivery"
          ? `\nDelivering to:\n${formatAddressShort(order.delivery_address)}${order.delivery_date ? `\n${formatDeliveryDate(order.delivery_date)}` : ""}${order.delivery_time_window ? ` · ${formatTimeWindow(order.delivery_time_window)}` : ""}`
          : "\nPickup at yard: 110 Frowein Rd, Center Moriches";

      const paymentLine =
        order.status === "paid"
          ? `Total: ${formatUsd(order.grand_total_cents)} (paid)`
          : order.payment_method === "cod"
            ? `Amount due on delivery: ${formatUsd(order.grand_total_cents)}`
            : `Total: ${formatUsd(order.grand_total_cents)}`;

      return `Eastern LM — Order Confirmed\n\n${items}\n${deliveryInfo}\n\n${paymentLine}\n\nQuestions? (631) 874-6244`;
    }

    case "pre_delivery": {
      const items = getItemsCompact(order.items);
      return `Eastern LM — Delivery tomorrow!\n\n${items}\n${formatAddressShort(order.delivery_address)}\n${order.delivery_time_window ? formatTimeWindow(order.delivery_time_window) : "Time TBD"}\n\nOur driver will call ~30 min before arrival.\nPlease ensure driveway access is clear.\n\nQuestions? (631) 874-6244`;
    }

    case "post_delivery_review": {
      return `Eastern LM — Delivery complete!\n\nThank you for your order, ${firstName}! We hope you're happy with your materials.\n\nHelp us out with a quick Google review:\n${GOOGLE_REVIEW_URL}\n\nNeed more? Call (631) 874-6244\nOrder online: easternlm.com`;
    }

    case "custom":
      return "";
  }
}

// ─── Component ────────────────────────────────────────────────

export function SmsModal({ order, onClose }: Props) {
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateKey>("order_confirmation");
  const [messageText, setMessageText] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    setMessageText(generateTemplate(selectedTemplate, order));
  }, [selectedTemplate, order]);

  async function handleSend() {
    if (!messageText.trim()) {
      toast.error("Message cannot be empty");
      return;
    }
    if (!order.customer_phone) {
      toast.error("No phone number for this customer");
      return;
    }

    setSending(true);
    try {
      const res = await fetch("/api/admin/operations/send-sms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: order.id,
          phone: order.customer_phone,
          message: messageText,
          template: selectedTemplate,
        }),
      });

      const data = await res.json();
      if (data.ok) {
        toast.success(`SMS sent to ${formatPhone(order.customer_phone)}`);
        onClose();
      } else {
        toast.error(data.error ?? "Failed to send SMS");
      }
    } catch {
      toast.error("Failed to send SMS");
    } finally {
      setSending(false);
    }
  }

  const segments = Math.ceil(messageText.length / 160) || 1;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div
        className="bg-card rounded-xl border shadow-xl w-full max-w-lg max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b sticky top-0 bg-card z-10">
          <div>
            <h2 className="font-bold text-lg">Send SMS to {order.customer_name || "Customer"}</h2>
            <p className="text-sm text-muted-foreground">
              {order.customer_phone ? formatPhone(order.customer_phone) : "No phone"} · via RingCentral (631) 874-6244
            </p>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {/* Template selection */}
          <div className="space-y-2">
            <p className="text-sm font-medium">Select a message:</p>
            {TEMPLATES.map((tmpl) => (
              <button
                key={tmpl.key}
                onClick={() => setSelectedTemplate(tmpl.key)}
                className={`w-full text-left rounded-lg border-2 p-3 transition-colors ${
                  selectedTemplate === tmpl.key
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-muted-foreground/30"
                }`}
              >
                <p className="font-semibold text-sm">{tmpl.label}</p>
              </button>
            ))}
          </div>

          {/* Message preview / editor */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-sm font-medium">Message Preview</label>
              <span className="text-xs text-muted-foreground">
                {messageText.length} chars · {segments} SMS segment{segments !== 1 ? "s" : ""}
              </span>
            </div>
            <textarea
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              rows={8}
              className="w-full rounded-lg border p-3 text-sm font-mono bg-muted/30 resize-none"
              placeholder={selectedTemplate === "custom" ? "Type your message..." : ""}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 p-4 border-t sticky bottom-0 bg-card">
          <Button variant="outline" onClick={onClose} disabled={sending}>
            Cancel
          </Button>
          <Button
            onClick={handleSend}
            disabled={sending || !messageText.trim() || !order.customer_phone}
          >
            {sending ? "Sending..." : "Send SMS"}
          </Button>
        </div>
      </div>
    </div>
  );
}
