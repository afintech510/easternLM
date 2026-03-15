import type { Metadata } from "next";
import { RcaCalculator } from "@/components/calculators/rca-calculator";
import { CalculatorPageLayout } from "@/components/calculators/calculator-page-layout";

export const metadata: Metadata = {
  title: "RCA Calculator | Recycled Concrete for Driveways",
  description: "Calculate recycled concrete aggregate (RCA) for driveways, parking pads, and road base. State Grade or Regular. Suffolk County delivery from $20/yd.",
};

export default function RcaCalculatorPage() {
  return (
    <CalculatorPageLayout
      title="RCA Calculator"
      subtitle="Calculate recycled concrete aggregate for driveways, parking pads, and road base"
      calculator={<RcaCalculator />}
      products={[
        { name: "State Grade RCA", slug: "state-grade-rca-95-concrete-made-to-spec-not-certified", price: 2700, unit: "per cubic yard" },
        { name: "Regular RCA", slug: "regular-rca-blend-of-concrete-brick-and-blacktop", price: 2000, unit: "per cubic yard" },
      ]}
      tips="RCA is recycled crushed concrete — it compacts into a solid, durable base and hardens over time. State Grade RCA is 95% concrete and more uniform. Regular RCA includes brick and blacktop — cheaper but more varied in color. Both work well for driveways and parking areas."
      faqs={[
        { q: "Is RCA as good as virgin stone for driveways?", a: "For a base layer, yes. RCA compacts tighter than most virgin aggregates and actually hardens over time as the cement re-bonds. For a finished surface, bluestone looks better." },
        { q: "How deep should RCA be for a driveway?", a: "4-6 inches for residential driveways. 6-8 inches for heavy truck traffic or parking areas." },
        { q: "Does RCA need to be compacted?", a: "Yes. Compact in 2-inch lifts with a plate compactor or roller. Water it lightly before compacting for better results." },
      ]}
      serviceSlug="driveways"
    />
  );
}
