import type { Metadata } from "next";
import { TopsoilCalculator } from "@/components/calculators/topsoil-calculator";
import { CalculatorPageLayout } from "@/components/calculators/calculator-page-layout";

export const metadata: Metadata = {
  title: "Topsoil Calculator | How Much Topsoil for My Lawn?",
  description: "Calculate topsoil or compost needed for new lawns, gardens, and grading. Includes settling factor. Suffolk County delivery from $24/yd.",
};

export default function TopsoilCalculatorPage() {
  return (
    <CalculatorPageLayout
      title="Topsoil Calculator"
      subtitle="Calculate screened topsoil or compost for lawns, gardens, and grading"
      calculator={<TopsoilCalculator />}
      products={[
        { name: "Screened Topsoil", slug: "topsoil-screened-organic", price: 2400, unit: "per cubic yard" },
        { name: "Certified Organic Compost", slug: "compost-certified-organic-rich-in-nutrients", price: 3200, unit: "per cubic yard" },
      ]}
      tips="Long Island's native soil is mostly sand — it drains fast and lacks nutrients. Adding 4-6 inches of screened topsoil before seeding gives roots the organic matter they need. For existing lawns, a 1-2 inch top-dress improves soil quality over time. Mix topsoil 50/50 with compost for vegetable gardens."
      faqs={[
        { q: "How much topsoil do I need for a new lawn?", a: "Plan for 4-6 inches of screened topsoil. A 2,000 sq ft lawn at 4 inches needs about 25 cubic yards." },
        { q: "Should I use topsoil or compost?", a: "Topsoil for volume (new lawns, grading). Compost for amendment (existing gardens, nutrient boost). Many customers mix both." },
        { q: "Does topsoil settle after spreading?", a: "Yes, expect 10% settling. Our calculator adds this factor automatically so you don't come up short." },
      ]}
      serviceSlug="landscaping"
    />
  );
}
