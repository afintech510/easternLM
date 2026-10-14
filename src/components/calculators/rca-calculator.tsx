"use client";
import { useMemo, useState } from "react";
import { rcaCalculation } from "@/lib/calculators";
import { livePrice, useLivePrices } from "@/lib/use-live-prices";
import { CalculatorShell, CalcInput, CalcSelect, type CalculatorResult } from "./calculator-shell";

const STATE_SLUG = "state-grade-rca-95-concrete-made-to-spec-not-certified";
const REGULAR_SLUG = "regular-rca-blend-of-concrete-brick-and-blacktop";

export function RcaCalculator() {
  const [length, setLength] = useState("20");
  const [width, setWidth] = useState("20");
  const [depth, setDepth] = useState("6");
  const [grade, setGrade] = useState("state");
  const prices = useLivePrices([STATE_SLUG, REGULAR_SLUG]);
  const yd = (slug: string, fallback: number) => `$${(livePrice(prices, slug, fallback) / 100).toFixed(0)}/yd`;

  const result = useMemo((): CalculatorResult | null => {
    const l = Number(length), w = Number(width), d = Number(depth);
    if (!l || !w || !d) return null;
    const calc = rcaCalculation({ lengthFt: l, widthFt: w, depthInches: d, grade: grade as "state" | "regular" });
    const slug = grade === "state" ? STATE_SLUG : REGULAR_SLUG;
    const name = grade === "state" ? "State Grade RCA" : "Regular RCA";
    const price = grade === "state" ? 3000 : 2300;
    return {
      yards: calc.yards, exact: calc.exact, label: "RCA",
      formula: `${l}ft × ${w}ft × ${d}" ÷ 324 + 15% compaction = ${calc.yards.toFixed(1)} yd`,
      recommendation: grade === "state" ? "State Grade RCA is 95% concrete — cleaner, more uniform, compacts into a solid surface." : "Regular RCA is a mix of concrete, brick, and blacktop — cheaper but more varied in color.",
      pricePerYardCents: price, productSlug: slug, productName: name,
    };
  }, [length, width, depth, grade]);

  return (
    <CalculatorShell title="RCA Calculator" description="Calculate recycled concrete aggregate for driveways, parking pads, and road base."
      inputs={<div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <CalcInput label="Length" value={length} onChange={setLength} unit="ft" />
          <CalcInput label="Width" value={width} onChange={setWidth} unit="ft" />
        </div>
        <CalcInput label="Depth" value={depth} onChange={setDepth} unit="inches" hint={'4-6" driveways, 6-8" parking'} />
        <CalcSelect label="Grade" value={grade} onChange={setGrade} options={[
          { value: "state", label: `State Grade (${yd(STATE_SLUG, 3000)}) — 95% concrete, uniform` },
          { value: "regular", label: `Regular (${yd(REGULAR_SLUG, 2300)}) — concrete/brick/blacktop mix` },
        ]} />
      </div>} result={result} />
  );
}
