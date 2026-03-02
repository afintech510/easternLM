import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, CheckCircle2, Phone } from "lucide-react";
import { JsonLd } from "@/components/seo/json-ld";
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
      "Planting, grading, and material-driven upgrades for residential and commercial spaces.",
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
      "Durable stone and hardscape installations designed for Long Island weather cycles.",
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
          "Proper base preparation with compacted aggregate and drainage provisions for longevity.",
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
      "Recurring maintenance packages that keep properties clean, safe, and presentable.",
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
            areaServed: "Suffolk County, NY",
            provider: {
              "@type": "LocalBusiness",
              name: "Eastern Landscape & Mason Supply",
            },
            serviceType: slug,
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

      {/* CTA */}
      <section className="relative overflow-hidden bg-primary py-14 md:py-18">
        <div className="topo-pattern absolute inset-0" />
        <div className="relative mx-auto max-w-7xl px-4 text-center sm:px-6">
          <h2 className="[font-family:var(--font-display)] text-2xl text-primary-foreground md:text-3xl">
            Request a Free Estimate
          </h2>
          <p className="mx-auto mt-3 max-w-lg text-sm text-primary-foreground/60">
            Send your project details and we&apos;ll confirm scope, timing, and
            material requirements.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <Button
              asChild
              size="lg"
              className="bg-accent text-accent-foreground shadow-lg shadow-accent/25 hover:bg-accent/90"
            >
              <Link href="/contact">
                Start Estimate Request
                <ArrowRight className="size-4" />
              </Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="border-primary-foreground/25 bg-transparent text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground"
            >
              <a href={siteConfig.phoneHref}>
                <Phone className="size-4" />
                Call {siteConfig.phoneDisplay}
              </a>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
