import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, Calculator, CheckCircle2, Phone, Truck, Users } from "lucide-react";
import { JsonLd } from "@/components/seo/json-ld";
import { ServiceQuoteForm } from "@/components/forms/service-quote-form";
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
  subtitle: string;
  services: string[];
  process: { step: string; detail: string }[];
  faqs: { question: string; answer: string }[];
};

const serviceContent: Record<string, ServicePageContent> = {
  landscaping: {
    title: "Landscaping Services",
    subtitle:
      "Planting, grading, and garden design using materials from our yard.",
    services: [
      "Garden bed design & planting",
      "Soil grading and leveling",
      "Retaining walls & borders",
      "Seasonal enhancement packages",
      "Drainage solutions",
    ],
    process: [
      {
        step: "Site Walk & Scope",
        detail:
          "We visit your property to understand the terrain, soil conditions, and your vision for the space.",
      },
      {
        step: "Material Plan & Estimate",
        detail:
          "A detailed proposal with material selection, quantities, timeline, and transparent pricing.",
      },
      {
        step: "Crew Scheduling & Install",
        detail:
          "Our crew handles everything from material delivery to final cleanup and walkthrough.",
      },
    ],
    faqs: [
      {
        question: "Do you provide materials as part of the service?",
        answer:
          "Yes. The scope combines labor and materials from our yard inventory, ensuring quality and availability.",
      },
      {
        question: "Can landscaping be split into phases?",
        answer:
          "Yes. We can stage work by budget, season, or access constraints to fit your timeline.",
      },
    ],
  },
  masonry: {
    title: "Masonry Services",
    subtitle:
      "Stone patios, walkways, and walls built to handle Long Island winters.",
    services: [
      "Patios and walkways",
      "Retaining walls",
      "Outdoor fireplaces & fire pits",
      "Stone repair and reset work",
      "Block and brick veneer",
    ],
    process: [
      {
        step: "Layout & Grade Check",
        detail:
          "We assess the site elevation, drainage patterns, and structural requirements.",
      },
      {
        step: "Base Prep & Drainage",
        detail:
          "We compact the base and add drainage so it doesn't settle or flood.",
      },
      {
        step: "Install, Jointing & Cleanup",
        detail:
          "Expert stone or block installation with proper jointing, sealing, and thorough cleanup.",
      },
    ],
    faqs: [
      {
        question: "What materials do you install?",
        answer:
          "Natural stone, concrete pavers, and masonry block systems — all sourced from our supply yard.",
      },
      {
        question: "Do you repair failed patios?",
        answer:
          "Yes. We can lift and reset areas with proper base correction to restore structural integrity.",
      },
    ],
  },
  driveways: {
    title: "Driveway Services",
    subtitle:
      "Gravel and stone driveway installs, resurfacing, and section repair.",
    services: [
      "New gravel driveways",
      "Resurfacing and regrading",
      "Pothole and edge restoration",
      "Paver driveway installation",
      "Drainage correction",
    ],
    process: [
      {
        step: "Driveway Inspection",
        detail:
          "We evaluate the existing surface, base condition, grade, and drainage patterns.",
      },
      {
        step: "Base & Aggregate Plan",
        detail:
          "Material selection and layering plan customized for your traffic load and terrain.",
      },
      {
        step: "Compaction & Final Grade",
        detail:
          "Machine compaction for stability, final grading for proper water runoff, and edge finishing.",
      },
    ],
    faqs: [
      {
        question: "Do you handle long rural driveways?",
        answer:
          "Yes. We regularly quote and service long private drives across Suffolk County.",
      },
      {
        question: "Can you improve drainage during resurfacing?",
        answer:
          "Yes. Drainage correction is included in project planning where needed.",
      },
    ],
  },
  "property-maintenance": {
    title: "Property Maintenance",
    subtitle:
      "Regular lawn care, mulch refresh, and cleanup — on whatever schedule fits your property.",
    services: [
      "Seasonal cleanup",
      "Mulch refresh and edging",
      "General grounds maintenance",
      "Storm debris removal",
      "Weed control & bed care",
    ],
    process: [
      {
        step: "Maintenance Walk-Through",
        detail:
          "We assess your property to identify recurring needs and develop a maintenance cadence.",
      },
      {
        step: "Service Cadence Setup",
        detail:
          "A customized schedule — weekly, bi-weekly, monthly, or seasonal — tailored to your property.",
      },
      {
        step: "Ongoing Visits & Reporting",
        detail:
          "Regular crew visits with completion reports so you always know the state of your property.",
      },
    ],
    faqs: [
      {
        question: "Do you offer one-time cleanup services?",
        answer:
          "Yes. One-time and recurring service options are available to fit any need.",
      },
      {
        question: "Can service plans include material replenishment?",
        answer:
          "Yes. Material refresh is frequently bundled into maintenance plans at preferred pricing.",
      },
    ],
  },
};

