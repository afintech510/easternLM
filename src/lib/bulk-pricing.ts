/**
 * Variable pricing engine for the /app bulk ordering experience.
 * ALL math in integer cents. No floating point currency.
 *
 * Spec §3: Price = ceiling - floor((ceiling - floor) × min(qty×100, floorQty×100) / (floorQty×100))
 * Linear interpolation from ceiling (qty=1) to floor (qty>=floorQty).
 */

const DEFAULT_SHORTCUTS = [3, 5, 10, 15, 20];

/**
 * Calculate the per-unit price in cents for a given quantity.
 * Uses integer-only math to avoid floating point artifacts.
 * Spec §3.1
 */
export function calcPriceCents(
  qty: number,
  ceilingCents: number,
  floorCents: number,
  floorQty: number
): number {
  if (qty <= 0) return ceilingCents;
  if (qty >= floorQty) return floorCents;
  // Integer math: multiply by 100 to avoid decimals from half-yard quantities
  const effectiveQty = Math.min(Math.round(qty * 100), floorQty * 100);
  const range = ceilingCents - floorCents;
  const discount = Math.floor((range * effectiveQty) / (floorQty * 100));
  return ceilingCents - discount;
}

/**
 * Calculate line total in cents: qty × unitPriceCents.
 * Spec §3.2
 */
export function calcTotalCents(qty: number, priceCents: number): number {
  return Math.round(qty * priceCents);
}

/**
 * Calculate savings vs ceiling price at the current quantity.
 * Spec §3.3
 */
export function calcSavingsCents(
  qty: number,
  ceilingCents: number,
  currentPriceCents: number
): number {
  return Math.round(qty * ceilingCents) - Math.round(qty * currentPriceCents);
}

/**
 * Find the next shortcut quantity above the current qty.
 * Returns null if already at or above the highest shortcut.
 * Used for "Add X more to drop to $Y" nudge messaging.
 */
export function calcNextBreakpoint(
  qty: number,
  shortcuts: number[] = DEFAULT_SHORTCUTS
): { nextQty: number; addQty: number } | null {
  const sorted = [...shortcuts].sort((a, b) => a - b);
  const next = sorted.find((s) => s > qty);
  if (!next) return null;
  return { nextQty: next, addQty: Math.round((next - qty) * 10) / 10 };
}

/**
 * Validate that client-computed total matches server-computed total
 * within 0.5% tolerance. Spec §3.4
 */
export function validatePriceMatch(
  clientTotalCents: number,
  serverTotalCents: number
): boolean {
  if (serverTotalCents === 0) return clientTotalCents === 0;
  const delta = Math.abs(clientTotalCents - serverTotalCents);
  return delta / serverTotalCents <= 0.005;
}

/**
 * Verify that total(qty+step) > total(qty) for all quantities in range.
 * A valid pricing config must be monotonically increasing in total cost.
 * Spec §3.3
 */
export function assertMonotonicPricing(
  ceilingCents: number,
  floorCents: number,
  floorQty: number,
  stepQty: number = 0.5
): boolean {
  if (floorCents > ceilingCents) return false;
  if (floorQty <= 0) return false;

  let prevTotal = 0;
  for (let qty = stepQty; qty <= floorQty + stepQty; qty += stepQty) {
    const price = calcPriceCents(qty, ceilingCents, floorCents, floorQty);
    const total = calcTotalCents(qty, price);
    if (total < prevTotal) return false;
    prevTotal = total;
  }
  return true;
}
