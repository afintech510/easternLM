"use client";

import Link from "next/link";
import { useState } from "react";
import {
  ArrowRight,
  Baby,
  Blocks,
  Car,
  Compass,
  Construction,
  Dog,
  Droplets,
  Fence,
  Flame,
  Flower,
  Footprints,
  Home,
  Layers,
  Mountain,
  Palette,
  Phone,
  Ruler,
  Shield,
  Sprout,
  Trees,
  Truck,
  Warehouse,
  Waves,
} from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CalculatorByType } from "@/components/calculators/calculator-by-type";
import { ServiceQuoteForm } from "@/components/forms/service-quote-form";
import type { MaterialLandingPage, MaterialVariant, UseCase } from "@/lib/data/material-landing-pages";
import type { ShopProduct } from "@/lib/data/catalog";
import { siteConfig } from "@/config/site";

function formatUsd(cents: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);
}

const iconMap: Record<string, typeof Truck> = {
  sprout: Sprout, flower: Flower, ruler: Ruler, tree: Trees,
  home: Home, droplets: Droplets, shield: Shield,
  waves: Waves, baby: Baby, brick: Blocks, concrete: Construction,
  drain: Droplets, hole: Mountain, foundation: Layers, pipe: Construction,
  footprints: Footprints, dog: Dog, car: Car, palette: Palette,
  layers: Layers, warehouse: Warehouse, construction: Construction,
  flame: Flame, mountain: Mountain, compass: Compass, fence: Fence,
  door: Home,
};

function UseCaseIcon({ name }: { name: string }) {
  const Icon = iconMap[name] || Truck;
  return <Icon className="size-6 text-accent" />;
}

type Props = {
  page: MaterialLandingPage;
  products: ShopProduct[];
};

