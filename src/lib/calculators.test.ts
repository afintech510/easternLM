import {
  cubicYards,
  drivewayCalculation,
  mulchCalculation,
  topsoilCalculation,
  baseCalculation,
  fillCalculation,
  rcaCalculation,
  sandCalculation,
  estimatePrice,
} from "@/lib/calculators";

describe("cubicYards", () => {
  test("20x10 at 3 inches = 1.85 yards", () => {
    expect(cubicYards(20, 10, 3)).toBeCloseTo(1.852, 2);
  });

  test("zero inputs return 0", () => {
    expect(cubicYards(0, 10, 3)).toBe(0);
    expect(cubicYards(20, 0, 3)).toBe(0);
    expect(cubicYards(20, 10, 0)).toBe(0);
  });

  test("negative inputs treated as 0", () => {
    expect(cubicYards(-5, 10, 3)).toBe(0);
  });

  test("NaN inputs treated as 0", () => {
    expect(cubicYards(NaN, 10, 3)).toBe(0);
  });

  test("large area", () => {
    expect(cubicYards(100, 50, 6)).toBeCloseTo(92.59, 1);
  });
});

describe("drivewayCalculation", () => {
  test("50ft x 12ft driveway with 4in base + 2in surface", () => {
    const result = drivewayCalculation({ lengthFt: 50, widthFt: 12, baseDepthInches: 4, surfaceDepthInches: 2 });
    expect(result.baseYards).toBeGreaterThan(0);
    expect(result.surfaceYards).toBeGreaterThan(0);
    expect(result.totalYards).toBe(result.baseYards + result.surfaceYards);
    expect(result.baseMaterial).toBe("State Grade RCA");
  });

  test("base includes 10% compaction factor", () => {
    const result = drivewayCalculation({ lengthFt: 27, widthFt: 12, baseDepthInches: 12, surfaceDepthInches: 0 });
    // 27x12x12 = 12 cubic yards raw, +10% = 13.2, rounded up to 13.5
    expect(result.baseYards).toBe(13.5);
  });
});

describe("mulchCalculation", () => {
  test("500 sqft at 3 inches", () => {
    const result = mulchCalculation({ sqFt: 500, depthInches: 3 });
    expect(result.yards).toBe(5); // 4.63 exact → 5.0 rounded up
    expect(result.bags2cuft).toBeGreaterThan(0);
    expect(result.recommendation).toContain("3 inches");
  });

  test("2 inch depth gives refresh recommendation", () => {
    const result = mulchCalculation({ sqFt: 200, depthInches: 2 });
    expect(result.recommendation).toContain("refresh");
  });
});

describe("topsoilCalculation", () => {
  test("new lawn 2000 sqft at 4 inches", () => {
    const result = topsoilCalculation({ sqFt: 2000, depthInches: 4, purpose: "new-lawn" });
    expect(result.yards).toBeGreaterThan(0);
    expect(result.withCompaction).toBeGreaterThanOrEqual(result.exact);
    expect(result.recommendation).toContain("seeding");
  });

  test("top-dress purpose", () => {
    const result = topsoilCalculation({ sqFt: 1000, depthInches: 1, purpose: "top-dress" });
    expect(result.recommendation).toContain("Overseed");
  });
});

describe("baseCalculation", () => {
  test("10x10 patio base at 4 inches no buffer", () => {
    const result = baseCalculation({ lengthFt: 10, widthFt: 10, depthInches: 4, addEdgeBuffer: false });
    expect(result.yards).toBeGreaterThan(0);
    expect(result.withCompaction).toBeGreaterThanOrEqual(result.exact);
  });

  test("edge buffer adds 1ft to each dimension", () => {
    const without = baseCalculation({ lengthFt: 10, widthFt: 10, depthInches: 4, addEdgeBuffer: false });
    const with_ = baseCalculation({ lengthFt: 10, widthFt: 10, depthInches: 4, addEdgeBuffer: true });
    expect(with_.yards).toBeGreaterThan(without.yards);
  });
});

describe("fillCalculation", () => {
  test("rectangular fill", () => {
    const result = fillCalculation({ lengthFt: 20, widthFt: 10, depthInches: 6 });
    expect(result.yards).toBeGreaterThan(0);
    expect(result.material).toBe("Clean Fill");
  });

  test("circular fill (tree ring)", () => {
    const result = fillCalculation({ diameterFt: 6, depthInches: 3 });
    expect(result.yards).toBeGreaterThan(0);
    expect(result.exact).toBeCloseTo(0.262, 2); // pi * 9 * 3/12/27
  });

  test("zero inputs", () => {
    const result = fillCalculation({});
    expect(result.yards).toBe(0);
  });
});

describe("rcaCalculation", () => {
  test("parking pad 20x20 at 6 inches state grade", () => {
    const result = rcaCalculation({ lengthFt: 20, widthFt: 20, depthInches: 6, grade: "state" });
    expect(result.yards).toBeGreaterThan(0);
    expect(result.priceEstimateCents).toBeGreaterThan(0);
  });

  test("regular grade is cheaper", () => {
    const state = rcaCalculation({ lengthFt: 20, widthFt: 20, depthInches: 6, grade: "state" });
    const regular = rcaCalculation({ lengthFt: 20, widthFt: 20, depthInches: 6, grade: "regular" });
    expect(regular.priceEstimateCents).toBeLessThan(state.priceEstimateCents);
  });
});

describe("sandCalculation", () => {
  test("paver bedding 200 sqft at 1 inch", () => {
    const result = sandCalculation({ sqFt: 200, depthInches: 1, type: "paver-bedding" });
    expect(result.yards).toBe(1); // 0.617 → 1.0
    expect(result.material).toBe("Fine Sand");
  });

  test("masonry mix uses concrete sand", () => {
    const result = sandCalculation({ sqFt: 100, depthInches: 2, type: "masonry-mix" });
    expect(result.material).toBe("State Concrete Sand");
  });
});

describe("estimatePrice", () => {
  test("5 yards at $30/yd = $150", () => {
    expect(estimatePrice(5, 3000).materialCostCents).toBe(15000);
  });

  test("zero yards", () => {
    expect(estimatePrice(0, 3000).materialCostCents).toBe(0);
  });
});
