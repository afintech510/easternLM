import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, Calculator, CheckCircle, Clock, MapPin, Phone, ShoppingCart, Truck, Users } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { AddToCartButton } from "@/components/cart/add-to-cart-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { JsonLd } from "@/components/seo/json-ld";
import { CalculatorByType } from "@/components/calculators/calculator-by-type";
import { siteConfig } from "@/config/site";
import { getProductTownPages, getProductTownPageBySlug, type ProductTownFeaturedProduct } from "@/lib/data/product-town-pages";

type PageProps = { params: Promise<{ slug: string }> };

export const dynamicParams = false;
export const revalidate = 86400;

function formatUsd(cents: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);
}

export async function generateStaticParams() {
  const pages = await getProductTownPages();
  return pages.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const bundle = await getProductTownPageBySlug(slug);
  if (!bundle) return { title: "Materials | Eastern LM" };

  return {
    title: bundle.page.title,
    description: bundle.page.metaDescription,
    openGraph: {
      title: bundle.page.title,
      description: bundle.page.metaDescription,
      type: "website",
      siteName: "Eastern Landscape & Mason Supply",
    },
  };
}

// ─── Nearby towns helper ──────────────────────────────────────────

async function getRelatedPages(currentSlug: string, productGroup: string, townSlug: string) {
  const allPages = await getProductTownPages();
  // Same product, different towns (up to 6)
  const sameMaterial = allPages
    .filter((p) => p.slug !== currentSlug && p.slug.startsWith(productGroup.toLowerCase().replace(/\s+&\s+/g, "-").replace(/\s+/g, "-")))
    .slice(0, 6);
  // Same town, different products (up to 4)
  const sameTown = allPages
    .filter((p) => p.slug !== currentSlug && p.slug.endsWith(`-${townSlug}`))
    .slice(0, 4);
  return { sameMaterial, sameTown };
}

// ─── Product card component ──────────────────────────────────────

function ProductCard({ product }: { product: ProductTownFeaturedProduct }) {
  return (
    <article className="flex min-w-[260px] shrink-0 flex-col rounded-xl border bg-card overflow-hidden transition-all hover:border-accent/30 hover:shadow-md snap-start">
      <Link href={`/shop/${product.slug}`} className="block overflow-hidden">
        <Image
          src={product.image}
          alt={product.name}
          width={400}
          height={250}
          className="h-36 w-full object-cover transition-transform hover:scale-105"
          sizes="(max-width: 640px) 80vw, 260px"
        />
      </Link>
      <div className="flex flex-1 flex-col p-4">
        <div className="flex-1">
          <Link href={`/shop/${product.slug}`} className="text-sm font-semibold leading-tight hover:text-accent">
            {product.name}
          </Link>
          <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{product.description}</p>
        </div>
        <div className="mt-3">
          <span className="text-lg font-bold text-accent">{formatUsd(product.pricePerUnitCents)}</span>
          <span className="ml-1 text-xs text-muted-foreground">{product.unitDisplay}</span>
        </div>
        <div className="mt-2">
          <AddToCartButton
            productId={product.id}
            name={product.name}
            unitPriceCents={product.pricePerUnitCents}
            deliveryType={product.deliveryType as "bulk" | "non-bulk"}
            materialClass={product.materialClass as "mulch" | "default"}
          />
        </div>
      </div>
    </article>
  );
}

// ─── Page ─────────────────────────────────────────────────────────

