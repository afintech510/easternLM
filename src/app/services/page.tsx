import Link from "next/link";
import { coreServices } from "@/config/content";
import { Button } from "@/components/ui/button";

export default function ServicesPage() {
  return (
    <div className="mx-auto max-w-6xl space-y-8 px-4 py-12 md:py-16">
      <section className="space-y-4">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          Services
        </p>
        <h1 className="[font-family:var(--font-display)] text-4xl text-primary md:text-5xl">
          Local Outdoor Service Teams Backed By Yard Supply
        </h1>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        {coreServices.map((service) => (
          <article key={service.slug} className="rounded-2xl border bg-card p-6">
            <h2 className="text-xl font-semibold">{service.name}</h2>
            <p className="mt-2 text-sm text-muted-foreground">{service.description}</p>
            <Button asChild className="mt-4">
              <Link href={`/services/${service.slug}`}>Learn More</Link>
            </Button>
          </article>
        ))}
      </section>
    </div>
  );
}
