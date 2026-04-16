import type { Metadata } from "next";
import Link from "next/link";
import { siteConfig } from "@/config/site";

export const metadata: Metadata = {
  title: "Terms & Conditions | Eastern Landscape & Mason Supply",
  description:
    "Terms and conditions for purchasing materials, scheduling delivery, and using services from Eastern Landscape & Mason Supply.",
};

export default function TermsPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-8 px-4 py-12 md:py-16">
      <h1 className="[font-family:var(--font-display)] text-4xl text-primary">Terms &amp; Conditions</h1>
      <p className="text-sm text-muted-foreground">Last updated: April 16, 2026</p>

      <section className="space-y-4 text-sm leading-relaxed text-muted-foreground">
        {/* ── 1. Acceptance ── */}
        <h2 className="text-lg font-semibold text-foreground">Acceptance</h2>
        <p>
          By using the easternlm.com website and purchasing from Eastern Landscape &amp; Mason Supply,
          you agree to these terms. We reserve the right to update these terms at any time. Changes will
          be posted on this page with an updated date.
        </p>

        {/* ── 2. Who May Order ── */}
        <h2 className="text-lg font-semibold text-foreground">Who May Order</h2>
        <p>
          You must be at least 18 years old and have a valid payment method to place an order. Delivery
          is available within our service area (Suffolk County, NY — approximately 50 miles from our
          Center Moriches yard).
        </p>

        {/* ── 3. Pricing and Taxes ── */}
        <h2 className="text-lg font-semibold text-foreground">Pricing &amp; Taxes</h2>
        <ul className="list-disc space-y-1 pl-6">
          <li>Bulk material prices are listed per cu.&nbsp;yard. Non-bulk items are priced per piece, per bag, or per pallet as shown.</li>
          <li>New York State sales tax of 8.75% (Suffolk County rate) applies to both materials and delivery fees.</li>
          <li>Prices are subject to change without notice. The price at the time your order is placed is the price you pay.</li>
          <li>Bulk material quantities are approximate. Natural products may vary in color, size, and composition.</li>
        </ul>

        {/* ── 4. Payment ── */}
        <h2 className="text-lg font-semibold text-foreground">Payment</h2>
        <ul className="list-disc space-y-1 pl-6">
          <li>We accept Visa, Mastercard, American Express, and Discover via Stripe.</li>
          <li>Buy-now-pay-later is available through Klarna and Afterpay at checkout.</li>
          <li>Cash or check on delivery (COD) is available. Payment must be made to the driver at the time of delivery.</li>
          <li>A credit card processing surcharge of up to 3.5% applies to card transactions, as permitted by New York State law and disclosed at checkout.</li>
          <li>Charge account (invoice) terms are available to approved commercial customers only.</li>
        </ul>

        {/* ── 5. Delivery Terms ── */}
        <h2 className="text-lg font-semibold text-foreground">Delivery</h2>
        <p>
          See our <Link href="/delivery" className="text-primary underline hover:no-underline">Delivery &amp; Returns</Link> page
          for full details on service area, fees, scheduling, and our return/refund policy.
        </p>
        <ul className="list-disc space-y-1 pl-6">
          <li>Delivery dates are estimates, not guarantees. Weather, equipment, and scheduling may affect timing.</li>
          <li>The customer is responsible for ensuring the delivery site is accessible to a loaded dump truck. Our drivers will not place material where access is unsafe or blocked.</li>
          <li>We are not responsible for damage to driveways, lawns, or underground utilities from heavy truck loads when the customer has directed the delivery path. Flag any concerns before delivery.</li>
        </ul>

        {/* ── 6. Pickup Terms ── */}
        <h2 className="text-lg font-semibold text-foreground">Pickup</h2>
        <p>
          Customer pickup is available at our yard (110 Frowein Road, Center Moriches) during business hours.
          Bring a truck or trailer with proper tie-downs. The customer is responsible for securing
          the load. We are not liable for spillage or damage en route after material leaves the yard.
        </p>

        {/* ── 7. Returns and Refunds ── */}
        <h2 className="text-lg font-semibold text-foreground">Returns &amp; Refunds</h2>
        <ul className="list-disc space-y-1 pl-6">
          <li>Bulk materials (mulch, stone, gravel, sand, topsoil) cannot be returned once delivered or loaded for pickup.</li>
          <li>If your order arrives damaged, is the wrong product, or the quantity is short, call us at {siteConfig.phoneDisplay} within 24 hours and we will make it right — either by replacing the material at no charge or issuing a refund to the original payment method.</li>
          <li>Custom-blended or special-order materials are non-refundable.</li>
          <li>Orders may be cancelled before dispatch for a full refund.</li>
          <li>Bagged products and unused non-bulk items may be returned within 7 days with receipt.</li>
          <li>Refunds are processed within 5–7 business days.</li>
        </ul>

        {/* ── 8. Estimates and Quotes ── */}
        <h2 className="text-lg font-semibold text-foreground">Estimates &amp; Quotes</h2>
        <p>
          Quotes for materials and delivery are honored for 14 days from the date issued, unless
          otherwise stated on the quote. Service quotes (landscaping, masonry, driveways, maintenance)
          are estimates based on site conditions at the time of assessment. Final pricing may vary if
          conditions differ from the original scope. All service work requires a signed agreement
          before commencement.
        </p>

        {/* ── 9. SMS Terms ── */}
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
          <strong>Opt-out:</strong> You can cancel SMS messages at any time by replying <strong>STOP</strong> to any message. After opting out, you will receive a one-time confirmation message and will no longer receive SMS messages from us unless you opt in again.
        </p>
        <p>
          <strong>Help:</strong> Reply <strong>HELP</strong> to any message for assistance, or contact us at {siteConfig.phoneDisplay} or {siteConfig.email}.
        </p>
        <p>
          <strong>Carrier disclaimer:</strong> Carriers (AT&amp;T, T-Mobile, Verizon, etc.) are not liable for delayed or undelivered messages. Message delivery is subject to effective transmission from your network operator and is not guaranteed.
        </p>
        <p>
          <strong>Privacy:</strong> We do not share, sell, rent, or trade mobile phone numbers or any personal information collected through our SMS messaging program with third parties or affiliates for marketing or promotional purposes. Mobile opt-in data and consent will not be shared with any third parties. See our <Link href="/privacy-policy" className="text-primary underline hover:no-underline">Privacy Policy</Link>.
        </p>

        {/* ── 10. Limitation of Liability ── */}
        <h2 className="text-lg font-semibold text-foreground">Limitation of Liability</h2>
        <p>
          Eastern Landscape &amp; Mason Supply is not liable for indirect, incidental, or consequential damages arising from your use of our website or purchase of our products and services. Our total liability is limited to the value of the products or services purchased in the relevant transaction.
        </p>

        {/* ── 11. Governing Law ── */}
        <h2 className="text-lg font-semibold text-foreground">Governing Law</h2>
        <p>
          These Terms &amp; Conditions are governed by and construed in accordance with the laws of the State of New York, without regard to its conflict of law principles. Any disputes arising from these terms or your use of our website and services shall be resolved in the courts of Suffolk County, New York.
        </p>

        {/* ── 12. Contact ── */}
        <h2 className="text-lg font-semibold text-foreground">Contact</h2>
        <p>
          {siteConfig.name}<br />
          {siteConfig.addressLine1}, {siteConfig.addressLine2}<br />
          {siteConfig.phoneDisplay} |{" "}
          <a href={`mailto:${siteConfig.email}`} className="text-primary underline hover:no-underline">{siteConfig.email}</a>
        </p>
      </section>
    </div>
  );
}
