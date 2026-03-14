"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowRight, Calculator, Phone, Truck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const PROJECT_TYPES = [
  { id: "driveway", label: "Driveway", icon: "🛤️", defaultDepth: "4", material: "Gravel / Bluestone" },
  { id: "garden-bed", label: "Garden Bed", icon: "🌿", defaultDepth: "3", material: "Mulch / Topsoil" },
  { id: "patio-base", label: "Patio Base", icon: "🧱", defaultDepth: "4", material: "Bluestone Screenings" },
  { id: "lawn", label: "Lawn / Topsoil", icon: "🌱", defaultDepth: "2", material: "Screened Topsoil" },
  { id: "fill", label: "Fill / Grade", icon: "🚜", defaultDepth: "6", material: "Clean Fill / Bank Run" },
  { id: "custom", label: "Custom", icon: "📐", defaultDepth: "3", material: "Any material" },
];

const MATERIAL_PRICES: Array<{ name: string; slug: string; pricePerYard: number }> = [
  { name: "Black Mulch", slug: "black-mulch", pricePerYard: 30 },
  { name: "Dark Natural Mulch", slug: "dark-natural-mulch", pricePerYard: 20 },
  { name: "Screened Topsoil", slug: "topsoil-screened-organic", pricePerYard: 24 },
  { name: "3/4\" Bluestone", slug: "34-inch-bluestone", pricePerYard: 88 },
  { name: "3/4\" Wash Gravel", slug: "34-inch-wash-gravel", pricePerYard: 80 },
  { name: "Bluestone Screenings", slug: "bluestone-screenings-stone-dust-fines", pricePerYard: 85 },
  { name: "State RCA", slug: "state-grade-rca-95-concrete-made-to-spec-not-certified", pricePerYard: 27 },
  { name: "Regular RCA", slug: "regular-rca-blend-of-concrete-brick-and-blacktop", pricePerYard: 20 },
  { name: "Fine Sand", slug: "fine-sand", pricePerYard: 60 },
  { name: "Clean Fill", slug: "clean-fill-exc-dirt-unscreened", pricePerYard: 15 },
  { name: "Compost", slug: "compost-certified-organic-rich-in-nutrients", pricePerYard: 32 },
  { name: "3/8\" Pea Gravel", slug: "38-inch-pea-gravel", pricePerYard: 75 },
];

