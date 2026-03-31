/**
 * Coverage calculator for the /app bulk ordering experience.
 * Converts between cubic yards and square feet at a given depth.
 *
 * Spec Section 4: 1 cubic yard = 27 cubic feet.
 * At depth D inches, coverage = yards × 27 × (12 / D) sq ft.
 */

/**
 * How many square feet does `yards` cubic yards cover at `depthInches` deep?
 */
export function calcCoverageSqFt(yards: number, depthInches: number): number {
  if (depthInches <= 0 || yards <= 0) return 0;
  return Math.round((yards * 27 * 12) / depthInches);
}
