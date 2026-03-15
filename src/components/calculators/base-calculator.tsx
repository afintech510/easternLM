"use client";
import { useMemo, useState } from "react";
import { baseCalculation } from "@/lib/calculators";
import { CalculatorShell, CalcInput, type CalculatorResult } from "./calculator-shell";

export function BaseCalculator() {
  const [length, setLength] = useState("10");
  const [width, setWidth] = useState("10");
  const [depth, setDepth] = useState("4");
  const [buffer, setBuffer] = useState(true);

  const result = useMemo((): CalculatorResult | null => {
    const l = Number(length), w = Number(width), d = Number(depth);
    if (!l || !w || !d) return null;
    const calc = baseCalculation({ lengthFt: l, widthFt: w, depthInches: d, addEdgeBuffer: buffer });
    const dims = buffer ? `(${l}+1)ft × (${w}+1)ft` : `${l}ft × ${w}ft`;
    return {
      yards: calc.yards, exact: calc.exact, label: "Base Stone",
      formula: `${dims} × ${d}" depth + 15% compaction = ${calc.yards.toFixed(1)} yd`,
      recommendation: "4\" of compacted 3/4 crushed stone is standard for shed pads and patio bases. Add 6\" edge buffer for a stable perimeter.",
      pricePerYardCents: 8800, productSlug: "34-inch-bluestone", productName: calc.material,
    };
  }, [length, width, depth, buffer]);

  return (
    <CalculatorShell title="Patio / Shed Base Calculator" description="Calculate crushed stone for patio sub-base, shed pads, and equipment pads."
      inputs={<div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <CalcInput label="Length" value={length} onChange={setLength} unit="ft" />
          <CalcInput label="Width" value={width} onChange={setWidth} unit="ft" />
        </div>
        <CalcInput label="Base depth" value={depth} onChange={setDepth} unit="inches" hint={'4" typical, 6" for heavy loads'} />
        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <input type="checkbox" checked={buffer} onChange={(e) => setBuffer(e.target.checked)} className="rounded" />
          Add 6\" edge buffer (recommended)
        </label>
      </div>} result={result} />
  );
}
