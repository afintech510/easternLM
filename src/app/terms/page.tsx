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
      <p className="text-sm text-muted-foreground">Last updated: March 15, 2026</p>

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

        <h2 id="sms-terms" className="text-lg font-semibold text-foreground">SMS / Text Messaging Terms of Service</h2>
        <p>
          <strong>Program name:</strong> Eastern Landscape &amp; Mason Supply SMS Alerts
        </p>
        <p>
          By providing your mobile phone number when placing an order, requesting a quote, creating an account, or otherwise opting in to receive text messages from Eastern Landscape &amp; Mason Supply, you consent to receive automated SMS/text messages related to your transactions and services. These messages may include:
        </p>
        <ul className="list-disc space-y-1 pl-6">
          <li>Order confirmations and payment receipts</li>
          <li>Delivery scheduling notifications and status updates</li>
          <li>Quote notifications and follow-up reminders</li>
          <li>Service lead updates and appointment reminders</li>
          <li>Payment reminders and invoice links</li>
          <li>Post-delivery review requests</li>
        </ul>
        <p>
          <strong>Message frequency varies</strong> based on your order and service activity. You will only receive messages related to your interactions with Eastern Landscape &amp; Mason Supply.
        </p>
        <p>
          <strong>Message and data rates may apply.</strong> Check with your wireless carrier for details about your text messaging plan.
        </p>
        <p>
          <strong>Opt-out:</strong> You can cancel SMS messages at any time by replying <strong>STOP</strong> to any message you receive from us. After opting out, you will receive a one-time confirmation message and will no longer receive SMS messages from us unless you opt in again.
        </p>
        <p>
          <strong>Help:</strong> Reply <strong>HELP</strong> to any message for assistance, or contact us at {siteConfig.phoneDisplay} or {siteConfig.email}.
        </p>
        <p>
          <strong>Carrier disclaimer:</strong> Carriers (AT&amp;T, T-Mobile, Verizon, etc.) are not liable for delayed or undelivered messages. Message delivery is subject to effective transmission from your network operator and is not guaranteed.
        </p>
        <p>
          <strong>Privacy:</strong> We do not share, sell, rent, or trade mobile phone numbers or any personal information collected through our SMS messaging program with third parties or affiliates for marketing or promotional purposes. Mobile opt-in data and consent will not be shared with any third parties. For more information, see our <a href="/privacy-policy" className="text-primary underline hover:no-underline">Privacy Policy</a>.
        </p>
        <p>
          <strong>Contact:</strong> Eastern Landscape &amp; Mason Supply, 110 Frowein Road, Center Moriches, NY 11934. Phone: {siteConfig.phoneDisplay}. Email: {siteConfig.email}.
        </p>

        <h2 className="text-lg font-semibold text-foreground">Limitation of Liability</h2>
        <p>
          Eastern Landscape &amp; Mason Supply is not liable for indirect, incidental, or consequential damages. Our liability is limited to the value of the products or services purchased.
        </p>

        <h2 className="text-lg font-semibold text-foreground">Governing Law</h2>
        <p>
          These Terms &amp; Conditions are governed by and construed in accordance with the laws of the State of New York, without regard to its conflict of law principles. Any disputes arising from these terms or your use of our website and services shall be resolved in the courts of Suffolk County, New York.
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
