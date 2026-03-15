import type { Metadata } from "next";
import { MulchCalculator } from "@/components/calculators/mulch-calculator";
import { CalculatorPageLayout } from "@/components/calculators/calculator-page-layout";
import { JsonLd } from "@/components/seo/json-ld";

export const metadata: Metadata = {
  title: "Mulch Calculator | How Much Mulch Do I Need?",
  description: "Calculate how many yards of mulch you need for garden beds, tree rings, and walkway borders. Black, brown, red, and natural mulch with Suffolk County delivery.",
};

export default function MulchCalculatorPage() {
  return (
    <>
      <JsonLd data={{ "@context": "https://schema.org", "@type": "FAQPage", mainEntity: [
        { "@type": "Question", name: "How much mulch do I need?", acceptedAnswer: { "@type": "Answer", text: "Multiply length × width × depth (in inches), then divide by 324. A 20×10 foot bed at 3 inches deep needs about 1.85 cubic yards." } },
        { "@type": "Question", name: "How deep should mulch be?", acceptedAnswer: { "@type": "Answer", text: "3 inches for new beds, 2 inches for annual refresh. Avoid piling mulch against tree trunks." } },
      ]}} />
      <CalculatorPageLayout
        title="Mulch Calculator"
        subtitle="Calculate how many yards of mulch you need for your garden beds"
        calculator={<MulchCalculator />}
        products={[
          { name: "Dark Natural Mulch", slug: "dark-natural-mulch", price: 2000, unit: "per cubic yard" },
          { name: "Black Mulch", slug: "black-mulch", price: 3000, unit: "per cubic yard" },
          { name: "Chocolate Mulch", slug: "chocolate-mulch", price: 3000, unit: "per cubic yard" },
          { name: "Red Mulch", slug: "red-mulch", price: 3800, unit: "per cubic yard" },
        ]}
        tips="Apply 3 inches of mulch for best weed suppression and moisture retention. Pull mulch 2-3 inches away from tree trunks and plant stems to prevent rot. For annual refresh, 2 inches over existing mulch is enough. Best time to mulch on Long Island is mid-April through May."
        faqs={[
          { q: "How many square feet does a yard of mulch cover?", a: "One cubic yard covers about 162 sq ft at 2 inches deep, or 108 sq ft at 3 inches deep." },
          { q: "Should I remove old mulch before adding new?", a: "Usually no. If old mulch is less than 4 inches deep, just add on top. If it's deeper, rake and remove excess first." },
          { q: "What's the best mulch color?", a: "Black mulch is most popular for contrast against green plants. Chocolate brown gives a warm, natural look. Dark natural is the budget choice for large areas." },
        ]}
        serviceSlug="landscaping"
        serviceLabel="Landscaping Services"
      />
    </>
  );
}
