import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, Calculator, CheckCircle2, Phone, Truck, Users } from "lucide-react";
import { JsonLd } from "@/components/seo/json-ld";
import { ServiceQuoteForm } from "@/components/forms/service-quote-form";
import { CalculatorByType } from "@/components/calculators/calculator-by-type";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { siteConfig } from "@/config/site";

type ServicePageContent = {
  title: string;
  heroTitle: string;
  subtitle: string;
  services: string[];
  process: { step: string; detail: string }[];
  faqs: { question: string; answer: string }[];
  diyProducts: { name: string; slug: string }[];
  category: "driveways" | "landscaping" | "masonry" | "maintenance";
  calculatorType: string;
};

const serviceContent: Record<string, ServicePageContent> = {
  landscaping: {
    title: "Landscaping Services",
    heroTitle: "Landscaping Services — Suffolk County",
    subtitle: "Planting, grading, and garden design using materials from our yard.",
    services: [
      "Garden bed design & planting",
      "Soil grading and leveling",
      "Retaining walls & borders",
      "Seasonal enhancement packages",
      "Drainage solutions",
    ],
    process: [
      { step: "Site Walk", detail: "We visit your property to understand the terrain and what you need done." },
      { step: "Material Plan & Price", detail: "A detailed scope with material selection, quantities, and upfront pricing." },
      { step: "Crew Installs", detail: "Our crew handles delivery, install, and cleanup. Materials come from our yard." },
    ],
    faqs: [
      { question: "Do you provide materials as part of the service?", answer: "Yes. Materials come from our yard inventory, so we control quality and availability." },
      { question: "Can landscaping be split into phases?", answer: "Yes. We can stage work by budget, season, or access — whatever fits your timeline." },
      { question: "What areas do you serve?", answer: "We serve all of Suffolk County, from Patchogue to Southampton and everywhere in between." },
    ],
    diyProducts: [
      { name: "Topsoil", slug: "topsoil-fill" },
      { name: "Mulch", slug: "mulch" },
      { name: "Gravel & Stone", slug: "gravel-stone" },
    ],
    category: "landscaping",
    calculatorType: "mulch",
  },
  masonry: {
    title: "Masonry Services",
    heroTitle: "Masonry Services — Suffolk County",
    subtitle: "Stone patios, walkways, and walls built to handle Long Island winters.",
    services: [
      "Patios and walkways",
      "Retaining walls",
      "Outdoor fireplaces & fire pits",
      "Stone repair and reset work",
      "Block and brick veneer",
    ],
    process: [
      { step: "Layout & Grade Check", detail: "We assess elevation, drainage, and what the site needs structurally." },
      { step: "Base Prep & Drainage", detail: "We compact the base and add drainage so it doesn't settle or flood." },
      { step: "Install & Cleanup", detail: "Stone or block installation with proper jointing, sealing, and full cleanup." },
    ],
    faqs: [
      { question: "What materials do you install?", answer: "Natural stone, concrete pavers, and block systems — all from our supply yard." },
      { question: "Do you repair failed patios?", answer: "Yes. We lift and reset areas with proper base correction to fix the root cause." },
      { question: "How long does a typical patio take?", answer: "Most residential patios take 3-5 days depending on size and base conditions." },
    ],
    diyProducts: [
      { name: "Natural Stone", slug: "natural-stone" },
      { name: "Pavers", slug: "pavers" },
      { name: "Masonry & Concrete", slug: "masonry-concrete" },
    ],
    category: "masonry",
    calculatorType: "sand",
  },
  driveways: {
    title: "Driveway Services",
    heroTitle: "Gravel Driveway Installation — Suffolk County",
    subtitle: "New installs, resurfacing, and repairs. Materials from our yard, installed by our crew.",
    services: [
      "New gravel driveways",
      "Resurfacing and regrading",
      "Pothole and edge restoration",
      "Paver driveway installation",
      "Drainage correction",
    ],
    process: [
      { step: "Driveway Inspection", detail: "We look at the existing surface, base condition, grade, and drainage." },
      { step: "Material & Layering Plan", detail: "We pick the right stone and plan the layers for your traffic load and terrain." },
      { step: "Compact & Grade", detail: "Machine compaction for stability, final grading for runoff, and edge finishing." },
    ],
    faqs: [
      { question: "Do you handle long rural driveways?", answer: "Yes. We regularly service long private drives across Suffolk County." },
      { question: "Can you improve drainage during resurfacing?", answer: "Yes. Drainage correction is part of every project plan where needed." },
      { question: "What stone do you recommend for driveways?", answer: "3/4\" bluestone or RCA are the most common. We'll recommend based on your conditions." },
    ],
    diyProducts: [
      { name: "Gravel & Stone", slug: "gravel-stone" },
      { name: "Sand", slug: "sand" },
      { name: "Topsoil & Fill", slug: "topsoil-fill" },
    ],
    category: "driveways",
    calculatorType: "driveway",
  },
  "property-maintenance": {
    title: "Property Maintenance",
    heroTitle: "Property Maintenance — Suffolk County",
    subtitle: "Regular lawn care, mulch refresh, and cleanup — on whatever schedule fits your property.",
    services: [
      "Seasonal cleanup",
      "Mulch refresh and edging",
      "General grounds maintenance",
      "Storm debris removal",
      "Weed control & bed care",
    ],
    process: [
      { step: "Walk-Through", detail: "We assess your property and identify what needs regular attention." },
      { step: "Set a Schedule", detail: "Weekly, bi-weekly, monthly, or seasonal — whatever works for you." },
      { step: "Crew Shows Up", detail: "Regular visits with consistent results. No surprises." },
    ],
    faqs: [
      { question: "Do you offer one-time cleanup?", answer: "Yes. One-time and recurring options are both available." },
      { question: "Can service plans include material replenishment?", answer: "Yes. Mulch refresh and material top-off are commonly included at preferred pricing." },
    ],
    diyProducts: [
      { name: "Mulch", slug: "mulch" },
      { name: "Topsoil & Fill", slug: "topsoil-fill" },
      { name: "Landscape & Drainage", slug: "landscape" },
    ],
    category: "maintenance",
    calculatorType: "mulch",
  },
};

