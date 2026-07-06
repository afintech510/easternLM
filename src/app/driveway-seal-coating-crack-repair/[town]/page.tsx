import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CheckCircle2, Phone } from "lucide-react";
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
import { getServiceTownEntry, getVerifiedServiceTowns } from "@/lib/data/site-service-towns";

const SLUG = "driveway-seal-coating-crack-repair";

export const dynamic = "force-dynamic";
export const dynamicParams = false;

export function generateStaticParams() {
  return getVerifiedServiceTowns(SLUG).map((e) => ({ town: e.townSlug }));
}

type PageProps = { params: Promise<{ town: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { town } = await params;
  const entry = getServiceTownEntry(SLUG, town);
  if (!entry?.verified) return { title: "Driveway Sealcoating" };
  return {
    title: `Driveway Sealcoating in ${entry.townName}, NY — Book Online | Eastern LM`,
    description: `Premium driveway sealcoating & crack repair in ${entry.townName}, NY. See your price and book online — scheduled within 2 weeks. Two-coat commercial-grade sealer, locally sourced.`,
    alternates: { canonical: `/${SLUG}/${entry.townSlug}` },
    openGraph: {
      title: `Driveway Sealcoating in ${entry.townName}, NY — Book Online`,
      description: `Premium two-coat sealcoat + crack repair in ${entry.townName}. Upfront pricing, scheduled within 2 weeks.`,
      type: "website",
    },
  };
}

export default async function SealcoatTownPage({ params }: PageProps) {
  const { town } = await params;
  const entry = getServiceTownEntry(SLUG, town);
  if (!entry?.verified) notFound();

  const pricing = await loadSealcoatPricing();
  const lowPrice = Math.min(...Object.values(pricing.tiers)) / 100;

  const faqs = [
    {
      question: `How much is driveway sealcoating in ${entry.townName}?`,
      answer: `Our premium two-coat sealcoat starts at $${lowPrice.toLocaleString()} and is priced by driveway size — you'll see the exact price before you book. Crack repair add-ons are +$100 (minor) or +$250 (major). We confirm the price with a quick inspection before any non-refundable fee.`,
    },
    {
      question: `Do you really schedule within 2 weeks in ${entry.townName}?`,
      answer: `Yes. Once you reserve online and we confirm a date, we schedule your ${entry.townName} driveway within two weeks, weather permitting.`,
    },
    {
      question: "Is my card charged when I book?",
      answer: "No. We place a hold to reserve your slot. Nothing is charged until you confirm a date — at which point the $199 booking fee (non-refundable, reschedulable) is captured and the balance is paid on completion.",
    },
  ];

  return (
    <div>
      <JsonLd
        data={[
          {
            "@context": "https://schema.org",
            "@type": "Service",
            name: `Driveway Sealcoating in ${entry.townName}, NY`,
            description: `Premium two-coat driveway sealcoating and crack repair in ${entry.townName}, New York. Booked online, scheduled within 2 weeks.`,
            serviceType: "Driveway Sealcoating",
            areaServed: { "@type": "City", name: `${entry.townName}, NY` },
            provider: {
              "@type": "LocalBusiness",
              "@id": "https://www.easternlm.com/#business",
              name: "Eastern Landscape & Mason Supply",
              telephone: "+16318746244",
              address: { "@type": "PostalAddress", streetAddress: "110 Frowein Road", addressLocality: "Center Moriches", addressRegion: "NY", postalCode: "11934" },
            },
            offers: { "@type": "Offer", priceCurrency: "USD", price: lowPrice, availability: "https://schema.org/InStock" },
          },
          {
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: faqs.map((faq) => ({ "@type": "Question", name: faq.question, acceptedAnswer: { "@type": "Answer", text: faq.answer } })),
          },
        ]}
      />

      {/* Hero + booking */}
      <section className="bg-primary">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:px-6 md:py-16 lg:grid-cols-[1.1fr_0.9fr]">
          <div>
            <Link href="/driveway-seal-coating-crack-repair" className="inline-flex items-center gap-1 text-sm text-primary-foreground/50 hover:text-accent">
              <ArrowLeft className="size-4" /> All sealcoating
            </Link>
            <h1 className="mt-4 [font-family:var(--font-display)] text-3xl text-primary-foreground md:text-5xl">
              Driveway Sealcoating in {entry.townName}, NY
            </h1>
            <p className="mt-4 max-w-xl text-base text-primary-foreground/70">{entry.intro}</p>
            <p className="mt-3 text-sm text-primary-foreground/60">
              Also serving {entry.nearbyTowns}. Premium two-coat sealcoat from{" "}
              <span className="font-semibold text-primary-foreground">${lowPrice.toLocaleString()}</span>.
            </p>
            {entry.localReferences.length > 0 && (
              <ul className="mt-6 space-y-2">
                {entry.localReferences.slice(0, 4).map((ref) => (
                  <li key={ref} className="flex items-start gap-2 text-sm text-primary-foreground/80">
                    <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-accent" /> {ref}
                  </li>
                ))}
              </ul>
            )}
            <Button asChild size="lg" variant="outline" className="mt-7 border-primary-foreground/30 bg-transparent text-primary-foreground hover:bg-primary-foreground/10">
              <a href={siteConfig.phoneHref}><Phone className="size-4" /> {siteConfig.phoneDisplay}</a>
            </Button>
          </div>
          <div className="lg:pt-2">
            <SealcoatBookingWidget pricing={pricing} />
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-12 md:py-16">
        <div className="mx-auto max-w-3xl px-4 sm:px-6">
          <h2 className="mb-6 text-center [font-family:var(--font-display)] text-2xl text-primary">
            Sealcoating in {entry.townName} — FAQs
          </h2>
          <Accordion type="single" collapsible className="w-full">
            {faqs.map((faq) => (
              <AccordionItem key={faq.question} value={faq.question}>
                <AccordionTrigger className="text-left text-base">{faq.question}</AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground">{faq.answer}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
          <p className="mt-8 text-center text-sm text-muted-foreground">
            Gravel driveway in {entry.townName}?{" "}
            <Link href="/gravel-driveway-repair" className="text-primary underline">See gravel driveway repair</Link>.
          </p>
        </div>
      </section>
    </div>
  );
}
