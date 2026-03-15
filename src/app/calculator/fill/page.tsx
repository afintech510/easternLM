import type { Metadata } from "next";
import { FillCalculator } from "@/components/calculators/fill-calculator";
import { CalculatorPageLayout } from "@/components/calculators/calculator-page-layout";

export const metadata: Metadata = {
  title: "Fill Dirt Calculator | How Much Fill Do I Need?",
  description: "Calculate clean fill or bank run for grading, backfill, and low spots. Rectangle and circular shapes supported. Suffolk County delivery from $15/yd.",
};

export default function FillCalculatorPage() {
  return (
    <CalculatorPageLayout
      title="Fill Calculator"
      subtitle="Calculate clean fill or bank run for grading, backfill, and low spots"
      calculator={<FillCalculator />}
      products={[
        { name: "Clean Fill", slug: "clean-fill-exc-dirt-unscreened", price: 1500, unit: "per cubic yard" },
        { name: "Bank Run", slug: "bank-run-sandy-fill-w-gravel-varying-in-size", price: 1800, unit: "per cubic yard" },
      ]}
      tips="Clean fill is excavated dirt — use it for raising grade and filling large areas. Bank run is a natural sand/gravel mix that compacts well and drains — good for sub-base and pipe bedding. Neither is suitable as a planting surface; add topsoil on top if you're planting."
      faqs={[
        { q: "What's the difference between clean fill and bank run?", a: "Clean fill is plain excavated dirt. Bank run is a natural sand/gravel mix that compacts and drains better. Bank run costs a bit more but is more versatile." },
        { q: "Can I plant on fill dirt?", a: "Not directly. Fill dirt lacks nutrients. Add 4-6 inches of screened topsoil on top before planting or seeding." },
        { q: "How much does fill settle?", a: "Expect 10% settling. Our calculator adds this factor so you order enough." },
      ]}
    />
  );
}
