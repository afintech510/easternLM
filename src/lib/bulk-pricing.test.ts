import {
  calcPriceCents,
  calcTotalCents,
  calcSavingsCents,
  calcNextBreakpoint,
  validatePriceMatch,
  assertMonotonicPricing,
} from "@/lib/bulk-pricing";

// ── calcPriceCents ───────────────────────────────────────────────

describe("calcPriceCents", () => {
  // Jet Black Mulch: ceiling=$34, floor=$28, floorQty=20
  const ceiling = 3400;
  const floor = 2800;
  const floorQty = 20;

  test("qty=0 returns ceiling", () => {
    expect(calcPriceCents(0, ceiling, floor, floorQty)).toBe(3400);
  });

  test("qty=1 returns near-ceiling (small discount)", () => {
    const price = calcPriceCents(1, ceiling, floor, floorQty);
    expect(price).toBeLessThanOrEqual(ceiling);
    expect(price).toBeGreaterThan(floor);
  });

  test("qty=floorQty returns floor", () => {
    expect(calcPriceCents(20, ceiling, floor, floorQty)).toBe(2800);
  });

  test("qty > floorQty still returns floor", () => {
    expect(calcPriceCents(50, ceiling, floor, floorQty)).toBe(2800);
    expect(calcPriceCents(100, ceiling, floor, floorQty)).toBe(2800);
  });

  test("midpoint interpolation is correct", () => {
    const midPrice = calcPriceCents(10, ceiling, floor, floorQty);
    // At qty=10 out of 20, roughly halfway → ~$31
    expect(midPrice).toBeGreaterThan(floor);
    expect(midPrice).toBeLessThan(ceiling);
    // Should be approximately 3100 (halfway between 2800 and 3400)
    expect(Math.abs(midPrice - 3100)).toBeLessThan(50);
  });

  test("half-yard quantities work (no floating point errors)", () => {
    const p1 = calcPriceCents(5.5, ceiling, floor, floorQty);
    const p2 = calcPriceCents(5.0, ceiling, floor, floorQty);
    const p3 = calcPriceCents(6.0, ceiling, floor, floorQty);
    // 5.5 should be between 5 and 6
    expect(p1).toBeLessThanOrEqual(p2);
    expect(p1).toBeGreaterThanOrEqual(p3);
  });

  test("returns integer (no fractional cents)", () => {
    for (let qty = 0.5; qty <= 25; qty += 0.5) {
      const price = calcPriceCents(qty, ceiling, floor, floorQty);
      expect(price).toBe(Math.floor(price));
    }
  });

  // Test with Topsoil: ceiling=$25, floor=$18, floorQty=20
  test("Topsoil pricing at various quantities", () => {
    expect(calcPriceCents(1, 2500, 1800, 20)).toBeGreaterThan(1800);
    expect(calcPriceCents(20, 2500, 1800, 20)).toBe(1800);
    expect(calcPriceCents(10, 2500, 1800, 20)).toBeLessThan(2500);
  });
});

// ── calcTotalCents ───────────────────────────────────────────────

describe("calcTotalCents", () => {
  test("5 × $34.00 = $170.00", () => {
    expect(calcTotalCents(5, 3400)).toBe(17000);
  });

  test("10 × $31.00 = $310.00", () => {
    expect(calcTotalCents(10, 3100)).toBe(31000);
  });

  test("0 qty = 0 total", () => {
    expect(calcTotalCents(0, 3400)).toBe(0);
  });

  test("half-yard: 5.5 × $32.00 = $176.00", () => {
    expect(calcTotalCents(5.5, 3200)).toBe(17600);
  });
});

// ── calcSavingsCents ─────────────────────────────────────────────

describe("calcSavingsCents", () => {
  test("no savings at ceiling price", () => {
    expect(calcSavingsCents(5, 3400, 3400)).toBe(0);
  });

  test("savings = (ceiling - current) × qty", () => {
    // 10 yds at $31 vs ceiling $34 → save $30
    expect(calcSavingsCents(10, 3400, 3100)).toBe(3000);
  });

  test("max savings at floor price", () => {
    // 20 yds at $28 vs ceiling $34 → save $120
    expect(calcSavingsCents(20, 3400, 2800)).toBe(12000);
  });
});

