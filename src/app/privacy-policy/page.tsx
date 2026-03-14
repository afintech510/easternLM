import type { Metadata } from "next";
import { siteConfig } from "@/config/site";

export const metadata: Metadata = {
  title: "Privacy Policy | Eastern Landscape & Mason Supply",
  description: "Privacy policy for Eastern Landscape & Mason Supply.",
};

export default function PrivacyPolicyPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-8 px-4 py-12 md:py-16">
      <h1 className="[font-family:var(--font-display)] text-4xl text-primary">Privacy Policy</h1>
      <p className="text-sm text-muted-foreground">Last updated: March 14, 2026</p>

      <section className="space-y-4 text-sm leading-relaxed text-muted-foreground">
        <h2 className="text-lg font-semibold text-foreground">Information We Collect</h2>
        <p>
          When you place an order, request a quote, or contact us, we collect the information you provide: name, phone number, email address, delivery address, and project details. We also collect payment information through our payment processor (Stripe) — we do not store credit card numbers on our servers.
        </p>
        <p>
          Our website uses cookies and analytics (Vercel Analytics) to understand how visitors use the site. This data is aggregated and does not identify individual users.
        </p>

        <h2 className="text-lg font-semibold text-foreground">How We Use Your Information</h2>
        <ul className="list-disc space-y-1 pl-6">
          <li>Process and fulfill your orders and deliveries</li>
          <li>Send order confirmations and delivery updates</li>
          <li>Respond to quote requests and customer inquiries</li>
          <li>Improve our website and services</li>
          <li>Comply with legal obligations</li>
        </ul>
        <p>
          We do not sell, rent, or share your personal information with third parties for marketing purposes.
        </p>

        <h2 className="text-lg font-semibold text-foreground">Third-Party Services</h2>
        <p>We use the following third-party services that may process your data:</p>
        <ul className="list-disc space-y-1 pl-6">
          <li><strong>Stripe</strong> — payment processing (PCI-DSS compliant)</li>
          <li><strong>Supabase</strong> — database and authentication</li>
          <li><strong>Google Maps</strong> — delivery distance calculation and address autocomplete</li>
          <li><strong>Resend</strong> — transactional email delivery</li>
          <li><strong>Vercel Analytics</strong> — anonymous website usage analytics</li>
        </ul>

        <h2 className="text-lg font-semibold text-foreground">Credit Card Surcharge Disclosure</h2>
        <p>
          In compliance with New York State law, a surcharge of up to 3% may be applied to credit and debit card transactions to cover payment processing costs. This surcharge is clearly disclosed during checkout before payment is submitted. Cash and check payments are not subject to this surcharge.
        </p>

        <h2 className="text-lg font-semibold text-foreground">Data Retention</h2>
        <p>
          We retain order and customer records for as long as necessary to provide our services and comply with legal requirements. You may request deletion of your personal data by contacting us.
        </p>

        <h2 className="text-lg font-semibold text-foreground">Your Rights</h2>
        <p>
          You may request access to, correction of, or deletion of your personal information at any time by contacting us at {siteConfig.email} or calling {siteConfig.phoneDisplay}.
        </p>

        <h2 className="text-lg font-semibold text-foreground">Contact</h2>
        <p>
          {siteConfig.name}<br />
          {siteConfig.addressLine1}, {siteConfig.addressLine2}<br />
          {siteConfig.phoneDisplay}<br />
          {siteConfig.email}
        </p>
      </section>
    </div>
  );
}
