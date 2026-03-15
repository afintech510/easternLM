import type { Metadata } from "next";
import { DrivewayCalculator } from "@/components/calculators/driveway-calculator";
import { CalculatorPageLayout } from "@/components/calculators/calculator-page-layout";
import { JsonLd } from "@/components/seo/json-ld";

export const metadata: Metadata = {
  title: "Driveway Gravel Calculator | How Much Gravel Do I Need?",
  description: "Calculate how much gravel and RCA base you need for your driveway. Enter dimensions, see cubic yards, get a price estimate. Suffolk County delivery available.",
};

export default function DrivewayCalculatorPage() {
  return (
    <>
      <JsonLd data={{ "@context": "https://schema.org", "@type": "FAQPage", mainEntity: [
        { "@type": "Question", name: "How much gravel do I need for a driveway?", acceptedAnswer: { "@type": "Answer", text: "A standard 50ft x 12ft driveway needs about 4-5 yards of base material (RCA) and 2-3 yards of surface gravel. Use our calculator for exact quantities." } },
        { "@type": "Question", name: "What gravel is best for driveways?", acceptedAnswer: { "@type": "Answer", text: "3/4 inch bluestone ($88/yd) for a premium look, or 3/4 wash gravel ($80/yd) for a budget option. Both compact well. Use State Grade RCA ($27/yd) for the base layer." } },
      ]}} />
      <CalculatorPageLayout
        title="Driveway Gravel Calculator"
        subtitle="Calculate RCA base + surface gravel for your driveway"
        calculator={<DrivewayCalculator />}
        products={[
          { name: "State Grade RCA", slug: "state-grade-rca-95-concrete-made-to-spec-not-certified", price: 2700, unit: "per cubic yard" },
          { name: "Regular RCA", slug: "regular-rca-blend-of-concrete-brick-and-blacktop", price: 2000, unit: "per cubic yard" },
          { name: "3/4\" Bluestone", slug: "34-inch-bluestone", price: 8800, unit: "per cubic yard" },
          { name: "3/4\" Wash Gravel", slug: "34-inch-wash-gravel", price: 8000, unit: "per cubic yard" },
        ]}
        tips="For a standard residential driveway, use 4-6 inches of RCA base compacted with a plate compactor, then 2-3 inches of surface gravel. Crown the center slightly so water runs off to the sides. Edge with belgian block or metal edging to keep stone from migrating."
        faqs={[
          { q: "How deep should a gravel driveway be?", a: "Total depth should be 6-8 inches: 4-6 inches of compacted RCA base + 2-3 inches of surface gravel." },
          { q: "What's the difference between RCA and virgin gravel?", a: "RCA (Recycled Concrete Aggregate) is crushed recycled concrete. It's cheaper and compacts into a very solid base. Virgin gravel like bluestone looks better on the surface." },
          { q: "Do I need a base layer?", a: "Yes. Putting surface gravel directly on dirt leads to sinking and rutting. A compacted RCA base is essential for a driveway that lasts." },
          { q: "How much does delivery cost?", a: "Delivery fees depend on your distance from our Center Moriches yard. Enter your address at checkout for an exact quote." },
        ]}
        serviceSlug="driveways"
        serviceLabel="Driveway Installation"
      />
    </>
  );
}
