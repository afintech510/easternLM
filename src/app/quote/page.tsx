import type { Metadata } from "next";
import { InstantQuoteFlow } from "@/components/quote/instant-quote-flow";

export const metadata: Metadata = {
  title: "Instant Quote | Eastern Landscape & Mason Supply",
  description: "Get an instant material estimate for your project. Pick your project, enter dimensions, see the price, order online or request professional installation.",
};

export default function QuotePage() {
  return <InstantQuoteFlow />;
}
