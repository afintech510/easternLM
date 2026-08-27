/**
 * Audience engine — resolves filter criteria into customer lists.
 */

import type { SupabaseClient } from "@supabase/supabase-js";

export type AudienceFilter = {
  tags_include?: string[]; // customer must have ALL of these tags
  tags_include_any?: string[]; // customer must have AT LEAST ONE of these tags
  tags_exclude?: string[];
  min_orders?: number;
  max_orders?: number;
  min_spent_cents?: number;
  last_order_after?: string;
  last_order_before?: string;
  towns?: string[];
  has_phone?: boolean;
  has_email?: boolean;
};

type CustomerRow = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  email: string | null;
  city: string | null;
  tags: string[];
  total_orders: number;
  total_spent_cents: number;
  last_order_at: string | null;
  opted_in_sms: boolean;
  opted_in_email: boolean;
};

const EXCLUDED_PHONES = new Set(["6318746244", "6313958283"]);

function resolveRelativeDate(value: string): string {
  if (!value.startsWith("RELATIVE:")) return value;
  const match = value.match(/RELATIVE:-(\d+)(months|days|years)/);
  if (!match) return value;
  const [, amount, unit] = match;
  const d = new Date();
  if (unit === "months") d.setMonth(d.getMonth() - Number(amount));
  else if (unit === "days") d.setDate(d.getDate() - Number(amount));
  else if (unit === "years") d.setFullYear(d.getFullYear() - Number(amount));
  return d.toISOString();
}

export async function resolveAudience(
  supabase: SupabaseClient,
  filter: AudienceFilter,
  channel: "sms" | "email" | "both" = "both",
): Promise<{ customers: CustomerRow[]; count: number }> {
  let query = supabase
    .from("customers")
    .select("id, first_name, last_name, phone, email, city, tags, total_orders, total_spent_cents, last_order_at, opted_in_sms, opted_in_email");

  // Contact info filters
  if (filter.has_phone) query = query.not("phone", "is", null);
  if (filter.has_email) query = query.not("email", "is", null);

  // Order count
  if (filter.min_orders != null) query = query.gte("total_orders", filter.min_orders);
  if (filter.max_orders != null) query = query.lte("total_orders", filter.max_orders);

  // Spend
  if (filter.min_spent_cents != null) query = query.gte("total_spent_cents", filter.min_spent_cents);

  // Date filters
  if (filter.last_order_after) {
    query = query.gte("last_order_at", resolveRelativeDate(filter.last_order_after));
  }
  if (filter.last_order_before) {
    query = query.lte("last_order_at", resolveRelativeDate(filter.last_order_before));
  }

  // Tags include (customer must have ALL of these tags)
  if (filter.tags_include?.length) {
    query = query.contains("tags", filter.tags_include);
  }

  // Tags include ANY (customer must have at least ONE of these tags)
  if (filter.tags_include_any?.length) {
    query = query.overlaps("tags", filter.tags_include_any);
  }

  const { data, error } = await query.order("last_order_at", { ascending: false }).limit(5000);

  if (error || !data) return { customers: [], count: 0 };

  // Post-filter: tags_exclude, towns, opt-outs, excluded phones
  let customers = data as CustomerRow[];

  // Tags exclude
  if (filter.tags_exclude?.length) {
    const exclude = new Set(filter.tags_exclude);
    customers = customers.filter((c) => !c.tags.some((t) => exclude.has(t)));
  }

  // Towns (match by city, case-insensitive)
  if (filter.towns?.length) {
    const townSet = new Set(filter.towns.map((t) => t.toLowerCase().replace(/-/g, " ")));
    customers = customers.filter((c) => c.city && townSet.has(c.city.toLowerCase()));
  }

  // Opt-out filtering based on channel
  if (channel === "sms" || channel === "both") {
    customers = customers.filter((c) => c.opted_in_sms !== false || channel === "both");
  }
  if (channel === "email" || channel === "both") {
    customers = customers.filter((c) => c.opted_in_email !== false || channel === "both");
  }

  // Exclude yard's own numbers
  customers = customers.filter((c) => !c.phone || !EXCLUDED_PHONES.has(c.phone));

  return { customers, count: customers.length };
}

export async function previewAudience(
  supabase: SupabaseClient,
  filter: AudienceFilter,
): Promise<{ count: number; sample: CustomerRow[]; smsFriendly: number; emailFriendly: number }> {
  const { customers, count } = await resolveAudience(supabase, filter);
  return {
    count,
    sample: customers.slice(0, 10),
    smsFriendly: customers.filter((c) => c.phone && c.opted_in_sms !== false).length,
    emailFriendly: customers.filter((c) => c.email && c.opted_in_email !== false).length,
  };
}
