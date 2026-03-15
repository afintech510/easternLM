import type { Metadata } from "next";
import { BaseCalculator } from "@/components/calculators/base-calculator";
import { CalculatorPageLayout } from "@/components/calculators/calculator-page-layout";

export const metadata: Metadata = {
  title: "Shed & Patio Base Calculator | Crushed Stone Base",
  description: "Calculate crushed stone for shed pads, patio bases, and equipment pads. Includes compaction factor and edge buffer. Suffolk County delivery.",
};

export default function ShedBaseCalculatorPage() {
  return (
    <CalculatorPageLayout
      title="Shed / Patio Base Calculator"
      subtitle="Calculate crushed stone for shed pads, patio sub-base, and equipment pads"
      calculator={<BaseCalculator />}
      products={[
        { name: "3/4\" Bluestone", slug: "34-inch-bluestone", price: 8800, unit: "per cubic yard" },
        { name: "3/4\" Wash Gravel", slug: "34-inch-wash-gravel", price: 8000, unit: "per cubic yard" },
        { name: "Bluestone Screenings", slug: "bluestone-screenings-stone-dust-fines", price: 8500, unit: "per cubic yard" },
      ]}
      tips="A proper base is 4 inches of compacted 3/4 crushed stone with a 6-inch edge buffer on all sides. Compact in 2-inch lifts with a plate compactor. Add 1 inch of screenings or sand on top as a leveling layer before placing the shed or pavers."
      faqs={[
        { q: "How thick should a shed base be?", a: "4 inches of compacted crushed stone is standard. For heavy sheds or equipment, use 6 inches." },
        { q: "Do I need an edge buffer?", a: "Yes. Extend the base 6 inches beyond the shed footprint on all sides for drainage and stability." },
        { q: "What stone is best for a shed pad?", a: "3/4 crushed bluestone or wash gravel. Both compact well and drain properly." },
      ]}
      serviceSlug="masonry"
    />
  );
}
