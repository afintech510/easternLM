"use client";

import { useMemo, useState } from "react";

export default function CalculatorPage() {
  const [length, setLength] = useState("20");
  const [width, setWidth] = useState("10");
  const [depthInches, setDepthInches] = useState("3");

  const yards = useMemo(() => {
    const l = Number(length);
    const w = Number(width);
    const d = Number(depthInches);

    if (!Number.isFinite(l) || !Number.isFinite(w) || !Number.isFinite(d)) {
      return 0;
    }

    const cubicFeet = l * w * (d / 12);
    return cubicFeet / 27;
  }, [depthInches, length, width]);

  return (
    <div className="mx-auto max-w-4xl space-y-8 px-4 py-12 md:py-16">
      <section className="space-y-4">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          Material Calculator
        </p>
        <h1 className="[font-family:var(--font-display)] text-4xl text-primary md:text-5xl">
          Estimate Cubic Yards In Seconds
        </h1>
      </section>

      <section className="rounded-2xl border bg-card p-6">
        <div className="grid gap-4 sm:grid-cols-3">
          <label className="space-y-2 text-sm font-semibold">
            Length (ft)
            <input
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={length}
              onChange={(event) => setLength(event.target.value)}
              inputMode="decimal"
            />
          </label>
          <label className="space-y-2 text-sm font-semibold">
            Width (ft)
            <input
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={width}
              onChange={(event) => setWidth(event.target.value)}
              inputMode="decimal"
            />
          </label>
          <label className="space-y-2 text-sm font-semibold">
            Depth (in)
            <input
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={depthInches}
              onChange={(event) => setDepthInches(event.target.value)}
              inputMode="decimal"
            />
          </label>
        </div>
        <p className="mt-6 text-2xl font-semibold text-primary">{yards.toFixed(2)} cubic yards</p>
        <p className="mt-2 text-sm text-muted-foreground">
          Formula: `Length x Width x (Depth/12) / 27`.
        </p>
      </section>
    </div>
  );
}
