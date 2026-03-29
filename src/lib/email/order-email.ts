import { Resend } from "resend";
import type { Database } from "@/types/database";

type OrderRow = Database["public"]["Tables"]["orders"]["Row"];
type OrderItemRow = Database["public"]["Tables"]["order_items"]["Row"];
type DeliveryScheduleEntry = {
  day?: number;
  truckName?: string;
  materialClass?: string;
  quantity?: number;
  feeCents?: number;
};

const YARD_ADDRESS = "110 Frowein Road, Center Moriches, NY 11934";

function formatUsd(cents: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(cents / 100);
}

function formatMiles(distanceMeters?: number | null) {
  if (typeof distanceMeters !== "number" || !Number.isFinite(distanceMeters) || distanceMeters <= 0) {
    return null;
  }

  const miles = distanceMeters / 1609.344;
  return `${miles.toFixed(1)} miles`;
}

function formatDuration(durationSeconds?: number | null) {
  if (typeof durationSeconds !== "number" || !Number.isFinite(durationSeconds) || durationSeconds <= 0) {
    return null;
  }

  const totalMinutes = Math.round(durationSeconds / 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours > 0 && minutes > 0) {
    return `${hours}h ${minutes}m`;
  }

  if (hours > 0) {
    return `${hours}h`;
  }

  return `${minutes}m`;
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatConstraintLabel(key: string) {
  switch (key) {
    case "lowWires":
      return "Low wires";
    case "narrowDriveway":
      return "Narrow driveway";
    case "softGround":
      return "Soft ground";
    case "gated":
      return "Gated access";
    case "steep":
      return "Steep approach";
    case "notes":
      return "Notes";
    default:
      return key;
  }
}

function buildAccessConstraintList(accessConstraints: unknown) {
  if (!accessConstraints || typeof accessConstraints !== "object") {
    return [] as string[];
  }

  const entries = Object.entries(accessConstraints as Record<string, unknown>);
  const notes = entries
    .filter(([key]) => key === "notes")
    .map(([, value]) => String(value ?? "").trim())
    .filter(Boolean);

  const activeFlags = entries
    .filter(([key, value]) => key !== "notes" && value === true)
    .map(([key]) => formatConstraintLabel(key));

  return [...activeFlags, ...notes.map((note) => `Notes: ${note}`)];
}

function parseDeliverySchedule(deliverySchedule: unknown) {
  if (!Array.isArray(deliverySchedule)) {
    return [] as DeliveryScheduleEntry[];
  }

  return deliverySchedule
    .map((entry) => (typeof entry === "object" && entry ? (entry as DeliveryScheduleEntry) : null))
    .filter((entry): entry is DeliveryScheduleEntry => entry !== null)
    .sort((a, b) => (a.day ?? 0) - (b.day ?? 0));
}

export async function sendOrderConfirmationEmail(input: {
  order: OrderRow;
  items: OrderItemRow[];
}) {
  const apiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.RESEND_FROM_EMAIL;

  if (!apiKey || !fromEmail) {
    return { sent: false, reason: "Missing Resend configuration." as const };
  }

  const resend = new Resend(apiKey);
  const { order, items } = input;

  const itemRows = items
    .map(
      (item) =>
        `<tr>
          <td style="padding:6px 8px;border-bottom:1px solid #e5e7eb;">${escapeHtml(item.product_name)}</td>
          <td style="padding:6px 8px;border-bottom:1px solid #e5e7eb;">${item.quantity} ${escapeHtml(item.unit)}</td>
          <td style="padding:6px 8px;border-bottom:1px solid #e5e7eb;">${formatUsd(item.line_subtotal_cents)}</td>
        </tr>`,
    )
    .join("");

  const scheduleEntries = parseDeliverySchedule(order.delivery_schedule);
  const deliveryScheduleList = scheduleEntries
    .map((entry) => {
      const dayLabel = entry.day ? `Day ${entry.day}` : "Day";
      const truck = entry.truckName ? escapeHtml(entry.truckName) : "Truck";
      const material = entry.materialClass ? `, ${escapeHtml(entry.materialClass)}` : "";
      const quantity = typeof entry.quantity === "number" ? `, qty ${entry.quantity}` : "";
      const fee = typeof entry.feeCents === "number" ? formatUsd(entry.feeCents) : "-";
      return `<li>${dayLabel}: ${truck}${material}${quantity} (${fee})</li>`;
    })
    .join("");

  const distanceLabel = formatMiles(order.distance_meters);
  const durationLabel = formatDuration(order.duration_seconds);
  const routeSummary =
    distanceLabel || durationLabel
      ? `Distance from yard: ${distanceLabel ?? "n/a"}${durationLabel ? ` (about ${durationLabel})` : ""}`
      : null;

  const accessConstraints = buildAccessConstraintList(order.access_constraints);
  const accessConstraintsList = accessConstraints.map((entry) => `<li>${escapeHtml(entry)}</li>`).join("");

  const html = `
    <div style="font-family:Arial,sans-serif;line-height:1.45;color:#111827;">
      <h2 style="margin:0 0 12px;">Order Confirmation</h2>
      <p style="margin:0 0 6px;">Order ID: <strong>${order.id}</strong></p>
      <p style="margin:0 0 6px;">Status: <strong>${order.status}</strong></p>
      <p style="margin:0 0 6px;">Customer: <strong>${escapeHtml(order.customer_name)}</strong></p>
      <p style="margin:0 0 12px;">Delivery Method: <strong>${order.delivery_method}</strong></p>

      <h3 style="margin:16px 0 8px;">Items</h3>
      <table style="width:100%;border-collapse:collapse;font-size:14px;">
        <thead>
          <tr>
            <th style="text-align:left;padding:6px 8px;border-bottom:2px solid #d1d5db;">Product</th>
            <th style="text-align:left;padding:6px 8px;border-bottom:2px solid #d1d5db;">Qty</th>
            <th style="text-align:left;padding:6px 8px;border-bottom:2px solid #d1d5db;">Line Total</th>
          </tr>
        </thead>
        <tbody>
          ${itemRows}
        </tbody>
      </table>

      <h3 style="margin:16px 0 8px;">Fees</h3>
      <ul style="padding-left:18px;margin:0 0 12px;">
        <li>Materials: ${formatUsd(order.materials_subtotal_cents)}</li>
        <li>Delivery total: ${formatUsd(order.delivery_total_cents)}</li>
        <li>First load fee: ${formatUsd(order.first_load_fee_cents ?? 0)}</li>
        <li>Additional load fee: ${formatUsd(order.additional_load_fee_cents ?? 0)}</li>
        ${routeSummary ? `<li>${routeSummary}</li>` : ""}
        <li>Tax: ${formatUsd(order.tax_cents)}</li>
        <li>Credit Card Processing Fee: ${formatUsd(order.cc_surcharge_cents)}</li>
        <li><strong>Total: ${formatUsd(order.grand_total_cents)}</strong></li>
      </ul>

      ${
        deliveryScheduleList
          ? `<h3 style="margin:16px 0 8px;">Delivery Schedule</h3><ul style="padding-left:18px;margin:0 0 12px;">${deliveryScheduleList}</ul>`
          : ""
      }

      ${
        accessConstraintsList
          ? `<h3 style="margin:16px 0 8px;">Access Constraints</h3><ul style="padding-left:18px;margin:0 0 12px;">${accessConstraintsList}</ul>`
          : ""
      }

      ${
        order.delivery_address
          ? `<p style="margin:0 0 4px;">Delivery Address: ${escapeHtml(order.delivery_address)}</p>`
          : `<p style="margin:0 0 4px;">Pickup Address: ${escapeHtml(YARD_ADDRESS)}</p>`
      }
    </div>
  `;

  if (!order.customer_email) {
    return { sent: false, reason: "No customer email" as const };
  }

  try {
    await resend.emails.send({
      from: fromEmail,
      to: order.customer_email,
      subject: `Order Confirmation - ${order.id}`,
      html,
    });

    return { sent: true as const };
  } catch (error) {
    console.error("[order-email] Failed to send:", error instanceof Error ? error.message : error);
    return { sent: false, reason: "Resend API error" as const };
  }
}
