import { getSupabaseAdminClient } from "@/lib/supabase/admin";

/**
 * Normalize phone to 10-digit string (strip +1, spaces, dashes, parens)
 */
export function normalizePhone(phone: string | null | undefined): string | null {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 11 && digits.startsWith("1")) return digits.slice(1);
  if (digits.length === 10) return digits;
  return digits || null;
}

/**
 * Extract first name from full name
 */
export function extractFirstName(fullName: string): string {
  return fullName.trim().split(/\s+/)[0] ?? fullName;
}

/**
 * Extract last name from full name
 */
export function extractLastName(fullName: string): string {
  const parts = fullName.trim().split(/\s+/);
  return parts.length > 1 ? parts.slice(1).join(" ") : "";
}

/**
 * Extract city from a delivery address string like "123 Main St, Patchogue, NY 11772"
 */
export function extractCity(address: string | null): string | null {
  if (!address) return null;
  const parts = address.split(",").map((p) => p.trim());
  // Usually: street, city, state zip
  if (parts.length >= 2) return parts[1]?.replace(/\s+(NY|New York)\s*\d*/i, "").trim() || null;
  return null;
}

/**
 * Tags that are set by import/payment-method/opt-in and are NOT derivable
 * from purchase behavior — they must be preserved across tag recomputes,
 * otherwise placing a new order would wipe them.
 */
const STICKY_TAGS = ["account-customer", "cod-customer", "newsletter-subscriber", "salt-buyer", "paver-buyer"];

/**
 * Decide whether a customer looks like a contractor from real signals.
 * Shared by live per-order tagging and the backfill script so the rule
 * stays in one place. A billing company name alone is a strong signal;
 * so is a charge account, sustained order frequency at spend, or buying
 * both masonry and gravel materials (a job-site pattern, not a homeowner).
 */
export function deriveContractorTag(input: {
  tags: string[];
  companyName?: string | null;
  isChargeAccount?: boolean | null;
  totalOrders: number;
  totalSpentCents: number;
}): boolean {
  const has = (t: string) => input.tags.includes(t);
  if (input.isChargeAccount) return true;
  if (has("account-customer")) return true;
  if (input.companyName && input.companyName.trim().length > 1) return true;
  if (input.totalOrders >= 5 && input.totalSpentCents >= 100000) return true;
  if (has("mason-buyer") && has("gravel-buyer")) return true;
  return false;
}

/**
 * Find or create a customer from order data. Returns the customer ID.
 * Matches by phone (primary) then email. Creates if no match found.
 */
export async function ensureCustomerForOrder(order: {
  customer_name: string;
  customer_email: string | null;
  customer_phone: string | null;
  delivery_address?: string | null;
  delivery_zip?: string | null;
  sms_opt_in?: boolean;
  placed_at?: string;
}): Promise<string | null> {
  const supabase = getSupabaseAdminClient() as any;
  const phone = normalizePhone(order.customer_phone);

  // 1. Try to find by phone
  let customerId: string | null = null;
  if (phone) {
    const { data } = await supabase
      .from("customers")
      .select("id")
      .eq("phone", phone)
      .maybeSingle();
    if (data) customerId = data.id;
  }

  // 2. Try to find by email
  if (!customerId && order.customer_email) {
    const { data } = await supabase
      .from("customers")
      .select("id")
      .eq("email", order.customer_email.toLowerCase())
      .maybeSingle();
    if (data) customerId = data.id;
  }

  // 3. Create new customer if not found
  if (!customerId) {
    const { data } = await supabase
      .from("customers")
      .insert({
        first_name: extractFirstName(order.customer_name),
        last_name: extractLastName(order.customer_name),
        email: order.customer_email?.toLowerCase() ?? null,
        phone,
        address: order.delivery_address ?? null,
        city: extractCity(order.delivery_address ?? null),
        zip: order.delivery_zip ?? null,
        source: "web_order",
        tags: [],
        total_orders: 0,
        total_spent_cents: 0,
        first_order_at: order.placed_at ?? new Date().toISOString(),
        opted_in_email: false,
        opted_in_sms: order.sms_opt_in ?? false,
      })
      .select("id")
      .single();
    if (data) customerId = data.id;
  }

  return customerId;
}

/**
 * Link a customer to an order and update customer stats.
 * Call this after an order is paid.
 */
export async function linkCustomerToOrder(orderId: string, customerId: string): Promise<void> {
  const supabase = getSupabaseAdminClient() as any;

  // Link order to customer
  await supabase.from("orders").update({ customer_id: customerId }).eq("id", orderId);

  // Update stats
  await updateCustomerStats(customerId);
}

/**
 * Recompute customer stats from all orders (new + legacy).
 * Updates total_orders, total_spent_cents, last_order_at, and tags.
 */
