import { siteConfig } from "@/config/site";

/**
 * Centralized schema.org helpers for the Eastern LM LocalBusiness graph.
 *
 * Pattern ported from the Hamptons Tree Experts reference site: ONE LocalBusiness
 * node (rendered on the home page with live reviews) owns the canonical `@id`
 * `${url}/#business`. Every Service / location / product node references that node
 * by `@id` via `businessRef()` instead of re-describing the business — so NAP, geo,
 * and priceRange live in exactly one place (`siteConfig`).
 */

export const BUSINESS_URL = siteConfig.url;
export const BUSINESS_ID = `${BUSINESS_URL}/#business` as const;

const postalAddress = {
  "@type": "PostalAddress",
  streetAddress: siteConfig.address.streetAddress,
  addressLocality: siteConfig.address.addressLocality,
  addressRegion: siteConfig.address.addressRegion,
  postalCode: siteConfig.address.postalCode,
  addressCountry: siteConfig.address.addressCountry,
} as const;

export type LdObject = Record<string, unknown>;

export type GoogleReview = {
  author_name: string;
  rating: number;
  text: string;
  time?: number;
};

/**
 * Lightweight reference to the canonical LocalBusiness node. Use as the `provider`
 * of a Service node, etc. Does NOT re-declare the full business — it points at the
 * `@id` so search engines merge it with the home-page node.
 */
export function businessRef(): LdObject {
  return {
    "@type": "LocalBusiness",
    "@id": BUSINESS_ID,
    name: siteConfig.name,
    telephone: siteConfig.telephone,
    address: postalAddress,
  };
}

/**
 * The single canonical LocalBusiness node. Rendered once (home page) with live
 * Google reviews merged in. Nothing else should re-declare this node.
 */
export function localBusinessSchema(opts?: {
  reviews?: GoogleReview[];
  rating?: number | string;
  totalReviews?: number | string;
  description?: string;
  image?: string;
}): LdObject {
  const reviews = opts?.reviews ?? [];
  return {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    "@id": BUSINESS_ID,
    name: siteConfig.name,
    description:
      opts?.description ??
      "Suffolk County landscape and masonry supply yard with bulk material delivery and full-service installation. Mulch, gravel, stone, sand, topsoil, and masonry products.",
    telephone: siteConfig.telephone,
    email: siteConfig.email,
    url: BUSINESS_URL,
    image: opts?.image ?? `${BUSINESS_URL}/images/og-home.jpg`,
    priceRange: siteConfig.priceRange,
    address: postalAddress,
    geo: {
      "@type": "GeoCoordinates",
      latitude: siteConfig.geo.latitude,
      longitude: siteConfig.geo.longitude,
    },
    openingHoursSpecification: [
      {
        "@type": "OpeningHoursSpecification",
        dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
        opens: "07:00",
        closes: "17:00",
      },
      { "@type": "OpeningHoursSpecification", dayOfWeek: "Saturday", opens: "07:00", closes: "15:00" },
    ],
    areaServed: {
      "@type": "State",
      name: siteConfig.serviceArea,
      containedInPlace: { "@type": "State", name: "New York" },
    },
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
    ...(reviews.length > 0
      ? {
          review: reviews.slice(0, 3).map((r) => ({
            "@type": "Review",
            reviewRating: { "@type": "Rating", ratingValue: String(r.rating), bestRating: "5" },
            author: { "@type": "Person", name: r.author_name },
            reviewBody: r.text,
            ...(r.time ? { datePublished: new Date(r.time * 1000).toISOString().split("T")[0] } : {}),
            publisher: { "@type": "Organization", name: "Google" },
          })),
        }
      : {}),
    ...(opts?.rating != null && opts?.totalReviews != null
      ? {
          aggregateRating: {
            "@type": "AggregateRating",
            ratingValue: String(opts.rating),
            reviewCount: String(opts.totalReviews),
          },
        }
      : {}),
  };
}

/**
 * A Service node whose provider references the canonical business `@id`.
 * `areaServed` defaults to the primary service area but can be overridden per-town.
 */
export function serviceSchema(opts: {
  name: string;
  description: string;
  url?: string;
  serviceType?: string;
  areaServed?: LdObject;
  offers?: LdObject;
  offerCatalog?: { name: string; items: string[] };
}): LdObject {
  return {
    "@context": "https://schema.org",
    "@type": "Service",
    name: opts.name,
    description: opts.description,
    ...(opts.serviceType ? { serviceType: opts.serviceType } : {}),
    ...(opts.url ? { url: opts.url } : {}),
    areaServed: opts.areaServed ?? {
      "@type": "AdministrativeArea",
      name: siteConfig.serviceArea,
    },
    provider: businessRef(),
    ...(opts.offerCatalog
      ? {
          hasOfferCatalog: {
            "@type": "OfferCatalog",
            name: opts.offerCatalog.name,
            itemListElement: opts.offerCatalog.items.map((s) => ({
              "@type": "Offer",
              itemOffered: { "@type": "Service", name: s },
            })),
          },
        }
      : {}),
    ...(opts.offers ? { offers: opts.offers } : {}),
  };
}

/** FAQPage node from a list of {question, answer}. */
export function faqSchema(faqs: { question: string; answer: string }[]): LdObject {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({
      "@type": "Question",
      name: f.question,
      acceptedAnswer: { "@type": "Answer", text: f.answer },
    })),
  };
}
