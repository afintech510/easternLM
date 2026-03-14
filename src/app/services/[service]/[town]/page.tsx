import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, Calculator, CheckCircle2, Clock, MapPin, Phone, Truck, Users } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { JsonLd } from "@/components/seo/json-ld";
import { ServiceQuoteForm } from "@/components/forms/service-quote-form";
import { siteConfig } from "@/config/site";
import { getServiceTownPages, getServiceTownPageBySlug } from "@/lib/data/product-town-pages";

type PageProps = { params: Promise<{ service: string; town: string }> };

export const dynamicParams = false;
export const revalidate = 86400;

function formatUsd(cents: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);
}

const SERVICE_CATEGORIES: Record<string, "driveways" | "landscaping" | "masonry" | "maintenance"> = {
  driveways: "driveways",
  landscaping: "landscaping",
  masonry: "masonry",
  "property-maintenance": "maintenance",
};

export async function generateStaticParams() {
  const pages = await getServiceTownPages();
  return pages.map((p) => {
    const parts = p.slug.match(/^(.+?)-in-(.+)$/);
    if (!parts) return { service: p.slug, town: "" };
    return { service: parts[1], town: parts[2] };
  });
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { service, town } = await params;
  const slug = `${service}-in-${town}`;
  const bundle = await getServiceTownPageBySlug(slug);
  if (!bundle) return { title: "Services | Eastern LM" };

  return {
    title: bundle.page.title,
    description: bundle.page.metaDescription,
    openGraph: { title: bundle.page.title, description: bundle.page.metaDescription, type: "website", siteName: "Eastern Landscape & Mason Supply" },
  };
}

