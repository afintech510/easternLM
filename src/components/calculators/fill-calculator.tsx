"use client";
import { useMemo, useState } from "react";
import { fillCalculation } from "@/lib/calculators";
import { CalculatorShell, CalcInput, CalcSelect, type CalculatorResult } from "./calculator-shell";

const PRODUCTS = [
  { slug: "clean-fill-exc-dirt-unscreened", name: "Clean Fill", price: 1500 },
  { slug: "bank-run-sandy-fill-w-gravel-varying-in-size", name: "Bank Run", price: 1800 },
];

export function FillCalculator() {
  const [shape, setShape] = useState("rect");
  const [length, setLength] = useState("20");
  const [width, setWidth] = useState("10");
  const [diameter, setDiameter] = useState("6");
  const [depth, setDepth] = useState("6");
  const [product, setProduct] = useState(PRODUCTS[0].slug);

  const result = useMemo((): CalculatorResult | null => {
    const d = Number(depth);
    if (!d) return null;
    const calc = shape === "circle"
      ? fillCalculation({ diameterFt: Number(diameter), depthInches: d })
      : fillCalculation({ lengthFt: Number(length), widthFt: Number(width), depthInches: d });
    if (calc.yards <= 0) return null;
    const selected = PRODUCTS.find((p) => p.slug === product) || PRODUCTS[0];
    const formula = shape === "circle"
      ? `π × (${diameter}/2)² × ${depth}" ÷ 324 + 10% = ${calc.yards.toFixed(1)} yd`
      : `${length}ft × ${width}ft × ${depth}" ÷ 324 + 10% = ${calc.yards.toFixed(1)} yd`;
    return {
      yards: calc.yards, exact: calc.exact, label: "Fill",
      formula, pricePerYardCents: selected.price, productSlug: selected.slug, productName: selected.name,
    };
  }, [shape, length, width, diameter, depth, product]);

  return (
    <CalculatorShell title="Fill Calculator" description="Calculate clean fill or bank run for grading, backfill, and low spots."
      inputs={<div className="space-y-3">
        <CalcSelect label="Shape" value={shape} onChange={setShape} options={[{ value: "rect", label: "Rectangle" }, { value: "circle", label: "Circle (tree ring, round bed)" }]} />
        {shape === "rect" ? (
          <div className="grid grid-cols-2 gap-3">
            <CalcInput label="Length" value={length} onChange={setLength} unit="ft" />
            <CalcInput label="Width" value={width} onChange={setWidth} unit="ft" />
          </div>
        ) : (
          <CalcInput label="Diameter" value={diameter} onChange={setDiameter} unit="ft" />
        )}
        <CalcInput label="Depth" value={depth} onChange={setDepth} unit="inches" />
        <CalcSelect label="Material" value={product} onChange={setProduct}
          options={PRODUCTS.map((p) => ({ value: p.slug, label: `${p.name} — $${(p.price / 100).toFixed(0)}/yd` }))} />
      </div>} result={result} />
  );
}
