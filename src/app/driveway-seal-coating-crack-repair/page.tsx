import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2, Phone, ShieldCheck, Search, CalendarCheck, FileSignature } from "lucide-react";
import { JsonLd } from "@/components/seo/json-ld";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { siteConfig } from "@/config/site";
import { SealcoatBookingWidget } from "@/components/sealcoat/sealcoat-booking-widget";
import { loadSealcoatPricing } from "@/lib/sealcoat/pricing";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Driveway Sealcoating & Crack Repair — Book Online | Eastern LM",
  description:
    "Premium two-coat driveway sealcoating + crack repair across Suffolk County, Long Island. See your price and book online — scheduled within 2 weeks. Center Moriches, Mastic, Shirley, Patchogue, Riverhead to Port Jefferson.",
  alternates: { canonical: "/driveway-seal-coating-crack-repair" },
  openGraph: {
    title: "Driveway Sealcoating & Crack Repair — Book Online",
    description:
      "Premium two-coat sealcoat + crack repair. Transparent buy-it-now pricing, scheduled within 2 weeks. Suffolk County, Long Island.",
    type: "website",
  },
};

const TOWNS = [
  "Center Moriches", "Moriches", "East Moriches", "Mastic", "Mastic Beach", "Shirley",
  "Patchogue", "Medford", "Bellport", "Brookhaven", "Manorville", "Eastport",
  "Westhampton", "Riverhead", "Yaphank", "Port Jefferson",
];

const FAQS: { question: string; answer: string }[] = [
  {
    question: "How does the online booking work?",
    answer:
      "Pick your driveway size, add crack repair if you need it, and reserve with a card hold — nothing is charged yet. We come inspect to confirm we can do the job at the price shown. Once you approve a date, a $199 non-refundable booking fee locks your spot and the rest is paid to the crew on completion. We schedule within 2 weeks.",
  },
  {
    question: "Why do you hold my card before charging?",
    answer:
      "The hold reserves your slot and lets us verify the card without charging it. It gives us time to inspect the driveway and confirm the price. If the driveway is in worse shape than expected, we'll talk through options before anything becomes non-refundable — and you can walk away with zero fees.",
  },
  {
    question: "What's included in the premium sealcoat?",
    answer:
      "Hand-cut and blown edges, oil-spot priming, crack clean-out, and two coats of commercial-grade asphalt sealer (not a thin one-pass spray). The sealer is locally sourced and applied by a vetted crew. We block the driveway and leave care instructions.",
  },
  {
    question: "What does crack repair cost?",
    answer:
      "Minor crack fill (hairline to 1/2\") is +$100. Major crack fill / hot-patch for wide cracks, alligatoring, and small potholes is +$250 and covers up to 150 linear feet of cracks or 40 sq ft of hot-patch. Heavier damage than that gets a custom quote after inspection.",
  },
  {
    question: "Can I reschedule after I book?",
    answer:
      "Yes. Your date can be rescheduled — just call the yard. The $199 booking fee is non-refundable once you confirm a date, but it carries to your new date.",
  },
  {
    question: "How long does sealcoating take and when can I drive on it?",
    answer:
      "Most residential driveways are a few hours of work. Plan to stay off it for 24 hours, and avoid parking for 48 hours in cooler weather. We'll give you exact timing based on conditions on the day.",
  },
  {
    question: "How often should I reseal my driveway?",
    answer:
      "On Long Island, every 2–3 years keeps asphalt protected from freeze-thaw, salt, and UV. Sealing on schedule is far cheaper than repaving a driveway that's been left to crack and ravel.",
  },
  {
    question: "What areas do you serve?",
    answer:
      "Center Moriches, Mastic, Shirley, Patchogue and the whole corridor from Southampton west to Patchogue, plus Riverhead to Port Jefferson. If you're nearby and not listed, call us — we likely cover you.",
  },
];

