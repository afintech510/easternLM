import type { Metadata } from "next";
import { BookNowCheckoutClient } from "@/components/book-now/checkout-client";

export const metadata: Metadata = {
  title: "Checkout — Book a Crew | Eastern Landscape & Mason Supply",
};

export default function BookNowCheckoutPage() {
  return <BookNowCheckoutClient />;
}
