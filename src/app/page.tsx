import Link from "next/link";
import { ArrowRight, Calculator, Star, Truck } from "lucide-react";
import { JsonLd } from "@/components/seo/json-ld";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { coreServices, featuredCategories } from "@/config/content";
import { siteConfig } from "@/config/site";

export default function Home() {
  const trustItems = [
    "Family-owned for 30+ years",
    "Same-day delivery before 11:00 AM",
    "Pickup and delivery options",
    "Pro pickup discount program",
  ];

  const reviews = [
    {
      quote: "Reliable deliveries and clear communication every order.",
      author: "Mike R.",
      location: "Shirley, NY",
    },
    {
      quote: "Great yard team and fast turnaround on stone and mulch.",
      author: "Jennifer S.",
      location: "Moriches, NY",
    },
    {
      quote: "Pricing is straightforward and pickup is easy to schedule.",
      author: "Tom D.",
      location: "Patchogue, NY",
    },
  ];

  return (
    <div className="pb-16">
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
            addressLocality: "East Moriches",
            addressRegion: "NY",
            postalCode: "11940",
            addressCountry: "US",
          },
          review: reviews.map((r) => ({
            "@type": "Review",
            reviewRating: { "@type": "Rating", ratingValue: "5", bestRating: "5" },
            author: { "@type": "Person", name: r.author },
            reviewBody: r.quote,
          })),
        }}
      />

      <section className="border-b border-border bg-gradient-to-br from-primary/[0.04] to-accent/[0.06]">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-16 md:grid-cols-[1.2fr_1fr] md:py-24">
          <div className="space-y-6">
            <Badge className="bg-accent/15 text-accent hover:bg-accent/15">
              Serving Suffolk County
            </Badge>
            <h1 className="[font-family:var(--font-display)] text-4xl leading-tight text-primary md:text-6xl">
              Local Landscape And Mason Supply, Built For Fast Delivery
            </h1>
            <p className="max-w-xl text-base text-muted-foreground md:text-lg">
              Order bulk materials, masonry supplies, and site essentials with a
              clear delivery path from yard to job site.
            </p>
            <div className="flex flex-wrap gap-3">
              <Button asChild size="lg" className="bg-accent text-accent-foreground hover:bg-accent/90">
                <Link href="/shop">
                  Shop Materials
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href="/services">Request A Service Quote</Link>
              </Button>
            </div>
          </div>
          <div className="rounded-2xl border bg-card p-6 shadow-sm">
            <p className="mb-4 flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              <Truck className="size-4 text-accent" />
              Delivery Snapshot
            </p>
            <ul className="space-y-3">
              {trustItems.map((item) => (
                <li key={item} className="rounded-lg bg-background px-4 py-3 text-sm">
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-10 md:py-14">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="[font-family:var(--font-display)] text-3xl text-primary">
            Featured Categories
          </h2>
          <Button asChild variant="ghost">
            <Link href="/shop">Browse all</Link>
          </Button>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {featuredCategories.map((category) => (
            <Link
              key={category.slug}
              href={`/shop#${category.slug}`}
              className="rounded-xl border bg-card px-5 py-4 text-sm font-semibold transition hover:border-accent/40 hover:shadow-md"
            >
              <p>{category.name}</p>
              <p className="mt-1 text-xs font-normal text-muted-foreground">{category.description}</p>
            </Link>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-10 md:py-14">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="[font-family:var(--font-display)] text-3xl text-primary">Services</h2>
          <Button asChild variant="ghost">
            <Link href="/services">View all</Link>
          </Button>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {coreServices.map((service) => (
            <article key={service.slug} className="rounded-2xl border bg-card p-5 transition hover:shadow-md">
              <h3 className="text-lg font-semibold">{service.name}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{service.description}</p>
              <Button asChild variant="outline" className="mt-4 w-full">
                <Link href={`/services/${service.slug}`}>Learn More</Link>
              </Button>
            </article>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-8">
        <div className="rounded-2xl border bg-accent/10 p-6 md:flex md:items-center md:justify-between md:gap-6">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-accent">
              Material Calculator
            </p>
            <h2 className="mt-2 [font-family:var(--font-display)] text-3xl text-primary">
              Estimate Yardage Before You Order
            </h2>
            <p className="mt-2 max-w-xl text-sm text-muted-foreground">
              Calculate length, width, and depth to get a working material estimate before checkout.
            </p>
          </div>
          <Button asChild size="lg" className="mt-4 bg-accent text-accent-foreground hover:bg-accent/90 md:mt-0">
            <Link href="/calculator">
              Use Calculator
              <Calculator className="size-4" />
            </Link>
          </Button>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-10">
        <h2 className="[font-family:var(--font-display)] text-3xl text-primary">Customer Feedback</h2>
        <div className="mt-5 grid gap-4 md:grid-cols-3">
          {reviews.map((review) => (
            <article key={review.author} className="rounded-2xl border bg-card p-5">
              <p className="flex gap-1 text-accent">
                {Array.from({ length: 5 }).map((_, starIndex) => (
                  <Star key={starIndex} className="size-4 fill-current" />
                ))}
              </p>
              <p className="mt-3 text-sm text-muted-foreground">&ldquo;{review.quote}&rdquo;</p>
              <p className="mt-3 text-sm font-semibold">{review.author}</p>
              <p className="text-xs text-muted-foreground">{review.location}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-8">
        <div className="grid gap-5 rounded-2xl border bg-card p-6 md:grid-cols-[1.1fr_1fr]">
          <div>
            <h2 className="[font-family:var(--font-display)] text-3xl text-primary">Built For Local Jobs</h2>
            <p className="mt-3 text-sm text-muted-foreground">
              Eastern combines supply-yard operations with field service experience, helping teams
              avoid delays caused by fragmented vendors.
            </p>
            <Button asChild className="mt-4">
              <Link href="/about">Learn Our Story</Link>
            </Button>
          </div>
          <div className="space-y-2 rounded-xl bg-background p-4 text-sm text-muted-foreground">
            <p>{siteConfig.addressLine1}</p>
            <p>{siteConfig.addressLine2}</p>
            {siteConfig.hours.map((line) => (
              <p key={line}>{line}</p>
            ))}
            <p>
              Phone:{" "}
              <a href={siteConfig.phoneHref} className="font-semibold text-accent hover:underline">
                {siteConfig.phoneDisplay}
              </a>
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
