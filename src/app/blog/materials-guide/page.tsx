import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { getShopCatalog } from "@/lib/data/catalog";

export const metadata: Metadata = {
  title: "Materials Guide | Eastern Landscape & Mason Supply",
  description: "A planning hub for quantity estimates, calculator workflows, and commonly ordered products.",
  openGraph: {
    title: "Materials Guide | Eastern Landscape & Mason Supply",
    description: "A planning hub for quantity estimates, calculator workflows, and commonly ordered products.",
    type: "article",
  },
};

function formatUsd(cents: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(cents / 100);
}

export default async function MaterialsGuidePage() {
  const catalog = await getShopCatalog({ sort: "popular" });
  const topProducts = catalog.products.slice(0, 6);

  return (
    <div className="mx-auto max-w-6xl space-y-8 px-4 py-12 md:py-16">
      <section className="space-y-3 rounded-2xl border bg-card p-6 md:p-8">
        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-muted-foreground">Materials Guide</p>
        <h1 className="[font-family:var(--font-display)] text-4xl text-primary md:text-5xl">
          Plan Quantities, Compare Products, Then Checkout Confidently
        </h1>
        <p className="max-w-3xl text-muted-foreground">
          Use this hub to estimate yardage, choose the right material class, and build a staged order.
        </p>
        <div className="flex flex-wrap gap-2 pt-2">
          <Button asChild>
            <Link href="/calculator">Open Material Calculator</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/shop">Browse Full Catalog</Link>
          </Button>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <article className="rounded-2xl border bg-card p-5">
          <h2 className="text-lg font-semibold">1. Measure</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Break projects into simple sections and capture width, length, and depth for each.
          </p>
        </article>
        <article className="rounded-2xl border bg-card p-5">
          <h2 className="text-lg font-semibold">2. Estimate</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Convert dimensions to cubic yards and validate with your desired compaction target.
          </p>
        </article>
        <article className="rounded-2xl border bg-card p-5">
          <h2 className="text-lg font-semibold">3. Schedule</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Add access constraints and pick preferred dates so delivery can be staged accurately.
          </p>
        </article>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold text-primary">Top Products</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {topProducts.map((product) => (
            <article key={product.id} className="rounded-2xl border bg-card p-4">
              <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">{product.categoryName}</p>
              <h3 className="mt-1 text-base font-semibold">{product.name}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{product.description}</p>
              <p className="mt-3 text-sm font-semibold text-primary">
                {formatUsd(product.pricePerUnitCents)} {product.unitDisplay}
              </p>
              <Button asChild className="mt-3 w-full" variant="outline">
                <Link href={`/shop/${product.slug}`}>View Product</Link>
              </Button>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
