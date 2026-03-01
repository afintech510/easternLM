import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
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
  if (!raw) {
    return "http://localhost:3000";
  }

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
  if (categorySlug) {
    params.set("category", categorySlug);
  }
  if (sort !== "popular") {
    params.set("sort", sort);
  }
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

  const selectedCategoryLabel = catalog.categories.find((category) => category.slug === selectedCategory)?.name;
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
    <div className="mx-auto max-w-6xl space-y-8 px-4 py-12 md:py-16">
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
      <section className="space-y-4">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground">Shop</p>
        <h1 className="[font-family:var(--font-display)] text-4xl text-primary md:text-5xl">
          Browse Materials By Category
        </h1>
        <p className="max-w-3xl text-muted-foreground">
          {selectedCategoryLabel ? `Filtered by ${selectedCategoryLabel}.` : "Showing all categories."}
        </p>
        {deliveryZip ? (
          <p className="max-w-3xl rounded-xl border border-primary/25 bg-primary/10 px-4 py-3 text-sm text-primary">
            Delivery ZIP preset: <span className="font-semibold">{deliveryZip}</span>
            {deliveryTown ? ` for ${deliveryTown.replaceAll("-", " ")}` : ""}. Add this ZIP in cart delivery
            address to calculate route-based fees.
          </p>
        ) : null}
      </section>

      <section className="grid gap-6 lg:grid-cols-[260px_1fr]">
        <aside className="space-y-5">
          <article className="rounded-2xl border bg-card p-4">
            <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Categories
            </h2>
            <div className="mt-3 space-y-2">
              <Link
                href={buildShopHref(undefined, selectedSort)}
                className={`block rounded-lg px-3 py-2 text-sm ${
                  !selectedCategory ? "bg-accent text-accent-foreground" : "hover:bg-background"
                }`}
              >
                All Materials
              </Link>
              {catalog.categories.map((category) => (
                <Link
                  key={category.id}
                  href={buildShopHref(category.slug, selectedSort)}
                  className={`block rounded-lg px-3 py-2 text-sm ${
                    selectedCategory === category.slug ? "bg-accent text-accent-foreground" : "hover:bg-background"
                  }`}
                >
                  {category.name}
                </Link>
              ))}
            </div>
          </article>

          <article className="rounded-2xl border bg-card p-4">
            <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-muted-foreground">Sort</h2>
            <div className="mt-3 space-y-2">
              {sortOptions.map((option) => (
                <Link
                  key={option.value}
                  href={buildShopHref(selectedCategory, option.value)}
                  className={`block rounded-lg px-3 py-2 text-sm ${
                    selectedSort === option.value ? "bg-accent text-accent-foreground" : "hover:bg-background"
                  }`}
                >
                  {option.label}
                </Link>
              ))}
            </div>
          </article>
        </aside>

        <div className="space-y-4">
          <div className="flex items-center justify-between rounded-2xl border bg-card px-4 py-3 text-sm">
            <p>{catalog.products.length} products</p>
            <p className="text-muted-foreground">Sort: {sortedLabel}</p>
          </div>

          {catalog.products.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {catalog.products.map((product) => (
                <article key={product.id} className="rounded-2xl border bg-card p-4 transition hover:shadow-lg hover:border-accent/30">
                  <Link href={`/shop/${product.slug}`} className="block overflow-hidden rounded-lg">
                    <Image
                      src={product.images[0] ?? "https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=800&h=500&fit=crop"}
                      alt={product.name}
                      className="h-48 w-full rounded-lg object-cover transition-transform hover:scale-105"
                      width={800}
                      height={500}
                    />
                  </Link>
                  <p className="mt-3 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                    {product.categoryName}
                  </p>
                  <Link href={`/shop/${product.slug}`} className="mt-1 block text-base font-semibold hover:text-accent">
                    {product.name}
                  </Link>
                  <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{product.description}</p>
                  <p className="mt-3 text-sm font-semibold text-accent">
                    {formatUsd(product.pricePerUnitCents)} {product.unitDisplay}
                  </p>
                  <div className="mt-3 grid grid-cols-2 gap-2">
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
                </article>
              ))}
            </div>
          ) : (
            <article className="rounded-2xl border bg-card p-6">
              <p className="text-sm text-muted-foreground">
                No products found for this filter. Try another category or sort option.
              </p>
            </article>
          )}

          <article className="rounded-2xl border bg-card p-4">
            <p className="text-sm text-muted-foreground">
              Need a custom quote for bulk delivery, pickup scheduling, or contractor orders?
            </p>
            <Button asChild className="mt-3">
              <Link href="/contact">Request quote</Link>
            </Button>
          </article>
        </div>
      </section>
    </div>
  );
}
