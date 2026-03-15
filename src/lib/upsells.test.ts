import { calculateUpsellPrice, getApplicableUpsells, type Upsell, type UpsellContext } from "@/lib/upsells";

const spreading: Upsell = {
  id: "1", slug: "spreading-service", name: "Spreading", description: "", shortDescription: "",
  pricingType: "tiered_per_yard",
  flatPriceCents: null, perYardPriceCents: null,
  tieredPricing: [
    { max_yards: 4, rate_cents_per_yard: 7500 },
    { max_yards: 5, flat_cents: 35000 },
    { max_yards: 10, base_cents: 35000, rate_cents_per_yard: 3000 },
    { max_yards: 20, base_cents: 50000, rate_cents_per_yard: 2500 },
    { max_yards: null, base_cents: 75000, rate_cents_per_yard: 3750 },
  ],
  triggerProductTypes: ["bulk"], triggerMaterialClasses: [], triggerCategories: [],
  triggerCalculatorTypes: ["mulch", "topsoil", "gravel"], triggerContexts: ["calculator", "product_detail", "cart"],
  upsellType: "service", linkedProductSlugs: [], sortOrder: 1, isTaxable: true, icon: "shovel",
};

const fabric: Upsell = {
  id: "2", slug: "weed-barrier-fabric", name: "Weed Barrier", description: "", shortDescription: "",
  pricingType: "flat", flatPriceCents: 7500, perYardPriceCents: null, tieredPricing: null,
  triggerProductTypes: ["bulk"], triggerMaterialClasses: [], triggerCategories: ["mulch", "topsoil-fill"],
  triggerCalculatorTypes: ["mulch", "topsoil"], triggerContexts: ["calculator", "product_detail", "cart"],
  upsellType: "product", linkedProductSlugs: ["fabric-1"], sortOrder: 2, isTaxable: true, icon: "layers",
};

const tarp: Upsell = {
  id: "3", slug: "tarp-placement", name: "Tarp Placement", description: "", shortDescription: "",
  pricingType: "flat", flatPriceCents: 2500, perYardPriceCents: null, tieredPricing: null,
  triggerProductTypes: ["bulk"], triggerMaterialClasses: [], triggerCategories: [],
  triggerCalculatorTypes: [], triggerContexts: ["cart"],
  upsellType: "add-on", linkedProductSlugs: [], sortOrder: 3, isTaxable: true, icon: "shield",
};

const allUpsells = [spreading, fabric, tarp];

describe("calculateUpsellPrice", () => {
  test("spreading: 1 yard = $75", () => expect(calculateUpsellPrice(spreading, 1)).toBe(7500));
  test("spreading: 3 yards = $225", () => expect(calculateUpsellPrice(spreading, 3)).toBe(22500));
  test("spreading: 4 yards = $300", () => expect(calculateUpsellPrice(spreading, 4)).toBe(30000));
  test("spreading: 5 yards = $350 flat", () => expect(calculateUpsellPrice(spreading, 5)).toBe(35000));
  test("spreading: 6 yards = $350 + 6×$30 = $530", () => expect(calculateUpsellPrice(spreading, 6)).toBe(35000 + 18000));
  test("spreading: 10 yards = $350 + 10×$30 = $650", () => expect(calculateUpsellPrice(spreading, 10)).toBe(35000 + 30000));
  test("spreading: 15 yards = $500 + 15×$25 = $875", () => expect(calculateUpsellPrice(spreading, 15)).toBe(50000 + 37500));
  test("spreading: 20 yards = $500 + 20×$25 = $1000", () => expect(calculateUpsellPrice(spreading, 20)).toBe(50000 + 50000));
  test("spreading: 25 yards = $750 + 25×$37.50 = $1687.50", () => expect(calculateUpsellPrice(spreading, 25)).toBe(75000 + 93750));
  test("spreading: 0 yards = $0", () => expect(calculateUpsellPrice(spreading, 0)).toBe(0));

  test("flat: fabric = $75", () => expect(calculateUpsellPrice(fabric, 5)).toBe(7500));
  test("flat: tarp = $25", () => expect(calculateUpsellPrice(tarp, 10)).toBe(2500));
});

describe("getApplicableUpsells", () => {
  test("mulch calculator shows spreading + fabric, not tarp", () => {
    const ctx: UpsellContext = { productType: "bulk", categorySlug: "mulch", calculatorType: "mulch", displayContext: "calculator" };
    const result = getApplicableUpsells(allUpsells, ctx);
    expect(result.map((u) => u.slug)).toEqual(["spreading-service", "weed-barrier-fabric"]);
  });

  test("cart shows tarp for bulk without calculator type", () => {
    const ctx: UpsellContext = { productType: "bulk", categorySlug: "mulch", displayContext: "cart" };
    const result = getApplicableUpsells(allUpsells, ctx);
    // spreading requires calculatorType match, fabric requires calculatorType match - tarp has empty triggers
    expect(result.map((u) => u.slug)).toEqual(["tarp-placement"]);
  });

  test("cart with calculatorType shows spreading + fabric + tarp", () => {
    const ctx: UpsellContext = { productType: "bulk", categorySlug: "mulch", calculatorType: "mulch", displayContext: "cart" };
    const result = getApplicableUpsells(allUpsells, ctx);
    expect(result.map((u) => u.slug)).toEqual(["spreading-service", "weed-barrier-fabric", "tarp-placement"]);
  });

  test("non-bulk product shows nothing (trigger_product_types = bulk)", () => {
    const ctx: UpsellContext = { productType: "non-bulk", categorySlug: "tools", displayContext: "product_detail" };
    const result = getApplicableUpsells(allUpsells, ctx);
    expect(result).toHaveLength(0);
  });

  test("sand calculator doesn't show spreading or fabric (calculator trigger)", () => {
    const ctx: UpsellContext = { productType: "bulk", categorySlug: "sand", calculatorType: "sand", displayContext: "calculator" };
    const result = getApplicableUpsells(allUpsells, ctx);
    // spreading requires mulch/topsoil/gravel calculator, fabric requires mulch/topsoil
    expect(result).toHaveLength(0);
  });

  test("empty triggers match all", () => {
    const ctx: UpsellContext = { productType: "bulk", displayContext: "cart" };
    const result = getApplicableUpsells([tarp], ctx);
    expect(result).toHaveLength(1);
  });

  test("results sorted by sort_order", () => {
    const ctx: UpsellContext = { productType: "bulk", categorySlug: "mulch", calculatorType: "mulch", displayContext: "cart" };
    const result = getApplicableUpsells(allUpsells, ctx);
    expect(result.length).toBeGreaterThanOrEqual(2);
    expect(result[0].sortOrder).toBeLessThan(result[1].sortOrder);
  });
});
