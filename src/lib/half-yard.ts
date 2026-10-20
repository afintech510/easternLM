/**
 * Half-yard pricing — calculates line totals with a per-product adder
 * that applies when the POS order quantity includes a half yard (.5).
 *
 * The adder is a FLAT FEE per line item (not per half-yard), applied once
 * whenever quantity % 1 !== 0.
 */

/**
 * Calculate line total including half-yard adder when applicable.
 *
 * @param quantity        e.g. 2.5
 * @param unitPriceCents  price per full yard in cents, e.g. 3500
 * @param halfYardAdderCents  extra charge when qty has .5, e.g. 500
 * @param halfYardEnabled     whether this product supports half-yard pricing
 */
export function calculateLineTotal(
  quantity: number,
  unitPriceCents: number,
  halfYardAdderCents: number = 0,
  halfYardEnabled: boolean = false,
): number {
  const baseTotal = Math.round(quantity * unitPriceCents);
  const adder = halfYardEnabled && quantity % 1 !== 0 ? halfYardAdderCents : 0;
  return baseTotal + adder;
}

type HalfYardCustomer = {
  first_name?: string | null;
  last_name?: string | null;
  company_name?: string | null;
  charge_account_name?: string | null;
  tags?: string[] | null;
};

/**
 * Customers who never pay the half-yard adder: GP Landscape (by name — they
 * have more than one customer record), or anyone tagged `no-half-yard-fee`.
 */
export function waivesHalfYardFee(customer: HalfYardCustomer | null | undefined): boolean {
  if (!customer) return false;
  if (customer.tags?.includes("no-half-yard-fee")) return true;
  const name = [customer.charge_account_name, customer.company_name, customer.first_name, customer.last_name]
    .filter(Boolean)
    .join(" ");
  return /\bgp\s+landscap/i.test(name);
}

/** Returns true if the quantity has a fractional (.5) component. */
export function isHalfYardQty(quantity: number): boolean {
  return quantity % 1 !== 0;
}
