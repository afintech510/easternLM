import type { Metadata } from "next";
import Image from "next/image";
import { siteConfig } from "@/config/site";

export const metadata: Metadata = {
  title: "About Us | Eastern Landscape & Mason Supply",
  description:
    "Family-owned landscape and masonry supply yard in Center Moriches, NY. Serving Suffolk County homeowners and contractors with bulk materials, delivery, and installation.",
};

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-6xl space-y-10 px-4 py-12 md:py-16">
      <section className="space-y-4">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          About Eastern LM
        </p>
        <h1 className="[font-family:var(--font-display)] text-4xl text-primary md:text-5xl">
          A Family Yard Built on Straight Talk and Fair Prices
        </h1>
      </section>

      <section className="grid gap-8 md:grid-cols-2 md:items-start">
        <div className="space-y-4 text-sm leading-relaxed text-muted-foreground">
          <p>
            Eastern Landscape &amp; Mason Supply is a family-owned yard at 110 Frowein Road
            in Center Moriches, right off Sunrise Highway. We sell bulk landscape and masonry
            materials — mulch, topsoil, gravel, sand, natural stone, pavers, concrete block —
            and we deliver them across Suffolk County with our own trucks.
          </p>
          <p>
            We also do the work. Our crews handle landscaping, masonry, driveway installation,
            and property maintenance from Patchogue to Southampton. When you buy materials and
            hire us to install them, the pricing stays transparent — you see the material cost,
            the delivery fee, and the labor rate. No bundled markups.
          </p>
          <p>
            Most of what we sell comes from Long Island or nearby. Our gravel and sand come from
            local pits, our topsoil is screened on-site, and our bluestone comes from quarries
            in the Catskill Mountains of upstate New York. We know the materials because we work
            with them every day.
          </p>
          <p>
            Contractors get volume pricing, priority scheduling, and a dedicated line
            (ext&nbsp;103 for Ronnie in Operations). Homeowners get the same honest answers —
            how much material you actually need, which product fits your project, and whether
            it makes sense to do it yourself or have us handle it.
          </p>
          <p>
            The yard is open Monday through Friday, 7&nbsp;AM to 5&nbsp;PM, and Saturday
            7&nbsp;AM to 3&nbsp;PM. Walk-ins are welcome — come see the materials in person
            before you order.
          </p>
        </div>

        {/* Photo slot — replace with a real yard photo when available */}
        <div className="relative aspect-[4/3] w-full overflow-hidden rounded-xl border bg-muted/30">
          <Image
            src="/images/placeholder-product.svg"
            alt="Eastern Landscape & Mason Supply yard"
            fill
            className="object-cover"
          />
        </div>
      </section>

      <section className="grid gap-5 md:grid-cols-3">
        <article className="rounded-xl border bg-card p-5">
          <h2 className="text-lg font-semibold">What We Sell</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Bulk materials sold per cu.&nbsp;yard, masonry products by the piece or pallet,
            and site supplies — all with transparent pricing and no hidden fees.
          </p>
        </article>
        <article className="rounded-xl border bg-card p-5">
          <h2 className="text-lg font-semibold">What We Build</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Driveways, patios, walkways, retaining walls, lawn installations, and seasonal
            maintenance — delivered by local crews who know Suffolk County soil and drainage.
          </p>
        </article>
        <article className="rounded-xl border bg-card p-5">
          <h2 className="text-lg font-semibold">How We Deliver</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Our dump trucks run daily routes across Suffolk County. Order before 11&nbsp;AM on
            a weekday and same-day delivery is usually available.
          </p>
        </article>
      </section>

      <section className="rounded-2xl border bg-card p-6">
        <h2 className="text-xl font-semibold">Visit the Yard</h2>
        <p className="mt-3 text-sm text-muted-foreground">
          {siteConfig.addressLine1}, {siteConfig.addressLine2}
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          {siteConfig.phoneDisplay} &middot;{" "}
          <a href={`mailto:${siteConfig.email}`} className="text-primary underline hover:no-underline">
            {siteConfig.email}
          </a>
        </p>
        <ul className="mt-4 space-y-1 text-sm text-muted-foreground">
          {siteConfig.hours.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>

        <div className="mt-6 overflow-hidden rounded-xl border">
          <iframe
            src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3028.4!2d-72.7929!3d40.7894!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x89e8596e55206037%3A0xd54cc280c66a9687!2sEastern%20Landscape%20%26%20Mason%20Supply!5e0!3m2!1sen!2sus!4v1710000000000!5m2!1sen!2sus"
            width="100%"
            height="300"
            style={{ border: 0 }}
            allowFullScreen
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            title="Eastern Landscape & Mason Supply — 110 Frowein Road, Center Moriches, NY"
          />
        </div>
      </section>

      <p className="text-xs text-muted-foreground">Last updated: April 2026</p>
    </div>
  );
}
