import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BeforeAfterSlider } from "@/components/gallery/before-after-slider";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { JsonLd } from "@/components/seo/json-ld";
import { getTownPageBundle, getTownPages, type TownFaq } from "@/lib/data/town-pages";

type TownRouteProps = {
  params: Promise<{ town: string }>;
};

export const dynamicParams = false;
export const revalidate = 86400;

function formatUsd(cents: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(cents / 100);
}

function buildMapEmbedSrc(origin: string, destination: string) {
  const mapsKey = process.env.GOOGLE_MAPS_API_KEY;

  if (mapsKey) {
    const params = new URLSearchParams({
      key: mapsKey,
      origin,
      destination,
      mode: "driving",
    });

    return `https://www.google.com/maps/embed/v1/directions?${params.toString()}`;
  }

  const query = new URLSearchParams({
    q: `${origin} to ${destination}`,
    output: "embed",
  });

  return `https://www.google.com/maps?${query.toString()}`;
}

function buildMapDirectionsHref(origin: string, destination: string) {
  const params = new URLSearchParams({
    api: "1",
    origin,
    destination,
    travelmode: "driving",
  });

  return `https://www.google.com/maps/dir/?${params.toString()}`;
}

function fallbackFaqs(townName: string): TownFaq[] {
  return [
    {
      q: `How much does delivery to ${townName} cost?`,
      a: "Delivery starts at the listed first-load estimate and is finalized from live route distance and order composition.",
    },
    {
      q: "Can I get same-day delivery?",
      a: "Weekday orders submitted before cutoff may qualify for same-day dispatch depending on route volume.",
    },
    {
      q: "Can I include access notes?",
      a: "Yes. Add driveway, wire, gate, and ground constraints during checkout so dispatch can plan safely.",
    },
  ];
}

export async function generateStaticParams() {
  const towns = await getTownPages();
  return towns.map((town) => ({ town: town.slug }));
}

export async function generateMetadata({ params }: TownRouteProps): Promise<Metadata> {
  const { town } = await params;
  const bundle = await getTownPageBundle(town);

  if (!bundle) {
    return {
      title: "Delivery Area | Eastern Landscape & Mason Supply",
    };
  }

  return {
    title: `Delivery to ${bundle.town.name}, ${bundle.town.state} | Eastern Landscape & Mason Supply`,
    description: `${bundle.town.name} delivery starts around ${formatUsd(bundle.town.deliveryFeeCents)} with typical drive time around ${bundle.town.driveMinutes} minutes from our yard.`,
  };
}

