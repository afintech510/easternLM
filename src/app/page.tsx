export const dynamic = "force-dynamic";

import Link from "next/link";
import { InstantQuoteWidget } from "@/components/quote/instant-quote-widget";
import {
  ArrowRight,
  Calculator,
  CheckCircle2,
  Clock,
  MapPin,
  Phone,
  Shield,
  Star,
  Truck,
  Users,
} from "lucide-react";
import { JsonLd } from "@/components/seo/json-ld";
import { Button } from "@/components/ui/button";
import { coreServices } from "@/config/content";
import { siteConfig } from "@/config/site";
import { getGoogleReviews } from "@/lib/data/reviews";

const materialCategories = [
  { name: "Mulch", slug: "mulch", price: "from $20/yd", desc: "Black, brown, red, natural" },
  { name: "Topsoil & Fill", slug: "topsoil-fill", price: "from $15/yd", desc: "Screened, compost, clean fill" },
  { name: "Gravel & Stone", slug: "gravel-stone", price: "from $20/yd", desc: "Bluestone, pea gravel, wash gravel" },
  { name: "Sand", slug: "sand", price: "from $60/yd", desc: "Mason sand, concrete sand" },
  { name: "Natural Stone", slug: "natural-stone", price: "per piece", desc: "Flagstone, boulders, steppers" },
  { name: "Masonry & Concrete", slug: "masonry-concrete", price: "per unit", desc: "Block, brick, portland, rebar" },
  { name: "Pavers", slug: "pavers", price: "per piece", desc: "Cambridge, Nicolock, poly sand" },
  { name: "Bagged Materials", slug: "bagged-material", price: "per bag", desc: "Mulch, soil, gravel, salt bags" },
];