export function MaterialLandingClient({ page, products }: Props) {
  const [showQuoteForm, setShowQuoteForm] = useState(false);

  const productMap = new Map(products.map((p) => [p.slug, p]));

  return (
    <div className="space-y-0">
      {/* ── Hero ─────────────────────────────────────── */}
      <section className="bg-primary">
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 md:py-14">
          <Badge className="bg-accent/20 text-accent border-0 text-xs">{page.seasonalCta}</Badge>
          <h1 className="mt-3 [font-family:var(--font-display)] text-3xl text-primary-foreground md:text-5xl">
            {page.heroTitle}
          </h1>
          <p className="mt-3 max-w-2xl text-base text-primary-foreground/60">{page.heroSubtitle}</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button asChild size="lg" className="bg-accent text-accent-foreground hover:bg-accent/90">
              <a href="#products">Shop Now <ArrowRight className="ml-1 size-4" /></a>
            </Button>
            <Button asChild variant="outline" size="lg" className="border-primary-foreground/30 bg-transparent text-primary-foreground hover:bg-primary-foreground/10">
              <a href="#calculator">Calculate How Much</a>
            </Button>
          </div>
          <div className="mt-6 flex flex-wrap gap-4 text-sm text-primary-foreground/50">
            <span className="flex items-center gap-1.5"><Truck className="size-4 text-accent" /> Free pickup · Delivery available</span>
            <span className="flex items-center gap-1.5"><Phone className="size-4 text-accent" /> {siteConfig.phoneDisplay}</span>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-7xl space-y-12 px-4 py-10 sm:px-6 md:py-14">
        {/* ── Product Variants ───────────────────────── */}
        <section id="products">
          <h2 className="mb-2 [font-family:var(--font-display)] text-2xl text-primary md:text-3xl">
            Choose Your {page.title}
          </h2>
          <p className="mb-6 text-sm text-muted-foreground">All prices per cubic yard. Delivered or pick up at our yard.</p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {page.variants.map((variant) => {
              const product = productMap.get(variant.productSlug);
              return (
                <VariantCard key={variant.productSlug} variant={variant} product={product} />
              );
            })}
          </div>
        </section>

        {/* ── Use Cases ──────────────────────────────── */}
        <section>
          <h2 className="mb-6 [font-family:var(--font-display)] text-2xl text-primary md:text-3xl">
            Common Uses
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {page.useCases.map((uc) => (
              <div key={uc.title} className="flex gap-4 rounded-xl border bg-card p-4">
                <div className="flex size-12 shrink-0 items-center justify-center rounded-lg bg-accent/10">
                  <UseCaseIcon name={uc.icon} />
                </div>
                <div>
                  <p className="font-semibold">{uc.title}</p>
                  <p className="mt-0.5 text-sm text-muted-foreground">{uc.description}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── Calculator ─────────────────────────────── */}
        {page.calculatorType && (
          <section id="calculator">
            <h2 className="mb-2 [font-family:var(--font-display)] text-2xl text-primary md:text-3xl">
              How Much Do I Need?
            </h2>
            <p className="mb-6 text-sm text-muted-foreground">Enter your project dimensions — we'll calculate cubic yards and cost.</p>
            <div className="max-w-xl">
              <CalculatorByType type={page.calculatorType} />
            </div>
          </section>
        )}

        {/* ── Service Upsell ─────────────────────────── */}
        <section className="rounded-2xl bg-primary p-6 md:p-10">
          <div className="grid gap-6 md:grid-cols-2 md:items-center">
            <div>
              <h2 className="[font-family:var(--font-display)] text-2xl text-primary-foreground md:text-3xl">
                {page.serviceUpsell.headline}
              </h2>
              <p className="mt-3 text-primary-foreground/60">{page.serviceUpsell.description}</p>
              <Button
                size="lg"
                className="mt-6 bg-accent text-accent-foreground hover:bg-accent/90"
                onClick={() => setShowQuoteForm(!showQuoteForm)}
              >
                {page.serviceUpsell.cta} <ArrowRight className="ml-1 size-4" />
              </Button>
            </div>
            <div className="text-sm text-primary-foreground/50 space-y-2">
              <p className="flex items-center gap-2"><Truck className="size-4 text-accent" /> Materials from our yard — no markup</p>
              <p className="flex items-center gap-2"><Phone className="size-4 text-accent" /> Or call {siteConfig.phoneDisplay}</p>
            </div>
          </div>
          {showQuoteForm && (
            <div className="mt-8 rounded-xl bg-background p-6">
              <ServiceQuoteForm serviceCategory={page.serviceUpsell.serviceCategory as "driveways" | "landscaping" | "masonry" | "maintenance"} />
            </div>
          )}
        </section>

        {/* ── FAQ ────────────────────────────────────── */}
        <section id="faq">
          <h2 className="mb-6 [font-family:var(--font-display)] text-2xl text-primary md:text-3xl">
            Frequently Asked Questions
          </h2>
          <Accordion type="multiple" className="rounded-xl border bg-card">
            {page.faqs.map((faq, i) => (
              <AccordionItem key={i} value={`faq-${i}`} className="border-b last:border-0">
                <AccordionTrigger className="px-5 py-4 text-left text-sm font-medium hover:no-underline">
                  {faq.q}
                </AccordionTrigger>
                <AccordionContent className="px-5 pb-4 text-sm text-muted-foreground">
                  {faq.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </section>

        {/* ── Related Materials ──────────────────────── */}
        {page.relatedSlugs.length > 0 && (
          <section>
            <h2 className="mb-4 [font-family:var(--font-display)] text-2xl text-primary">
              Related Materials
            </h2>
            <div className="flex flex-wrap gap-3">
              {page.relatedSlugs.map((slug) => (
                <Button key={slug} asChild variant="outline" size="sm">
                  <Link href={`/buy/${slug}`}>
                    {slug.split("-").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ")}
                    <ArrowRight className="ml-1 size-3" />
                  </Link>
                </Button>
              ))}
            </div>
          </section>
        )}

        {/* ── Bottom CTA ─────────────────────────────── */}
        <section className="rounded-xl border-2 border-accent/25 bg-accent/5 p-6 text-center md:p-10">
          <h2 className="[font-family:var(--font-display)] text-2xl text-primary md:text-3xl">
            Ready to Order?
          </h2>
          <p className="mx-auto mt-2 max-w-lg text-sm text-muted-foreground">
            Browse our full selection, add to cart, and check out online. We calculate delivery fees at checkout based on your address.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Button asChild size="lg" className="bg-accent text-accent-foreground hover:bg-accent/90">
              <Link href="/shop">Shop All Materials <ArrowRight className="ml-1 size-4" /></Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <a href={siteConfig.phoneHref}>
                <Phone className="size-4" /> Call {siteConfig.phoneDisplay}
              </a>
            </Button>
          </div>
        </section>
      </div>
    </div>
  );
}

function VariantCard({ variant, product }: { variant: MaterialVariant; product?: ShopProduct }) {
  return (
    <Link
      href={product ? `/shop/${product.slug}` : `/shop?q=${encodeURIComponent(variant.name)}`}
      className="group rounded-xl border bg-card p-5 transition-all hover:border-accent/30 hover:shadow-md"
    >
      <div className="flex items-start justify-between">
        <h3 className="font-semibold group-hover:text-accent">{variant.name}</h3>
        {variant.badge && (
          <Badge className="bg-accent/10 text-accent border-0 text-xs shrink-0">{variant.badge}</Badge>
        )}
      </div>
      <p className="mt-2 text-sm text-muted-foreground">{variant.description}</p>
      {product && (
        <p className="mt-3 text-lg font-bold text-accent">
          {formatUsd(product.pricePerUnitCents)}
          <span className="ml-1 text-sm font-normal text-muted-foreground">{product.unitDisplay}</span>
        </p>
      )}
      <p className="mt-2 flex items-center gap-1 text-xs text-accent group-hover:underline">
        View Details <ArrowRight className="size-3" />
      </p>
    </Link>
  );
}