// ── calcNextBreakpoint ───────────────────────────────────────────

describe("calcNextBreakpoint", () => {
  test("at qty=2 → next is 3", () => {
    const bp = calcNextBreakpoint(2);
    expect(bp).toEqual({ nextQty: 3, addQty: 1 });
  });

  test("at qty=5 → next is 10", () => {
    const bp = calcNextBreakpoint(5);
    expect(bp).toEqual({ nextQty: 10, addQty: 5 });
  });

  test("at qty=7 → next is 10", () => {
    const bp = calcNextBreakpoint(7);
    expect(bp).toEqual({ nextQty: 10, addQty: 3 });
  });

  test("at qty=20 → null (at max shortcut)", () => {
    expect(calcNextBreakpoint(20)).toBeNull();
  });

  test("at qty=25 → null (above all shortcuts)", () => {
    expect(calcNextBreakpoint(25)).toBeNull();
  });

  test("custom shortcuts", () => {
    const bp = calcNextBreakpoint(4, [5, 10, 25]);
    expect(bp).toEqual({ nextQty: 5, addQty: 1 });
  });
});

// ── validatePriceMatch ───────────────────────────────────────────

describe("validatePriceMatch", () => {
  test("exact match → true", () => {
    expect(validatePriceMatch(10000, 10000)).toBe(true);
  });

  test("0.4% difference → true (within tolerance)", () => {
    // 10000 × 0.004 = 40
    expect(validatePriceMatch(10040, 10000)).toBe(true);
  });

  test("0.5% difference → true (at boundary)", () => {
    expect(validatePriceMatch(10050, 10000)).toBe(true);
  });

  test("0.6% difference → false (exceeds tolerance)", () => {
    expect(validatePriceMatch(10060, 10000)).toBe(false);
  });

  test("both zero → true", () => {
    expect(validatePriceMatch(0, 0)).toBe(true);
  });

  test("client zero, server non-zero → false", () => {
    expect(validatePriceMatch(0, 10000)).toBe(false);
  });
});

// ── assertMonotonicPricing ───────────────────────────────────────

describe("assertMonotonicPricing", () => {
  test("valid config: Jet Black Mulch → true", () => {
    expect(assertMonotonicPricing(3400, 2800, 20, 0.5)).toBe(true);
  });

  test("valid config: Topsoil → true", () => {
    expect(assertMonotonicPricing(2500, 1800, 20, 0.5)).toBe(true);
  });

  test("valid config: Crushed Whitestone → true", () => {
    expect(assertMonotonicPricing(14500, 11000, 20, 0.5)).toBe(true);
  });

  test("invalid: floor > ceiling → false", () => {
    expect(assertMonotonicPricing(2000, 5000, 20, 0.5)).toBe(false);
  });

  test("invalid: floorQty <= 0 → false", () => {
    expect(assertMonotonicPricing(3400, 2800, 0, 0.5)).toBe(false);
  });

  test("equal ceiling and floor → true (flat pricing)", () => {
    expect(assertMonotonicPricing(3000, 3000, 20, 0.5)).toBe(true);
  });

  // Test all 16 seeded product configs
  test("all seeded product configs are monotonic", () => {
    const configs = [
      [2500, 1800, 20], // Topsoil
      [3400, 2200, 20], // Compost
      [3400, 2800, 20], // Black Mulch
      [2600, 1600, 20], // Natural Mulch
      [4000, 2600, 20], // Chocolate Mulch
      [4200, 3200, 20], // Red Mulch
      [3200, 2000, 20], // RCA #1
      [2600, 1400, 20], // RCA #2
      [9000, 6500, 20], // Pea Gravel
      [9000, 6500, 20], // Wash Gravel
      [9500, 7000, 20], // Bluestone
      [14500, 11000, 20], // Whitestone
      [14500, 11000, 20], // Pocono River Rock
      [12000, 9000, 20], // Burgundy
      [6800, 4800, 20], // Concrete Sand
      [6800, 4800, 20], // Mason Sand
    ];
    for (const [ceil, floor, qty] of configs) {
      expect(assertMonotonicPricing(ceil, floor, qty, 0.5)).toBe(true);
    }
  });
});
