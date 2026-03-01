import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { JsonLd } from "@/components/seo/json-ld";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";

type ServicePageContent = {
  title: string;
  subtitle: string;
  services: string[];
  process: string[];
  faqs: { question: string; answer: string }[];
};

const serviceContent: Record<string, ServicePageContent> = {
  landscaping: {
    title: "Landscaping Services",
    subtitle: "Planting, grading, and material-driven upgrades for residential and commercial spaces.",
    services: ["Plant bed installation", "Soil grading and leveling", "Seasonal enhancement packages"],
    process: ["Site walk and scope", "Material plan + estimate", "Crew scheduling and install"],
    faqs: [
      {
        question: "Do you provide materials as part of the service?",
        answer: "Yes. The scope combines labor and materials from our yard inventory.",
      },
      {
        question: "Can landscaping be split into phases?",
        answer: "Yes. We can stage work by budget, season, or access constraints.",
      },
    ],
  },
  masonry: {
    title: "Masonry Services",
    subtitle: "Durable stone and hardscape installations designed for Long Island weather cycles.",
    services: ["Patios and walkways", "Retaining walls", "Stone repair and reset work"],
    process: ["Layout and grade check", "Base prep and drainage", "Install, jointing, and cleanup"],
    faqs: [
      {
        question: "What materials do you install?",
        answer: "Natural stone, concrete pavers, and masonry block systems.",
      },
      {
        question: "Do you repair failed patios?",
        answer: "Yes. We can lift and reset areas with proper base correction.",
      },
    ],
  },
  driveways: {
    title: "Driveway Services",
    subtitle: "Gravel and stone driveway installs, resurfacing, and section repair.",
    services: ["New gravel driveways", "Resurfacing and regrading", "Pothole and edge restoration"],
    process: ["Driveway inspection", "Base and aggregate plan", "Compaction and final grade"],
    faqs: [
      {
        question: "Do you handle long rural driveways?",
        answer: "Yes. We regularly quote and service long private drives.",
      },
      {
        question: "Can you improve drainage during resurfacing?",
        answer: "Yes. Drainage correction is included in project planning where needed.",
      },
    ],
  },
  "property-maintenance": {
    title: "Property Maintenance",
    subtitle: "Recurring maintenance packages that keep properties clean, safe, and presentable.",
    services: ["Seasonal cleanup", "Mulch refresh and edging", "General grounds maintenance"],
    process: ["Maintenance walk-through", "Service cadence setup", "Ongoing crew visits and reporting"],
    faqs: [
      {
        question: "Do you offer one-time cleanup services?",
        answer: "Yes. One-time and recurring service options are available.",
      },
      {
        question: "Can service plans include material replenishment?",
        answer: "Yes. Material refresh is frequently bundled into maintenance plans.",
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

export async function generateMetadata({ params }: ServiceDetailPageProps): Promise<Metadata> {
  const { slug } = await params;
  const content = serviceContent[slug];

  if (!content) {
    return {
      title: "Service",
    };
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

export default async function ServiceDetailPage({ params }: ServiceDetailPageProps) {
  const { slug } = await params;
  const content = serviceContent[slug];

  if (!content) {
    notFound();
  }

  return (
    <div className="mx-auto max-w-6xl space-y-8 px-4 py-12 md:py-16">
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
      <section className="space-y-4 rounded-2xl border bg-card p-6 md:p-8">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground">Service</p>
        <h1 className="[font-family:var(--font-display)] text-4xl text-primary md:text-5xl">{content.title}</h1>
        <p className="max-w-3xl text-muted-foreground">{content.subtitle}</p>
      </section>

      <section className="grid gap-5 md:grid-cols-2">
        <article className="rounded-2xl border bg-card p-6">
          <h2 className="text-lg font-semibold">Included Services</h2>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            {content.services.map((item) => (
              <li key={item} className="rounded-lg bg-background px-4 py-3">
                {item}
              </li>
            ))}
          </ul>
        </article>
        <article className="rounded-2xl border bg-card p-6">
          <h2 className="text-lg font-semibold">Before & After Gallery</h2>
          <p className="mt-3 text-sm text-muted-foreground">
            Project photography and before/after slider integration will be connected in the gallery
            phase.
          </p>
          <div className="mt-4 h-44 rounded-xl border border-dashed bg-background" />
        </article>
      </section>

      <section className="rounded-2xl border bg-card p-6">
        <h2 className="text-lg font-semibold">Our Process</h2>
        <ol className="mt-4 grid gap-3 md:grid-cols-3">
          {content.process.map((step, index) => (
            <li key={step} className="rounded-xl bg-background p-4 text-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                Step {index + 1}
              </p>
              <p className="mt-2">{step}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="rounded-2xl border bg-card p-6">
        <h2 className="text-lg font-semibold">FAQs</h2>
        <Accordion type="single" collapsible className="mt-4 w-full">
          {content.faqs.map((faq) => (
            <AccordionItem key={faq.question} value={faq.question}>
              <AccordionTrigger>{faq.question}</AccordionTrigger>
              <AccordionContent className="text-muted-foreground">{faq.answer}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </section>

      <section className="rounded-2xl border bg-primary/10 p-6">
        <h2 className="text-2xl font-semibold text-primary">Request A Free Estimate</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Send your project details and we will confirm scope, timing, and material requirements.
        </p>
        <Button asChild className="mt-4">
          <Link href="/contact">Start Estimate Request</Link>
        </Button>
      </section>
    </div>
  );
}
