import type { Metadata } from "next";
import { SandCalculator } from "@/components/calculators/sand-calculator";
import { CalculatorPageLayout } from "@/components/calculators/calculator-page-layout";

export const metadata: Metadata = {
  title: "Sand Calculator | Paver Bedding & Masonry Sand",
  description: "Calculate fine sand or concrete sand for paver bedding, leveling, and masonry work. Suffolk County delivery from $60/yd.",
};

export default function SandCalculatorPage() {
  return (
    <CalculatorPageLayout
      title="Sand Calculator"
      subtitle="Calculate sand for paver bedding, leveling, and masonry work"
      calculator={<SandCalculator />}
      products={[
        { name: "Fine Sand", slug: "fine-sand", price: 6000, unit: "per cubic yard" },
        { name: "State Concrete Sand", slug: "state-concrete-sand", price: 6000, unit: "per cubic yard" },
      ]}
      tips="For paver bedding, use 1 inch of fine sand screeded level over compacted base stone. Do not compact the sand layer — pavers compact it when placed. For mixing mortar, use state concrete sand (coarser gradation). For leveling or pool bases, fine sand works best."
      faqs={[
        { q: "What's the difference between fine sand and concrete sand?", a: "Fine sand (mason sand) is smooth and fine-grained — used for paver bedding, leveling, and sandboxes. Concrete sand is coarser — used for mixing concrete and mortar, and for pipe bedding." },
        { q: "How much sand do I need under pavers?", a: "1 inch of fine sand across the paver area. A 200 sq ft patio needs about 0.6 cubic yards of sand." },
        { q: "Should I compact the sand layer?", a: "No. Screed it level but don't compact it. The pavers themselves compact the sand when placed and vibrated." },
      ]}
      serviceSlug="masonry"
    />
  );
}