export async function updateCustomerStats(customerId: string): Promise<void> {
  const supabase = getSupabaseAdminClient() as any;

  // Count new system orders
  const { count: newOrderCount } = await supabase
    .from("orders")
    .select("id", { count: "exact", head: true })
    .eq("customer_id", customerId)
    .in("status", ["paid", "processing", "scheduled", "delivered"]);

  // Sum new system revenue
  const { data: newOrders } = await supabase
    .from("orders")
    .select("grand_total_cents")
    .eq("customer_id", customerId)
    .in("status", ["paid", "processing", "scheduled", "delivered"]);

  // Count legacy orders
  const { count: legacyCount } = await supabase
    .from("order_history")
    .select("id", { count: "exact", head: true })
    .eq("customer_id", customerId);

  // Sum legacy revenue
  const { data: legacyOrders } = await supabase
    .from("order_history")
    .select("order_total_cents")
    .eq("customer_id", customerId);

  const totalOrders = (newOrderCount ?? 0) + (legacyCount ?? 0);
  const newSpent = (newOrders ?? []).reduce((s: number, o: any) => s + (o.grand_total_cents ?? 0), 0);
  const legacySpent = (legacyOrders ?? []).reduce((s: number, o: any) => s + (o.order_total_cents ?? 0), 0);
  const totalSpent = newSpent + legacySpent;

  // Load customer context (needed for contractor derivation + sticky tags)
  const { data: customer } = await supabase
    .from("customers")
    .select("is_charge_account, company_name, source, tags")
    .eq("id", customerId)
    .single();

  // Compute tags from order items + preserve sticky/import tags
  const tags = await computeCustomerTags(customerId, totalOrders, totalSpent, {
    existingTags: (customer?.tags as string[]) ?? [],
    companyName: customer?.company_name ?? null,
    isChargeAccount: customer?.is_charge_account ?? null,
  });

  let customerType = "homeowner";
  if (customer?.is_charge_account && customer?.company_name) customerType = "business";
  else if (customer?.is_charge_account || tags.includes("contractor")) customerType = "contractor";
  else if (customer?.source === "service_lead" && totalOrders === 0) customerType = "service_lead";

  await supabase
    .from("customers")
    .update({
      total_orders: totalOrders,
      total_spent_cents: totalSpent,
      last_order_at: new Date().toISOString(),
      tags,
      customer_type: customerType,
    })
    .eq("id", customerId);
}

/**
 * Auto-tag customers based on their purchase behavior.
 */
async function computeCustomerTags(
  customerId: string,
  totalOrders: number,
  totalSpent: number,
  context: { existingTags: string[]; companyName: string | null; isChargeAccount: boolean | null } = {
    existingTags: [],
    companyName: null,
    isChargeAccount: null,
  },
): Promise<string[]> {
  const tags: string[] = [];

  // Preserve import/payment/opt-in tags that behavior can't re-derive
  for (const t of context.existingTags) {
    if (STICKY_TAGS.includes(t)) tags.push(t);
  }

  if (totalOrders >= 3) tags.push("repeat");
  if (totalSpent >= 100000) tags.push("high-value"); // $1000+

  // Product-based tags from order items
  const supabase = getSupabaseAdminClient() as any;
  const { data: items } = await supabase
    .from("order_items")
    .select("product_name")
    .in(
      "order_id",
      (await supabase.from("orders").select("id").eq("customer_id", customerId)).data?.map((o: any) => o.id) ?? [],
    );

  if (items?.length) {
    const names = (items as any[]).map((i) => (i.product_name ?? "").toLowerCase()).join(" ");
    if (/mulch/i.test(names)) tags.push("mulch-buyer");
    if (/gravel|stone|bluestone|crushed/i.test(names)) tags.push("gravel-buyer");
    if (/mason|mortar|cement|concrete|rebar/i.test(names)) tags.push("mason-buyer");
    if (/topsoil|compost|fill/i.test(names)) tags.push("topsoil-buyer");
    if (/sand/i.test(names)) tags.push("sand-buyer");
    if (/paver|cambridge|nicolock/i.test(names)) tags.push("paver-buyer");
  }

  // Also check legacy order_history
  const { data: legacyItems } = await supabase
    .from("order_history")
    .select("items")
    .eq("customer_id", customerId)
    .limit(50);

  if (legacyItems?.length) {
    const allItems = (legacyItems as any[])
      .flatMap((o) => (Array.isArray(o.items) ? o.items : []))
      .map((i: any) => (i.name ?? i.product_name ?? "").toLowerCase())
      .join(" ");
    if (/mulch/i.test(allItems) && !tags.includes("mulch-buyer")) tags.push("mulch-buyer");
    if (/gravel|stone|crushed/i.test(allItems) && !tags.includes("gravel-buyer")) tags.push("gravel-buyer");
    if (/mason|mortar|cement/i.test(allItems) && !tags.includes("mason-buyer")) tags.push("mason-buyer");
  }

  // Contractor derivation (depends on tags computed above + customer context)
  if (
    deriveContractorTag({
      tags,
      companyName: context.companyName,
      isChargeAccount: context.isChargeAccount,
      totalOrders,
      totalSpentCents: totalSpent,
    })
  ) {
    tags.push("contractor");
  }

  return [...new Set(tags)]; // deduplicate
}
