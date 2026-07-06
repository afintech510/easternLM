/**
 * Scope input schemas per service slug.
 * Each service defines what questions to ask the customer to size the job.
 * Pricing formulas in ./pricing.ts consume these inputs.
 *
 * Admin controls RATES via the DB (ServicePricing).
 * Code controls the SHAPE of what to ask (these schemas).
 */

export type InputField =
  | {
      key: string;
      type: "number";
      label: string;
      help?: string;
      min: number;
      max?: number;
      step?: number;
      default: number;
      unit?: string;
    }
  | {
      key: string;
      type: "select";
      label: string;
      help?: string;
      options: Array<{ value: string; label: string; /** multiplier applied to per_unit_cents */ factor?: number }>;
      default: string;
    }
  | {
      key: string;
      type: "tier";
      label: string;
      help?: string;
      /** tier keys map to ServicePricing.tiers */
      options: Array<{ value: string; label: string; sublabel?: string }>;
      default: string;
    };

/**
 * Tag a service as "wants a tier pick" vs "wants per-unit math" vs "flat price".
 * Pricing behavior:
 *   - "flat"      → flat_cents (ignore inputs except for display)
 *   - "tiered"    → pricing.tiers[selected_tier_value]
 *   - "per_unit"  → base_cents + (per_unit_cents × qty × multipliers)
 *   - "quote_only"→ routes to custom project form (no instant price)
 */
export type PricingMode = "flat" | "tiered" | "per_unit" | "quote_only";

export type ServiceSchema = {
  slug: string;
  mode: PricingMode;
  inputs: InputField[];
  /** Human-readable summary line shown after inputs (e.g. "≈ 5 cu yd of mulch") */
  summary?: (inputs: Record<string, string | number>) => string;
};

