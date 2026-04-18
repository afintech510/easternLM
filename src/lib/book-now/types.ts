/** Types for the Book-a-Crew Smart Quote builder */

export type InstantBookService = {
  id: string;
  slug: string;
  name: string;
  tagline: string | null;
  description: string | null;
  icon: string | null;
  category: string;
  is_active: boolean;
  sort_order: number;
  season_start_month: number | null;
  season_end_month: number | null;
  /** Pricing rates — adjustable by admin, consumed by src/lib/book-now/pricing.ts */
  pricing: ServicePricing;
};

export type ServicePricing = {
  /** Base/flat fee in cents (truck roll, minimum charge, etc.) */
  base_cents: number;
  /** Per-unit rate in cents (per bed, per sq ft, per linear ft, etc.) — null if not applicable */
  per_unit_cents?: number | null;
  /** Minimum total charge */
  min_total_cents?: number | null;
  /** Flat price for a fixed package (used when inputs don't scale, e.g. "Full day cleanup") */
  flat_cents?: number | null;
  /** Optional: fixed "tiers" keyed by input option value (e.g. yard_size band) */
  tiers?: Record<string, number> | null;
};

export type QuoteLineItem = {
  serviceSlug: string;
  serviceName: string;
  inputs: Record<string, string | number>;
  subtotalCents: number;
};

export type PropertyInfo = {
  address: string;
  lotSize: "under_quarter" | "quarter_half" | "half_one" | "over_one";
};

export type TimelineOption = "rush_48h" | "this_week" | "two_weeks" | "flexible";

export const TIMELINE_CONFIG: Record<TimelineOption, { label: string; days: string; multiplier: number }> = {
  rush_48h:   { label: "In 48 hours",  days: "0–2 days",   multiplier: 1.25 },
  this_week:  { label: "This week",    days: "3–7 days",   multiplier: 1.10 },
  two_weeks:  { label: "Next 2 weeks", days: "8–14 days",  multiplier: 1.00 },
  flexible:   { label: "Flexible",     days: "2–4 weeks",  multiplier: 0.92 },
};

export const TIMELINE_ORDER: TimelineOption[] = ["rush_48h", "this_week", "two_weeks", "flexible"];

export type Quote = {
  property: PropertyInfo;
  timeline: TimelineOption;
  items: QuoteLineItem[];
  subtotalCents: number;      // sum of all items
  timelineMultiplier: number; // 0.92 / 1.00 / 1.10 / 1.25
  adjustedSubtotalCents: number; // subtotal × multiplier
  totalCents: number;         // final (same as adjusted for now; CC surcharge added at checkout)
};

export type BookingRequest = {
  quote: Quote;
  customer: {
    name: string;
    email: string;
    phone: string;
  };
  preferredDate?: string;
  notes?: string;
  paymentMethodId: string;
  termsAccepted: boolean;
};
