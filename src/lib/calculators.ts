/**
 * Material calculator engine — pure math, no UI.
 * All functions return cubic yards (rounded up to nearest 0.5).
 */

function roundUpHalf(n: number): number {
  return Math.ceil(n * 2) / 2;
}

function clampPositive(n: number): number {
  return Number.isFinite(n) && n > 0 ? n : 0;
}

// ─── Core formula ─────────────────────────────────────────────────

export function cubicYards(lengthFt: number, widthFt: number, depthInches: number): number {
  const l = clampPositive(lengthFt);
  const w = clampPositive(widthFt);
  const d = clampPositive(depthInches);
  return (l * w * d) / 12 / 27;
}

// ─── Driveway ─────────────────────────────────────────────────────

export type DrivewayInput = {
  lengthFt: number;
  widthFt: number;
  baseDepthInches: number;
  surfaceDepthInches: number;
};

export type DrivewayResult = {
  baseYards: number;
  surfaceYards: number;
  totalYards: number;
  baseMaterial: string;
  surfaceMaterial: string;
};

export function drivewayCalculation(input: DrivewayInput): DrivewayResult {
  const baseRaw = cubicYards(input.lengthFt, input.widthFt, input.baseDepthInches);
  const surfaceRaw = cubicYards(input.lengthFt, input.widthFt, input.surfaceDepthInches);
  const baseYards = roundUpHalf(baseRaw * 1.1); // 10% compaction
  const surfaceYards = roundUpHalf(surfaceRaw);
  return {
    baseYards,
    surfaceYards,
    totalYards: baseYards + surfaceYards,
    baseMaterial: "State Grade RCA",
    surfaceMaterial: "3/4\" Bluestone",
  };
}

// ─── Mulch ────────────────────────────────────────────────────────

export type MulchInput = {
  sqFt: number;
  depthInches: number;
};

export type MulchResult = {
  yards: number;
  exact: number;
  bags2cuft: number;
  recommendation: string;
};

export function mulchCalculation(input: MulchInput): MulchResult {
  const sqFt = clampPositive(input.sqFt);
  const depth = clampPositive(input.depthInches);
  const exact = (sqFt * depth) / 12 / 27;
  const yards = roundUpHalf(exact);
  const bags2cuft = Math.ceil((exact * 27) / 2); // 2 cu ft bags
  let recommendation = "2 inches for annual refresh.";
  if (depth >= 3) recommendation = "3 inches is ideal for new beds — good weed suppression and moisture retention.";
  if (depth >= 4) recommendation = "4 inches is heavy coverage — best for new installations or playground areas.";
  return { yards, exact, bags2cuft, recommendation };
}

// ─── Topsoil ──────────────────────────────────────────────────────

export type TopsoilInput = {
  sqFt: number;
  depthInches: number;
  purpose: "new-lawn" | "top-dress" | "garden-bed" | "fill";
};

export type TopsoilResult = {
  yards: number;
  exact: number;
  withCompaction: number;
  recommendation: string;
};

export function topsoilCalculation(input: TopsoilInput): TopsoilResult {
  const sqFt = clampPositive(input.sqFt);
  const depth = clampPositive(input.depthInches);
  const exact = (sqFt * depth) / 12 / 27;
  const compacted = exact * 1.1;
  const yards = roundUpHalf(compacted);

  const recs: Record<string, string> = {
    "new-lawn": "4-6 inches of screened topsoil before seeding or sodding. Add compost for better root establishment.",
    "top-dress": "1-2 inches spread evenly. Overseed after for best results.",
    "garden-bed": "6 inches minimum for raised beds. Mix with compost 50/50 for vegetables.",
    fill: "Use clean fill or bank run for grade work. Topsoil only needed on the surface layer.",
  };

  return { yards, exact, withCompaction: roundUpHalf(compacted), recommendation: recs[input.purpose] || "" };
}

// ─── Base (shed/patio) ────────────────────────────────────────────

export type BaseInput = {
  lengthFt: number;
  widthFt: number;
  depthInches: number;
  addEdgeBuffer: boolean;
};

export type BaseResult = {
  yards: number;
  exact: number;
  withCompaction: number;
  material: string;
};

export function baseCalculation(input: BaseInput): BaseResult {
  const l = clampPositive(input.lengthFt) + (input.addEdgeBuffer ? 1 : 0); // +6" each side
  const w = clampPositive(input.widthFt) + (input.addEdgeBuffer ? 1 : 0);
  const exact = cubicYards(l, w, input.depthInches);
  const compacted = exact * 1.15; // 15% compaction factor
  return {
    yards: roundUpHalf(compacted),
    exact,
    withCompaction: roundUpHalf(compacted),
    material: "3/4\" Crushed Bluestone",
  };
}

// ─── Fill ─────────────────────────────────────────────────────────

export type FillInput = {
  lengthFt?: number;
  widthFt?: number;
  depthInches?: number;
  diameterFt?: number;
  compactionFactor?: number;
};

export type FillResult = {
  yards: number;
  exact: number;
  material: string;
};

export function fillCalculation(input: FillInput): FillResult {
  const factor = input.compactionFactor ?? 1.1;
  let exact: number;

  if (input.diameterFt && input.diameterFt > 0) {
    // Circular: pi * r^2 * depth
    const r = clampPositive(input.diameterFt) / 2;
    const d = clampPositive(input.depthInches ?? 3);
    exact = (Math.PI * r * r * d) / 12 / 27;
  } else {
    exact = cubicYards(input.lengthFt ?? 0, input.widthFt ?? 0, input.depthInches ?? 0);
  }

  return {
    yards: roundUpHalf(exact * factor),
    exact,
    material: "Clean Fill",
  };
}

// ─── RCA ──────────────────────────────────────────────────────────

export type RcaInput = {
  lengthFt: number;
  widthFt: number;
  depthInches: number;
  grade: "state" | "regular";
};

export type RcaResult = {
  yards: number;
  exact: number;
  withCompaction: number;
  priceEstimateCents: number;
};

export function rcaCalculation(input: RcaInput): RcaResult {
  const exact = cubicYards(input.lengthFt, input.widthFt, input.depthInches);
  const compacted = exact * 1.15;
  const yards = roundUpHalf(compacted);
  const pricePerYard = input.grade === "state" ? 2700 : 2000;
  return {
    yards,
    exact,
    withCompaction: roundUpHalf(compacted),
    priceEstimateCents: Math.round(yards * pricePerYard),
  };
}

// ─── Sand ─────────────────────────────────────────────────────────

export type SandInput = {
  sqFt: number;
  depthInches: number;
  type: "paver-bedding" | "leveling" | "masonry-mix";
};

export type SandResult = {
  yards: number;
  exact: number;
  material: string;
};

export function sandCalculation(input: SandInput): SandResult {
  const exact = (clampPositive(input.sqFt) * clampPositive(input.depthInches)) / 12 / 27;
  const materials: Record<string, string> = {
    "paver-bedding": "Fine Sand",
    leveling: "Fine Sand",
    "masonry-mix": "State Concrete Sand",
  };
  return {
    yards: roundUpHalf(exact),
    exact,
    material: materials[input.type] || "Fine Sand",
  };
}

// ─── Price estimator ──────────────────────────────────────────────

export function estimatePrice(yards: number, pricePerYardCents: number): { materialCostCents: number } {
  return { materialCostCents: Math.round(clampPositive(yards) * clampPositive(pricePerYardCents)) };
}
