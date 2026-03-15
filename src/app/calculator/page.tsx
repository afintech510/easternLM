"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowRight, Calculator, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cubicYards } from "@/lib/calculators";

const CALCULATORS = [
  { href: "/calculator/driveway", icon: "🛤️", title: "Driveway", desc: "Gravel, RCA, resurfacing" },
  { href: "/calculator/mulch", icon: "🌿", title: "Mulch Beds", desc: "Garden beds, tree rings" },
  { href: "/calculator/topsoil", icon: "🌱", title: "New Lawn / Topsoil", desc: "Seeding, sod, top-dressing" },
  { href: "/calculator/shed-base", icon: "🏠", title: "Shed / Patio Base", desc: "Crushed stone base layer" },
  { href: "/calculator/fill", icon: "📐", title: "Fill a Hole / Grade", desc: "Clean fill, bank run" },
  { href: "/calculator/rca", icon: "🚜", title: "RCA Base", desc: "Recycled concrete aggregate" },
  { href: "/calculator/sand", icon: "🧱", title: "Paver Bedding / Sand", desc: "Fine sand, concrete sand" },
];

export default function CalculatorHubPage() {
  const [length, setLength] = useState("");
  const [width, setWidth] = useState("");
  const [depth, setDepth] = useState("");

  const quickResult = useMemo(() => {
    const l = Number(length), w = Number(width), d = Number(depth);
    if (!l || !w || !d) return null;
    const exact = cubicYards(l, w, d);
    const rounded = Math.ceil(exact * 2) / 2;
    return { exact, rounded };
  }, [length, width, depth]);

  return (
    <div>
      <section className="bg-primary">
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 md:py-14">
          <div className="flex items-center gap-3">
            <Calculator className="size-8 text-accent" />
            <div>
              <h1 className="[font-family:var(--font-display)] text-3xl text-primary-foreground md:text-4xl">
                Material Calculators
              </h1>
              <p className="text-sm text-primary-foreground/60">
                Figure out how much you need, see the price, add to cart.
              </p>
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 md:py-12 space-y-10">
        {/* Project selector */}
        <section>
          <h2 className="mb-5 text-lg font-semibold">What are you working on?</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {CALCULATORS.map((calc) => (
              <Link
                key={calc.href}
                href={calc.href}
                className="group flex items-start gap-4 rounded-xl border bg-card p-5 transition-all hover:border-accent/40 hover:shadow-md"
              >
                <span className="text-3xl">{calc.icon}</span>
                <div>
                  <p className="font-semibold group-hover:text-accent">{calc.title}</p>
                  <p className="mt-0.5 text-sm text-muted-foreground">{calc.desc}</p>
                </div>
                <ArrowRight className="ml-auto mt-1 size-4 shrink-0 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
              </Link>
            ))}
          </div>
        </section>

        {/* Quick yardage calculator */}
        <section className="rounded-xl border bg-card p-6">
          <h2 className="text-lg font-semibold">Quick Yardage Estimate</h2>
          <p className="mt-1 text-sm text-muted-foreground">Just need cubic yards? Enter length, width, and depth.</p>
          <div className="mt-4 grid grid-cols-3 gap-3">
            <div>
              <label className="mb-1 block text-sm font-medium">Length</label>
              <div className="flex items-center gap-1">
                <input type="text" inputMode="decimal" value={length} onChange={(e) => setLength(e.target.value)} placeholder="20" className="h-10 w-full rounded-md border border-input bg-background px-3 text-lg font-semibold" />
                <span className="text-sm text-muted-foreground">ft</span>
              </div>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Width</label>
              <div className="flex items-center gap-1">
                <input type="text" inputMode="decimal" value={width} onChange={(e) => setWidth(e.target.value)} placeholder="10" className="h-10 w-full rounded-md border border-input bg-background px-3 text-lg font-semibold" />
                <span className="text-sm text-muted-foreground">ft</span>
              </div>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Depth</label>
              <div className="flex items-center gap-1">
                <input type="text" inputMode="decimal" value={depth} onChange={(e) => setDepth(e.target.value)} placeholder="3" className="h-10 w-full rounded-md border border-input bg-background px-3 text-lg font-semibold" />
                <span className="text-sm text-muted-foreground">in</span>
              </div>
            </div>
          </div>
          {quickResult && (
            <div className="mt-4 rounded-lg bg-accent/5 border border-accent/20 p-4">
              <p className="text-sm text-muted-foreground">{length} × {width} × {depth}" ÷ 12 ÷ 27 = {quickResult.exact.toFixed(2)} yd</p>
              <p className="mt-1 text-2xl font-bold text-accent">{quickResult.rounded.toFixed(1)} cubic yards</p>
              <p className="mt-1 text-xs text-muted-foreground">Rounded up to nearest half yard</p>
              <Button asChild className="mt-3" size="sm">
                <Link href="/shop">Shop Materials <ArrowRight className="size-4" /></Link>
              </Button>
            </div>
          )}
        </section>

        {/* Phone */}
        <div className="rounded-xl border bg-card p-5 text-center">
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