export default async function ProductTownPage({ params }: PageProps) {
  const { slug } = await params;
  const bundle = await getProductTownPageBySlug(slug);
  if (!bundle) notFound();

  const { page, town, products } = bundle;
  const firstZip = town.zipCodes[0] ?? "";
  const { sameMaterial, sameTown } = await getRelatedPages(slug, page.productGroup, town.slug);

  return (
    <div>
      {/* ── Schema Markup ──────────────────────────────────── */}
      <JsonLd
        data={[
          {
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: [
              { "@type": "ListItem", position: 1, name: "Shop", item: "https://www.easternlm.com/shop" },
              { "@type": "ListItem", position: 2, name: page.productGroup, item: `https://www.easternlm.com/shop?category=${page.productGroup.toLowerCase().replace(/\s+/g, "-")}` },
              { "@type": "ListItem", position: 3, name: `${page.productGroup} in ${town.name}` },
            ],
          },
          {
            "@context": "https://schema.org",
            "@type": "Product",
            name: `${page.productGroup} — ${town.name} Delivery`,
            description: page.introParagraph,
            category: page.productGroup,
            offers: products.length > 0 ? {
              "@type": "AggregateOffer",
              priceCurrency: "USD",
              lowPrice: (Math.min(...products.map((p) => p.pricePerUnitCents)) / 100).toFixed(2),
              highPrice: (Math.max(...products.map((p) => p.pricePerUnitCents)) / 100).toFixed(2),
              offerCount: products.length,
              availability: "https://schema.org/InStock",
            } : undefined,
            areaServed: { "@type": "City", name: town.name, containedInPlace: { "@type": "State", name: "New York" } },
            brand: { "@type": "Brand", name: "Eastern Landscape & Mason Supply" },
          },
          {
            "@context": "https://schema.org",
            "@type": "Service",
            name: `${page.productGroup} Delivery to ${town.name}`,
            serviceType: "Bulk Material Delivery",
            areaServed: { "@type": "City", name: town.name },
            provider: { "@type": "LocalBusiness", "@id": "https://www.easternlm.com/#business", name: "Eastern Landscape & Mason Supply", telephone: "+16318746244" },
            offers: { "@type": "Offer", priceCurrency: "USD", price: (town.deliveryFeeCents / 100).toFixed(2), description: "First load delivery fee" },
          },
          ...(page.faqs.length > 0 ? [{
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: page.faqs.map((faq) => ({ "@type": "Question", name: faq.q, acceptedAnswer: { "@type": "Answer", text: faq.a } })),
          }] : []),
        ]}
      />

      {/* ── 1. HERO ────────────────────────────────────────── */}
      <section className="bg-primary">
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 md:py-16">
          {/* Breadcrumb */}
          <nav className="flex items-center gap-1.5 text-xs text-primary-foreground/40" aria-label="Breadcrumb">
            <Link href="/shop" className="hover:text-accent">Shop</Link>
            <span>/</span>
            <Link href={`/delivery/${town.slug}`} className="hover:text-accent">{town.name}</Link>
            <span>/</span>
            <span className="text-primary-foreground/60">{page.productGroup}</span>
          </nav>

          <h1 className="mt-4 max-w-3xl [font-family:var(--font-display)] text-3xl leading-tight text-primary-foreground md:text-5xl">
            {page.h1}
          </h1>

          {/* Badges */}
          <div className="mt-5 flex flex-wrap gap-3">
            <Badge className="border-0 bg-accent/20 px-3 py-1.5 text-sm font-semibold text-accent">
              <Truck className="mr-1.5 size-4" /> Delivery from {formatUsd(town.deliveryFeeCents)}
            </Badge>
            <Badge variant="outline" className="border-primary-foreground/20 px-3 py-1.5 text-sm text-primary-foreground/70">
              <Clock className="mr-1.5 size-4" /> ~{town.driveMinutes} min from our yard
            </Badge>
            <Badge variant="outline" className="border-primary-foreground/20 px-3 py-1.5 text-sm text-primary-foreground/70">
              <MapPin className="mr-1.5 size-4" /> {town.distanceMiles.toFixed(1)} miles
            </Badge>
          </div>

          {/* CTAs */}
          <div className="mt-7 flex flex-wrap gap-3">
            <Button asChild size="lg" className="bg-accent text-accent-foreground shadow-lg shadow-accent/20 hover:bg-accent/90">
              <Link href="/calculator">
                <Calculator className="size-4" /> Calculate &amp; Order
              </Link>
            </Button>
            {page.relatedServiceSlug && (
              <Button asChild size="lg" variant="outline" className="border-primary-foreground/25 text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground">
                <Link href={`/services/${page.relatedServiceSlug}`}>
                  <Users className="size-4" /> Get a Service Quote
                </Link>
              </Button>
            )}
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-4 sm:px-6">

        {/* ── 2. PRODUCT CARDS (horizontal scroll mobile) ──── */}
        {products.length > 0 && (
          <section className="-mx-4 py-10 sm:mx-0 md:py-12">
            <div className="mb-5 flex items-end justify-between px-4 sm:px-0">
              <h2 className="[font-family:var(--font-display)] text-2xl text-primary">
                {page.productGroup} Available for {town.name}
              </h2>
              <Button asChild variant="ghost" size="sm" className="hidden sm:flex">
                <Link href={`/shop?category=${page.productGroup.toLowerCase().replace(/\s+&\s+/g, "-").replace(/\s+/g, "-")}`}>
                  View all <ArrowRight className="size-4" />
                </Link>
              </Button>
            </div>
            <div className="flex gap-4 overflow-x-auto px-4 pb-2 snap-x snap-mandatory sm:grid sm:grid-cols-2 sm:overflow-visible sm:px-0 lg:grid-cols-4">
              {products.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          </section>
        )}

        {/* ── 3. EMBEDDED CALCULATOR ────────────────────────── */}
        {page.calculatorType && (
          <section>
            <h2 className="mb-4 [font-family:var(--font-display)] text-2xl text-primary">
              How Much {page.productGroup} Do You Need?
            </h2>
            <CalculatorByType type={page.calculatorType} />
          </section>
        )}

        {/* ── 4. INTRO CONTENT ─────────────────────────────── */}
        <section className="grid gap-6 py-10 md:py-12 lg:grid-cols-[1.3fr_1fr]">
          <div className="space-y-4">
            <h2 className="[font-family:var(--font-display)] text-2xl text-primary">
              {page.productGroup} in {town.name}
            </h2>
            <p className="text-sm leading-relaxed text-muted-foreground">{page.introParagraph}</p>
            {page.localContext && (
              <div className="rounded-lg bg-muted/50 p-4">
                <p className="text-sm leading-relaxed text-muted-foreground">{page.localContext}</p>
              </div>
            )}
            {page.projectTips && (
              <div className="rounded-lg border-l-4 border-accent bg-accent/5 p-4">
                <p className="text-sm font-medium">Project Tip</p>
                <p className="mt-1 text-sm text-muted-foreground">{page.projectTips}</p>
              </div>
            )}
          </div>

          {/* Common uses */}
          {page.commonUses.length > 0 && (
            <div className="rounded-xl border bg-card p-5">
              <h3 className="mb-3 text-sm font-semibold uppercase tracking-widest text-muted-foreground">Common Uses</h3>
              <ul className="space-y-2">
                {page.commonUses.map((use) => (
                  <li key={use} className="flex items-center gap-2 text-sm">
                    <CheckCircle className="size-4 shrink-0 text-accent" />
                    {use}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>

        {/* ── 5. SERVICE CROSS-SELL ────────────────────────── */}
        {page.relatedServiceSlug && (
          <section className="rounded-xl bg-primary p-8 md:flex md:items-center md:justify-between">
            <div>
              <h2 className="[font-family:var(--font-display)] text-2xl text-primary-foreground">
                Need {page.productGroup} Installed?
              </h2>
              <p className="mt-2 max-w-lg text-sm text-primary-foreground/60">
                Our crew handles the full job in {town.name} — materials from our yard, installed by us. Free estimates, no obligation.
              </p>
            </div>
            <div className="mt-5 flex flex-wrap gap-3 md:mt-0 md:shrink-0">
              <Button asChild size="lg" className="bg-accent text-accent-foreground hover:bg-accent/90">
                <Link href={`/services/${page.relatedServiceSlug}`}>Get a Free Quote <ArrowRight className="size-4" /></Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="border-primary-foreground/25 text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground">
                <a href={siteConfig.phoneHref}><Phone className="size-4" /> {siteConfig.phoneDisplay}</a>
              </Button>
            </div>
          </section>
        )}

        {/* ── 6. DELIVERY INFO ─────────────────────────────── */}
        <section className="grid gap-4 py-10 sm:grid-cols-3 md:py-12">
          <div className="rounded-xl border bg-card p-5 text-center">
            <Truck className="mx-auto size-6 text-accent" />
            <p className="mt-2 text-2xl font-bold text-accent">{formatUsd(town.deliveryFeeCents)}</p>
            <p className="text-sm text-muted-foreground">First load to {town.name}</p>
          </div>
          <div className="rounded-xl border bg-card p-5 text-center">
            <Clock className="mx-auto size-6 text-accent" />
            <p className="mt-2 text-2xl font-bold">{town.driveMinutes} min</p>
            <p className="text-sm text-muted-foreground">{town.distanceMiles.toFixed(1)} miles from yard</p>
          </div>
          <div className="rounded-xl border bg-card p-5 text-center">
            <ShoppingCart className="mx-auto size-6 text-accent" />
            <p className="mt-2 text-sm font-semibold">Order before 11 AM</p>
            <p className="text-sm text-muted-foreground">May qualify for same-day</p>
          </div>
        </section>

        {/* ── 7. FAQ ───────────────────────────────────────── */}
        {page.faqs.length > 0 && (
          <section className="py-10 md:py-12">
            <h2 className="mb-5 [font-family:var(--font-display)] text-2xl text-primary">
              {page.productGroup} Delivery FAQ — {town.name}
            </h2>
            <div className="mx-auto max-w-3xl">
              <Accordion type="single" collapsible className="w-full">
                {page.faqs.map((faq) => (
                  <AccordionItem key={faq.q} value={faq.q}>
                    <AccordionTrigger className="text-left text-base">{faq.q}</AccordionTrigger>
                    <AccordionContent className="text-sm leading-relaxed text-muted-foreground">{faq.a}</AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </div>
          </section>
        )}

        {/* ── 8. RELATED PAGES (internal linking) ──────────── */}
        <section className="border-t py-10 md:py-12">
          {sameMaterial.length > 0 && (
            <div className="mb-6">
              <h3 className="mb-3 text-sm font-semibold uppercase tracking-widest text-muted-foreground">
                {page.productGroup} delivery to nearby towns
              </h3>
              <div className="flex flex-wrap gap-2">
                {sameMaterial.map((p) => {
                  const townName = p.slug.split("-delivery-").pop()?.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) || p.slug;
                  return (
                    <Link key={p.slug} href={`/materials/${p.slug}`} className="rounded-md border bg-card px-3 py-1.5 text-sm font-medium text-foreground/70 transition-colors hover:border-accent/40 hover:text-accent">
                      {townName}
                    </Link>
                  );
                })}
              </div>
            </div>
          )}

          {sameTown.length > 0 && (
            <div className="mb-6">
              <h3 className="mb-3 text-sm font-semibold uppercase tracking-widest text-muted-foreground">
                Other materials for {town.name}
              </h3>
              <div className="flex flex-wrap gap-2">
                {sameTown.map((p) => {
                  const materialName = p.slug.split("-delivery-")[0]?.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) || p.slug;
                  return (
                    <Link key={p.slug} href={`/materials/${p.slug}`} className="rounded-md border bg-card px-3 py-1.5 text-sm font-medium text-foreground/70 transition-colors hover:border-accent/40 hover:text-accent">
                      {materialName}
                    </Link>
                  );
                })}
              </div>
            </div>
          )}

          <div className="flex flex-wrap gap-3">
            <Button asChild variant="outline" size="sm">
              <Link href={`/delivery/${town.slug}`}><MapPin className="size-4" /> Full {town.name} delivery info</Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link href="/blog/how-much-mulch-do-i-need">How much do I need? (guide)</Link>
            </Button>
          </div>
        </section>

        {/* ── FINAL CTA ────────────────────────────────────── */}
        <section className="rounded-xl border bg-card p-6 mb-10 md:flex md:items-center md:justify-between">
          <div>
            <h2 className="text-lg font-semibold">Ready to Order {page.productGroup}?</h2>
            <p className="mt-1 text-sm text-muted-foreground">Add to cart and enter your {town.name} address at checkout.</p>
          </div>
          <div className="mt-3 flex gap-3 md:mt-0">
            <Button asChild size="lg" className="bg-accent text-accent-foreground hover:bg-accent/90">
              <Link href={`/shop?deliveryZip=${encodeURIComponent(firstZip)}&town=${encodeURIComponent(town.slug)}`}>
                Shop Now <ArrowRight className="size-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <a href={siteConfig.phoneHref}><Phone className="size-4" /> Call</a>
            </Button>
          </div>
        </section>
      </div>
    </div>
  );
}
