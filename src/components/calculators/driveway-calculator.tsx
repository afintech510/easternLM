"use client";
import { useMemo, useState } from "react";
import { drivewayCalculation } from "@/lib/calculators";
import { CalculatorShell, CalcInput, type CalculatorResult } from "./calculator-shell";

export function DrivewayCalculator() {
  const [length, setLength] = useState("50");
  const [width, setWidth] = useState("12");
  const [baseDepth, setBaseDepth] = useState("4");
  const [surfaceDepth, setSurfaceDepth] = useState("2");

  const result = useMemo((): CalculatorResult | null => {
    const l = Number(length), w = Number(width), bd = Number(baseDepth), sd = Number(surfaceDepth);
    if (!l || !w || (!bd && !sd)) return null;
    const calc = drivewayCalculation({ lengthFt: l, widthFt: w, baseDepthInches: bd, surfaceDepthInches: sd });
    return {
      yards: calc.surfaceYards, exact: calc.surfaceYards, label: "Driveway Surface",
      formula: `${l}ft × ${w}ft driveway: ${bd}" base + ${sd}" surface`,
      recommendation: "4\" of RCA base compacted, then 2\" of bluestone surface is the standard recipe for Long Island driveways.",
      pricePerYardCents: 8800, productSlug: "34-inch-bluestone", productName: "3/4\" Bluestone (surface)",
      secondary: calc.baseYards > 0 ? {
        yards: calc.baseYards, label: "Base layer",
        pricePerYardCents: 2700, productSlug: "state-grade-rca-95-concrete-made-to-spec-not-certified", productName: "State Grade RCA (base)",
      } : undefined,
    };
  }, [length, width, baseDepth, surfaceDepth]);

  return (
    <CalculatorShell title="Driveway Calculator" description="Calculate base and surface stone for a gravel driveway. Two layers: compacted base + surface gravel."
      inputs={<div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <CalcInput label="Driveway length" value={length} onChange={setLength} unit="ft" />
          <CalcInput label="Driveway width" value={width} onChange={setWidth} unit="ft" hint={'Typical: 10-12 ft'} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <CalcInput label="Base depth (RCA)" value={baseDepth} onChange={setBaseDepth} unit="inches" hint={'4-6" recommended'} />
          <CalcInput label="Surface depth" value={surfaceDepth} onChange={setSurfaceDepth} unit="inches" hint={'2-3" recommended'} />
        </div>
      </div>} result={result} />
  );
}
