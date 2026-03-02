import Link from "next/link";
import {
  ArrowRight,
  Calculator,
  CheckCircle2,
  Clock,
  MapPin,
  Phone,
  Star,
  Truck,
} from "lucide-react";
import { JsonLd } from "@/components/seo/json-ld";
import { Button } from "@/components/ui/button";
import { coreServices, featuredCategories } from "@/config/content";
import { siteConfig } from "@/config/site";

export default function Home() {
  const stats = [
    { label: "Towns served", value: "25+" },
    { label: "Same-day delivery", value: "Before 11 AM" },
    { label: "Family-owned", value: "30+ years" },
  ];

  const reviews = [
    {
      quote:
        "Reliable deliveries and clear communication every order. Eastern has been our go-to yard for three seasons now.",
      author: "Mike R.",
      location: "Shirley, NY",
    },
    {
      quote:
        "Great yard team and fast turnaround on stone and mulch. Pricing is always fair and upfront.",
      author: "Jennifer S.",
      location: "Moriches, NY",
    },
    {
      quote:
        "Pricing is straightforward and pickup is easy to schedule. Best supply yard on the east end.",
      author: "Tom D.",
      location: "Patchogue, NY",
    },
  ];

  return (
    <div>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "LocalBusiness",
          name: siteConfig.name,
          description: siteConfig.description,
          telephone: siteConfig.phoneDisplay,
          email: siteConfig.email,
          address: {
            "@type": "PostalAddress",
            streetAddress: siteConfig.addressLine1,
            addressLocality: "Center Moriches",
            addressRegion: "NY",
            postalCode: "11934",
            addressCountry: "US",
          },
          review: reviews.map((r) => ({
            "@type": "Review",
            reviewRating: {
              "@type": "Rating",
              ratingValue: "5",
              bestRating: "5",
            },
            author: { "@type": "Person", name: r.author },
            reviewBody: r.quote,
          })),
        }}
      />

      {/* ── Hero ─────────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-primary">
        {/* Topo overlay pattern */}
        <div className="topo-pattern absolute inset-0" />

        <div className="relative mx-auto grid max-w-7xl items-center gap-10 px-4 py-20 sm:px-6 md:grid-cols-[1.3fr_1fr] md:py-28 lg:py-32">
          <div className="space-y-6">
            <p className="inline-flex items-center gap-2 rounded-full bg-accent/15 px-4 py-1.5 text-sm font-medium text-accent">
              <MapPin className="size-3.5" />
              Serving Suffolk County
            </p>
            <h1 className="[font-family:var(--font-display)] text-4xl leading-[1.1] text-primary-foreground md:text-5xl lg:text-6xl">
              Premium Landscape & Mason Supply
            </h1>
            <p className="max-w-lg text-base leading-relaxed text-primary-foreground/70 md:text-lg">
              Bulk materials, masonry supplies, and expert services — delivered
              from yard to job site across Long Island.
            </p>
            <div className="flex flex-wrap gap-3 pt-2">
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
                <Link href="/contact">Request a Quote</Link>
              </Button>
            </div>
          </div>

          {/* Stats card */}
          <div className="rounded-2xl border border-primary-foreground/10 bg-primary-foreground/5 p-6 backdrop-blur-sm">
            <p className="mb-5 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-primary-foreground/50">
              <Truck className="size-4 text-accent" />
              Why Eastern
            </p>
            <div className="space-y-4">
              {stats.map((stat) => (
                <div
                  key={stat.label}
                  className="flex items-center justify-between rounded-xl bg-primary-foreground/5 px-5 py-4"
                >
                  <span className="text-sm text-primary-foreground/60">
                    {stat.label}
                  </span>
                  <span className="text-sm font-bold text-accent">
                    {stat.value}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Shop by Category ─────────────────────────────────── */}
      <section className="bg-background py-16 md:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="mb-10 flex items-end justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">
                Shop by Category
              </p>
              <h2 className="mt-2 [font-family:var(--font-display)] text-3xl text-primary md:text-4xl">
                Quality Materials, Fair Prices
              </h2>
            </div>
            <Button asChild variant="ghost" className="hidden md:flex">
              <Link href="/shop">
                Browse all
                <ArrowRight className="size-4" />
              </Link>
            </Button>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {featuredCategories.map((category) => (
              <Link
                key={category.slug}
                href={`/shop?category=${category.slug}`}
                className="group relative overflow-hidden rounded-2xl border bg-card p-6 transition-all hover:border-accent/40 hover:shadow-lg"
              >
                <div className="mb-3 flex size-10 items-center justify-center rounded-xl bg-accent/10">
                  <CheckCircle2 className="size-5 text-accent" />
                </div>
                <h3 className="text-lg font-semibold text-foreground group-hover:text-accent">
                  {category.name}
                </h3>
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                  {category.description}
                </p>
                <div className="mt-4 flex items-center gap-1 text-sm font-medium text-accent opacity-0 transition-opacity group-hover:opacity-100">
                  Shop now <ArrowRight className="size-3.5" />
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

      {/* ── Services ─────────────────────────────────────────── */}
      <section className="bg-warm-bg py-16 md:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="mb-10 flex items-end justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">
                What We Do
              </p>
              <h2 className="mt-2 [font-family:var(--font-display)] text-3xl text-primary md:text-4xl">
                Professional Outdoor Services
              </h2>
            </div>
            <Button asChild variant="ghost" className="hidden md:flex">
              <Link href="/services">
                View all
                <ArrowRight className="size-4" />
              </Link>
            </Button>
          </div>

          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
            {coreServices.map((service) => (
              <article
                key={service.slug}
                className="group rounded-2xl border bg-card p-6 transition-all hover:border-accent/30 hover:shadow-lg"
              >
                <h3 className="text-lg font-semibold text-foreground group-hover:text-accent">
                  {service.name}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {service.description}
                </p>
                <Button
                  asChild
                  variant="link"
                  className="mt-4 h-auto p-0 text-accent"
                >
                  <Link href={`/services/${service.slug}`}>
                    Learn More
                    <ArrowRight className="size-3.5" />
                  </Link>
                </Button>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ── Material Calculator CTA ──────────────────────────── */}
      <section className="bg-background py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="flex flex-col items-center justify-between gap-6 rounded-2xl border-2 border-accent/20 bg-accent/5 p-8 md:flex-row md:p-10">
            <div className="flex items-start gap-4">
              <div className="hidden size-14 items-center justify-center rounded-2xl bg-accent/15 md:flex">
                <Calculator className="size-7 text-accent" />
              </div>
              <div>
                <h2 className="[font-family:var(--font-display)] text-2xl text-primary md:text-3xl">
                  Material Calculator
                </h2>
                <p className="mt-1.5 max-w-lg text-sm text-muted-foreground">
                  Enter length, width, and depth to estimate how much material
                  you need before placing your order.
                </p>
              </div>
            </div>
            <Button
              asChild
              size="lg"
              className="shrink-0 bg-accent text-accent-foreground shadow-lg shadow-accent/20 hover:bg-accent/90"
            >
              <Link href="/calculator">
                Use Calculator
                <ArrowRight className="size-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* ── Customer Reviews ──────────────────────────────────── */}
      <section className="bg-warm-bg py-16 md:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="mb-10 text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">
              Testimonials
            </p>
            <h2 className="mt-2 [font-family:var(--font-display)] text-3xl text-primary md:text-4xl">
              What Our Customers Say
            </h2>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            {reviews.map((review) => (
              <article
                key={review.author}
                className="rounded-2xl border bg-card p-6"
              >
                <div className="mb-4 text-4xl leading-none text-accent/30">
                  &ldquo;
                </div>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {review.quote}
                </p>
                <div className="mt-5 flex items-center gap-1 text-accent">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} className="size-4 fill-current" />
                  ))}
                </div>
                <p className="mt-2 text-sm font-semibold">{review.author}</p>
                <p className="text-xs text-muted-foreground">
                  {review.location}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA Banner ────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-primary py-16 md:py-20">
        <div className="topo-pattern absolute inset-0" />
        <div className="relative mx-auto max-w-7xl px-4 text-center sm:px-6">
          <h2 className="[font-family:var(--font-display)] text-3xl text-primary-foreground md:text-4xl">
            Get Your Materials Delivered Today
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-base text-primary-foreground/60">
            Order online for pickup or delivery. Same-day delivery available on
            early orders, Monday through Friday.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <Button
              asChild
              size="lg"
              className="bg-accent text-accent-foreground shadow-lg shadow-accent/25 hover:bg-accent/90"
            >
              <Link href="/shop">
                Start Your Order
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

      {/* ── Company Info Strip ─────────────────────────────────── */}
      <section className="border-t bg-background py-12">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 sm:px-6 md:grid-cols-3">
          <div className="flex items-start gap-4">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-accent/10">
              <MapPin className="size-5 text-accent" />
            </div>
            <div>
              <p className="text-sm font-semibold">Visit Our Yard</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {siteConfig.addressLine1}, {siteConfig.addressLine2}
              </p>
            </div>
          </div>
          <div className="flex items-start gap-4">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-accent/10">
              <Clock className="size-5 text-accent" />
            </div>
            <div>
              <p className="text-sm font-semibold">Operating Hours</p>
              <div className="mt-1 space-y-0.5 text-sm text-muted-foreground">
                {siteConfig.hours.map((h) => (
                  <p key={h}>{h}</p>
                ))}
              </div>
            </div>
          </div>
          <div className="flex items-start gap-4">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-accent/10">
              <Truck className="size-5 text-accent" />
            </div>
            <div>
              <p className="text-sm font-semibold">Delivery & Pickup</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Same-day bulk delivery across Suffolk County. Pro pickup
                discounts available.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