export default async function Home() {
  const { rating, totalReviews, reviews: googleReviews, reviewUrl } = await getGoogleReviews();

  return (
    <div>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "LocalBusiness",
          "@id": "https://www.easternlm.com/#business",
          name: siteConfig.name,
          description: "Suffolk County landscape and masonry supply yard with bulk material delivery and full-service installation. Mulch, gravel, stone, sand, topsoil, and masonry products.",
          telephone: "+16318746244",
          email: siteConfig.email,
          url: "https://www.easternlm.com",
          image: "https://www.easternlm.com/images/og-home.jpg",
          priceRange: "$$",
          address: {
            "@type": "PostalAddress",
            streetAddress: siteConfig.addressLine1,
            addressLocality: "Center Moriches",
            addressRegion: "NY",
            postalCode: "11934",
            addressCountry: "US",
          },
          geo: { "@type": "GeoCoordinates", latitude: 40.7894, longitude: -72.7929 },
          openingHoursSpecification: [
            { "@type": "OpeningHoursSpecification", dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"], opens: "07:00", closes: "17:00" },
            { "@type": "OpeningHoursSpecification", dayOfWeek: "Saturday", opens: "07:00", closes: "15:00" },
          ],
          areaServed: { "@type": "State", name: "Suffolk County, New York", containedInPlace: { "@type": "State", name: "New York" } },
          hasOfferCatalog: {
            "@type": "OfferCatalog",
            name: "Landscape & Masonry Materials",
            itemListElement: [
              { "@type": "OfferCatalog", name: "Mulch" },
              { "@type": "OfferCatalog", name: "Gravel & Stone" },
              { "@type": "OfferCatalog", name: "Sand" },
              { "@type": "OfferCatalog", name: "Topsoil & Fill" },
              { "@type": "OfferCatalog", name: "Natural Stone" },
              { "@type": "OfferCatalog", name: "Masonry & Concrete" },
            ],
          },
          review: googleReviews.slice(0, 3).map((r) => ({
            "@type": "Review",
            reviewRating: { "@type": "Rating", ratingValue: String(r.rating), bestRating: "5" },
            author: { "@type": "Person", name: r.author_name },
            reviewBody: r.text,
            ...(r.time ? { datePublished: new Date(r.time * 1000).toISOString().split("T")[0] } : {}),
            publisher: { "@type": "Organization", name: "Google" },
          })),
          aggregateRating: { "@type": "AggregateRating", ratingValue: String(rating), reviewCount: String(totalReviews) },
        }}
      />

      {/* ── 1. HERO ─────────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-primary">
        <div className="topo-pattern absolute inset-0" />
        <div className="relative mx-auto max-w-7xl px-4 py-16 sm:px-6 md:py-24 lg:py-28">
          {/* Urgency badge */}
          <div className="mb-6 inline-flex items-center gap-2 rounded-lg bg-accent/20 px-4 py-2 text-sm font-semibold text-accent">
            <Truck className="size-4" />
            Same-Day Delivery — Order by 11 AM
          </div>

          <h1 className="max-w-3xl [font-family:var(--font-display)] text-4xl leading-[1.1] text-primary-foreground md:text-5xl lg:text-6xl">
            Mulch, Stone & Gravel —{" "}
            <span className="text-accent">Delivered to Your Site</span>
          </h1>

          <p className="mt-5 max-w-xl text-lg leading-relaxed text-primary-foreground/70">
            Mulch, stone, gravel, topsoil & more. Upfront pricing. Order online or call — we deliver across Suffolk County.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-4">
            <Button
              asChild
              size="lg"
              className="bg-accent text-accent-foreground shadow-lg shadow-accent/25 hover:bg-accent/90"
            >
              <Link href="/shop">
                Shop Materials
                <ArrowRight className="size-4" />
              </Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="border-primary-foreground/25 bg-transparent text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground"
            >
              <Link href="/services">
                Get a Service Quote
              </Link>
            </Button>
          </div>

          {/* Phone — always visible */}
          <a
            href={siteConfig.phoneHref}
            className="mt-6 inline-flex items-center gap-2 text-lg font-semibold text-primary-foreground/90 transition-colors hover:text-accent"
          >
            <Phone className="size-5" />
            {siteConfig.phoneDisplay}
          </a>
        </div>
      </section>

      {/* ── 2. TRUST BAR ────────────────────────────────────────── */}
      <section className="border-b bg-card">
        <div className="mx-auto grid max-w-7xl grid-cols-2 gap-px md:grid-cols-4">
          {[
            { icon: Shield, label: "Family-Owned & Operated" },
            { icon: Truck, label: "Same-Day Delivery Available" },
            { icon: MapPin, label: "25+ Suffolk County Towns" },
            { icon: Users, label: "Pro Contractor Pricing" },
          ].map((item) => (
            <div key={item.label} className="flex items-center gap-3 px-5 py-4">
              <item.icon className="size-5 shrink-0 text-accent" />
              <span className="text-sm font-semibold">{item.label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ── 3. MATERIAL CATEGORIES ──────────────────────────────── */}
      <section className="bg-background py-16 md:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="mb-10 flex items-end justify-between">
            <div>
              <h2 className="[font-family:var(--font-display)] text-3xl text-primary md:text-4xl">
                Shop by Material
              </h2>
              <p className="mt-2 text-muted-foreground">
                Everything for the job — one yard, one order.
              </p>
            </div>
            <Button asChild variant="ghost" className="hidden md:flex">
              <Link href="/shop">
                View all products
                <ArrowRight className="size-4" />
              </Link>
            </Button>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {materialCategories.map((cat) => (
              <Link
                key={cat.slug}
                href={`/shop?category=${cat.slug}`}
                className="group rounded-xl border bg-card p-5 transition-all hover:border-accent/40 hover:shadow-md"
              >
                <h3 className="text-lg font-semibold group-hover:text-accent">{cat.name}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{cat.desc}</p>
                <div className="mt-3 flex items-center justify-between">
                  <span className="text-sm font-bold text-accent">{cat.price}</span>
                  <span className="text-sm font-medium text-accent opacity-0 transition-opacity group-hover:opacity-100">
                    Shop <ArrowRight className="inline size-3.5" />
                  </span>
                </div>
              </Link>
            ))}
          </div>

          <div className="mt-6 text-center md:hidden">
            <Button asChild variant="outline">
              <Link href="/shop">Browse all materials</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* ── 4. SERVICES — "We Don't Just Deliver — We Install" ──── */}
      <section className="bg-warm-bg py-16 md:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="mb-10">
            <h2 className="[font-family:var(--font-display)] text-3xl text-primary md:text-4xl">
              We Don&apos;t Just Deliver — We Install
            </h2>
            <p className="mt-2 max-w-2xl text-muted-foreground">
              Our crew handles the full job. Materials come from our yard — no middleman, no markup on supplies.
            </p>
          </div>

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {coreServices.map((service) => (
              <article
                key={service.slug}
                className="group flex flex-col rounded-xl border bg-card p-6 transition-all hover:border-accent/30 hover:shadow-md"
              >
                <h3 className="text-lg font-semibold group-hover:text-accent">{service.name}</h3>
                <p className="mt-2 flex-1 text-sm text-muted-foreground">{service.description}</p>
                <Button
                  asChild
                  size="sm"
                  className="mt-4 w-full bg-accent text-accent-foreground hover:bg-accent/90"
                >
                  <Link href={`/services/${service.slug}`}>
                    Get a Quote
                    <ArrowRight className="size-3.5" />
                  </Link>
                </Button>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ── 5. INSTANT QUOTE WIDGET ──────────────────────────── */}
      <section className="bg-background py-14">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <InstantQuoteWidget />
        </div>
      </section>

      {/* ── 6. TESTIMONIALS (Real Google Reviews) ──────────────── */}
      <section className="bg-warm-bg py-16 md:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="mb-10 flex items-end justify-between">
            <div>
              <h2 className="[font-family:var(--font-display)] text-3xl text-primary md:text-4xl">
                What Customers Say
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {rating.toFixed(1)} stars across {totalReviews} Google reviews
              </p>
            </div>
            <div className="hidden items-center gap-1 text-accent md:flex">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star key={i} className="size-5 fill-current" />
              ))}
            </div>
          </div>

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {googleReviews.slice(0, 3).map((review) => (
              <article key={review.author_name} className="rounded-xl border bg-card p-6">
                <div className="flex items-center gap-3 mb-3">
                  {review.profile_photo_url ? (
                    <img src={review.profile_photo_url} alt="" className="h-9 w-9 rounded-full" loading="lazy" />
                  ) : (
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                      {review.author_name.charAt(0)}
                    </div>
                  )}
                  <div>
                    <p className="text-sm font-semibold">{review.author_name}</p>
                    <p className="text-xs text-muted-foreground">{review.relative_time_description} · Google Review</p>
                  </div>
                </div>
                <div className="flex items-center gap-1 text-accent">
                  {Array.from({ length: review.rating }).map((_, i) => (
                    <Star key={i} className="size-4 fill-current" />
                  ))}
                </div>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground line-clamp-4">
                  &ldquo;{review.text}&rdquo;
                </p>
              </article>
            ))}
          </div>

          {/* Second row — hidden on mobile */}
          {googleReviews.length > 3 && (
            <div className="mt-5 hidden gap-5 lg:grid lg:grid-cols-2">
              {googleReviews.slice(3).map((review) => (
                <article key={review.author_name} className="rounded-xl border bg-card p-6">
                  <div className="flex items-center gap-3 mb-3">
                    {review.profile_photo_url ? (
                      <img src={review.profile_photo_url} alt="" className="h-9 w-9 rounded-full" loading="lazy" />
                    ) : (
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                        {review.author_name.charAt(0)}
                      </div>
                    )}
                    <div>
                      <p className="text-sm font-semibold">{review.author_name}</p>
                      <p className="text-xs text-muted-foreground">{review.relative_time_description} · Google Review</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 text-accent">
                    {Array.from({ length: review.rating }).map((_, i) => (
                      <Star key={i} className="size-4 fill-current" />
                    ))}
                  </div>
                  <p className="mt-3 text-sm leading-relaxed text-muted-foreground line-clamp-4">
                    &ldquo;{review.text}&rdquo;
                  </p>
                </article>
              ))}
            </div>
          )}

          {/* Leave a Review CTA */}
          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            {reviewUrl && (
              <a
                href={reviewUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-lg bg-accent px-5 py-2.5 text-sm font-semibold text-accent-foreground transition-colors hover:bg-accent/90"
              >
                <Star className="size-4" />
                Leave a Review
              </a>
            )}
            <a
              href="https://maps.app.goo.gl/AiDyPCCs84ZSpsSx7"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-muted-foreground underline hover:text-foreground"
            >
              See all reviews on Google
            </a>
          </div>
        </div>
      </section>

      {/* ── 7. DELIVERY / SERVICE AREA ─────────────────────────── */}
      <section className="bg-background py-16 md:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="rounded-xl border bg-card p-8 md:flex md:items-center md:gap-10">
            <div className="flex-1">
              <h2 className="[font-family:var(--font-display)] text-2xl text-primary md:text-3xl">
                We Deliver Across Suffolk County
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                From Patchogue to Southampton, Riverhead to Montauk — our trucks run daily routes to 25+ towns. Delivery fees are calculated by distance from our Center Moriches yard.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                {["Manorville", "Shirley", "Mastic", "Westhampton Beach", "Quogue", "Riverhead", "Southampton"].map((town) => (
                  <span key={town} className="rounded-md border bg-muted/50 px-2.5 py-1 text-xs font-medium">
                    {town}
                  </span>
                ))}
                <Link href="/delivery" className="rounded-md border border-accent/30 bg-accent/5 px-2.5 py-1 text-xs font-medium text-accent hover:bg-accent/10">
                  + 18 more towns
                </Link>
              </div>
            </div>
            <div className="mt-6 flex shrink-0 flex-col gap-3 md:mt-0">
              <Button asChild size="lg">
                <Link href="/delivery">
                  <MapPin className="size-4" />
                  View All Delivery Areas
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link href="/shop">
                  Check Your Delivery Fee
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* ── 8. FINAL CTA BANNER ────────────────────────────────── */}
      <section className="relative overflow-hidden bg-primary py-16 md:py-20">
        <div className="topo-pattern absolute inset-0" />
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 md:flex md:items-center md:justify-between">
          <div>
            <h2 className="[font-family:var(--font-display)] text-3xl text-primary-foreground md:text-4xl">
              Ready to Order?
            </h2>
            <p className="mt-2 max-w-lg text-primary-foreground/60">
              Shop online or call us. Orders before 11 AM may ship same day.
            </p>
          </div>
          <div className="mt-6 flex flex-wrap gap-3 md:mt-0 md:shrink-0">
            <Button
              asChild
              size="lg"
              className="bg-accent text-accent-foreground shadow-lg shadow-accent/25 hover:bg-accent/90"
            >
              <Link href="/shop">
                Shop Now
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
                {siteConfig.phoneDisplay}
              </a>
            </Button>
          </div>
        </div>
      </section>

      {/* ── COMPANY INFO STRIP ────────────────────────────────── */}
      <section className="border-t bg-background py-10">
        <div className="mx-auto grid max-w-7xl gap-6 px-4 sm:px-6 md:grid-cols-3">
          <div className="flex items-start gap-3">
            <MapPin className="mt-0.5 size-5 shrink-0 text-accent" />
            <div>
              <p className="text-sm font-semibold">Visit the Yard</p>
              <p className="mt-0.5 text-sm text-muted-foreground">{siteConfig.addressLine1}, {siteConfig.addressLine2}</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <Clock className="mt-0.5 size-5 shrink-0 text-accent" />
            <div>
              <p className="text-sm font-semibold">Hours</p>
              <p className="mt-0.5 text-sm text-muted-foreground">Mon-Fri 7-5, Sat 7-3, Sun Closed</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <Phone className="mt-0.5 size-5 shrink-0 text-accent" />
            <div>
              <p className="text-sm font-semibold">Call Us</p>
              <a href={siteConfig.phoneHref} className="mt-0.5 block text-sm font-semibold text-accent hover:underline">
                {siteConfig.phoneDisplay}
              </a>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
