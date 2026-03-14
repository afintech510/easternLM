import type { Metadata } from "next";
import { siteConfig } from "@/config/site";

export const metadata: Metadata = {
  title: "Terms & Conditions | Eastern Landscape & Mason Supply",
  description: "Terms and conditions for Eastern Landscape & Mason Supply.",
};

export default function TermsPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-8 px-4 py-12 md:py-16">
      <h1 className="[font-family:var(--font-display)] text-4xl text-primary">Terms &amp; Conditions</h1>
      <p className="text-sm text-muted-foreground">Last updated: March 14, 2026</p>

      <section className="space-y-4 text-sm leading-relaxed text-muted-foreground">
        <h2 className="text-lg font-semibold text-foreground">General</h2>
        <p>
          By using this website and purchasing from Eastern Landscape &amp; Mason Supply, you agree to these terms. We reserve the right to update these terms at any time.
        </p>

        <h2 className="text-lg font-semibold text-foreground">Orders &amp; Pricing</h2>
        <ul className="list-disc space-y-1 pl-6">
          <li>All prices are listed in US dollars and are subject to change without notice.</li>
          <li>Prices include the material cost per unit as displayed. Delivery fees, tax, and credit card surcharges are calculated and shown separately at checkout.</li>
          <li>Orders are confirmed upon successful payment processing.</li>
          <li>Bulk material quantities are approximate. Natural products may vary in color, size, and composition.</li>
        </ul>

        <h2 className="text-lg font-semibold text-foreground">Delivery</h2>
        <ul className="list-disc space-y-1 pl-6">
          <li>Delivery is available within our service area (approximately 50 miles from Center Moriches, NY).</li>
          <li>Delivery dates are estimates, not guarantees. Weather, equipment, and scheduling may affect timing.</li>
          <li>The customer is responsible for ensuring the delivery site is accessible to our trucks. Our drivers will not place material where access is unsafe or blocked.</li>
          <li>We are not responsible for damage to driveways, lawns, or underground utilities from heavy truck loads. Flag any concerns before delivery.</li>
        </ul>

        <h2 className="text-lg font-semibold text-foreground">Payment &amp; Surcharges</h2>
        <ul className="list-disc space-y-1 pl-6">
          <li>We accept credit cards, debit cards, and cash at the yard.</li>
          <li>A credit card processing surcharge of up to 3% applies to card transactions, as permitted by New York State law and disclosed at checkout.</li>
          <li>Invoice account (inv-acct) terms are available to approved commercial customers only.</li>
        </ul>

        <h2 className="text-lg font-semibold text-foreground">Returns &amp; Cancellations</h2>
        <ul className="list-disc space-y-1 pl-6">
          <li>Bulk materials (mulch, stone, gravel, sand, topsoil) cannot be returned once delivered or loaded.</li>
          <li>Orders may be cancelled before dispatch for a full refund.</li>
          <li>Bagged products and unused non-bulk items may be returned within 7 days with receipt.</li>
        </ul>

        <h2 className="text-lg font-semibold text-foreground">Service Quotes</h2>
        <p>
          Service quotes (landscaping, masonry, driveways, maintenance) are estimates based on site conditions at the time of assessment. Final pricing may vary if conditions differ from the original scope. All service work requires a signed agreement before commencement.
        </p>

        <h2 className="text-lg font-semibold text-foreground">Limitation of Liability</h2>
        <p>
          Eastern Landscape &amp; Mason Supply is not liable for indirect, incidental, or consequential damages. Our liability is limited to the value of the products or services purchased.
        </p>

        <h2 className="text-lg font-semibold text-foreground">Contact</h2>
        <p>
          {siteConfig.name}<br />
          {siteConfig.addressLine1}, {siteConfig.addressLine2}<br />
          {siteConfig.phoneDisplay} | {siteConfig.email}
        </p>
      </section>
    </div>
  );
}
