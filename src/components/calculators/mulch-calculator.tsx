"use client";

import { useMemo, useState } from "react";
import { mulchCalculation, estimatePrice } from "@/lib/calculators";
import { CalculatorShell, CalcInput, CalcSelect, type CalculatorResult } from "./calculator-shell";

const MULCH_PRODUCTS = [
  { slug: "dark-natural-mulch", name: "Dark Natural Mulch", price: 2000 },
  { slug: "black-mulch", name: "Black Mulch", price: 3000 },
  { slug: "chocolate-mulch", name: "Chocolate Mulch", price: 3000 },
  { slug: "red-mulch", name: "Red Mulch", price: 3800 },
];

export function MulchCalculator() {
  const [length, setLength] = useState("20");
  const [width, setWidth] = useState("10");
  const [depth, setDepth] = useState("3");
  const [product, setProduct] = useState(MULCH_PRODUCTS[1].slug);

  const result = useMemo((): CalculatorResult | null => {
    const l = Number(length), w = Number(width), d = Number(depth);
    if (!l || !w || !d) return null;
    const calc = mulchCalculation({ sqFt: l * w, depthInches: d });
    const selected = MULCH_PRODUCTS.find((p) => p.slug === product) || MULCH_PRODUCTS[1];
    return {
      yards: calc.yards, exact: calc.exact, label: "Mulch",
      formula: `${l}ft × ${w}ft = ${l * w} sq ft × ${d}" depth ÷ 324 = ${calc.exact.toFixed(2)} yd → ${calc.yards.toFixed(1)} yd`,
      recommendation: calc.recommendation,
      pricePerYardCents: selected.price, productSlug: selected.slug, productName: selected.name,
    };
  }, [length, width, depth, product]);

  return (
    <CalculatorShell
      title="Mulch Calculator"
      description="Calculate how many yards of mulch you need for garden beds, tree rings, and borders."
      inputs={
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <CalcInput label="Length" value={length} onChange={setLength} unit="ft" />
            <CalcInput label="Width" value={width} onChange={setWidth} unit="ft" />
          </div>
          <CalcInput label="Depth" value={depth} onChange={setDepth} unit="inches" hint={"2\" for refresh, 3\" for new beds"} />
          <CalcSelect label="Mulch type" value={product} onChange={setProduct}
            options={MULCH_PRODUCTS.map((p) => ({ value: p.slug, label: `${p.name} — $${(p.price / 100).toFixed(0)}/yd` }))} />
        </div>
      }
      result={result}
    />
  );
}