export function generateStaticParams() {
  return Object.keys(serviceContent).map((slug) => ({ slug }));
}

type ServiceDetailPageProps = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: ServiceDetailPageProps): Promise<Metadata> {
  const { slug } = await params;
  const content = serviceContent[slug];
  if (!content) return { title: "Service" };
  return {
    title: `${content.title} | Eastern Landscape & Mason Supply`,
    description: content.subtitle,
    openGraph: { title: content.heroTitle, description: content.subtitle, type: "website" },
  };
}

export default async function ServiceDetailPage({ params }: ServiceDetailPageProps) {
  const { slug } = await params;
  const content = serviceContent[slug];
  if (!content) notFound();

  return (
    <div>
      <JsonLd
        data={[
          {
            "@context": "https://schema.org",
            "@type": "Service",
            name: content.title,
            description: content.subtitle,
            serviceType: content.title,
            areaServed: { "@type": "State", name: "Suffolk County, New York" },
            provider: {
              "@type": "LocalBusiness",
              "@id": "https://www.easternlm.com/#business",
              name: "Eastern Landscape & Mason Supply",
              telephone: "+16318746244",
              address: { "@type": "PostalAddress", streetAddress: "110 Frowein Road", addressLocality: "Center Moriches", addressRegion: "NY", postalCode: "11934" },
            },
            hasOfferCatalog: {
              "@type": "OfferCatalog",
              name: content.title,
              itemListElement: content.services.map((s) => ({ "@type": "Offer", itemOffered: { "@type": "Service", name: s } })),
            },
          },
          {
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: content.faqs.map((faq) => ({
              "@type": "Question",
              name: faq.question,
              acceptedAnswer: { "@type": "Answer", text: faq.answer },
            })),
          },
        ]}
      />

      {/* ── Hero ──────────────────────────────────────────── */}
      <section className="bg-primary">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 md:py-16">
          <Link href="/services" className="text-sm text-primary-foreground/50 hover:text-accent">&larr; All Services</Link>
          <h1 className="mt-4 [font-family:var(--font-display)] text-3xl text-primary-foreground md:text-5xl">
            {content.heroTitle}
          </h1>
          <p className="mt-3 max-w-2xl text-base text-primary-foreground/60">{content.subtitle}</p>
        </div>
      </section>

      {/* ── Double Conversion Split ──────────────────────── */}
      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 md:py-16">
        <div className="grid gap-8 lg:grid-cols-2">

          {/* LEFT: We'll Do It For You */}
          <div className="space-y-6">
            <div className="rounded-xl border-2 border-accent/25 bg-card p-6">
              <div className="flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-lg bg-accent/15">
                  <Users className="size-5 text-accent" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold">We&apos;ll Do It For You</h2>
                  <p className="text-sm text-muted-foreground">Full-service installation by our crew</p>
                </div>
              </div>
              <ul className="mt-5 space-y-2">
                {content.services.map((item) => (
                  <li key={item} className="flex items-start gap-2 text-sm">
                    <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-accent" />
                    {item}
                  </li>
                ))}
              </ul>
              <div className="mt-5 flex flex-wrap gap-3 border-t pt-5 text-xs text-muted-foreground">
                <span className="flex items-center gap-1"><CheckCircle2 className="size-3 text-accent" /> Free estimates</span>
                <span className="flex items-center gap-1"><CheckCircle2 className="size-3 text-accent" /> 30+ years experience</span>
                <span className="flex items-center gap-1"><CheckCircle2 className="size-3 text-accent" /> Materials from our yard</span>
              </div>
            </div>

            {/* Quote form */}
            <ServiceQuoteForm serviceCategory={content.category} />
          </div>

          {/* RIGHT: Do It Yourself */}
          <div className="space-y-6">
            <div className="rounded-xl border bg-card p-6">
              <div className="flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10">
                  <Calculator className="size-5 text-primary" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold">Do It Yourself</h2>
                  <p className="text-sm text-muted-foreground">Order materials online — we deliver</p>
                </div>
              </div>
              <ul className="mt-5 space-y-2">
                <li className="flex items-start gap-2 text-sm">
                  <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" />
                  280+ materials with upfront pricing
                </li>
                <li className="flex items-start gap-2 text-sm">
                  <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" />
                  Use our calculator for exact quantities
                </li>
                <li className="flex items-start gap-2 text-sm">
                  <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" />
                  Same-week delivery across Suffolk County
                </li>
                <li className="flex items-start gap-2 text-sm">
                  <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" />
                  Order online — no phone call needed
                </li>
              </ul>

              {/* Popular materials for this service */}
              <div className="mt-5 border-t pt-5">
                <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">Popular for this project</p>
                <div className="space-y-2">
                  {content.diyProducts.map((prod) => (
                    <Link
                      key={prod.slug}
                      href={`/shop?category=${prod.slug}`}
                      className="flex items-center justify-between rounded-lg border px-4 py-3 text-sm font-medium transition-colors hover:border-accent/40 hover:bg-accent/5"
                    >
                      {prod.name}
                      <ArrowRight className="size-4 text-accent" />
                    </Link>
                  ))}
                </div>
              </div>

              <div className="mt-5 space-y-2">
                <Button asChild className="w-full" size="lg">
                  <Link href="/shop">
                    <Truck className="size-4" /> Shop & Order Materials
                  </Link>
                </Button>
              </div>
            </div>

            {/* Embedded calculator */}
            <CalculatorByType type={content.calculatorType} />

            {/* Phone CTA card */}
            <div className="rounded-xl border bg-card p-5 text-center">
              <p className="text-sm font-semibold">Not sure which option?</p>
              <Button asChild size="lg" variant="outline" className="mt-2 w-full">
                <a href={siteConfig.phoneHref}>
                  <Phone className="size-4" /> {siteConfig.phoneDisplay}
                </a>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* ── Process Steps ─────────────────────────────────── */}
      <section className="border-y bg-warm-bg py-12 md:py-16">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <h2 className="mb-8 text-center [font-family:var(--font-display)] text-2xl text-primary md:text-3xl">
            How It Works
          </h2>
          <div className="grid gap-6 md:grid-cols-3">
            {content.process.map((step, i) => (
              <div key={step.step} className="text-center">
                <div className="mx-auto mb-3 flex size-10 items-center justify-center rounded-full bg-accent text-sm font-bold text-accent-foreground">
                  {i + 1}
                </div>
                <h3 className="font-semibold">{step.step}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{step.detail}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQs ──────────────────────────────────────────── */}
      <section className="py-12 md:py-16">
        <div className="mx-auto max-w-3xl px-4 sm:px-6">
          <h2 className="mb-6 text-center [font-family:var(--font-display)] text-2xl text-primary">
            Common Questions
          </h2>
          <Accordion type="single" collapsible className="w-full">
            {content.faqs.map((faq) => (
              <AccordionItem key={faq.question} value={faq.question}>
                <AccordionTrigger className="text-left text-base">{faq.question}</AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground">{faq.answer}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>
    </div>
  );
}
