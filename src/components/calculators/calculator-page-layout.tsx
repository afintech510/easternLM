"use client";

import Link from "next/link";
import { type ReactNode } from "react";
import { ArrowRight, Phone, Users } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";

type ProductCard = { name: string; slug: string; price: number; unit: string };
type Faq = { q: string; a: string };

type Props = {
  title: string;
  subtitle: string;
  calculator: ReactNode;
  products: ProductCard[];
  tips: string;
  faqs: Faq[];
  serviceSlug?: string;
  serviceLabel?: string;
};

function formatUsd(cents: number) {
  return `$${(cents / 100).toFixed(0)}`;
}

export function CalculatorPageLayout({ title, subtitle, calculator, products, tips, faqs, serviceSlug, serviceLabel }: Props) {
  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 md:py-12 space-y-10">
      {/* Calculator — above the fold */}
      {calculator}

      {/* Products */}
      {products.length > 0 && (
        <section>
          <h2 className="mb-4 text-lg font-semibold">Recommended Products</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {products.map((p) => (
              <Link key={p.slug} href={`/shop/${p.slug}`} className="flex items-center justify-between rounded-xl border bg-card p-4 transition-all hover:border-accent/40 hover:shadow-md">
                <div>
                  <p className="text-sm font-semibold">{p.name}</p>
                  <p className="text-xs text-muted-foreground">{p.unit}</p>
                </div>
                <span className="text-lg font-bold text-accent">{formatUsd(p.price)}/yd</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Tips */}
      {tips && (
        <section className="rounded-xl border-l-4 border-accent bg-accent/5 p-5">
          <h2 className="text-sm font-semibold">Project Tips</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{tips}</p>
        </section>
      )}

      {/* FAQ */}
      {faqs.length > 0 && (
        <section>
          <h2 className="mb-4 text-lg font-semibold">FAQ</h2>
          <Accordion type="single" collapsible>
            {faqs.map((faq) => (
              <AccordionItem key={faq.q} value={faq.q}>
                <AccordionTrigger className="text-left text-sm">{faq.q}</AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground">{faq.a}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </section>
      )}

      {/* Service cross-sell */}
      {serviceSlug && (
        <section className="rounded-xl bg-primary p-6 md:flex md:items-center md:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-primary-foreground">Want us to install it?</h2>
            <p className="mt-1 text-sm text-primary-foreground/60">Our crew handles the full job — materials from our yard.</p>
          </div>
          <div className="mt-4 flex gap-3 md:mt-0">
            <Button asChild size="lg" className="bg-accent text-accent-foreground hover:bg-accent/90">
              <Link href={`/services/${serviceSlug}`}><Users className="size-4" /> Get a Free Quote</Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="border-primary-foreground/25 text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground">
              <a href="tel:+16318746244"><Phone className="size-4" /> Call</a>
            </Button>
          </div>
        </section>
      )}

      {/* Back to hub */}
      <div className="text-center">
        <Button asChild variant="ghost" size="sm">
          <Link href="/calculator"><ArrowRight className="size-4 rotate-180" /> All Calculators</Link>
        </Button>
      </div>
    </div>
  );
}
