import { siteConfig } from "@/config/site";

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-6xl space-y-10 px-4 py-12 md:py-16">
      <section className="space-y-4">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          About Eastern LM
        </p>
        <h1 className="[font-family:var(--font-display)] text-4xl text-primary md:text-5xl">
          A Family Yard Built Around Reliable Supply And Honest Service
        </h1>
        <p className="max-w-3xl text-muted-foreground">
          Eastern Landscape & Mason Supply has served Suffolk County contractors and homeowners for
          over three decades. We combine yard inventory with local field knowledge so jobs move from
          estimate to delivery without guesswork.
        </p>
      </section>

      <section className="grid gap-5 md:grid-cols-3">
        <article className="rounded-xl border bg-card p-5">
          <h2 className="text-lg font-semibold">What We Sell</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Bulk materials, masonry products, and site supplies with transparent pricing and unit
            options.
          </p>
        </article>
        <article className="rounded-xl border bg-card p-5">
          <h2 className="text-lg font-semibold">What We Build</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Landscaping, masonry, driveway, and maintenance services delivered by local crews.
          </p>
        </article>
        <article className="rounded-xl border bg-card p-5">
          <h2 className="text-lg font-semibold">How We Deliver</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Route-based truck dispatch with cutoff-aware scheduling and clear service-area rules.
          </p>
        </article>
      </section>

      <section className="rounded-2xl border bg-card p-6">
        <h2 className="text-xl font-semibold">Visit The Yard</h2>
        <p className="mt-3 text-sm text-muted-foreground">
          {siteConfig.addressLine1}, {siteConfig.addressLine2}
        </p>
        <ul className="mt-4 space-y-1 text-sm text-muted-foreground">
          {siteConfig.hours.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      </section>
    </div>
  );
}
