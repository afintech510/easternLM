import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { JsonLd } from "@/components/seo/json-ld";
import { ProductDetailClient } from "@/components/shop/product-detail-client";
import { getShopProductBySlug } from "@/lib/data/catalog";
import { getTownsForProductSlug } from "@/lib/data/town-pages";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type ShopProductPageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: ShopProductPageProps): Promise<Metadata> {
  const { slug } = await params;
  const bundle = await getShopProductBySlug(slug);

  if (!bundle) {
    return { title: "Product" };
  }

  const p = bundle.product;
  const price = `$${(p.pricePerUnitCents / 100).toFixed(2)}`;
  const isBulk = p.deliveryType === "bulk";

  // SEO-optimized title: under 60 chars, includes product + location signal
  const titleBase = p.name.replace(/\s*\([^)]*\)\s*/g, "").trim(); // strip parenthetical
  const metaTitle = `${titleBase} ${p.unitDisplay} | Suffolk County Delivery`;

  // Meta description: under 155 chars, includes price + CTA
  const descSnippet = p.description
    ? p.description.split(".")[0] + "."
    : `${p.name} available for ${isBulk ? "bulk delivery" : "pickup"}.`;
  const metaDesc = `${descSnippet} ${price} ${p.unitDisplay}. ${isBulk ? "Bulk delivery across Suffolk County." : "Pickup at our Center Moriches yard."} Order online today.`.substring(0, 155);

  return {
    title: metaTitle.length <= 60 ? metaTitle : `${titleBase} | Eastern LM Supply`,
    description: metaDesc,
    openGraph: {
      title: `${titleBase} — ${price} ${p.unitDisplay}`,
      description: metaDesc,
      type: "website",
      siteName: "Eastern Landscape & Mason Supply",
      images: p.images[0] ? [{ url: p.images[0], width: 1200, height: 630 }] : undefined,
    },
  };
}

function formatUsd(cents: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(cents / 100);
}

export default async function ShopProductPage({ params }: ShopProductPageProps) {
  const { slug } = await params;
  const bundle = await getShopProductBySlug(slug);

  if (!bundle) {
    notFound();
  }

  const relatedTowns = await getTownsForProductSlug(bundle.product.slug, 6);

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-12 sm:px-6 md:py-16">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Product",
          name: bundle.product.name,
          description: bundle.product.description,
          image: bundle.product.images.length > 0 ? bundle.product.images : undefined,
          category: bundle.product.categoryName,
          brand: {
            "@type": "Brand",
            name: "Eastern Landscape & Mason Supply",
          },
          offers: {
            "@type": "Offer",
            priceCurrency: "USD",
            price: (bundle.product.pricePerUnitCents / 100).toFixed(2),
            availability: "https://schema.org/InStock",
            seller: {
              "@type": "LocalBusiness",
              name: "Eastern Landscape & Mason Supply",
              address: {
                "@type": "PostalAddress",
                streetAddress: "110 Frowein Road",
                addressLocality: "Center Moriches",
                addressRegion: "NY",
                postalCode: "11934",
              },
            },
          },
        }}
      />
      <nav className="text-sm text-muted-foreground">
        <Link href="/shop" className="hover:text-primary hover:underline">
          Shop
        </Link>{" "}
        /{" "}
        <Link
          href={`/shop?category=${bundle.product.categorySlug}`}
          className="hover:text-primary hover:underline"
        >
          {bundle.product.categoryName}
        </Link>{" "}
        / <span className="text-foreground">{bundle.product.name}</span>
      </nav>
      <ProductDetailClient product={bundle.product} relatedProducts={bundle.relatedProducts} />
      {relatedTowns.length > 0 ? (
        <section className="rounded-2xl border bg-card p-5">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-semibold">Delivery Town Pages For This Product</h2>
            <Badge variant="secondary">{relatedTowns.length} towns</Badge>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            Compare route timing and fee estimates before checkout.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {relatedTowns.map((town) => (
              <Button key={town.slug} asChild size="sm" variant="outline">
                <Link href={`/delivery/${town.slug}`}>
                  {town.name} <span className="text-xs text-muted-foreground">(Tier {town.tier})</span>
                </Link>
              </Button>
            ))}
          </div>
          <p className="mt-3 text-sm font-semibold text-primary">
            Starting at {formatUsd(bundle.product.pricePerUnitCents)} {bundle.product.unitDisplay}
          </p>
        </section>
      ) : null}
    </div>
  );
}
