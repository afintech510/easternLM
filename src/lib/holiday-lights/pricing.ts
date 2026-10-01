import { HOLIDAY_LIGHTS, type HomeStyle } from "@/config/holiday-lights";

/**
 * Build & Book pricing — shared by the browser (live price) and the server (which
 * always recalculates before creating the deposit checkout). Pure + deterministic.
 * All money in cents.
 */

export const BUILD_STYLES = [
  { key: "warm", label: "Classic Warm White", colors: ["#ffdf9c"] },
  { key: "cool", label: "Cool White", colors: ["#e8f3ff"] },
  { key: "multi", label: "Multicolor", colors: ["#ff5148", "#ffb62e", "#46c46f", "#4a95ff"] },
  { key: "candy", label: "Candy Cane", colors: ["#ff3d3d", "#ffffff"] },
  { key: "christmas", label: "Red & Green", colors: ["#ff3d3d", "#2fbf5f"] },
  { key: "elegant", label: "Elegant Warm White", colors: ["#fff3d6"] },
] as const;
export type BuildStyle = (typeof BUILD_STYLES)[number]["key"];

export const DEFAULT_STORIES: Record<HomeStyle, 1 | 2> = { ranch: 1, cape: 1, colonial: 2, split: 2 };

export type BuildInput = {
  homeStyle: HomeStyle | null;
  /** 1 = single story, 2 = two stories or more (+20% roofline). */
  stories: 1 | 2;
  rooflineFt: number;
  style: BuildStyle;
  extras: {
    takedown: boolean;
    wreath24: number;
    wreath36: number;
    wreath48: number;
    bushS: number;
    bushM: number;
    bushL: number;
    /** Vertical feet of tree trunk wrap (all trees combined). */
    treeFt: number;
    /** Window / door outline footage. */
    windowFt: number;
    garlandFt: number;
    stakes: number;
  };
};

export type PriceLine = { key: string; label: string; detail: string; cents: number };

export type PriceBreakdown = {
  lines: PriceLine[];
  itemsCents: number;
  minimumAdjustmentCents: number;
  earlyBirdCents: number;
  preTaxCents: number;
  taxCents: number;
  totalCents: number;
  depositCents: number;
  balanceCents: number;
  litFeet: number;
};

export const LIMITS = {
  rooflineFt: { min: 20, max: 600 },
  count: { min: 0, max: 30 },
  feet: { min: 0, max: 300 },
} as const;

const P = HOLIDAY_LIGHTS.pricing;
const RATES = {
  windowPerFtCents: 800,
  garlandPerFtCents: 2200,
  treePerFtCents: 1500,
  stakeCents: 1800,
};

/** Per-unit prices for the UI (single source; priceBuild uses the same numbers). */
export const UNIT_PRICES = {
  wreath24: P.wreathCents.in24,
  wreath36: P.wreathCents.in36,
  wreath48: P.wreathCents.in48,
  bushS: P.bushWrapCents.s,
  bushM: P.bushWrapCents.m,
  bushL: P.bushWrapCents.l,
  stakes: RATES.stakeCents,
  treeFt: RATES.treePerFtCents,
  windowFt: RATES.windowPerFtCents,
  garlandFt: RATES.garlandPerFtCents,
  takedownFt: P.takedownPerFtCents,
} as const;