export function generateStaticParams() {
  return Object.keys(serviceContent).map((slug) => ({ slug }));
}

type ServiceDetailPageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({
  params,
}: ServiceDetailPageProps): Promise<Metadata> {
  const { slug } = await params;
  const content = serviceContent[slug];

  if (!content) {
    return { title: "Service" };
  }

  return {
    title: `${content.title} | Eastern Landscape & Mason Supply`,
    description: content.subtitle,
    openGraph: {
      title: content.title,
      description: content.subtitle,
      type: "website",
    },
  };
}

export default async function ServiceDetailPage({
  params,
}: ServiceDetailPageProps) {
  const { slug } = await params;
  const content = serviceContent[slug];

  if (!content) {
    notFound();
  }

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
            areaServed: {
              "@type": "State",
              name: "Suffolk County, New York",
            },
            provider: {
              "@type": "LocalBusiness",
              "@id": "https://www.easternlm.com/#business",
              name: "Eastern Landscape & Mason Supply",
              telephone: "+16318746244",
              address: {
                "@type": "PostalAddress",
                streetAddress: "110 Frowein Road",
                addressLocality: "Center Moriches",
                addressRegion: "NY",
                postalCode: "11934",
              },
            },
            hasOfferCatalog: {
              "@type": "OfferCatalog",
              name: content.title,
              itemListElement: content.services.map((s) => ({
                "@type": "Offer",
                itemOffered: { "@type": "Service", name: s },
              })),
            },
          },
          {
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: content.faqs.map((faq) => ({
              "@type": "Question",
              name: faq.question,
              acceptedAnswer: {
                "@type": "Answer",
                text: faq.answer,
              },
            })),
          },
        ]}
      />

      {/* Hero */}
      <section className="bg-primary">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 md:py-16">
          <Link
            href="/services"
            className="text-sm text-primary-foreground/50 transition-colors hover:text-accent"
          >
            &larr; All Services
          </Link>
          <h1 className="mt-4 [font-family:var(--font-display)] text-3xl text-primary-foreground md:text-5xl">
            {content.title}
          </h1>
          <p className="mt-3 max-w-2xl text-base leading-relaxed text-primary-foreground/60">
            {content.subtitle}
          </p>
        </div>
      </section>

      {/* Main content */}
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 md:py-16">
        <div className="grid gap-10 lg:grid-cols-[1.2fr_1fr]">
          {/* Included Services */}
          <section>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">
              Included
            </p>
            <h2 className="mt-2 [font-family:var(--font-display)] text-2xl text-primary">
              What&apos;s Covered
            </h2>
            <ul className="mt-6 space-y-3">
              {content.services.map((item) => (
                <li
                  key={item}
                  className="flex items-center gap-3 rounded-xl border bg-card px-5 py-4 text-sm"
                >
                  <CheckCircle2 className="size-5 shrink-0 text-accent" />
                  {item}
                </li>
              ))}
            </ul>
          </section>

          {/* Process */}
          <section>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">
              Our Process
            </p>
            <h2 className="mt-2 [font-family:var(--font-display)] text-2xl text-primary">
              How We Work
            </h2>
            <div className="mt-6 space-y-4">
              {content.process.map((step, index) => (
                <div
                  key={step.step}
                  className="rounded-xl border bg-card p-5"
                >
                  <div className="flex items-center gap-3">
                    <span className="flex size-8 items-center justify-center rounded-full bg-accent text-sm font-bold text-accent-foreground">
                      {index + 1}
                    </span>
                    <h3 className="font-semibold">{step.step}</h3>
                  </div>
                  <p className="mt-2 pl-11 text-sm leading-relaxed text-muted-foreground">
                    {step.detail}
                  </p>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>

      {/* FAQs */}
      <section className="border-y bg-warm-bg py-12 md:py-16">
        <div className="mx-auto max-w-3xl px-4 sm:px-6">
          <div className="mb-8 text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">
              FAQ
            </p>
            <h2 className="mt-2 [font-family:var(--font-display)] text-2xl text-primary">
              Common Questions
            </h2>
          </div>
          <Accordion type="single" collapsible className="w-full">
            {content.faqs.map((faq) => (
              <AccordionItem key={faq.question} value={faq.question}>
                <AccordionTrigger className="text-left text-base">
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="text-sm leading-relaxed text-muted-foreground">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      {/* Dual Conversion Section */}
      <section className="bg-warm-bg py-12 md:py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="mb-8 text-center">
            <h2 className="[font-family:var(--font-display)] text-2xl text-primary md:text-3xl">
              Two Ways to Get Started
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              We&apos;re both a supply yard and a full-service installer.
            </p>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            {/* WE'LL DO IT FOR YOU */}
            <div className="space-y-4">
              <div className="rounded-2xl border-2 border-accent/30 bg-card p-6">
                <div className="flex items-center gap-3">
                  <div className="flex size-10 items-center justify-center rounded-full bg-accent/15 text-accent">
                    <Users className="size-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold">We&apos;ll Do It For You</h3>
                    <p className="text-sm text-muted-foreground">Full-service installation by our crew</p>
                  </div>
                </div>
                <ul className="mt-4 space-y-2 text-sm">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="size-4 text-accent" />
                    Our experienced crew handles everything
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="size-4 text-accent" />
                    Free on-site estimates
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="size-4 text-accent" />
                    30+ years of Suffolk County expertise
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="size-4 text-accent" />
                    Materials included from our own yard
                  </li>
                </ul>
              </div>
              <ServiceQuoteForm
                serviceCategory={slug === "property-maintenance" ? "maintenance" : slug as "driveways" | "landscaping" | "masonry"}
              />
            </div>

            {/* DO IT YOURSELF */}
            <div className="rounded-2xl border bg-card p-6">
              <div className="flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Calculator className="size-5" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold">Do It Yourself</h3>
                  <p className="text-sm text-muted-foreground">Order materials online for delivery or pickup</p>
                </div>
              </div>
              <ul className="mt-4 space-y-2 text-sm">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="size-4 text-primary" />
                  280+ materials with transparent pricing
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="size-4 text-primary" />
                  Use our yard calculator for exact quantities
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="size-4 text-primary" />
                  Same-week delivery across Suffolk County
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="size-4 text-primary" />
                  Order online — no phone call needed
                </li>
              </ul>
              <div className="mt-6 space-y-3">
                <Button asChild className="w-full" size="lg">
                  <Link href="/shop">
                    <Truck className="size-4" />
                    Browse & Order Materials
                  </Link>
                </Button>
                <Button asChild variant="outline" className="w-full" size="lg">
                  <Link href="/calculator">
                    <Calculator className="size-4" />
                    Material Calculator
                  </Link>
                </Button>
                <Button
                  asChild
                  variant="outline"
                  className="w-full"
                  size="lg"
                >
                  <a href={siteConfig.phoneHref}>
                    <Phone className="size-4" />
                    Call {siteConfig.phoneDisplay}
                  </a>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
