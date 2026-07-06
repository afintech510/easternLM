import Link from "next/link";
import { ArrowLeft, CheckCircle2, MapPin, Phone } from "lucide-react";
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
import { serviceSchema, faqSchema } from "@/lib/seo/business";
import type { SiteService } from "@/lib/data/site-services";
import type { ServiceTownEntry } from "@/lib/data/site-service-towns";

/**
 * Shared template for a verified per-town paving landing page. Only ever rendered
 * for entries whose `verified` flag is true (see the gate in each [town]/page.tsx),
 * so `intro` / `localReferences` are guaranteed to be real, filled content.
 */
export function buildTownFaqs(service: SiteService, entry: ServiceTownEntry) {
  return [
    {
      question: `How much does ${service.schemaName.toLowerCase()} cost in ${entry.townName}?`,
      answer: `Cost depends on size, base condition, and material. Because we own the supply yard, the stone in your project is priced direct — no middleman markup — and we give firm pricing after a quick on-site look in ${entry.townName}.`,
    },
    {
      question: `Do you serve ${entry.townName} and nearby areas?`,
      answer: `Yes — we cover ${entry.townName} and surrounding areas including ${entry.nearbyTowns}, working out of our yard at ${siteConfig.addressLine1} in Center Moriches.`,
    },
    ...service.faqs.slice(0, 2),
  ];
}

export function PavingServiceTownPage({
  service,
  entry,
}: {
  service: SiteService;
  entry: ServiceTownEntry;
}) {
  const faqs = buildTownFaqs(service, entry);

  return (
    <div>
      <JsonLd
        data={[
          serviceSchema({
            name: `${service.schemaName} in ${entry.townName}, NY`,
            description: `${service.schemaDescription} Serving ${entry.townName}, New York and nearby ${entry.nearbyTowns}.`,
            serviceType: service.schemaServiceType,
            url: `${siteConfig.url}/${service.slug}/${entry.townSlug}`,
            areaServed: { "@type": "City", name: `${entry.townName}, NY` },
            offerCatalog: { name: service.schemaName, items: service.scope },
          }),
          faqSchema(faqs),
        ]}
      />

      {/* Hero */}
      <section className="bg-primary">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 md:py-16">
          <Link href={`/${service.slug}`} className="inline-flex items-center gap-1 text-sm text-primary-foreground/50 hover:text-accent">
            <ArrowLeft className="size-4" /> {service.schemaName}
          </Link>
          <h1 className="mt-4 [font-family:var(--font-display)] text-3xl text-primary-foreground md:text-5xl">
            {service.schemaName} in {entry.townName}, NY
          </h1>
          <p className="mt-4 max-w-2xl text-base text-primary-foreground/70">{entry.intro}</p>
          <p className="mt-3 text-sm text-primary-foreground/60">Also serving {entry.nearbyTowns}.</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button asChild size="lg" className="bg-accent text-accent-foreground hover:bg-accent/90">
              <a href={`#${service.ctaAnchor}`}>{service.ctaLabel}</a>
            </Button>
            <Button asChild size="lg" variant="outline" className="border-primary-foreground/30 bg-transparent text-primary-foreground hover:bg-primary-foreground/10">
              <a href={siteConfig.phoneHref}><Phone className="size-4" /> {siteConfig.phoneDisplay}</a>
            </Button>
          </div>
        </div>
      </section>

      {/* Split: local detail + quote */}
      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 md:py-16">
        <div className="grid gap-8 lg:grid-cols-2">
          <div className="space-y-6">
            {entry.localReferences.length > 0 && (
              <div className="rounded-xl border-2 border-accent/25 bg-card p-6">
                <div className="flex items-center gap-2">
                  <MapPin className="size-5 text-accent" />
                  <h2 className="text-lg font-semibold">{entry.townName} — local notes</h2>
                </div>
                <ul className="mt-4 space-y-2">
                  {entry.localReferences.map((ref) => (
                    <li key={ref} className="flex items-start gap-2 text-sm">
                      <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-accent" /> {ref}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="rounded-xl border bg-card p-6">
              <h2 className="text-lg font-semibold">What we handle</h2>
              <ul className={service.scopeColumns === 2 ? "mt-4 grid gap-2 sm:grid-cols-2" : "mt-4 space-y-2"}>
                {service.scope.map((item) => (
                  <li key={item} className="flex items-start gap-2 text-sm">
                    <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-accent" /> {item}
                  </li>
                ))}
              </ul>
            </div>

            {entry.commonProjects.length > 0 && (
              <div className="rounded-xl border bg-card p-6">
                <h2 className="text-lg font-semibold">Common {entry.townName} projects</h2>
                <ul className="mt-4 space-y-2">
                  {entry.commonProjects.map((p) => (
                    <li key={p} className="flex items-start gap-2 text-sm">
                      <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-accent" /> {p}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <div id={service.ctaAnchor} className="space-y-6">
            <ServiceQuoteForm serviceCategory={service.serviceCategory} defaultServiceType={service.leadServiceType} />
            <div className="rounded-xl border bg-card p-5 text-sm text-muted-foreground">
              {service.crossLink.prefix}{" "}
              <Link href={service.crossLink.href} className="text-primary underline">{service.crossLink.label}</Link>.
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="border-t py-12 md:py-16">
        <div className="mx-auto max-w-3xl px-4 sm:px-6">
          <h2 className="mb-6 text-center [font-family:var(--font-display)] text-2xl text-primary">
            {service.schemaName} in {entry.townName} — FAQs
          </h2>
          <Accordion type="single" collapsible className="w-full">
            {faqs.map((faq) => (
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
