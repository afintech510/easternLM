import { calcCoverageSqFt } from "@/lib/bulk-coverage";

describe("calcCoverageSqFt", () => {
  test("5 yards at 3 inches = 540 sq ft", () => {
    expect(calcCoverageSqFt(5, 3)).toBe(540);
  });

  test("10 yards at 4 inches = 810 sq ft", () => {
    expect(calcCoverageSqFt(10, 4)).toBe(810);
  });

  test("1 yard at 1 inch = 324 sq ft", () => {
    expect(calcCoverageSqFt(1, 1)).toBe(324);
  });

  test("20 yards at 3 inches = 2160 sq ft", () => {
    expect(calcCoverageSqFt(20, 3)).toBe(2160);
  });

  test("0 yards = 0 sq ft", () => {
    expect(calcCoverageSqFt(0, 3)).toBe(0);
  });

  test("0 depth = 0 sq ft", () => {
    expect(calcCoverageSqFt(5, 0)).toBe(0);
  });

  test("negative depth = 0 sq ft", () => {
    expect(calcCoverageSqFt(5, -1)).toBe(0);
  });

  test("half-yard quantities work", () => {
    // 5.5 yards at 3" = 594 sq ft
    expect(calcCoverageSqFt(5.5, 3)).toBe(594);
  });

  // Test all default depths produce reasonable results
  test("default depths for each category", () => {
    // Soil: 3" → 5 yds covers 540 sq ft
    expect(calcCoverageSqFt(5, 3)).toBe(540);
    // Mulch: 3" → 10 yds covers 1080 sq ft
    expect(calcCoverageSqFt(10, 3)).toBe(1080);
    // Stone/Gravel: 4" → 10 yds covers 810 sq ft
    expect(calcCoverageSqFt(10, 4)).toBe(810);
    // Sand paver base: 1" → 5 yds covers 1620 sq ft
    expect(calcCoverageSqFt(5, 1)).toBe(1620);
    // Sand playground: 6" → 10 yds covers 540 sq ft
    expect(calcCoverageSqFt(10, 6)).toBe(540);
    // Decorative: 2" → 5 yds covers 810 sq ft
    expect(calcCoverageSqFt(5, 2)).toBe(810);
  });

  test("returns integer (no fractional sq ft)", () => {
    for (let depth = 1; depth <= 6; depth++) {
      for (let yards = 0.5; yards <= 25; yards += 0.5) {
        const sqft = calcCoverageSqFt(yards, depth);
        expect(sqft).toBe(Math.round(sqft));
      }
    }
  });
});
