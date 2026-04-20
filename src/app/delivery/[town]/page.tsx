import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, Calculator, Clock, MapPin, Phone, Truck } from "lucide-react";
import { BeforeAfterSlider } from "@/components/gallery/before-after-slider";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { JsonLd } from "@/components/seo/json-ld";
import { siteConfig } from "@/config/site";
import { getTownPageBundle, getTownPages, type TownFaq } from "@/lib/data/town-pages";

type TownRouteProps = { params: Promise<{ town: string }> };

export const dynamicParams = false;
export const revalidate = 86400;

function formatUsd(cents: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);
}

function buildMapEmbedSrc(origin: string, destination: string) {
  const mapsKey = process.env.GOOGLE_MAPS_API_KEY;
  if (mapsKey) {
    return `https://www.google.com/maps/embed/v1/directions?${new URLSearchParams({ key: mapsKey, origin, destination, mode: "driving" })}`;
  }
  return `https://www.google.com/maps?${new URLSearchParams({ q: `${origin} to ${destination}`, output: "embed" })}`;
}

function fallbackFaqs(townName: string): TownFaq[] {
  return [
    { q: `How much does delivery to ${townName} cost?`, a: "Delivery starts at the listed first-load estimate. Your exact fee is calculated at checkout based on route distance." },
    { q: "Can I get same-day delivery?", a: "Orders placed before 11 AM on weekdays may qualify for same-day delivery depending on route volume." },
    { q: "What materials do you deliver?", a: "We deliver all bulk materials: mulch, topsoil, gravel, stone, sand, and RCA. Bagged items ride free on bulk loads." },
    { q: "How do I place an order?", a: "Order online at easternlm.com/shop, enter your delivery address at checkout, and we handle the rest. Or call (631) 874-6244." },
  ];
}

export async function generateStaticParams() {
  const towns = await getTownPages();
  return towns.map((town) => ({ town: town.slug }));
}

export async function generateMetadata({ params }: TownRouteProps): Promise<Metadata> {
  const { town } = await params;
  const bundle = await getTownPageBundle(town);
  if (!bundle) return { title: "Delivery Area | Eastern Landscape & Mason Supply" };
  return {
    title: `${bundle.town.name} Delivery | Mulch, Stone, Gravel | Eastern LM`,
    description: `Bulk material delivery to ${bundle.town.name}, NY. First load from ${formatUsd(bundle.town.deliveryFeeCents)}, ~${bundle.town.driveMinutes} min from our yard. Order online.`,
  };
}

