import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Calculator, CheckCircle, Phone, Search, Truck } from "lucide-react";
import { AddToCartButton } from "@/components/cart/add-to-cart-button";
import { JsonLd } from "@/components/seo/json-ld";
import { Button } from "@/components/ui/button";
import { getShopCatalog, type ShopSortOption } from "@/lib/data/catalog";
import { siteConfig } from "@/config/site";

type ShopPageProps = {
  searchParams: Promise<{
    category?: string;
    sort?: string;
    q?: string;
  }>;
};

export const metadata: Metadata = {
  title: "Landscape & Mason Supply | Mulch, Stone, Gravel Delivery Suffolk County",
  description:
    "Shop 280+ bulk materials with transparent pricing. Mulch, topsoil, gravel, stone, sand, and masonry supplies delivered across Suffolk County from Center Moriches. Order online.",
  openGraph: {
    title: "Shop Landscape & Mason Supply | Eastern LM",
    description:
      "280+ bulk materials with transparent pricing. Mulch, topsoil, gravel, stone, and masonry supplies delivered across Suffolk County. Order online today.",
    type: "website",
  },
};

function resolveBaseUrl() {
  const raw = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (!raw) return "http://localhost:3000";
  try { return new URL(raw).origin; } catch { try { return new URL(`https://${raw}`).origin; } catch { return "http://localhost:3000"; } }
}

function formatUsd(cents: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2 }).format(cents / 100);
}

function resolveSortOption(value?: string): ShopSortOption {
  if (value === "price-asc" || value === "price-desc" || value === "name-asc") return value;
  return "popular";
}

function buildShopHref(categorySlug: string | undefined, sort: ShopSortOption, q?: string) {
  const params = new URLSearchParams();
  if (categorySlug) params.set("category", categorySlug);
  if (sort !== "popular") params.set("sort", sort);
  if (q) params.set("q", q);
  const query = params.toString();
  return query ? `/shop?${query}` : "/shop";
}

