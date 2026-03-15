"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowLeft, ArrowRight, Calculator, Phone, ShoppingCart, Truck, Users } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ServiceQuoteForm } from "@/components/forms/service-quote-form";
import { useCartStore } from "@/stores/cartStore";
import {
  cubicYards,
  drivewayCalculation,
  mulchCalculation,
  topsoilCalculation,
  baseCalculation,
  fillCalculation,
  rcaCalculation,
  sandCalculation,
} from "@/lib/calculators";
import { trackCalcEvent } from "@/lib/calculator-events";

function formatUsd(cents: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);
}

// ─── Project types ────────────────────────────────────────────────

type ProjectType = "driveway" | "mulch" | "topsoil" | "base" | "fill" | "rca" | "sand";

const PROJECTS: Array<{ id: ProjectType; icon: string; label: string; desc: string; service: string }> = [
  { id: "driveway", icon: "🛤️", label: "Driveway", desc: "New or resurface", service: "driveways" },
  { id: "mulch", icon: "🌿", label: "Garden Beds / Mulch", desc: "Beds, tree rings, borders", service: "landscaping" },
  { id: "topsoil", icon: "🌱", label: "New Lawn / Topsoil", desc: "Seeding, sod, grading", service: "landscaping" },
  { id: "base", icon: "🏠", label: "Shed / Patio Base", desc: "Crushed stone base", service: "masonry" },
  { id: "fill", icon: "📐", label: "Fill / Grading", desc: "Low spots, backfill", service: "driveways" },
  { id: "rca", icon: "🚜", label: "RCA Base", desc: "Parking, roads", service: "driveways" },
  { id: "sand", icon: "🧱", label: "Paver Bedding", desc: "Sand for pavers", service: "masonry" },
];

// ─── Material line item ───────────────────────────────────────────

type MaterialLine = { name: string; slug: string; yards: number; priceCents: number };

// ─── Component ────────────────────────────────────────────────────

