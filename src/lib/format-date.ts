/** "Monday, Mar 24, 2026 · 7:57 AM" */
export function formatOrderDateTime(dateStr: string): string {
  const d = new Date(dateStr);
  const day = d.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric", year: "numeric" });
  const time = d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
  return `${day} · ${time}`;
}

/** "Mon 3/24 · 7:57 AM" */
export function formatShortDateTime(dateStr: string): string {
  const d = new Date(dateStr);
  const day = d.toLocaleDateString("en-US", { weekday: "short", month: "numeric", day: "numeric" });
  const time = d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
  return `${day} · ${time}`;
}

/** "Wednesday, March 26, 2026" */
export function formatDeliveryDate(dateStr: string): string {
  const d = new Date(dateStr + (dateStr.includes("T") ? "" : "T12:00:00"));
  return d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
}

/** "Wed, Mar 26, 2026" */
export function formatShortDeliveryDate(dateStr: string): string {
  const d = new Date(dateStr + (dateStr.includes("T") ? "" : "T12:00:00"));
  return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" });
}

const TIME_WINDOW_MAP: Record<string, string> = {
  early: "Early Morning (7:00 AM – 10:00 AM)",
  morning: "Morning (7:00 AM – 10:00 AM)",
  midday: "Midday (10:00 AM – 1:00 PM)",
  afternoon: "Afternoon (1:00 PM – 5:00 PM)",
  flexible: "Flexible (7:00 AM – 5:00 PM)",
};

export function formatTimeWindow(tw: string | null | undefined): string {
  if (!tw) return "Flexible";
  return TIME_WINDOW_MAP[tw.toLowerCase()] ?? tw;
}

export function formatPhone(phone: string | null | undefined): string {
  if (!phone) return "";
  const d = phone.replace(/\D/g, "").slice(-10);
  if (d.length !== 10) return phone;
  return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
}

const PAYMENT_LABELS: Record<string, string> = {
  card_online: "Card (online)",
  card_terminal: "Card (terminal)",
  cash: "Cash",
  cod: "Cash on Delivery",
  account: "Charge Account",
  split: "Split Payment",
  paylink: "Payment Link",
};

export function formatPaymentMethod(method: string | null | undefined): string {
  if (!method) return "Card";
  return PAYMENT_LABELS[method] ?? method.replace(/_/g, " ");
}
