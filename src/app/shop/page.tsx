import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight, SlidersHorizontal } from "lucide-react";
import { AddToCartButton } from "@/components/cart/add-to-cart-button";
import { JsonLd } from "@/components/seo/json-ld";
import { Button } from "@/components/ui/button";
import { getShopCatalog, type ShopSortOption } from "@/lib/data/catalog";

type ShopPageProps = {
  searchParams: Promise<{
    category?: string;
    sort?: string;
    deliveryZip?: string;
    town?: string;
  }>;
};

export const metadata: Metadata = {
  title: "Shop Materials | Eastern Landscape & Mason Supply",
  description: "Browse bulk and non-bulk landscape and masonry products with transparent pricing.",
  openGraph: {
    title: "Shop Materials | Eastern Landscape & Mason Supply",
    description: "Browse bulk and non-bulk landscape and masonry products with transparent pricing.",
    type: "website",
  },
};

function resolveBaseUrl() {
  const raw = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (!raw) return "http://localhost:3000";
  try {
    return new URL(raw).origin;
  } catch {
    try {
      return new URL(`https://${raw}`).origin;
    } catch {
      return "http://localhost:3000";
    }
  }
}

function formatUsd(cents: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(cents / 100);
}

function resolveSortOption(value?: string): ShopSortOption {
  if (value === "price-asc" || value === "price-desc" || value === "name-asc") {
    return value;
  }
  return "popular";
}

function buildShopHref(categorySlug: string | undefined, sort: ShopSortOption) {
  const params = new URLSearchParams();
  if (categorySlug) params.set("category", categorySlug);
  if (sort !== "popular") params.set("sort", sort);
  const query = params.toString();
  return query ? `/shop?${query}` : "/shop";
}