function clampInt(v: unknown, min: number, max: number, fallback = min): number {
  const n = Math.round(Number(v));
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

export function presetFeet(home: HomeStyle): number {
  const [lo, hi] = HOLIDAY_LIGHTS.homes[home].ft;
  return Math.round((lo + hi) / 2 / 5) * 5;
}

export function defaultBuild(home: HomeStyle = "ranch"): BuildInput {
  return {
    homeStyle: home,
    stories: DEFAULT_STORIES[home],
    rooflineFt: presetFeet(home),
    style: "warm",
    extras: { takedown: false, wreath24: 0, wreath36: 0, wreath48: 0, bushS: 0, bushM: 0, bushL: 0, treeFt: 0, windowFt: 0, garlandFt: 0, stakes: 0 },
  };
}

/** Coerce untrusted input (request body) into a valid BuildInput. */
export function normalizeBuild(raw: unknown): BuildInput {
  const r = (raw ?? {}) as Partial<BuildInput> & { extras?: Partial<BuildInput["extras"]> };
  const e: Partial<BuildInput["extras"]> = r.extras ?? {};
  const homes = Object.keys(HOLIDAY_LIGHTS.homes) as HomeStyle[];
  const c = (v: unknown) => clampInt(v, LIMITS.count.min, LIMITS.count.max, 0);
  const f = (v: unknown) => clampInt(v, LIMITS.feet.min, LIMITS.feet.max, 0);
  return {
    homeStyle: homes.includes(r.homeStyle as HomeStyle) ? (r.homeStyle as HomeStyle) : null,
    stories: Number(r.stories) >= 2 ? 2 : 1,
    rooflineFt: clampInt(r.rooflineFt, LIMITS.rooflineFt.min, LIMITS.rooflineFt.max, 120),
    style: BUILD_STYLES.some((s) => s.key === r.style) ? (r.style as BuildStyle) : "warm",
    extras: {
      takedown: e.takedown === true,
      wreath24: c(e.wreath24),
      wreath36: c(e.wreath36),
      wreath48: c(e.wreath48),
      bushS: c(e.bushS),
      bushM: c(e.bushM),
      bushL: c(e.bushL),
      treeFt: f(e.treeFt),
      windowFt: f(e.windowFt),
      garlandFt: f(e.garlandFt),
      stakes: c(e.stakes),
    },
  };
}

export function rooflineRateCents(stories: 1 | 2): number {
  return stories >= 2 ? Math.round((P.rooflinePerFtCents * (100 + P.secondStoryUpliftPct)) / 100) : P.rooflinePerFtCents;
}

const usd = (cents: number) => `$${(cents / 100).toLocaleString("en-US", { minimumFractionDigits: cents % 100 ? 2 : 0, maximumFractionDigits: 2 })}`;

/**
 * Price a build. `earlyBird` is decided by the caller (deadline check at booking
 * time, locked onto the booking) so client and server agree.
 */
export function priceBuild(build: BuildInput, opts: { earlyBird: boolean }): PriceBreakdown {
  const b = normalizeBuild(build);
  const x = b.extras;
  const lines: PriceLine[] = [];
  const add = (key: string, label: string, qty: number, unitCents: number, unitLabel: string) => {
    if (qty <= 0) return;
    lines.push({ key, label, detail: `${qty} ${unitLabel} × ${usd(unitCents)}`, cents: qty * unitCents });
  };

  const roofRate = rooflineRateCents(b.stories);
  add("roofline", `C9 roofline${b.stories >= 2 ? " (2+ stories)" : ""}`, b.rooflineFt, roofRate, "ft");
  add("windows", "Window / door outlines", x.windowFt, RATES.windowPerFtCents, "ft");
  add("garland", "Lit garland", x.garlandFt, RATES.garlandPerFtCents, "ft");
  add("wreath24", 'Lit wreath 24"', x.wreath24, P.wreathCents.in24, "×");
  add("wreath36", 'Lit wreath 36"', x.wreath36, P.wreathCents.in36, "×");
  add("wreath48", 'Lit wreath 48"', x.wreath48, P.wreathCents.in48, "×");
  add("bushS", "Bush wrap, small", x.bushS, P.bushWrapCents.s, "×");
  add("bushM", "Bush wrap, medium", x.bushM, P.bushWrapCents.m, "×");
  add("bushL", "Bush wrap, large", x.bushL, P.bushWrapCents.l, "×");
  add("tree", "Tree trunk wrap", x.treeFt, RATES.treePerFtCents, "vertical ft");
  add("stakes", "Pathway light stakes", x.stakes, RATES.stakeCents, "×");

  const litFeet = b.rooflineFt + x.windowFt + x.garlandFt;
  if (x.takedown) add("takedown", "Takedown + labeled storage", litFeet, P.takedownPerFtCents, "ft");

  const itemsCents = lines.reduce((s, l) => s + l.cents, 0);
  const minimumAdjustmentCents = Math.max(0, P.minimumCents - itemsCents);
  const afterMin = itemsCents + minimumAdjustmentCents;
  const earlyBirdCents = opts.earlyBird ? Math.min(HOLIDAY_LIGHTS.earlyBird.amountCents, afterMin) : 0;
  const preTaxCents = afterMin - earlyBirdCents;
  const taxCents = Math.round(preTaxCents * P.taxRate);
  const totalCents = preTaxCents + taxCents;
  const depositCents = Math.min(P.depositCents, totalCents);

  return {
    lines,
    itemsCents,
    minimumAdjustmentCents,
    earlyBirdCents,
    preTaxCents,
    taxCents,
    totalCents,
    depositCents,
    balanceCents: totalCents - depositCents,
    litFeet,
  };
}

/** One-line human summary for leads, emails and Stripe descriptions. */
export function summarizeBuild(build: BuildInput): string {
  const b = normalizeBuild(build);
  const style = BUILD_STYLES.find((s) => s.key === b.style)?.label ?? b.style;
  const x = b.extras;
  const parts = [`${b.rooflineFt} ft roofline (${b.stories >= 2 ? "2+ stories" : "1 story"}), ${style}`];
  const wreaths = x.wreath24 + x.wreath36 + x.wreath48;
  const bushes = x.bushS + x.bushM + x.bushL;
  if (wreaths) parts.push(`${wreaths} wreath${wreaths > 1 ? "s" : ""}`);
  if (bushes) parts.push(`${bushes} bush wrap${bushes > 1 ? "s" : ""}`);
  if (x.treeFt) parts.push(`${x.treeFt} ft tree wrap`);
  if (x.windowFt) parts.push(`${x.windowFt} ft window/door`);
  if (x.garlandFt) parts.push(`${x.garlandFt} ft garland`);
  if (x.stakes) parts.push(`${x.stakes} pathway stakes`);
  if (x.takedown) parts.push("takedown + storage");
  return parts.join(", ");
}