export default function CalculatorPage() {
  const [projectType, setProjectType] = useState("");
  const [length, setLength] = useState("20");
  const [width, setWidth] = useState("10");
  const [depthInches, setDepthInches] = useState("3");
  const [selectedMaterial, setSelectedMaterial] = useState("");

  const activeProject = PROJECT_TYPES.find((p) => p.id === projectType);

  const yards = useMemo(() => {
    const l = Number(length), w = Number(width), d = Number(depthInches);
    if (!Number.isFinite(l) || !Number.isFinite(w) || !Number.isFinite(d)) return 0;
    return (l * w * (d / 12)) / 27;
  }, [depthInches, length, width]);

  const roundedYards = Math.ceil(yards * 2) / 2; // Round up to nearest 0.5
  const material = MATERIAL_PRICES.find((m) => m.slug === selectedMaterial);
  const estimatedCost = material ? roundedYards * material.pricePerYard : null;

  return (
    <div>
      {/* Header */}
      <section className="bg-primary">
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 md:py-14">
          <div className="flex items-center gap-3">
            <Calculator className="size-8 text-accent" />
            <div>
              <h1 className="[font-family:var(--font-display)] text-3xl text-primary-foreground md:text-4xl">
                Material Calculator
              </h1>
              <p className="text-sm text-primary-foreground/60">Figure out how much you need in 30 seconds</p>
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-4xl space-y-8 px-4 py-10 sm:px-6">

        {/* Step 1: Project type */}
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <span className="flex size-7 items-center justify-center rounded-full bg-accent text-sm font-bold text-accent-foreground">1</span>
            <h2 className="text-lg font-semibold">What are you working on?</h2>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {PROJECT_TYPES.map((pt) => (
              <button
                key={pt.id}
                type="button"
                onClick={() => { setProjectType(pt.id); setDepthInches(pt.defaultDepth); }}
                className={`flex items-center gap-3 rounded-xl border p-4 text-left transition-all hover:border-accent/50 ${
                  projectType === pt.id ? "border-accent bg-accent/10" : ""
                }`}
              >
                <span className="text-2xl">{pt.icon}</span>
                <div>
                  <p className="text-sm font-semibold">{pt.label}</p>
                  <p className="text-xs text-muted-foreground">{pt.material}</p>
                </div>
              </button>
            ))}
          </div>
        </section>

        {/* Step 2: Dimensions */}
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <span className="flex size-7 items-center justify-center rounded-full bg-accent text-sm font-bold text-accent-foreground">2</span>
            <h2 className="text-lg font-semibold">Enter your dimensions</h2>
          </div>
          <div className="rounded-xl border bg-card p-5">
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <label className="mb-1 block text-sm font-medium">Length (ft)</label>
                <Input value={length} onChange={(e) => setLength(e.target.value)} inputMode="decimal" className="text-lg" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Width (ft)</label>
                <Input value={width} onChange={(e) => setWidth(e.target.value)} inputMode="decimal" className="text-lg" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Depth (inches)</label>
                <Input value={depthInches} onChange={(e) => setDepthInches(e.target.value)} inputMode="decimal" className="text-lg" />
                {activeProject && <p className="mt-1 text-xs text-muted-foreground">Recommended: {activeProject.defaultDepth}&quot; for {activeProject.label.toLowerCase()}</p>}
              </div>
            </div>

            {/* Show the math */}
            <div className="mt-5 rounded-lg bg-muted/50 p-4">
              <p className="text-sm text-muted-foreground">
                {length} ft &times; {width} ft &times; {depthInches}&quot; depth &divide; 324 =
              </p>
              <p className="mt-1 text-3xl font-bold text-accent">{roundedYards.toFixed(1)} cubic yards</p>
              <p className="text-xs text-muted-foreground">(Rounded up to nearest half yard: {yards.toFixed(2)} yd exact)</p>
            </div>
          </div>
        </section>

        {/* Step 3: Material + price */}
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <span className="flex size-7 items-center justify-center rounded-full bg-accent text-sm font-bold text-accent-foreground">3</span>
            <h2 className="text-lg font-semibold">Pick a material for pricing</h2>
          </div>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {MATERIAL_PRICES.map((mat) => (
              <button
                key={mat.slug}
                type="button"
                onClick={() => setSelectedMaterial(mat.slug)}
                className={`flex items-center justify-between rounded-lg border p-3 text-left transition-all hover:border-accent/50 ${
                  selectedMaterial === mat.slug ? "border-accent bg-accent/10" : ""
                }`}
              >
                <span className="text-sm font-medium">{mat.name}</span>
                <span className="text-sm font-bold text-accent">${mat.pricePerYard}/yd</span>
              </button>
            ))}
          </div>
        </section>

        {/* Result */}
        {estimatedCost !== null && roundedYards > 0 && (
          <section className="rounded-xl border-2 border-accent/30 bg-accent/5 p-6 space-y-4">
            <h2 className="text-lg font-semibold">Your Estimate</h2>
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <p className="text-xs text-muted-foreground">Material</p>
                <p className="text-sm font-semibold">{material?.name}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Quantity</p>
                <p className="text-sm font-semibold">{roundedYards.toFixed(1)} cubic yards</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Material cost</p>
                <p className="text-2xl font-bold text-accent">${estimatedCost.toFixed(2)}</p>
                <p className="text-xs text-muted-foreground">+ delivery &amp; tax at checkout</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-3 pt-2">
              <Button asChild size="lg" className="bg-accent text-accent-foreground hover:bg-accent/90">
                <Link href={`/shop/${material?.slug}`}>
                  <Truck className="size-4" /> Order {material?.name}
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link href="/shop">Browse Other Materials</Link>
              </Button>
            </div>
          </section>
        )}

        {/* Phone fallback */}
        <section className="rounded-xl border bg-card p-5 text-center">
          <p className="text-sm font-semibold">Not sure what material you need?</p>
          <p className="mt-1 text-sm text-muted-foreground">Call us — we help people figure this out every day.</p>
          <Button asChild variant="outline" size="lg" className="mt-3">
            <a href="tel:+16318746244">
              <Phone className="size-4" /> (631) 874-6244
            </a>
          </Button>
        </section>
      </div>
    </div>
  );
}