export default async function TownDeliveryPage({ params }: TownRouteProps) {
  const { town } = await params;
  const bundle = await getTownPageBundle(town);

  if (!bundle) {
    notFound();
  }

  const { town: townPage, projects, products } = bundle;
  const firstZip = townPage.zipCodes[0] ?? "";
  const faqItems = townPage.faqs.length > 0 ? townPage.faqs : fallbackFaqs(townPage.name);

  return (
    <div className="mx-auto max-w-6xl space-y-8 px-4 py-12 md:py-16">
      <JsonLd
        data={[
          {
            "@context": "https://schema.org",
            "@type": "Service",
            name: `Bulk Material Delivery to ${townPage.name}, ${townPage.state}`,
            description: `Landscape and masonry material delivery to ${townPage.name}. First load starting at ${formatUsd(townPage.deliveryFeeCents)}, ${townPage.driveMinutes} minute drive from our yard.`,
            serviceType: "Bulk Material Delivery",
            areaServed: {
              "@type": "City",
              name: townPage.name,
              containedInPlace: { "@type": "State", name: "New York" },
            },
            provider: {
              "@type": "LocalBusiness",
              "@id": "https://www.easternlm.com/#business",
              name: "Eastern Landscape & Mason Supply",
              telephone: "+16318746244",
            },
            offers: {
              "@type": "Offer",
              priceCurrency: "USD",
              price: (townPage.deliveryFeeCents / 100).toFixed(2),
              description: "First load delivery fee estimate",
            },
          },
          {
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: faqItems.map((faq) => ({
              "@type": "Question",
              name: faq.q,
              acceptedAnswer: { "@type": "Answer", text: faq.a },
            })),
          },
        ]}
      />
      <section className="rounded-2xl border bg-card p-6 md:p-8">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary">Delivery Area</Badge>
          <Badge variant="outline">Tier {townPage.tier}</Badge>
          <Badge variant="outline">ZIP {townPage.zipCodes.join(", ")}</Badge>
        </div>
        <h1 className="mt-3 [font-family:var(--font-display)] text-4xl text-primary md:text-5xl">
          Material Delivery to {townPage.name}, {townPage.state}
        </h1>
        <p className="mt-3 max-w-3xl text-muted-foreground">{townPage.localDescription}</p>
        {townPage.localDescriptionExtended ? (
          <p className="mt-3 max-w-3xl text-muted-foreground">{townPage.localDescriptionExtended}</p>
        ) : null}
      </section>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <article className="rounded-2xl border bg-card p-4">
          <p className="text-xs uppercase tracking-[0.12em] text-muted-foreground">Estimated First Load</p>
          <p className="mt-1 text-2xl font-semibold text-primary">{formatUsd(townPage.deliveryFeeCents)}</p>
        </article>
        <article className="rounded-2xl border bg-card p-4">
          <p className="text-xs uppercase tracking-[0.12em] text-muted-foreground">Distance from Yard</p>
          <p className="mt-1 text-2xl font-semibold">{townPage.distanceMiles.toFixed(1)} miles</p>
        </article>
        <article className="rounded-2xl border bg-card p-4">
          <p className="text-xs uppercase tracking-[0.12em] text-muted-foreground">Drive Time</p>
          <p className="mt-1 text-2xl font-semibold">{townPage.driveMinutes} min</p>
        </article>
        <article className="rounded-2xl border bg-card p-4">
          <p className="text-xs uppercase tracking-[0.12em] text-muted-foreground">Dispatch Window</p>
          <p className="mt-1 text-2xl font-semibold">{townPage.estimatedDeliveryMinutes} min</p>
        </article>
      </section>

      <section className="grid gap-5 lg:grid-cols-[1.2fr_1fr]">
        <article className="overflow-hidden rounded-2xl border bg-card">
          <iframe
            title={`Route map from yard to ${townPage.name}`}
            src={buildMapEmbedSrc(townPage.routeOrigin, townPage.routeDestination)}
            className="h-[360px] w-full border-0"
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
          />
        </article>

        <article className="space-y-4 rounded-2xl border bg-card p-5">
          <h2 className="text-lg font-semibold">Route and Scheduling Notes</h2>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li>Delivery pricing is distance and time based from our yard route.</li>
            <li>Orders placed before weekday cutoff may qualify for same-day service.</li>
            <li>Access constraints can be added during checkout and are sent to dispatch.</li>
          </ul>
          <Button asChild variant="outline">
            <a href={buildMapDirectionsHref(townPage.routeOrigin, townPage.routeDestination)} target="_blank" rel="noreferrer">
              Open Route in Google Maps
            </a>
          </Button>
        </article>
      </section>

      <section className="space-y-4 rounded-2xl border bg-card p-5">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Projects in and Around {townPage.name}</h2>
          <Badge variant="secondary">{projects.length} matched</Badge>
        </div>

        {projects.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {projects.map((project) => (
              <article key={project.id} className="rounded-xl border bg-background p-3">
                {project.beforeAfter && project.images.length >= 2 ? (
                  <BeforeAfterSlider
                    beforeImage={project.images[0]}
                    afterImage={project.images[1]}
                    alt={project.title}
                  />
                ) : (
                  <div className="relative aspect-[4/3] w-full overflow-hidden rounded-lg">
                    <Image
                      src={project.images[0] ?? "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1200&h=800&fit=crop"}
                      alt={project.title}
                      fill
                      sizes="(max-width: 768px) 100vw, 33vw"
                      className="object-cover"
                    />
                  </div>
                )}
                <p className="mt-3 text-sm font-semibold">{project.title}</p>
                <p className="mt-1 text-xs text-muted-foreground">{project.description}</p>
              </article>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            Additional town-tagged project media will appear here as new jobs are completed.
          </p>
        )}
      </section>

      {townPage.testimonialQuote ? (
        <section className="rounded-2xl border bg-primary/10 p-5">
          <p className="text-sm font-semibold uppercase tracking-[0.14em] text-primary/80">Town Testimonial</p>
          <blockquote className="mt-2 text-lg text-primary">
            &ldquo;{townPage.testimonialQuote}&rdquo;
          </blockquote>
          {townPage.testimonialAuthor ? (
            <p className="mt-2 text-sm text-muted-foreground">- {townPage.testimonialAuthor}</p>
          ) : null}
        </section>
      ) : null}

      <section className="space-y-4 rounded-2xl border bg-card p-5">
        <h2 className="text-xl font-semibold">Popular Materials for {townPage.name}</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((product) => (
            <article key={product.id} className="rounded-xl border bg-background p-3">
              <div className="relative aspect-[4/3] w-full overflow-hidden rounded-lg">
                <Image
                  src={product.image}
                  alt={product.name}
                  fill
                  sizes="(max-width: 768px) 100vw, 33vw"
                  className="object-cover"
                />
              </div>
              <p className="mt-3 text-sm font-semibold">{product.name}</p>
              <p className="text-xs text-muted-foreground">
                {formatUsd(product.pricePerUnitCents)} {product.unitDisplay}
              </p>
              <Button asChild size="sm" className="mt-3 w-full">
                <Link href={`/shop/${product.slug}`}>View Product</Link>
              </Button>
            </article>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border bg-card p-5">
        <h2 className="text-xl font-semibold">Frequently Asked Questions</h2>
        <Accordion type="single" collapsible className="mt-4 w-full">
          {faqItems.map((faq) => (
            <AccordionItem key={faq.q} value={faq.q}>
              <AccordionTrigger>{faq.q}</AccordionTrigger>
              <AccordionContent className="text-muted-foreground">{faq.a}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </section>

      <section className="rounded-2xl border bg-primary/10 p-6">
        <h2 className="text-2xl font-semibold text-primary">Order Delivery to {townPage.name}</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Start your order with ZIP {firstZip}. Delivery calculations are validated server-side before payment.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button asChild>
            <Link href={`/shop?deliveryZip=${encodeURIComponent(firstZip)}&town=${encodeURIComponent(townPage.slug)}`}>
              Shop with ZIP Prefilled
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/delivery">View Delivery Policy</Link>
          </Button>
        </div>
      </section>
    </div>
  );
}