const INCLUDED = [
  "Hand-cut & blown clean edges",
  "Oil-spot priming so sealer bonds",
  "Crack clean-out before sealing",
  "Two coats of commercial-grade sealer",
  "Locally sourced material",
  "Driveway blocked + care instructions",
];

const STEPS = [
  { icon: ShieldCheck, title: "Reserve with a card hold", detail: "Pick your size and book online. Your card is held — never charged yet." },
  { icon: Search, title: "We inspect & confirm", detail: "We verify we can do the job at your price. Worse than expected? We talk first — zero fees to walk away." },
  { icon: FileSignature, title: "Confirm date & sign", detail: "Approve a date and the $199 booking fee locks it in (non-refundable, reschedulable)." },
  { icon: CalendarCheck, title: "Scheduled within 2 weeks", detail: "A vetted crew sealcoats your driveway. Balance is paid on completion." },
];

export default async function SealcoatingPage() {
  const pricing = await loadSealcoatPricing();
  const lowPrice = Math.min(...Object.values(pricing.tiers)) / 100;

  return (
    <div>
      <JsonLd
        data={[
          {
            "@context": "https://schema.org",
            "@type": "Service",
            name: "Driveway Sealcoating & Crack Repair",
            description:
              "Premium two-coat driveway sealcoating and crack repair across Suffolk County, Long Island. Transparent buy-it-now pricing, booked online and scheduled within 2 weeks.",
            serviceType: "Driveway Sealcoating",
            areaServed: TOWNS.map((t) => ({ "@type": "City", name: `${t}, NY` })),
            provider: {
              "@type": "LocalBusiness",
              "@id": "https://www.easternlm.com/#business",
              name: "Eastern Landscape & Mason Supply",
              telephone: "+16318746244",
              address: {
                "@type": "PostalAddress",
                streetAddress: "110 Frowein Road",
                addressLocality: "Center Moriches",
                addressRegion: "NY",
                postalCode: "11934",
              },
            },
            offers: {
              "@type": "Offer",
              priceCurrency: "USD",
              price: lowPrice,
              priceSpecification: {
                "@type": "PriceSpecification",
                priceCurrency: "USD",
                minPrice: lowPrice,
              },
              availability: "https://schema.org/InStock",
              url: "https://www.easternlm.com/driveway-seal-coating-crack-repair",
            },
          },
          {
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: FAQS.map((faq) => ({
              "@type": "Question",
              name: faq.question,
              acceptedAnswer: { "@type": "Answer", text: faq.answer },
            })),
          },
        ]}
      />

      {/* ── Hero + Booking ─────────────────────────────────── */}
      <section className="bg-primary">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:px-6 md:py-16 lg:grid-cols-[1.1fr_0.9fr]">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-accent/15 px-3 py-1 text-xs font-semibold text-accent">
              <CheckCircle2 className="size-3.5" /> Book online · Scheduled within 2 weeks
            </span>
            <h1 className="mt-4 [font-family:var(--font-display)] text-3xl text-primary-foreground md:text-5xl">
              Driveway Sealcoating &amp; Crack Repair — Suffolk County
            </h1>
            <p className="mt-4 max-w-xl text-base text-primary-foreground/70">
              Premium two-coat sealcoat and crack repair, priced upfront and booked online. From{" "}
              <span className="font-semibold text-primary-foreground">${lowPrice.toLocaleString()}</span>. Center Moriches, Mastic,
              Shirley, Patchogue, Riverhead to Port Jefferson, and the whole South Fork corridor.
            </p>
            <ul className="mt-6 grid gap-2 sm:grid-cols-2">
              {INCLUDED.map((item) => (
                <li key={item} className="flex items-start gap-2 text-sm text-primary-foreground/80">
                  <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-accent" /> {item}
                </li>
              ))}
            </ul>
            <div className="mt-7 flex flex-wrap gap-3">
              <Button asChild size="lg" variant="outline" className="border-primary-foreground/30 bg-transparent text-primary-foreground hover:bg-primary-foreground/10">
                <a href={siteConfig.phoneHref}>
                  <Phone className="size-4" /> {siteConfig.phoneDisplay}
                </a>
              </Button>
            </div>
          </div>

          <div className="lg:pt-2">
            <SealcoatBookingWidget pricing={pricing} />
          </div>
        </div>
      </section>

      {/* ── How It Works ──────────────────────────────────── */}
      <section className="border-y bg-warm-bg py-12 md:py-16">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <h2 className="mb-2 text-center [font-family:var(--font-display)] text-2xl text-primary md:text-3xl">
            How Booking Works
          </h2>
          <p className="mx-auto mb-8 max-w-2xl text-center text-sm text-muted-foreground">
            A card hold reserves your slot. We inspect to confirm the price before anything becomes non-refundable.
          </p>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((step, i) => (
              <div key={step.title} className="rounded-xl border bg-card p-5">
                <div className="flex size-10 items-center justify-center rounded-lg bg-accent/15">
                  <step.icon className="size-5 text-accent" />
                </div>
                <div className="mt-3 text-xs font-bold text-accent">STEP {i + 1}</div>
                <h3 className="mt-1 font-semibold">{step.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{step.detail}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Why us ────────────────────────────────────────── */}
      <section className="py-12 md:py-16">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <div className="grid gap-8 md:grid-cols-3">
            <div>
              <h3 className="font-semibold text-primary">Real pricing, no waiting</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Most sealcoaters make you call and wait for a quote. You see your price and book in 60 seconds —
                and you only pay the $199 booking fee once you&apos;ve approved a date.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-primary">Two coats, done right</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Edges hand-cut, oil spots primed, cracks cleaned, and two full coats of commercial-grade sealer —
                not a single thin pass that washes off in a season.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-primary">Backed by the yard</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Eastern Landscape &amp; Mason Supply has served Suffolk County families for years. Locally sourced
                material and crews we stand behind.
              </p>
            </div>
          </div>

          {/* Coverage */}
          <div className="mt-10 rounded-xl border bg-card p-6">
            <h3 className="font-semibold">Sealcoating across Suffolk County</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              We sealcoat and repair driveways throughout the Moriches–Patchogue corridor and out east:
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {TOWNS.map((t) => (
                <span key={t} className="rounded-full border px-3 py-1 text-xs text-muted-foreground">{t}, NY</span>
              ))}
            </div>
          </div>

          {/* Cross-links */}
          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            <Link href="/gravel-driveway-repair" className="rounded-lg border px-4 py-3 text-sm font-medium transition-colors hover:border-accent/40 hover:bg-accent/5">
              Gravel driveway? → Repair &amp; regrade
            </Link>
            <Link href="/private-road-maintenance" className="rounded-lg border px-4 py-3 text-sm font-medium transition-colors hover:border-accent/40 hover:bg-accent/5">
              Private road or HOA? → Road rehab
            </Link>
            <Link href="/gravel-parking-lot-rehab" className="rounded-lg border px-4 py-3 text-sm font-medium transition-colors hover:border-accent/40 hover:bg-accent/5">
              Commercial lot? → Parking lot rehab
            </Link>
          </div>
        </div>
      </section>

      {/* ── FAQs ──────────────────────────────────────────── */}
      <section className="border-t py-12 md:py-16">
        <div className="mx-auto max-w-3xl px-4 sm:px-6">
          <h2 className="mb-6 text-center [font-family:var(--font-display)] text-2xl text-primary">
            Sealcoating FAQs
          </h2>
          <Accordion type="single" collapsible className="w-full">
            {FAQS.map((faq) => (
              <AccordionItem key={faq.question} value={faq.question}>
                <AccordionTrigger className="text-left text-base">{faq.question}</AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground">{faq.answer}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
          <div className="mt-8 rounded-xl border bg-card p-6 text-center">
            <p className="text-sm font-semibold">Questions before you book?</p>
            <Button asChild size="lg" variant="outline" className="mt-2">
              <a href={siteConfig.phoneHref}>
                <Phone className="size-4" /> {siteConfig.phoneDisplay}
              </a>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
