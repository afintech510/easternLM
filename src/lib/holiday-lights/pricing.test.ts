import { HOLIDAY_LIGHTS } from "@/config/holiday-lights";
import { defaultBuild, normalizeBuild, presetFeet, priceBuild, rooflineRateCents, summarizeBuild, type BuildInput } from "./pricing";

function build(over: Partial<BuildInput> = {}, extras: Partial<BuildInput["extras"]> = {}): BuildInput {
  const b = defaultBuild("ranch");
  return { ...b, stories: 1, ...over, extras: { ...b.extras, ...extras } };
}

describe("priceBuild", () => {
  it("prices roofline at $9/ft with 8.75% tax on everything and no card fee", () => {
    const p = priceBuild(build({ rooflineFt: 150 }), { earlyBird: false });
    expect(p.itemsCents).toBe(150 * 900);
    expect(p.minimumAdjustmentCents).toBe(0);
    expect(p.taxCents).toBe(Math.round(135000 * 0.0875));
    expect(p.totalCents).toBe(135000 + 11813);
    expect(p.lines.map((l) => l.key)).not.toContain("card_fee");
  });

  it("applies +20% for 2+ stories", () => {
    expect(rooflineRateCents(2)).toBe(1080);
    const p = priceBuild(build({ rooflineFt: 100, stories: 2 }), { earlyBird: false });
    expect(p.lines[0]).toMatchObject({ key: "roofline", cents: 108000 });
  });

  it("enforces the $899 minimum", () => {
    const p = priceBuild(build({ rooflineFt: 50 }), { earlyBird: false });
    expect(p.itemsCents).toBe(45000);
    expect(p.minimumAdjustmentCents).toBe(89900 - 45000);
    expect(p.preTaxCents).toBe(89900);
  });

  it("takes $100 off when early bird is locked, after the minimum", () => {
    const small = priceBuild(build({ rooflineFt: 50 }), { earlyBird: true });
    expect(small.preTaxCents).toBe(89900 - 10000);
    const big = priceBuild(build({ rooflineFt: 200 }), { earlyBird: true });
    expect(big.earlyBirdCents).toBe(10000);
    expect(big.preTaxCents).toBe(180000 - 10000);
  });

  it("adds every extra at rate-card prices", () => {
    const p = priceBuild(
      build({ rooflineFt: 120 }, { wreath24: 1, wreath36: 1, wreath48: 1, bushS: 1, bushM: 1, bushL: 1, treeFt: 10, windowFt: 20, garlandFt: 5, stakes: 4 }),
      { earlyBird: false },
    );
    const cents = Object.fromEntries(p.lines.map((l) => [l.key, l.cents]));
    expect(cents).toMatchObject({
      roofline: 108000,
      wreath24: 9500,
      wreath36: 16500,
      wreath48: 24500,
      bushS: 4500,
      bushM: 7500,
      bushL: 12000,
      tree: 15000,
      windows: 16000,
      garland: 11000,
      stakes: 7200,
    });
  });

  it("charges takedown + storage per lit foot (roofline, windows, garland)", () => {
    const p = priceBuild(build({ rooflineFt: 100 }, { takedown: true, windowFt: 20, garlandFt: 10 }), { earlyBird: false });
    expect(p.litFeet).toBe(130);
    expect(p.lines.find((l) => l.key === "takedown")?.cents).toBe(130 * 300);
  });

  it("splits a $199 deposit from the balance", () => {
    const p = priceBuild(build({ rooflineFt: 150 }), { earlyBird: false });
    expect(p.depositCents).toBe(HOLIDAY_LIGHTS.pricing.depositCents);
    expect(p.balanceCents).toBe(p.totalCents - 19900);
  });

  it("is deterministic for client and server (same input → same output)", () => {
    const b = build({ rooflineFt: 137, stories: 2 }, { wreath36: 2, takedown: true });
    expect(priceBuild(JSON.parse(JSON.stringify(b)), { earlyBird: true })).toEqual(priceBuild(b, { earlyBird: true }));
  });
});

describe("normalizeBuild", () => {
  it("clamps and sanitizes untrusted input", () => {
    const n = normalizeBuild({ rooflineFt: 99999, stories: 7, style: "neon", homeStyle: "castle", extras: { wreath24: -3, stakes: 1e6, takedown: "yes" } });
    expect(n.rooflineFt).toBe(600);
    expect(n.stories).toBe(2);
    expect(n.style).toBe("warm");
    expect(n.homeStyle).toBeNull();
    expect(n.extras.wreath24).toBe(0);
    expect(n.extras.stakes).toBe(30);
    expect(n.extras.takedown).toBe(false);
  });
});

describe("presets + summary", () => {
  it("uses the midpoint of each home style's range", () => {
    expect(presetFeet("ranch")).toBe(125);
    expect(presetFeet("colonial")).toBe(170);
  });
  it("summarizes a build in one line", () => {
    expect(summarizeBuild(build({ rooflineFt: 120 }, { wreath24: 2, takedown: true }))).toBe(
      "120 ft roofline (1 story), Classic Warm White, 2 wreaths, takedown + storage",
    );
  });
});