export default async function ShopPage({ searchParams }: ShopPageProps) {
  const query = await searchParams;
  const selectedCategory = query.category;
  const selectedSort = resolveSortOption(query.sort);
  const searchQuery = query.q?.trim() || "";
  const baseUrl = resolveBaseUrl();

  const catalog = await getShopCatalog({
    categorySlug: selectedCategory,
    sort: selectedSort,
  });

  // Client-side search filter (simple substring match)
  const filteredProducts = searchQuery
    ? catalog.products.filter((p) =>
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.description.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : catalog.products;

  const selectedCategoryLabel = catalog.categories.find((c) => c.slug === selectedCategory)?.name;

  const sortOptions: Array<{ value: ShopSortOption; label: string }> = [
    { value: "popular", label: "Popular" },
    { value: "price-asc", label: "Price: Low → High" },
    { value: "price-desc", label: "Price: High → Low" },
    { value: "name-asc", label: "A → Z" },
  ];

  return (
    <div>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "ItemList",
          itemListElement: filteredProducts.slice(0, 20).map((product, index) => ({
            "@type": "ListItem",
            position: index + 1,
            url: `${baseUrl}/shop/${product.slug}`,
            name: product.name,
          })),
        }}
      />

      {/* ── Compact header ────────────────────────────────── */}
      <section className="border-b bg-primary">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 md:py-10">
          <h1 className="[font-family:var(--font-display)] text-2xl text-primary-foreground md:text-4xl">
            {selectedCategoryLabel || "Shop Materials"}
          </h1>
          <p className="mt-1 text-sm text-primary-foreground/60">
            {filteredProducts.length} product{filteredProducts.length !== 1 ? "s" : ""}
            {selectedCategoryLabel ? ` in ${selectedCategoryLabel}` : ""} — pickup or delivery
          </p>
        </div>
      </section>

      {/* ── Mobile category tabs (horizontal scroll) ────── */}
      <div className="overflow-x-auto border-b bg-card lg:hidden">
        <div className="flex gap-1 px-4 py-2">
          <Link
            href={buildShopHref(undefined, selectedSort)}
            className={`shrink-0 rounded-md px-3 py-1.5 text-sm font-medium ${!selectedCategory ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`}
          >
            All
          </Link>
          {catalog.categories.map((cat) => (
            <Link
              key={cat.id}
              href={buildShopHref(cat.slug, selectedSort)}
              className={`shrink-0 rounded-md px-3 py-1.5 text-sm font-medium whitespace-nowrap ${selectedCategory === cat.slug ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`}
            >
              {cat.name}
            </Link>
          ))}
        </div>
      </div>

      {/* ── Main layout ───────────────────────────────────── */}
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 md:py-10">
        <div className="grid gap-8 lg:grid-cols-[220px_1fr]">

          {/* ── Desktop sidebar ──────────────────────────── */}
          <aside className="hidden space-y-5 lg:block">
            {/* Search */}
            <form action="/shop" method="get" className="relative">
              <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
              <input
                type="text"
                name="q"
                defaultValue={searchQuery}
                placeholder="Search products..."
                className="h-9 w-full rounded-md border bg-background pl-9 pr-3 text-sm outline-ring/50"
              />
              {selectedCategory && <input type="hidden" name="category" value={selectedCategory} />}
            </form>

            {/* Categories */}
            <div>
              <h2 className="mb-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">Category</h2>
              <nav className="space-y-0.5">
                <Link
                  href={buildShopHref(undefined, selectedSort)}
                  className={`block rounded-md px-3 py-2 text-sm font-medium ${!selectedCategory ? "bg-primary text-primary-foreground" : "text-foreground/70 hover:bg-muted"}`}
                >
                  All Materials
                </Link>
                {catalog.categories.map((cat) => (
                  <Link
                    key={cat.id}
                    href={buildShopHref(cat.slug, selectedSort)}
                    className={`block rounded-md px-3 py-2 text-sm font-medium ${selectedCategory === cat.slug ? "bg-primary text-primary-foreground" : "text-foreground/70 hover:bg-muted"}`}
                  >
                    {cat.name}
                  </Link>
                ))}
              </nav>
            </div>

            {/* Sort */}
            <div>
              <h2 className="mb-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">Sort</h2>
              <nav className="space-y-0.5">
                {sortOptions.map((opt) => (
                  <Link
                    key={opt.value}
                    href={buildShopHref(selectedCategory, opt.value)}
                    className={`block rounded-md px-3 py-2 text-sm font-medium ${selectedSort === opt.value ? "bg-accent/15 text-accent" : "text-foreground/70 hover:bg-muted"}`}
                  >
                    {opt.label}
                  </Link>
                ))}
              </nav>
            </div>

            {/* Calculator CTA */}
            <div className="rounded-xl border-2 border-accent/20 bg-accent/5 p-4">
              <Calculator className="size-6 text-accent" />
              <p className="mt-2 text-sm font-semibold">Not sure how much?</p>
              <p className="mt-1 text-xs text-muted-foreground">Use our material calculator to figure out cubic yards.</p>
              <Button asChild size="sm" variant="outline" className="mt-3 w-full">
                <Link href="/calculator">Open Calculator</Link>
              </Button>
            </div>
          </aside>

          {/* ── Product grid ─────────────────────────────── */}
          <div className="space-y-5">
            {filteredProducts.length > 0 ? (
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {filteredProducts.map((product) => (
                  <article
                    key={product.id}
                    className="group flex flex-col overflow-hidden rounded-xl border bg-card transition-all hover:border-accent/30 hover:shadow-md"
                  >
                    {/* Image — big, clickable */}
                    <Link href={`/shop/${product.slug}`} className="block overflow-hidden">
                      <Image
                        src={product.images[0] ?? "https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=800&h=500&fit=crop"}
                        alt={product.name}
                        className="h-44 w-full object-cover transition-transform duration-300 group-hover:scale-105"
                        width={800}
                        height={500}
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                      />
                    </Link>

                    {/* Body */}
                    <div className="flex flex-1 flex-col p-4">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-semibold uppercase tracking-widest text-muted-foreground">
                          {product.categoryName}
                        </span>
                        <span className="flex items-center gap-1 font-medium text-green-600">
                          <CheckCircle className="size-3" /> In Stock
                        </span>
                      </div>

                      <Link href={`/shop/${product.slug}`} className="mt-1.5 text-base font-semibold leading-tight hover:text-accent">
                        {product.name}
                      </Link>

                      {product.description && (
                        <p className="mt-1 line-clamp-2 flex-1 text-sm text-muted-foreground">{product.description}</p>
                      )}

                      {/* Price — prominent */}
                      <div className="mt-3">
                        <span className="text-xl font-bold text-accent">{formatUsd(product.pricePerUnitCents)}</span>
                        <span className="ml-1 text-sm text-muted-foreground">{product.unitDisplay}</span>
                      </div>

                      {product.deliveryType === "bulk" && (
                        <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                          <Truck className="size-3" /> Bulk delivery
                        </p>
                      )}

                      {/* CTAs */}
                      <div className="mt-3 grid grid-cols-2 gap-2">
                        <Button asChild variant="outline" size="sm">
                          <Link href={`/shop/${product.slug}`}>Details</Link>
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
              <div className="rounded-xl border bg-card p-10 text-center">
                <p className="text-muted-foreground">No products found{searchQuery ? ` for "${searchQuery}"` : ""}.</p>
                <Button asChild variant="outline" className="mt-4">
                  <Link href="/shop">Clear filters</Link>
                </Button>
              </div>
            )}

            {/* Bottom CTA */}
            <div className="rounded-xl border bg-card p-5 md:flex md:items-center md:justify-between">
              <div>
                <p className="font-semibold">Need a bulk quote or contractor pricing?</p>
                <p className="mt-0.5 text-sm text-muted-foreground">Volume discounts available. Call or submit a request.</p>
              </div>
              <div className="mt-3 flex gap-2 md:mt-0">
                <Button asChild size="sm" className="bg-accent text-accent-foreground hover:bg-accent/90">
                  <Link href="/contact">Contact Us</Link>
                </Button>
                <Button asChild size="sm" variant="outline">
                  <a href={siteConfig.phoneHref}>
                    <Phone className="size-3.5" />
                    Call
                  </a>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