export default async function TownDeliveryPage({ params }: TownRouteProps) {
  const { town } = await params;
  const bundle = await getTownPageBundle(town);
  if (!bundle) notFound();

  const { town: tp, projects, products } = bundle;
  const firstZip = tp.zipCodes[0] ?? "";
  const faqItems = tp.faqs.length > 0 ? tp.faqs : fallbackFaqs(tp.name);

  return (
    <div>
      <JsonLd
        data={[
          {
            "@context": "https://schema.org", "@type": "Service",
            name: `Bulk Material Delivery to ${tp.name}, ${tp.state}`,
            description: `Landscape and masonry material delivery to ${tp.name}. First load from ${formatUsd(tp.deliveryFeeCents)}, ${tp.driveMinutes} min drive.`,
            serviceType: "Bulk Material Delivery",
            areaServed: { "@type": "City", name: tp.name, containedInPlace: { "@type": "State", name: "New York" } },
            provider: { "@type": "LocalBusiness", "@id": "https://www.easternlm.com/#business", name: "Eastern Landscape & Mason Supply", telephone: "+16318746244" },
            offers: { "@type": "Offer", priceCurrency: "USD", price: (tp.deliveryFeeCents / 100).toFixed(2) },
          },
          {
            "@context": "https://schema.org", "@type": "FAQPage",
            mainEntity: faqItems.map((faq) => ({ "@type": "Question", name: faq.q, acceptedAnswer: { "@type": "Answer", text: faq.a } })),
          },
        ]}
      />

      {/* ── Hero ──────────────────────────────────────────── */}
      <section className="bg-primary">
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 md:py-14">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <Badge className="bg-accent/20 text-accent border-0">Delivery Area</Badge>
            <Badge variant="outline" className="border-primary-foreground/20 bg-transparent text-primary-foreground/60">Tier {tp.tier}</Badge>
            <Badge variant="outline" className="border-primary-foreground/20 bg-transparent text-primary-foreground/60">ZIP {tp.zipCodes.join(", ")}</Badge>
          </div>
          <h1 className="mt-3 [font-family:var(--font-display)] text-3xl text-primary-foreground md:text-5xl">
            Material Delivery to {tp.name}, {tp.state}
          </h1>
          <p className="mt-3 max-w-2xl text-base text-primary-foreground/60">{tp.localDescription}</p>

          {/* Key stats inline */}
          <div className="mt-6 flex flex-wrap gap-6">
            <div className="flex items-center gap-2 text-primary-foreground">
              <div className="flex size-10 items-center justify-center rounded-lg bg-primary-foreground/10">
                <Truck className="size-5 text-accent" />
              </div>
              <div>
                <p className="text-xl font-bold text-accent">{formatUsd(tp.deliveryFeeCents)}</p>
                <p className="text-xs text-primary-foreground/50">First load</p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-primary-foreground">
              <div className="flex size-10 items-center justify-center rounded-lg bg-primary-foreground/10">
                <MapPin className="size-5 text-accent" />
              </div>
              <div>
                <p className="text-xl font-bold">{tp.distanceMiles.toFixed(1)} mi</p>
                <p className="text-xs text-primary-foreground/50">From our yard</p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-primary-foreground">
              <div className="flex size-10 items-center justify-center rounded-lg bg-primary-foreground/10">
                <Clock className="size-5 text-accent" />
              </div>
              <div>
                <p className="text-xl font-bold">{tp.driveMinutes} min</p>
                <p className="text-xs text-primary-foreground/50">Drive time</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-7xl space-y-10 px-4 py-10 sm:px-6 md:py-14">
        {/* ── Map + Order CTA ────────────────────────────── */}
        <section className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
          <div className="overflow-hidden rounded-xl border">
            <iframe
              title={`Route to ${tp.name}`}
              src={buildMapEmbedSrc(tp.routeOrigin, tp.routeDestination)}
              className="h-[340px] w-full border-0"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          </div>
          <div className="flex flex-col justify-center space-y-4 rounded-xl border bg-card p-6">
            <h2 className="text-lg font-semibold">Order Delivery to {tp.name}</h2>
            <p className="text-sm text-muted-foreground">
              Browse materials, add to cart, and enter your {tp.name} address at checkout. We calculate the exact delivery fee from your location.
            </p>
            <Button asChild size="lg" className="w-full bg-accent text-accent-foreground hover:bg-accent/90">
              <Link href={`/shop?deliveryZip=${encodeURIComponent(firstZip)}&town=${encodeURIComponent(tp.slug)}`}>
                Shop Materials for {tp.name} <ArrowRight className="size-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="w-full">
              <Link href="/calculator">
                <Calculator className="size-4" /> Calculate How Much You Need
              </Link>
            </Button>
            <a href={siteConfig.phoneHref} className="flex items-center justify-center gap-2 text-sm text-muted-foreground hover:text-accent">
              <Phone className="size-4" /> Or call {siteConfig.phoneDisplay}
            </a>
          </div>
        </section>

        {/* ── Popular Materials ────────────────────────────── */}
        {products.length > 0 && (
          <section>
            <h2 className="mb-4 [font-family:var(--font-display)] text-2xl text-primary">
              Top Materials Ordered in {tp.name}
            </h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {products.map((product) => (
                <Link key={product.id} href={`/shop/${product.slug}`} className="group rounded-xl border bg-card overflow-hidden hover:border-accent/30 hover:shadow-md transition-all">
                  <div className="relative aspect-[4/3] w-full overflow-hidden">
                    <Image src={product.image} alt={product.name} fill sizes="(max-width: 768px) 100vw, 33vw" className="object-cover transition-transform group-hover:scale-105" />
                  </div>
                  <div className="p-4">
                    <p className="font-semibold group-hover:text-accent">{product.name}</p>
                    <p className="mt-1 text-sm font-bold text-accent">{formatUsd(product.pricePerUnitCents)} <span className="font-normal text-muted-foreground">{product.unitDisplay}</span></p>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* ── Projects gallery ────────────────────────────── */}
        {projects.length > 0 && (
          <section>
            <h2 className="mb-4 [font-family:var(--font-display)] text-2xl text-primary">
              Projects Near {tp.name}
            </h2>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {projects.map((project) => (
                <article key={project.id} className="rounded-xl border bg-card p-3">
                  {project.beforeAfter && project.images.length >= 2 ? (
                    <BeforeAfterSlider beforeImage={project.images[0]} afterImage={project.images[1]} alt={project.title} />
                  ) : (
                    <div className="relative aspect-[4/3] w-full overflow-hidden rounded-lg">
                      <Image src={project.images[0] ?? "/images/placeholder-product.svg"} alt={project.title} fill sizes="(max-width: 768px) 100vw, 33vw" className="object-cover" />
                    </div>
                  )}
                  <p className="mt-3 text-sm font-semibold">{project.title}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{project.description}</p>
                </article>
              ))}
            </div>
          </section>
        )}

        {/* ── Testimonial ─────────────────────────────────── */}
        {tp.testimonialQuote && (
          <section className="rounded-xl border-2 border-accent/20 bg-accent/5 p-6">
            <blockquote className="text-lg leading-relaxed">&ldquo;{tp.testimonialQuote}&rdquo;</blockquote>
            {tp.testimonialAuthor && <p className="mt-3 text-sm font-semibold">— {tp.testimonialAuthor}, {tp.name}</p>}
          </section>
        )}

        {/* ── FAQ ─────────────────────────────────────────── */}
        <section>
          <h2 className="mb-4 [font-family:var(--font-display)] text-2xl text-primary">
            {tp.name} Delivery FAQ
          </h2>
          <Accordion type="single" collapsible className="w-full">
            {faqItems.map((faq) => (
              <AccordionItem key={faq.q} value={faq.q}>
                <AccordionTrigger className="text-left">{faq.q}</AccordionTrigger>
                <AccordionContent className="text-muted-foreground">{faq.a}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </section>

        {/* ── Service quote CTA ───────────────────────────── */}
        <section className="rounded-xl bg-primary p-8 text-center">
          <h2 className="[font-family:var(--font-display)] text-2xl text-primary-foreground md:text-3xl">
            Need Installation in {tp.name}?
          </h2>
          <p className="mx-auto mt-2 max-w-lg text-sm text-primary-foreground/60">
            We do driveways, landscaping, masonry, and maintenance across Suffolk County. Get a free quote.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Button asChild size="lg" className="bg-accent text-accent-foreground hover:bg-accent/90">
              <Link href="/services">Get a Free Quote <ArrowRight className="size-4" /></Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="border-primary-foreground/30 bg-transparent text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground">
              <a href={siteConfig.phoneHref}><Phone className="size-4" /> {siteConfig.phoneDisplay}</a>
            </Button>
          </div>
        </section>
        {/* ── Internal Links: Materials + Services for this town ─ */}
        <section className="border-t pt-10 md:pt-12">
          <div className="mb-6">
            <h2 className="[font-family:var(--font-display)] text-2xl text-primary">
              Materials We Deliver to {tp.name}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">Browse by material type with {tp.name}-specific pricing and info.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {["mulch", "topsoil", "gravel", "sand", "rca-fill", "decorative-stone"].map((group) => (
              <Link
                key={group}
                href={`/materials/${group}-delivery-${tp.slug}`}
                className="rounded-md border bg-card px-3 py-2 text-sm font-medium transition-colors hover:border-accent/40 hover:text-accent"
              >
                {group.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())} Delivery
              </Link>
            ))}
          </div>

          <div className="mt-8 mb-6">
            <h3 className="text-lg font-semibold">Services in {tp.name}</h3>
          </div>
          <div className="flex flex-wrap gap-2">
            {["driveways", "landscaping", "masonry", "property-maintenance"].map((svc) => (
              <Link
                key={svc}
                href={`/services/${svc}/${tp.slug}`}
                className="rounded-md border bg-card px-3 py-2 text-sm font-medium transition-colors hover:border-accent/40 hover:text-accent"
              >
                {svc.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
              </Link>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
