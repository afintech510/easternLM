import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { JsonLd } from "@/components/seo/json-ld";
import { MaterialLandingClient } from "@/components/materials/material-landing-client";
import {
  getMaterialLandingPage,
  getAllMaterialLandingPageSlugs,
} from "@/lib/data/material-landing-pages";
import { getShopCatalog } from "@/lib/data/catalog";

type RouteProps = { params: Promise<{ slug: string }> };

export const dynamicParams = false;
export const revalidate = 86400;

export function generateStaticParams() {
  return getAllMaterialLandingPageSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: RouteProps): Promise<Metadata> {
  const { slug } = await params;
  const page = getMaterialLandingPage(slug);
  if (!page) return { title: "Materials | Eastern LM" };
  return {
    title: page.metaTitle,
    description: page.metaDescription,
    openGraph: {
      title: page.metaTitle,
      description: page.metaDescription,
      type: "website",
    },
  };
}

export default async function BuyMaterialPage({ params }: RouteProps) {
  const { slug } = await params;
  const page = getMaterialLandingPage(slug);
  if (!page) notFound();

  const catalog = await getShopCatalog({});
  const productSlugs = new Set(page.variants.map((v) => v.productSlug));
  const products = catalog.products.filter((p) => productSlugs.has(p.slug));

  const faqSchema = {
    "@context": "https://schema.org" as const,
    "@type": "FAQPage" as const,
    mainEntity: page.faqs.map((faq) => ({
      "@type": "Question" as const,
      name: faq.q,
      acceptedAnswer: { "@type": "Answer" as const, text: faq.a },
    })),
  };

  const serviceSchema = {
    "@context": "https://schema.org" as const,
    "@type": "Service" as const,
    name: `${page.title} Delivery — Suffolk County`,
    description: page.metaDescription,
    serviceType: "Bulk Material Delivery",
    areaServed: {
      "@type": "State" as const,
      name: "New York",
      containedInPlace: { "@type": "Country" as const, name: "US" },
    },
    provider: {
      "@type": "LocalBusiness" as const,
      "@id": "https://www.easternlm.com/#business",
      name: "Eastern Landscape & Mason Supply",
      telephone: "+16318746244",
      address: {
        "@type": "PostalAddress" as const,
        streetAddress: "110 Frowein Road",
        addressLocality: "Center Moriches",
        addressRegion: "NY",
        postalCode: "11934",
      },
    },
  };

  return (
    <>
      <JsonLd data={[faqSchema, serviceSchema]} />
      <MaterialLandingClient page={page} products={products} />
    </>
  );
}
