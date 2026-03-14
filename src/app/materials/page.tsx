import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, MapPin, Truck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getProductTownPages } from "@/lib/data/product-town-pages";
import { getTownPages } from "@/lib/data/town-pages";

export const metadata: Metadata = {
  title: "Bulk Material Delivery Across Suffolk County | Eastern LM",
  description: "Mulch, topsoil, gravel, sand, RCA, and decorative stone delivered to 65+ Suffolk County towns. Browse materials by town and order online.",
};

type GroupedPages = Record<string, Array<{ slug: string; townName: string; townSlug: string }>>;

export default async function MaterialsHubPage() {
  const [allPages, towns] = await Promise.all([getProductTownPages(), getTownPages()]);

  const townNameMap = new Map(towns.map((t) => [t.slug, t.name]));

  // Group by product group (extracted from slug prefix)
  const groups: GroupedPages = {};
  const GROUP_ORDER = ["mulch", "topsoil", "gravel", "sand", "rca-fill", "decorative-stone"];
  const GROUP_LABELS: Record<string, string> = {
    mulch: "Mulch Delivery",
    topsoil: "Topsoil & Compost Delivery",
    gravel: "Gravel & Stone Delivery",
    sand: "Sand Delivery",
    "rca-fill": "RCA & Fill Delivery",
    "decorative-stone": "Decorative Stone Delivery",
  };

  for (const page of allPages) {
    const match = page.slug.match(/^(.+?)-delivery-(.+)$/);
    if (!match) continue;
    const [, groupKey, townSlug] = match;
    if (!groups[groupKey]) groups[groupKey] = [];
    groups[groupKey].push({
      slug: page.slug,
      townName: townNameMap.get(townSlug) || townSlug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
      townSlug,
    });
  }

  // Sort towns within each group alphabetically
  for (const key of Object.keys(groups)) {
    groups[key].sort((a, b) => a.townName.localeCompare(b.townName));
  }

  return (
    <div>
      <section className="bg-primary">
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 md:py-14">
          <h1 className="[font-family:var(--font-display)] text-3xl text-primary-foreground md:text-5xl">
            Bulk Material Delivery — Suffolk County
          </h1>
          <p className="mt-3 max-w-2xl text-base text-primary-foreground/60">
            We deliver mulch, topsoil, gravel, sand, RCA, and decorative stone to 65+ towns across Suffolk County.
            Browse by material type and find your town below.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Button asChild size="lg" className="bg-accent text-accent-foreground hover:bg-accent/90">
              <Link href="/shop">Shop All Materials <ArrowRight className="size-4" /></Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="border-primary-foreground/25 text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground">
              <Link href="/calculator">Material Calculator</Link>
            </Button>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 md:py-14">
        {/* Quick jump nav */}
        <nav className="mb-10 flex flex-wrap gap-2" aria-label="Material categories">
          {GROUP_ORDER.filter((k) => groups[k]).map((key) => (
            <a key={key} href={`#${key}`} className="rounded-md border bg-card px-3 py-1.5 text-sm font-medium hover:border-accent/40 hover:text-accent transition-colors">
              {GROUP_LABELS[key] || key}
            </a>
          ))}
        </nav>

        {/* Material groups */}
        <div className="space-y-12">
          {GROUP_ORDER.filter((k) => groups[k]).map((key) => (
            <section key={key} id={key}>
              <div className="mb-4 flex items-center gap-3">
                <Truck className="size-5 text-accent" />
                <h2 className="[font-family:var(--font-display)] text-2xl text-primary">
                  {GROUP_LABELS[key] || key}
                </h2>
                <span className="rounded-md bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                  {groups[key].length} towns
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {groups[key].map((page) => (
                  <Link
                    key={page.slug}
                    href={`/materials/${page.slug}`}
                    className="flex items-center gap-1.5 rounded-md border bg-card px-3 py-2 text-sm font-medium transition-colors hover:border-accent/40 hover:text-accent"
                  >
                    <MapPin className="size-3 text-muted-foreground" />
                    {page.townName}
                  </Link>
                ))}
              </div>
              <Button asChild variant="ghost" size="sm" className="mt-3">
                <Link href={`/shop?category=${key === "rca-fill" ? "gravel-stone" : key}`}>
                  Shop {GROUP_LABELS[key]?.replace(" Delivery", "") || key} products <ArrowRight className="size-3.5" />
                </Link>
              </Button>
            </section>
          ))}
        </div>

        {/* Services section */}
        <section className="mt-16 rounded-xl bg-primary p-8 text-center">
          <h2 className="[font-family:var(--font-display)] text-2xl text-primary-foreground">
            Need Installation? We Do That Too.
          </h2>
          <p className="mx-auto mt-2 max-w-lg text-sm text-primary-foreground/60">
            Our crew handles driveways, landscaping, masonry, and maintenance across Suffolk County.
          </p>
          <Button asChild size="lg" className="mt-5 bg-accent text-accent-foreground hover:bg-accent/90">
            <Link href="/services">View Services <ArrowRight className="size-4" /></Link>
          </Button>
        </section>
      </div>
    </div>
  );
}
