"use client";
import { useMemo, useState } from "react";
import { topsoilCalculation } from "@/lib/calculators";
import { CalculatorShell, CalcInput, CalcSelect, type CalculatorResult } from "./calculator-shell";

const PRODUCTS = [
  { slug: "topsoil-screened-organic", name: "Screened Topsoil", price: 2400 },
  { slug: "compost-certified-organic-rich-in-nutrients", name: "Compost", price: 3200 },
];

export function TopsoilCalculator() {
  const [length, setLength] = useState("20");
  const [width, setWidth] = useState("10");
  const [depth, setDepth] = useState("4");
  const [purpose, setPurpose] = useState("new-lawn");
  const [product, setProduct] = useState(PRODUCTS[0].slug);

  const result = useMemo((): CalculatorResult | null => {
    const l = Number(length), w = Number(width), d = Number(depth);
    if (!l || !w || !d) return null;
    const calc = topsoilCalculation({ sqFt: l * w, depthInches: d, purpose: purpose as "new-lawn" | "top-dress" | "garden-bed" | "fill" });
    const selected = PRODUCTS.find((p) => p.slug === product) || PRODUCTS[0];
    return {
      yards: calc.yards, exact: calc.exact, label: "Topsoil",
      formula: `${l}ft × ${w}ft × ${d}" ÷ 324 = ${calc.exact.toFixed(2)} yd + 10% settling = ${calc.yards.toFixed(1)} yd`,
      recommendation: calc.recommendation,
      pricePerYardCents: selected.price, productSlug: selected.slug, productName: selected.name,
    };
  }, [length, width, depth, purpose, product]);

  return (
    <CalculatorShell title="Topsoil Calculator" description="Calculate topsoil or compost needed for lawns, gardens, and grading."
      inputs={<div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <CalcInput label="Length" value={length} onChange={setLength} unit="ft" />
          <CalcInput label="Width" value={width} onChange={setWidth} unit="ft" />
        </div>
        <CalcInput label="Depth" value={depth} onChange={setDepth} unit="inches" hint={'4-6" new lawn, 2" top-dress'} />
        <CalcSelect label="Project type" value={purpose} onChange={setPurpose} options={[
          { value: "new-lawn", label: "New lawn installation" }, { value: "top-dress", label: "Top-dressing existing lawn" },
          { value: "garden-bed", label: "Garden bed / raised bed" }, { value: "fill", label: "Fill / grading" },
        ]} />
        <CalcSelect label="Material" value={product} onChange={setProduct}
          options={PRODUCTS.map((p) => ({ value: p.slug, label: `${p.name} — $${(p.price / 100).toFixed(0)}/yd` }))} />
      </div>} result={result} />
  );
}
