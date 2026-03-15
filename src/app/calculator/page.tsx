"use client";

import { useState } from "react";
import { Calculator, Phone } from "lucide-react";
import { MulchCalculator } from "@/components/calculators/mulch-calculator";
import { TopsoilCalculator } from "@/components/calculators/topsoil-calculator";
import { DrivewayCalculator } from "@/components/calculators/driveway-calculator";
import { BaseCalculator } from "@/components/calculators/base-calculator";
import { FillCalculator } from "@/components/calculators/fill-calculator";
import { RcaCalculator } from "@/components/calculators/rca-calculator";
import { SandCalculator } from "@/components/calculators/sand-calculator";

const CALCULATORS = [
  { id: "mulch", label: "Mulch", icon: "🌿", desc: "Garden beds, tree rings" },
  { id: "topsoil", label: "Topsoil", icon: "🌱", desc: "Lawns, gardens, grading" },
  { id: "driveway", label: "Driveway", icon: "🛤️", desc: "Base + surface stone" },
  { id: "base", label: "Patio / Shed Base", icon: "🧱", desc: "Crushed stone base" },
  { id: "rca", label: "RCA", icon: "🚜", desc: "Recycled aggregate" },
  { id: "fill", label: "Fill", icon: "📐", desc: "Grade raising, backfill" },
  { id: "sand", label: "Sand", icon: "⏳", desc: "Paver bedding, masonry" },
];

export default function CalculatorPage() {
  const [active, setActive] = useState("mulch");

  return (
    <div>
      <section className="bg-primary">
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 md:py-14">
          <div className="flex items-center gap-3">
            <Calculator className="size-8 text-accent" />
            <div>
              <h1 className="[font-family:var(--font-display)] text-3xl text-primary-foreground md:text-4xl">
                Material Calculator
              </h1>
              <p className="text-sm text-primary-foreground/60">
                Calculate cubic yards, see the price, add to cart — all in one step.
              </p>
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 md:py-12">
        {/* Calculator selector */}
        <div className="mb-8 grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
          {CALCULATORS.map((calc) => (
            <button
              key={calc.id}
              onClick={() => setActive(calc.id)}
              className={`flex flex-col items-center gap-1 rounded-xl border p-3 text-center transition-all ${
                active === calc.id ? "border-accent bg-accent/10 shadow-sm" : "hover:border-accent/40 hover:bg-muted/50"
              }`}
            >
              <span className="text-2xl">{calc.icon}</span>
              <span className="text-xs font-semibold">{calc.label}</span>
            </button>
          ))}
        </div>

        {/* Active calculator */}
        {active === "mulch" && <MulchCalculator />}
        {active === "topsoil" && <TopsoilCalculator />}
        {active === "driveway" && <DrivewayCalculator />}
        {active === "base" && <BaseCalculator />}
        {active === "rca" && <RcaCalculator />}
        {active === "fill" && <FillCalculator />}
        {active === "sand" && <SandCalculator />}

        {/* Bottom help */}
        <div className="mt-8 rounded-xl border bg-card p-5 text-center">
          <p className="text-sm font-semibold">Not sure which calculator to use?</p>
          <p className="mt-1 text-sm text-muted-foreground">Call us — we help people figure this out every day.</p>
          <a href="tel:+16318746244" className="mt-3 inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-semibold hover:border-accent/40 hover:text-accent transition-colors">
            <Phone className="size-4" /> (631) 874-6244
          </a>
        </div>
      </div>
    </div>
  );
}
