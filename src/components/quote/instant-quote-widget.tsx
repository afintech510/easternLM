"use client";

import Link from "next/link";
import { ArrowRight, Calculator } from "lucide-react";
import { Button } from "@/components/ui/button";

const PROJECTS = [
  { href: "/quote", icon: "🛤️", label: "Driveway" },
  { href: "/quote", icon: "🌿", label: "Mulch" },
  { href: "/quote", icon: "🌱", label: "Topsoil" },
  { href: "/quote", icon: "🏠", label: "Patio Base" },
  { href: "/quote", icon: "📐", label: "Fill" },
  { href: "/quote", icon: "🧱", label: "Sand" },
];

export function InstantQuoteWidget() {
  return (
    <div className="rounded-xl border-2 border-accent/25 bg-accent/5 p-6">
      <div className="flex items-center gap-3 mb-4">
        <Calculator className="size-6 text-accent" />
        <div>
          <h3 className="text-lg font-semibold">Get an Instant Quote</h3>
          <p className="text-sm text-muted-foreground">Pick your project — see the price in seconds.</p>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
        {PROJECTS.map((p) => (
          <Link key={p.label} href={p.href} className="flex flex-col items-center gap-1 rounded-lg border bg-card p-3 text-center transition-all hover:border-accent/40 hover:shadow-sm">
            <span className="text-xl">{p.icon}</span>
            <span className="text-xs font-medium">{p.label}</span>
          </Link>
        ))}
      </div>
      <Button asChild className="mt-4 w-full bg-accent text-accent-foreground hover:bg-accent/90" size="lg">
        <Link href="/quote">Start Your Quote <ArrowRight className="size-4" /></Link>
      </Button>
    </div>
  );
}
