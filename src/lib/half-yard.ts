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

/** Returns true if the quantity has a fractional (.5) component. */
export function isHalfYardQty(quantity: number): boolean {
  return quantity % 1 !== 0;
}