export default async function ServiceTownPage({ params }: PageProps) {
  const { service, town: townParam } = await params;
  const slug = `${service}-in-${townParam}`;
  const bundle = await getServiceTownPageBySlug(slug);
  if (!bundle) notFound();

  const { page, town, products } = bundle;
  const formCategory = SERVICE_CATEGORIES[page.serviceType] || "driveways";

  // Related pages
  const allPages = await getServiceTownPages();
  const sameServiceOtherTowns = allPages.filter((p) => p.slug !== slug && p.slug.startsWith(`${service}-in-`)).slice(0, 6);
  const sameTownOtherServices = allPages.filter((p) => p.slug !== slug && p.slug.endsWith(`-in-${townParam}`)).slice(0, 3);

  return (
    <div>
      <JsonLd
        data={[
          {
            "@context": "https://schema.org", "@type": "Service",
            name: page.h1,
            description: page.introParagraph,
            serviceType: page.serviceType.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
            areaServed: { "@type": "City", name: town.name, containedInPlace: { "@type": "State", name: "New York" } },
            provider: { "@type": "LocalBusiness", "@id": "https://www.easternlm.com/#business", name: "Eastern Landscape & Mason Supply", telephone: "+16318746244" },
            hasOfferCatalog: page.servicesIncluded.length > 0 ? {
              "@type": "OfferCatalog", name: `${page.serviceType} services`,
              itemListElement: page.servicesIncluded.map((s) => ({ "@type": "Offer", itemOffered: { "@type": "Service", name: s } })),
            } : undefined,
          },
          ...(page.faqs.length > 0 ? [{
            "@context": "https://schema.org", "@type": "FAQPage",
            mainEntity: page.faqs.map((faq) => ({ "@type": "Question", name: faq.q, acceptedAnswer: { "@type": "Answer", text: faq.a } })),
          }] : []),
        ]}
      />

      {/* ── Hero ──────────────────────────────────────────── */}
      <section className="bg-primary">
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 md:py-14">
          <nav className="flex items-center gap-1.5 text-xs text-primary-foreground/40">
            <Link href="/services" className="hover:text-accent">Services</Link>
            <span>/</span>
            <Link href={`/services/${service}`} className="hover:text-accent">{service.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}</Link>
            <span>/</span>
            <span className="text-primary-foreground/60">{town.name}</span>
          </nav>
          <h1 className="mt-4 max-w-3xl [font-family:var(--font-display)] text-3xl leading-tight text-primary-foreground md:text-5xl">
            {page.h1}
          </h1>
          <p className="mt-3 max-w-2xl text-base text-primary-foreground/60">{page.introParagraph}</p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Badge className="border-0 bg-accent/20 px-3 py-1.5 text-sm font-semibold text-accent">
              <MapPin className="mr-1.5 size-4" /> {town.name}, NY
            </Badge>
            <Badge variant="outline" className="border-primary-foreground/20 px-3 py-1.5 text-sm text-primary-foreground/70">
              <Clock className="mr-1.5 size-4" /> Free estimates
            </Badge>
          </div>
        </div>
      </section>

      {/* ── Double Conversion ─────────────────────────────── */}
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 md:py-14">
        <div className="grid gap-8 lg:grid-cols-2">

          {/* LEFT: We'll install it */}
          <div className="space-y-5">
            <div className="rounded-xl border-2 border-accent/25 bg-card p-6">
              <div className="flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-lg bg-accent/15">
                  <Users className="size-5 text-accent" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold">We Handle the Full Job</h2>
                  <p className="text-sm text-muted-foreground">Professional installation in {town.name}</p>
                </div>
              </div>
              {page.servicesIncluded.length > 0 && (
                <ul className="mt-4 space-y-2">
                  {page.servicesIncluded.map((item) => (
                    <li key={item} className="flex items-start gap-2 text-sm">
                      <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-accent" /> {item}
                    </li>
                  ))}
                </ul>
              )}
              <div className="mt-4 flex flex-wrap gap-3 border-t pt-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1"><CheckCircle2 className="size-3 text-accent" /> Free estimates</span>
                <span className="flex items-center gap-1"><CheckCircle2 className="size-3 text-accent" /> 30+ years experience</span>
                <span className="flex items-center gap-1"><CheckCircle2 className="size-3 text-accent" /> Materials from our yard</span>
              </div>
            </div>
            <ServiceQuoteForm serviceCategory={formCategory} />
          </div>

          {/* RIGHT: DIY */}
          <div className="space-y-5">
            <div className="rounded-xl border bg-card p-6">
              <div className="flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10">
                  <Calculator className="size-5 text-primary" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold">Do It Yourself</h2>
                  <p className="text-sm text-muted-foreground">Order materials delivered to {town.name}</p>
                </div>
              </div>
              <ul className="mt-4 space-y-2 text-sm">
                <li className="flex items-start gap-2"><CheckCircle2 className="mt-0.5 size-4 text-primary" /> 280+ materials with upfront pricing</li>
                <li className="flex items-start gap-2"><CheckCircle2 className="mt-0.5 size-4 text-primary" /> Delivery to {town.name} from {formatUsd(town.deliveryFeeCents)}</li>
                <li className="flex items-start gap-2"><CheckCircle2 className="mt-0.5 size-4 text-primary" /> ~{town.driveMinutes} min drive, same-week delivery</li>
              </ul>

              {products.length > 0 && (
                <div className="mt-5 border-t pt-4">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">Popular materials</p>
                  {products.slice(0, 4).map((p) => (
                    <Link key={p.id} href={`/shop/${p.slug}`} className="flex items-center justify-between rounded-lg border px-3 py-2.5 mb-1.5 text-sm hover:border-accent/40 hover:bg-accent/5 transition-colors">
                      <span className="font-medium">{p.name}</span>
                      <span className="text-sm font-bold text-accent">{formatUsd(p.pricePerUnitCents)}</span>
                    </Link>
                  ))}
                </div>
              )}

              <div className="mt-4 space-y-2">
                <Button asChild className="w-full" size="lg">
                  <Link href="/shop"><Truck className="size-4" /> Shop &amp; Order Materials</Link>
                </Button>
                <Button asChild variant="outline" className="w-full" size="lg">
                  <Link href="/calculator"><Calculator className="size-4" /> Material Calculator</Link>
                </Button>
              </div>
            </div>

            <div className="rounded-xl border bg-card p-5 text-center">
              <p className="text-sm font-semibold">Not sure which option?</p>
              <Button asChild size="lg" variant="outline" className="mt-2 w-full">
                <a href={siteConfig.phoneHref}><Phone className="size-4" /> {siteConfig.phoneDisplay}</a>
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Local Context ─────────────────────────────────── */}
      {page.localContext && (
        <section className="border-y bg-warm-bg py-10 md:py-12">
          <div className="mx-auto max-w-3xl px-4 sm:px-6">
            <h2 className="[font-family:var(--font-display)] text-2xl text-primary">
              {page.serviceType.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())} in {town.name}
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{page.localContext}</p>
          </div>
        </section>
      )}

      {/* ── FAQ ───────────────────────────────────────────── */}
      {page.faqs.length > 0 && (
        <section className="py-10 md:py-12">
          <div className="mx-auto max-w-3xl px-4 sm:px-6">
            <h2 className="mb-5 [font-family:var(--font-display)] text-2xl text-primary">FAQ</h2>
            <Accordion type="single" collapsible>
              {page.faqs.map((faq) => (
                <AccordionItem key={faq.q} value={faq.q}>
                  <AccordionTrigger className="text-left">{faq.q}</AccordionTrigger>
                  <AccordionContent className="text-sm text-muted-foreground">{faq.a}</AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </section>
      )}

      {/* ── Related Pages ─────────────────────────────────── */}
      <section className="border-t py-10 md:py-12">
        <div className="mx-auto max-w-7xl space-y-6 px-4 sm:px-6">
          {sameServiceOtherTowns.length > 0 && (
            <div>
              <h3 className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                {service.replace(/-/g, " ")} services in nearby towns
              </h3>
              <div className="flex flex-wrap gap-2">
                {sameServiceOtherTowns.map((p) => {
                  const tName = p.slug.split("-in-").pop()?.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) || "";
                  const parts = p.slug.match(/^(.+?)-in-(.+)$/);
                  return (
                    <Link key={p.slug} href={`/services/${parts?.[1] || service}/${parts?.[2] || ""}`} className="rounded-md border bg-card px-3 py-1.5 text-sm font-medium text-foreground/70 hover:border-accent/40 hover:text-accent transition-colors">
                      {tName}
                    </Link>
                  );
                })}
              </div>
            </div>
          )}
          {sameTownOtherServices.length > 0 && (
            <div>
              <h3 className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                Other services in {town.name}
              </h3>
              <div className="flex flex-wrap gap-2">
                {sameTownOtherServices.map((p) => {
                  const sName = p.slug.split("-in-")[0]?.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) || "";
                  const parts = p.slug.match(/^(.+?)-in-(.+)$/);
                  return (
                    <Link key={p.slug} href={`/services/${parts?.[1] || ""}/${parts?.[2] || ""}`} className="rounded-md border bg-card px-3 py-1.5 text-sm font-medium text-foreground/70 hover:border-accent/40 hover:text-accent transition-colors">
                      {sName}
                    </Link>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
