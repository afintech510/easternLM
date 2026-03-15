"use client";
import { useMemo, useState } from "react";
import { sandCalculation } from "@/lib/calculators";
import { CalculatorShell, CalcInput, CalcSelect, type CalculatorResult } from "./calculator-shell";

export function SandCalculator() {
  const [length, setLength] = useState("20");
  const [width, setWidth] = useState("10");
  const [depth, setDepth] = useState("1");
  const [type, setType] = useState("paver-bedding");

  const result = useMemo((): CalculatorResult | null => {
    const l = Number(length), w = Number(width), d = Number(depth);
    if (!l || !w || !d) return null;
    const calc = sandCalculation({ sqFt: l * w, depthInches: d, type: type as "paver-bedding" | "leveling" | "masonry-mix" });
    const slug = calc.material === "State Concrete Sand" ? "state-concrete-sand" : "fine-sand";
    return {
      yards: calc.yards, exact: calc.exact, label: "Sand",
      formula: `${l}ft × ${w}ft × ${d}" ÷ 324 = ${calc.exact.toFixed(2)} yd → ${calc.yards.toFixed(1)} yd`,
      recommendation: type === "paver-bedding" ? "1\" of fine sand as a setting bed under pavers. Screed level before placing pavers." : type === "masonry-mix" ? "State concrete sand for mixing mortar and concrete." : "Fine sand for leveling and filling.",
      pricePerYardCents: 6000, productSlug: slug, productName: calc.material,
    };
  }, [length, width, depth, type]);

  return (
    <CalculatorShell title="Sand Calculator" description="Calculate sand for paver bedding, leveling, and masonry work."
      inputs={<div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <CalcInput label="Length" value={length} onChange={setLength} unit="ft" />
          <CalcInput label="Width" value={width} onChange={setWidth} unit="ft" />
        </div>
        <CalcInput label="Depth" value={depth} onChange={setDepth} unit="inches" hint={'1" paver bedding, 2-4" leveling'} />
        <CalcSelect label="Use" value={type} onChange={setType} options={[
          { value: "paver-bedding", label: "Paver bedding (1\" typical)" },
          { value: "leveling", label: "Leveling / filling" },
          { value: "masonry-mix", label: "Masonry / concrete mixing" },
        ]} />
      </div>} result={result} />
  );
}
