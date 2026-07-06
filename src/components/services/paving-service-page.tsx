import Link from "next/link";
import { ArrowRight, CheckCircle2, Layers, Phone, Truck } from "lucide-react";
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
import { PAVING_TOWNS_LINE, type SiteService } from "@/lib/data/site-services";

/**
 * Shared template for the data-driven paving / site-work LEAD-FORM hub pages.
 * Renders one `SiteService` entry: hero, scope + materials + DIY, quote form,
 * process, FAQ, and the Service + FAQPage JSON-LD (provider references the
 * canonical `#business` node via `serviceSchema`).
 */
export function PavingServicePage({ service }: { service: SiteService }) {
  return (
    <div>
      <JsonLd
        data={[
          serviceSchema({
            name: service.schemaName,
            description: service.schemaDescription,
            serviceType: service.schemaServiceType,
            url: `${siteConfig.url}/${service.slug}`,
            offerCatalog: { name: service.schemaName, items: service.scope },
          }),
          faqSchema(service.faqs),
        ]}
      />

      {/* Hero */}
      <section className="bg-primary">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 md:py-16">
          <h1 className="[font-family:var(--font-display)] text-3xl text-primary-foreground md:text-5xl">
            {service.heroTitle}
          </h1>
          <p className="mt-3 max-w-2xl text-base text-primary-foreground/70">{service.heroSubtitle}</p>
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

      {/* Split */}
      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 md:py-16">
        <div className="grid gap-8 lg:grid-cols-2">
          <div className="space-y-6">
            <div className="rounded-xl border-2 border-accent/25 bg-card p-6">
              <h2 className="text-lg font-semibold">{service.scopeHeading}</h2>
              <ul
                className={
                  service.scopeColumns === 2
                    ? "mt-4 grid gap-2 sm:grid-cols-2"
                    : "mt-4 space-y-2"
                }
              >
                {service.scope.map((item) => (
                  <li key={item} className="flex items-start gap-2 text-sm">
                    <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-accent" /> {item}
                  </li>
                ))}
              </ul>
              {service.badges && service.badges.length > 0 && (
                <div className="mt-5 flex flex-wrap gap-3 border-t pt-5 text-xs text-muted-foreground">
                  {service.badges.map((b) => (
                    <span key={b} className="flex items-center gap-1">
                      <CheckCircle2 className="size-3 text-accent" /> {b}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {service.materials && service.materials.length > 0 && (
              <div className="rounded-xl border bg-card p-6">
                <div className="flex items-center gap-2">
                  <Layers className="size-5 text-accent" />
                  <h2 className="text-lg font-semibold">{service.materialsHeading ?? "Materials we use"}</h2>
                </div>
                <ul className="mt-4 space-y-3">
                  {service.materials.map((m) => (
                    <li key={m.name} className="text-sm">
                      <span className="font-medium">{m.name}</span>
                      <span className="block text-muted-foreground">{m.use}</span>
                    </li>
                  ))}
                </ul>
                {service.materialsNote && (
                  <p className="mt-4 text-xs text-muted-foreground">{service.materialsNote}</p>
                )}
              </div>
            )}

            {service.diy && (
              <div className="rounded-xl border bg-card p-6">
                <h2 className="text-lg font-semibold">{service.diy.heading}</h2>
                <p className="mt-1 text-sm text-muted-foreground">{service.diy.blurb}</p>
                <Button asChild className="mt-4 w-full" size="lg">
                  <Link href={service.diy.href}><Truck className="size-4" /> {service.diy.label}</Link>
                </Button>
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

      {/* Process */}
      <section className="border-y bg-warm-bg py-12 md:py-16">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <h2 className="mb-8 text-center [font-family:var(--font-display)] text-2xl text-primary md:text-3xl">How It Works</h2>
          <div className="grid gap-6 md:grid-cols-3">
            {service.process.map((step, i) => (
              <div key={step.step} className="text-center">
                <div className="mx-auto mb-3 flex size-10 items-center justify-center rounded-full bg-accent text-sm font-bold text-accent-foreground">{i + 1}</div>
                <h3 className="font-semibold">{step.step}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{step.detail}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-12 md:py-16">
        <div className="mx-auto max-w-3xl px-4 sm:px-6">
          <h2 className="mb-6 text-center [font-family:var(--font-display)] text-2xl text-primary">Common Questions</h2>
          <Accordion type="single" collapsible className="w-full">
            {service.faqs.map((faq) => (
              <AccordionItem key={faq.question} value={faq.question}>
                <AccordionTrigger className="text-left text-base">{faq.question}</AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground">{faq.answer}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
          <p className="mt-8 text-center text-sm text-muted-foreground">
            Serving {PAVING_TOWNS_LINE}.{" "}
            <Link href={service.footerLink.href} className="text-primary underline">
              {service.footerLink.label} <ArrowRight className="inline size-3" />
            </Link>
          </p>
        </div>
      </section>
    </div>
  );
}
