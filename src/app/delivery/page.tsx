import Link from "next/link";
import { MapPin, Truck, Clock, Phone, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { siteConfig } from "@/config/site";

// Core delivery area — Patchogue to East Hampton, up to Riverhead/Miller Place
const CORE_TOWNS = [
  "Center Moriches", "East Moriches", "Moriches", "Eastport", "Shirley",
  "Mastic", "Mastic Beach", "Manorville", "Brookhaven", "Bellport",
  "Patchogue", "East Patchogue", "Medford", "Yaphank", "Ridge",
  "Wading River", "Riverhead", "Miller Place", "Rocky Point", "Shoreham",
  "Calverton", "Coram", "Selden", "Middle Island", "Mount Sinai",
  "Hampton Bays", "Westhampton", "Westhampton Beach", "Quogue",
  "East Hampton", "Southampton", "Bridgehampton", "Sag Harbor",
  "Montauk", "Amagansett", "Water Mill", "Sagaponack",
];

// Extended Suffolk County towns
const EXTENDED_TOWNS = [
  "Bay Shore", "Bayport", "Blue Point", "Bohemia", "Brentwood",
  "Brightwaters", "Centereach", "Central Islip", "Cold Spring Harbor",
  "Commack", "Deer Park", "Dix Hills", "East Islip", "East Northport",
  "East Setauket", "Farmingville", "Hauppauge", "Holbrook", "Holtsville",
  "Huntington", "Huntington Station", "Islip", "Islip Terrace",
  "Kings Park", "Lake Grove", "Lake Ronkonkoma", "Lindenhurst",
  "Mattituck", "Nesconset", "North Babylon", "Northport",
  "Oakdale", "Ocean Beach", "Poquott", "Port Jefferson",
  "Port Jefferson Station", "Ronkonkoma", "Saint James", "Sayville",
  "Smithtown", "Sound Beach", "South Setauket", "Stony Brook",
  "West Babylon", "West Islip", "West Sayville", "Wyandanch",
];

const CORE_SLUGS: Record<string, string> = {
  "Center Moriches": "center-moriches",
  "East Moriches": "east-moriches",
  "Moriches": "moriches",
  "Eastport": "eastport",
  "Shirley": "shirley",
  "Mastic": "mastic",
  "Mastic Beach": "mastic-beach",
  "Manorville": "manorville",
  "Brookhaven": "brookhaven",
  "Bellport": "bellport",
  "Patchogue": "patchogue",
  "East Patchogue": "east-patchogue",
  "Medford": "medford",
  "Yaphank": "yaphank",
  "Ridge": "ridge",
  "Wading River": "wading-river",
  "Riverhead": "riverhead",
  "Calverton": "calverton",
  "Coram": "coram",
  "Selden": "selden",
  "Hampton Bays": "hampton-bays",
  "Westhampton": "westhampton",
  "Quogue": "quogue",
  "East Hampton": "east-hampton",
  "Southampton": "southampton",
};

const rules = [
  "Delivery fees calculated by actual drive distance from our yard.",
  "Same-day delivery on weekday orders placed before 11:00 AM.",
  "$125 minimum material order for non-local delivery.",
  "Additional loads discounted — one dump truck delivery per day per address.",
  "Flatbed delivery available (+$50). Save $25 with your own forklift on-site.",
];

export const metadata = {
  title: "Suffolk County Delivery | Mulch, Stone, Gravel | Eastern LM",
  description: "Landscape and masonry material delivery across Suffolk County, Long Island. From Patchogue to Montauk, Riverhead to Miller Place. Transparent pricing, same-day available.",
};

export default function DeliveryPage() {
  return (
    <div className="relative overflow-hidden">
      {/* Long Island silhouette background */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 800 200'%3E%3Cpath d='M20 130 C60 110 100 95 160 90 C220 85 260 92 300 88 C340 84 380 78 420 75 C460 72 500 68 540 72 C580 76 620 82 660 78 C700 74 740 68 760 72 C780 76 790 85 795 90 L795 140 C780 145 740 148 700 142 C660 136 620 130 580 135 C540 140 500 145 460 142 C420 139 380 135 340 138 C300 141 260 148 220 145 C180 142 140 138 100 142 C60 146 40 148 20 145 Z' fill='%231a3a5c'/%3E%3C/svg%3E")`,
          backgroundRepeat: "no-repeat",
          backgroundPosition: "center 40%",
          backgroundSize: "120% auto",
        }}
      />

      <div className="relative mx-auto max-w-6xl space-y-12 px-4 py-12 md:py-16">
        {/* Hero */}
        <section className="space-y-4">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-accent">
            Suffolk County Delivery
          </p>
          <h1 className="[font-family:var(--font-display)] text-4xl text-primary md:text-5xl">
            We Deliver Across Long Island
          </h1>
          <p className="max-w-3xl text-lg text-muted-foreground">
            From our yard at {siteConfig.addressLine1} in Center Moriches, we deliver mulch, topsoil,
            gravel, stone, sand, and masonry supplies to every town in Suffolk County.
            Transparent pricing based on actual distance — no flat zones, no hidden fees.
          </p>
          <div className="flex gap-3 pt-2">
            <Button asChild className="bg-accent text-accent-foreground hover:bg-accent/90">
              <Link href="/shop">Shop & Get Delivery Quote</Link>
            </Button>
            <Button asChild variant="outline">
              <a href={siteConfig.phoneHref}><Phone className="size-4 mr-1.5" /> Call</a>
            </Button>
            <Button asChild variant="outline">
              <a href={siteConfig.smsHref}><MessageSquare className="size-4 mr-1.5" /> Text</a>
            </Button>
          </div>
        </section>

        {/* Google Map embed — Suffolk County highlighted */}
        <section className="rounded-2xl border overflow-hidden shadow-sm">
          <iframe
            src="https://www.google.com/maps/embed?pb=!1m14!1m12!1m3!1d387000!2d-72.7!3d40.86!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f5!5e0!3m2!1sen!2sus!4v1710000000000!5m2!1sen!2sus&q=Suffolk+County,+NY"
            width="100%"
            height="350"
            style={{ border: 0 }}
            allowFullScreen
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            title="Suffolk County delivery area"
            className="w-full"
          />
        </section>

        {/* How it works */}
        <section className="grid gap-5 md:grid-cols-3">
          <div className="rounded-2xl border bg-card p-6 space-y-2">
            <MapPin className="size-7 text-accent" />
            <h3 className="font-semibold">Distance-Based Pricing</h3>
            <p className="text-sm text-muted-foreground">
              Your delivery fee is calculated from our yard using actual route distance and time.
              No confusing zone maps.
            </p>
          </div>
          <div className="rounded-2xl border bg-card p-6 space-y-2">
            <Truck className="size-7 text-accent" />
            <h3 className="font-semibold">Dump Truck Fleet</h3>
            <p className="text-sm text-muted-foreground">
              Small dump (5-7 yd), medium dump (10 yd), and tri-axle (20 yd).
              Flatbed with forklift delivery also available.
            </p>
          </div>
          <div className="rounded-2xl border bg-card p-6 space-y-2">
            <Clock className="size-7 text-accent" />
            <h3 className="font-semibold">Same-Day Available</h3>
            <p className="text-sm text-muted-foreground">
              Order before 11 AM on weekdays for same-day delivery.
              Schedule ahead for your preferred date.
            </p>
          </div>
        </section>

        {/* Delivery rules */}
        <section className="rounded-2xl border bg-card p-6 md:p-8">
          <h2 className="text-lg font-semibold mb-4">Delivery Details</h2>
          <ul className="space-y-3">
            {rules.map((rule) => (
              <li key={rule} className="flex items-start gap-3 text-sm">
                <span className="mt-1 size-1.5 rounded-full bg-accent shrink-0" />
                <span className="text-muted-foreground">{rule}</span>
              </li>
            ))}
          </ul>
        </section>

        {/* Core Delivery Area towns — larger text */}
        <section className="space-y-4">
          <div>
            <h2 className="[font-family:var(--font-display)] text-2xl text-primary">
              Core Delivery Area
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              Patchogue to East Hampton &middot; Center Moriches to Miller Place &middot; Fast, frequent deliveries
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {CORE_TOWNS.map((town) => {
              const slug = CORE_SLUGS[town];
              return slug ? (
                <Link
                  key={town}
                  href={`/delivery/${slug}`}
                  className="rounded-lg border bg-card px-3.5 py-2 text-sm font-medium hover:border-accent/40 hover:text-accent transition-colors"
                >
                  {town}
                </Link>
              ) : (
                <span
                  key={town}
                  className="rounded-lg border bg-card px-3.5 py-2 text-sm font-medium text-muted-foreground"
                >
                  {town}
                </span>
              );
            })}
          </div>
        </section>

        {/* Extended Suffolk County */}
        <section className="space-y-4">
          <div>
            <h2 className="[font-family:var(--font-display)] text-xl text-primary">
              All of Suffolk County
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              We deliver to every town in Suffolk County. Fees calculated at checkout by address.
            </p>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {EXTENDED_TOWNS.map((town) => (
              <span
                key={town}
                className="rounded-md border bg-muted/30 px-2.5 py-1.5 text-xs text-muted-foreground"
              >
                {town}
              </span>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="rounded-2xl border-2 border-accent/20 bg-accent/5 p-8 text-center space-y-4">
          <h2 className="[font-family:var(--font-display)] text-2xl text-primary">
            Ready to Order?
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Add materials to your cart and enter your address — we&apos;ll show your exact delivery fee instantly.
            Or call us for contractor pricing and bulk quotes.
          </p>
          <div className="flex justify-center gap-3">
            <Button asChild size="lg" className="bg-accent text-accent-foreground hover:bg-accent/90">
              <Link href="/shop">Shop Materials</Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <a href={siteConfig.phoneHref}><Phone className="size-4 mr-1.5" /> {siteConfig.phoneDisplay}</a>
            </Button>
          </div>
        </section>
      </div>
    </div>
  );
}