export default async function ShopPage({ searchParams }: ShopPageProps) {
  const query = await searchParams;
  const selectedCategory = query.category;
  const selectedSort = resolveSortOption(query.sort);
  const deliveryZip = query.deliveryZip?.trim();
  const deliveryTown = query.town?.trim();
  const baseUrl = resolveBaseUrl();

  const catalog = await getShopCatalog({
    categorySlug: selectedCategory,
    sort: selectedSort,
  });

  const selectedCategoryLabel = catalog.categories.find(
    (category) => category.slug === selectedCategory,
  )?.name;

  const sortedLabel =
    selectedSort === "price-asc"
      ? "Price: Low to High"
      : selectedSort === "price-desc"
        ? "Price: High to Low"
        : selectedSort === "name-asc"
          ? "Name: A to Z"
          : "Popular";

  const sortOptions: Array<{ value: ShopSortOption; label: string }> = [
    { value: "popular", label: "Popular" },
    { value: "price-asc", label: "Price: Low to High" },
    { value: "price-desc", label: "Price: High to Low" },
    { value: "name-asc", label: "Name: A to Z" },
  ];

  return (
    <div>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "ItemList",
          itemListElement: catalog.products.slice(0, 20).map((product, index) => ({
            "@type": "ListItem",
            position: index + 1,
            url: `${baseUrl}/shop/${product.slug}`,
            name: product.name,
          })),
        }}
      />

      {/* Hero banner */}
      <section className="bg-primary">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 md:py-16">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">
            Shop
          </p>
          <h1 className="mt-2 [font-family:var(--font-display)] text-3xl text-primary-foreground md:text-5xl">
            Browse Materials
          </h1>
          <p className="mt-3 max-w-2xl text-base text-primary-foreground/60">
            {selectedCategoryLabel
              ? `Showing ${selectedCategoryLabel} products.`
              : "Bulk landscape materials, natural stone, masonry supplies, and more."}
          </p>
          {deliveryZip && (
            <p className="mt-4 inline-flex items-center gap-2 rounded-lg bg-primary-foreground/10 px-4 py-2.5 text-sm text-primary-foreground/80">
              Delivery ZIP: <span className="font-semibold text-accent">{deliveryZip}</span>
              {deliveryTown ? ` for ${deliveryTown.replaceAll("-", " ")}` : ""}
            </p>
          )}
        </div>
      </section>

      {/* Main content */}
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 md:py-14">
        <div className="grid gap-8 lg:grid-cols-[240px_1fr]">
          {/* Sidebar */}
          <aside className="space-y-6">
            <div className="rounded-2xl border bg-card p-5">
              <h2 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                <SlidersHorizontal className="size-3.5" />
                Categories
              </h2>
              <div className="mt-4 space-y-1">
                <Link
                  href={buildShopHref(undefined, selectedSort)}
                  className={`block rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                    !selectedCategory
                      ? "bg-accent text-accent-foreground"
                      : "text-foreground/70 hover:bg-muted hover:text-foreground"
                  }`}
                >
                  All Materials
                </Link>
                {catalog.categories.map((category) => (
                  <Link
                    key={category.id}
                    href={buildShopHref(category.slug, selectedSort)}
                    className={`block rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                      selectedCategory === category.slug
                        ? "bg-accent text-accent-foreground"
                        : "text-foreground/70 hover:bg-muted hover:text-foreground"
                    }`}
                  >
                    {category.name}
                  </Link>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border bg-card p-5">
              <h2 className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                Sort By
              </h2>
              <div className="mt-4 space-y-1">
                {sortOptions.map((option) => (
                  <Link
                    key={option.value}
                    href={buildShopHref(selectedCategory, option.value)}
                    className={`block rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                      selectedSort === option.value
                        ? "bg-accent text-accent-foreground"
                        : "text-foreground/70 hover:bg-muted hover:text-foreground"
                    }`}
                  >
                    {option.label}
                  </Link>
                ))}
              </div>
            </div>
          </aside>

          {/* Product grid */}
          <div className="space-y-6">
            {/* Toolbar */}
            <div className="flex items-center justify-between rounded-2xl border bg-card px-5 py-3.5">
              <p className="text-sm font-medium">
                {catalog.products.length} product{catalog.products.length !== 1 ? "s" : ""}
              </p>
              <p className="text-sm text-muted-foreground">Sort: {sortedLabel}</p>
            </div>

            {catalog.products.length > 0 ? (
              <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                {catalog.products.map((product) => (
                  <article
                    key={product.id}
                    className="group overflow-hidden rounded-2xl border bg-card transition-all hover:border-accent/30 hover:shadow-lg"
                  >
                    <Link
                      href={`/shop/${product.slug}`}
                      className="block overflow-hidden"
                    >
                      <Image
                        src={
                          product.images[0] ??
                          "https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=800&h=500&fit=crop"
                        }
                        alt={product.name}
                        className="h-48 w-full object-cover transition-transform duration-300 group-hover:scale-105"
                        width={800}
                        height={500}
                      />
                    </Link>
                    <div className="p-5">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                        {product.categoryName}
                      </p>
                      <Link
                        href={`/shop/${product.slug}`}
                        className="mt-1.5 block text-base font-semibold transition-colors hover:text-accent"
                      >
                        {product.name}
                      </Link>
                      <p className="mt-1.5 line-clamp-2 text-sm leading-relaxed text-muted-foreground">
                        {product.description}
                      </p>
                      <p className="mt-4 text-lg font-bold text-accent">
                        {formatUsd(product.pricePerUnitCents)}{" "}
                        <span className="text-sm font-normal text-muted-foreground">
                          {product.unitDisplay}
                        </span>
                      </p>
                      <div className="mt-4 grid grid-cols-2 gap-2">
                        <Button asChild variant="outline" size="sm">
                          <Link href={`/shop/${product.slug}`}>View Details</Link>
                        </Button>
                        <AddToCartButton
                          productId={product.id}
                          name={product.name}
                          unitPriceCents={product.pricePerUnitCents}
                          deliveryType={product.deliveryType}
                          materialClass={product.materialClass}
                        />
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="rounded-2xl border bg-card p-8 text-center">
                <p className="text-muted-foreground">
                  No products found for this filter.
                </p>
                <Button asChild variant="outline" className="mt-4">
                  <Link href="/shop">Clear filters</Link>
                </Button>
              </div>
            )}

            {/* Quote CTA */}
            <div className="rounded-2xl border-2 border-accent/20 bg-accent/5 p-6 md:flex md:items-center md:justify-between">
              <div>
                <p className="font-semibold text-foreground">
                  Need a custom quote for large orders?
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Contractor pricing, bulk delivery scheduling, and volume discounts available.
                </p>
              </div>
              <Button asChild className="mt-4 bg-accent text-accent-foreground hover:bg-accent/90 md:mt-0">
                <Link href="/contact">
                  Contact Us
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