export function InstantQuoteFlow() {
  const [step, setStep] = useState(1);
  const [project, setProject] = useState<ProjectType | null>(null);
  const [materials, setMaterials] = useState<MaterialLine[]>([]);
  const [showInstall, setShowInstall] = useState(false);
  const addItem = useCartStore((s) => s.addItem);

  // Step 2 inputs
  const [length, setLength] = useState("20");
  const [width, setWidth] = useState("10");
  const [depth, setDepth] = useState("3");
  const [depth2, setDepth2] = useState("2");
  const [mulchColor, setMulchColor] = useState("black-mulch");
  const [purpose, setPurpose] = useState("new-lawn");
  const [rcaGrade, setRcaGrade] = useState("state");

  const selectedProject = PROJECTS.find((p) => p.id === project);

  function selectProject(id: ProjectType) {
    setProject(id);
    setStep(2);
    // Set sensible defaults per project
    if (id === "driveway") { setLength("50"); setWidth("12"); setDepth("4"); setDepth2("2"); }
    if (id === "mulch") { setLength("20"); setWidth("10"); setDepth("3"); }
    if (id === "topsoil") { setLength("30"); setWidth("20"); setDepth("4"); }
    if (id === "base") { setLength("10"); setWidth("10"); setDepth("4"); }
    if (id === "fill") { setLength("15"); setWidth("10"); setDepth("6"); }
    if (id === "rca") { setLength("20"); setWidth("20"); setDepth("6"); }
    if (id === "sand") { setLength("15"); setWidth("10"); setDepth("1"); }
    trackCalcEvent("calculator_started", { project_type: id });
  }

  function calculate() {
    const l = Number(length), w = Number(width), d = Number(depth), d2 = Number(depth2);
    const lines: MaterialLine[] = [];

    switch (project) {
      case "driveway": {
        const calc = drivewayCalculation({ lengthFt: l, widthFt: w, baseDepthInches: d, surfaceDepthInches: d2 });
        if (calc.baseYards > 0) lines.push({ name: "State Grade RCA (base)", slug: "state-grade-rca-95-concrete-made-to-spec-not-certified", yards: calc.baseYards, priceCents: 2700 });
        if (calc.surfaceYards > 0) lines.push({ name: "3/4\" Bluestone (surface)", slug: "34-inch-bluestone", yards: calc.surfaceYards, priceCents: 8800 });
        break;
      }
      case "mulch": {
        const calc = mulchCalculation({ sqFt: l * w, depthInches: d });
        const prices: Record<string, number> = { "dark-natural-mulch": 2000, "black-mulch": 3000, "chocolate-mulch": 3000, "red-mulch": 3800 };
        const names: Record<string, string> = { "dark-natural-mulch": "Dark Natural Mulch", "black-mulch": "Black Mulch", "chocolate-mulch": "Chocolate Mulch", "red-mulch": "Red Mulch" };
        lines.push({ name: names[mulchColor] || "Black Mulch", slug: mulchColor, yards: calc.yards, priceCents: prices[mulchColor] || 3000 });
        break;
      }
      case "topsoil": {
        const calc = topsoilCalculation({ sqFt: l * w, depthInches: d, purpose: purpose as "new-lawn" | "top-dress" | "garden-bed" | "fill" });
        lines.push({ name: "Screened Topsoil", slug: "topsoil-screened-organic", yards: calc.yards, priceCents: 2400 });
        break;
      }
      case "base": {
        const calc = baseCalculation({ lengthFt: l, widthFt: w, depthInches: d, addEdgeBuffer: true });
        lines.push({ name: "3/4\" Crushed Bluestone", slug: "34-inch-bluestone", yards: calc.yards, priceCents: 8800 });
        break;
      }
      case "fill": {
        const calc = fillCalculation({ lengthFt: l, widthFt: w, depthInches: d });
        lines.push({ name: "Clean Fill", slug: "clean-fill-exc-dirt-unscreened", yards: calc.yards, priceCents: 1500 });
        break;
      }
      case "rca": {
        const calc = rcaCalculation({ lengthFt: l, widthFt: w, depthInches: d, grade: rcaGrade as "state" | "regular" });
        const slug = rcaGrade === "state" ? "state-grade-rca-95-concrete-made-to-spec-not-certified" : "regular-rca-blend-of-concrete-brick-and-blacktop";
        lines.push({ name: rcaGrade === "state" ? "State Grade RCA" : "Regular RCA", slug, yards: calc.yards, priceCents: rcaGrade === "state" ? 2700 : 2000 });
        break;
      }
      case "sand": {
        const calc = sandCalculation({ sqFt: l * w, depthInches: d, type: "paver-bedding" });
        lines.push({ name: "Fine Sand", slug: "fine-sand", yards: calc.yards, priceCents: 6000 });
        break;
      }
    }

    setMaterials(lines);
    setStep(3);
    const totalCents = lines.reduce((s, m) => s + Math.round(m.yards * m.priceCents), 0);
    trackCalcEvent("calculator_completed", { project_type: project, yards: lines.reduce((s, m) => s + m.yards, 0), estimated_price_cents: totalCents });
  }

  function handleAddToCart() {
    for (const m of materials) {
      addItem({ id: m.slug, name: m.name, quantity: m.yards, unitPriceCents: m.priceCents, deliveryType: "bulk", materialClass: "default" });
    }
    const totalCents = materials.reduce((s, m) => s + Math.round(m.yards * m.priceCents), 0);
    toast.success("Materials added to cart", { description: formatUsd(totalCents), action: { label: "View Cart", onClick: () => { window.location.href = "/cart"; } } });
    trackCalcEvent("quote_add_to_cart", { items: materials.map((m) => ({ slug: m.slug, yards: m.yards })), total_cents: totalCents });
  }

  const materialTotal = materials.reduce((s, m) => s + Math.round(m.yards * m.priceCents), 0);

  return (
    <div>
      {/* Header */}
      <section className="bg-primary">
        <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 md:py-10">
          <h1 className="[font-family:var(--font-display)] text-2xl text-primary-foreground md:text-4xl">
            {step === 1 ? "Get an Instant Quote" : step === 2 ? `${selectedProject?.label} — Enter Dimensions` : "Your Estimate"}
          </h1>
          <p className="mt-1 text-sm text-primary-foreground/60">
            {step === 1 ? "Pick your project. We'll calculate materials and price." : step === 2 ? "Enter your measurements for an instant price." : "Order materials or request professional installation."}
          </p>
          {/* Step dots */}
          <div className="mt-4 flex gap-2">
            {[1, 2, 3].map((s) => (
              <div key={s} className={`h-1.5 flex-1 rounded-full ${step >= s ? "bg-accent" : "bg-primary-foreground/20"}`} />
            ))}
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 md:py-12">

        {/* ── STEP 1: Project selection ──────────────────────── */}
        {step === 1 && (
          <div className="space-y-6">
            <div className="grid gap-3 sm:grid-cols-2">
              {PROJECTS.map((p) => (
                <button key={p.id} onClick={() => selectProject(p.id)}
                  className="flex items-start gap-4 rounded-xl border bg-card p-5 text-left transition-all hover:border-accent/40 hover:shadow-md">
                  <span className="text-3xl">{p.icon}</span>
                  <div>
                    <p className="font-semibold">{p.label}</p>
                    <p className="text-sm text-muted-foreground">{p.desc}</p>
                  </div>
                </button>
              ))}
            </div>
            <div className="rounded-xl border bg-card p-5 text-center">
              <p className="text-sm font-semibold">Something else?</p>
              <a href="tel:+16318746244" className="mt-2 inline-flex items-center gap-2 text-sm font-semibold text-accent hover:underline">
                <Phone className="size-4" /> Call (631) 874-6244
              </a>
            </div>
          </div>
        )}

        {/* ── STEP 2: Dimensions ─────────────────────────────── */}
        {step === 2 && (
          <div className="space-y-5">
            <Button variant="ghost" size="sm" onClick={() => setStep(1)}>
              <ArrowLeft className="size-4" /> Change project
            </Button>

            <div className="rounded-xl border bg-card p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-sm font-medium">Length</label>
                  <div className="flex items-center gap-1">
                    <Input value={length} onChange={(e) => setLength(e.target.value)} inputMode="decimal" className="text-lg font-semibold" />
                    <span className="text-sm text-muted-foreground">ft</span>
                  </div>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium">Width</label>
                  <div className="flex items-center gap-1">
                    <Input value={width} onChange={(e) => setWidth(e.target.value)} inputMode="decimal" className="text-lg font-semibold" />
                    <span className="text-sm text-muted-foreground">ft</span>
                  </div>
                </div>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">
                  {project === "driveway" ? "Base depth (RCA)" : "Depth"}
                </label>
                <div className="flex items-center gap-1">
                  <Input value={depth} onChange={(e) => setDepth(e.target.value)} inputMode="decimal" className="w-24 text-lg font-semibold" />
                  <span className="text-sm text-muted-foreground">inches</span>
                </div>
              </div>

              {project === "driveway" && (
                <div>
                  <label className="mb-1 block text-sm font-medium">Surface depth (bluestone)</label>
                  <div className="flex items-center gap-1">
                    <Input value={depth2} onChange={(e) => setDepth2(e.target.value)} inputMode="decimal" className="w-24 text-lg font-semibold" />
                    <span className="text-sm text-muted-foreground">inches</span>
                  </div>
                </div>
              )}

              {project === "mulch" && (
                <div>
                  <label className="mb-1 block text-sm font-medium">Mulch color</label>
                  <select value={mulchColor} onChange={(e) => setMulchColor(e.target.value)} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
                    <option value="black-mulch">Black Mulch — $30/yd</option>
                    <option value="chocolate-mulch">Chocolate Mulch — $30/yd</option>
                    <option value="dark-natural-mulch">Dark Natural — $20/yd</option>
                    <option value="red-mulch">Red Mulch — $38/yd</option>
                  </select>
                </div>
              )}

              {project === "topsoil" && (
                <div>
                  <label className="mb-1 block text-sm font-medium">Purpose</label>
                  <select value={purpose} onChange={(e) => setPurpose(e.target.value)} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
                    <option value="new-lawn">New lawn</option>
                    <option value="top-dress">Top-dress existing lawn</option>
                    <option value="garden-bed">Garden bed</option>
                    <option value="fill">Fill / grading</option>
                  </select>
                </div>
              )}

              {project === "rca" && (
                <div>
                  <label className="mb-1 block text-sm font-medium">Grade</label>
                  <select value={rcaGrade} onChange={(e) => setRcaGrade(e.target.value)} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
                    <option value="state">State Grade ($27/yd) — 95% concrete</option>
                    <option value="regular">Regular ($20/yd) — concrete/brick mix</option>
                  </select>
                </div>
              )}
            </div>

            <Button size="lg" className="w-full bg-accent text-accent-foreground hover:bg-accent/90" onClick={calculate}>
              Calculate My Quote <ArrowRight className="size-4" />
            </Button>
          </div>
        )}

        {/* ── STEP 3: Results — dual path ────────────────────── */}
        {step === 3 && !showInstall && (
          <div className="space-y-5">
            <Button variant="ghost" size="sm" onClick={() => setStep(2)}>
              <ArrowLeft className="size-4" /> Adjust dimensions
            </Button>

            <div className="grid gap-6 lg:grid-cols-2">
              {/* LEFT: Order Materials */}
              <div className="rounded-xl border-2 border-accent/25 bg-card p-6 space-y-4">
                <div className="flex items-center gap-2">
                  <ShoppingCart className="size-5 text-accent" />
                  <h2 className="text-lg font-semibold">Order Materials</h2>
                </div>

                <div className="space-y-2">
                  {materials.map((m) => (
                    <div key={m.slug} className="flex justify-between text-sm">
                      <span>{m.yards.toFixed(1)} yd — {m.name}</span>
                      <span className="font-semibold">{formatUsd(Math.round(m.yards * m.priceCents))}</span>
                    </div>
                  ))}
                  <div className="flex justify-between border-t pt-2 text-base font-bold">
                    <span>Materials</span>
                    <span className="text-accent">{formatUsd(materialTotal)}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">+ delivery fee and tax at checkout</p>
                </div>

                <Button size="lg" className="w-full bg-accent text-accent-foreground hover:bg-accent/90" onClick={handleAddToCart}>
                  <ShoppingCart className="size-4" /> Add to Cart — {formatUsd(materialTotal)}
                </Button>

                <p className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Truck className="size-3" /> Same-day delivery — order by 11 AM
                </p>
              </div>

              {/* RIGHT: Installation */}
              <div className="rounded-xl border bg-card p-6 space-y-4">
                <div className="flex items-center gap-2">
                  <Users className="size-5 text-primary" />
                  <h2 className="text-lg font-semibold">We&apos;ll Install It</h2>
                </div>

                <p className="text-sm text-muted-foreground">
                  Get a free quote for professional {selectedProject?.label.toLowerCase()} work. Our crew handles everything: materials, prep, install, and cleanup.
                </p>

                <ul className="space-y-1 text-sm">
                  <li className="flex items-center gap-2"><Calculator className="size-4 text-primary" /> Materials from our own yard</li>
                  <li className="flex items-center gap-2"><Calculator className="size-4 text-primary" /> 30+ years experience</li>
                  <li className="flex items-center gap-2"><Calculator className="size-4 text-primary" /> Free on-site estimates</li>
                </ul>

                <Button size="lg" className="w-full" onClick={() => {
                  setShowInstall(true);
                  trackCalcEvent("quote_service_request", { service_type: selectedProject?.service, project_type: project });
                }}>
                  Get a Free Quote <ArrowRight className="size-4" />
                </Button>

                <a href="tel:+16318746244" className="flex items-center justify-center gap-2 text-sm text-muted-foreground hover:text-accent">
                  <Phone className="size-4" /> or call (631) 874-6244
                </a>
              </div>
            </div>
          </div>
        )}

        {/* ── STEP 3B: Installation quote form ───────────────── */}
        {step === 3 && showInstall && (
          <div className="space-y-5">
            <Button variant="ghost" size="sm" onClick={() => setShowInstall(false)}>
              <ArrowLeft className="size-4" /> Back to estimate
            </Button>
            <ServiceQuoteForm
              serviceCategory={selectedProject?.service === "driveways" ? "driveways" : selectedProject?.service === "masonry" ? "masonry" : "landscaping"}
            />
          </div>
        )}
      </div>

      {/* ── Mobile sticky bar (step 3) ────────────────────────── */}
      {step === 3 && !showInstall && materialTotal > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t bg-card p-3 shadow-lg lg:hidden">
          <div className="mx-auto flex max-w-lg items-center justify-between gap-3">
            <div>
              <p className="text-xs text-muted-foreground">Estimate</p>
              <p className="text-lg font-bold text-accent">{formatUsd(materialTotal)}</p>
            </div>
            <Button size="lg" className="bg-accent text-accent-foreground hover:bg-accent/90" onClick={handleAddToCart}>
              Add to Cart
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