export const SERVICE_SCHEMAS: Record<string, ServiceSchema> = {
  // ── Premium Driveway Sealcoat (tiered by size) ────────────────
  "driveway-sealcoating": {
    slug: "driveway-sealcoating",
    mode: "tiered",
    inputs: [
      {
        key: "size",
        type: "tier",
        label: "Driveway size",
        default: "standard",
        options: [
          { value: "small", label: "Small", sublabel: "1-car · up to ~500 sq ft" },
          { value: "standard", label: "Standard", sublabel: "2-car · ~500–900 sq ft" },
          { value: "large", label: "Large", sublabel: "3-car / long · ~900–1,600 sq ft" },
        ],
      },
    ],
  },

  // ── Crack Fill add-ons (flat) ─────────────────────────────────
  "driveway-crackfill-minor": {
    slug: "driveway-crackfill-minor",
    mode: "flat",
    inputs: [],
  },
  "driveway-crackfill-major": {
    slug: "driveway-crackfill-major",
    mode: "flat",
    inputs: [],
  },

  // ── Mulch Install ─────────────────────────────────────────────
  "mulch-install": {
    slug: "mulch-install",
    mode: "per_unit",
    inputs: [
      { key: "beds", type: "number", label: "How many beds?", min: 1, max: 30, step: 1, default: 3, unit: "beds" },
      {
        key: "depth",
        type: "select",
        label: "Depth",
        default: "3",
        options: [
          { value: "2", label: '2" (refresh)', factor: 0.7 },
          { value: "3", label: '3" (standard)', factor: 1.0 },
          { value: "4", label: '4" (new install)', factor: 1.3 },
        ],
      },
    ],
    summary: (inputs) => {
      const beds = Number(inputs.beds) || 0;
      const depthFactor = inputs.depth === "4" ? 1.3 : inputs.depth === "2" ? 0.7 : 1.0;
      const est = beds * depthFactor;
      return `≈ ${est.toFixed(1)} cu yd of mulch`;
    },
  },

  // ── Yard Cleanup ──────────────────────────────────────────────
  "yard-cleanup": {
    slug: "yard-cleanup",
    mode: "tiered",
    inputs: [
      {
        key: "scope",
        type: "tier",
        label: "How big a job?",
        default: "half_day",
        options: [
          { value: "half_day", label: "Half day", sublabel: "2-person crew, 4 hrs" },
          { value: "full_day", label: "Full day", sublabel: "2-person crew, 8 hrs" },
          { value: "two_day", label: "Two days", sublabel: "Heavy cleanup / overgrowth" },
        ],
      },
    ],
  },

  // ── Topsoil Spreading ─────────────────────────────────────────
  "topsoil-spreading": {
    slug: "topsoil-spreading",
    mode: "per_unit",
    inputs: [
      { key: "yards", type: "number", label: "How many cu. yd?", help: "We can help estimate — call us", min: 3, max: 50, step: 1, default: 5, unit: "yd" },
    ],
    summary: (inputs) => `${inputs.yards} cu yd · labor + delivery`,
  },

  // ── Gravel Driveway Top-Dress ─────────────────────────────────
  "gravel-driveway-topdress": {
    slug: "gravel-driveway-topdress",
    mode: "tiered",
    inputs: [
      {
        key: "size",
        type: "tier",
        label: "Driveway size",
        default: "small",
        options: [
          { value: "small", label: "Short", sublabel: "Under 500 sq ft" },
          { value: "medium", label: "Average", sublabel: "500–1,000 sq ft" },
          { value: "large", label: "Long", sublabel: "1,000–2,000 sq ft" },
        ],
      },
    ],
  },

  // ── Belgian Block Edging ──────────────────────────────────────
  "belgian-block-edging": {
    slug: "belgian-block-edging",
    mode: "per_unit",
    inputs: [
      { key: "linear_ft", type: "number", label: "How many linear feet?", min: 10, max: 200, step: 1, default: 40, unit: "ft" },
    ],
    summary: (inputs) => `${inputs.linear_ft} linear ft`,
  },

  // ── Driveway Apron ────────────────────────────────────────────
  "driveway-apron": {
    slug: "driveway-apron",
    mode: "quote_only",
    inputs: [],
  },

  // ── Flagstone Pathway ─────────────────────────────────────────
  "flagstone-pathway": {
    slug: "flagstone-pathway",
    mode: "per_unit",
    inputs: [
      { key: "sqft", type: "number", label: "Area (sq ft)", help: "Length × width of the path", min: 10, max: 500, step: 5, default: 50, unit: "sq ft" },
    ],
  },

  // ── Gravel Pathway ────────────────────────────────────────────
  "gravel-pathway": {
    slug: "gravel-pathway",
    mode: "per_unit",
    inputs: [
      { key: "sqft", type: "number", label: "Area (sq ft)", min: 10, max: 500, step: 5, default: 50, unit: "sq ft" },
    ],
  },

  // ── Garden Walls ──────────────────────────────────────────────
  "garden-walls": {
    slug: "garden-walls",
    mode: "per_unit",
    inputs: [
      { key: "linear_ft", type: "number", label: "Wall length (linear ft)", min: 5, max: 60, step: 1, default: 15, unit: "ft" },
      {
        key: "height",
        type: "select",
        label: "Wall height",
        default: "short",
        options: [
          { value: "short", label: "Under 2 ft", factor: 1.0 },
          { value: "medium", label: "2–4 ft", factor: 1.6 },
          { value: "tall", label: "Over 4 ft — custom quote", factor: 0 }, // routes to custom
        ],
      },
    ],
  },

  // ── Power Washing ─────────────────────────────────────────────
  "power-washing": {
    slug: "power-washing",
    mode: "tiered",
    inputs: [
      {
        key: "scope",
        type: "tier",
        label: "What needs washing?",
        default: "patio",
        options: [
          { value: "patio", label: "Patio or walkway", sublabel: "Up to 400 sq ft" },
          { value: "driveway", label: "Driveway", sublabel: "Average size" },
          { value: "full_house", label: "House + driveway", sublabel: "Full exterior refresh" },
        ],
      },
    ],
  },

  // ── Paver Wash + Poly-Sand ────────────────────────────────────
  "paver-wash-sand": {
    slug: "paver-wash-sand",
    mode: "tiered",
    inputs: [
      {
        key: "size",
        type: "tier",
        label: "Paver area",
        default: "small",
        options: [
          { value: "small", label: "Small", sublabel: "Up to 500 sq ft" },
          { value: "medium", label: "Medium", sublabel: "Up to 1,000 sq ft" },
          { value: "large", label: "Large", sublabel: "Up to 2,000 sq ft" },
        ],
      },
    ],
  },
};

/** Returns the schema for a service, or null if unknown (admin added a service without code support). */
export function getServiceSchema(slug: string): ServiceSchema | null {
  return SERVICE_SCHEMAS[slug] ?? null;
}
