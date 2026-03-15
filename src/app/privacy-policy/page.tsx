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
      <p className="text-sm text-muted-foreground">Effective date: March 15, 2026</p>

      <section className="space-y-4 text-sm leading-relaxed text-muted-foreground">
        <p>
          {siteConfig.name} (&quot;we,&quot; &quot;us,&quot; or &quot;our&quot;) operates the website easternlm.com and related services. This Privacy Policy describes how we collect, use, and protect your personal information when you visit our website, place orders, request quotes, or communicate with us.
        </p>

        <h2 className="text-lg font-semibold text-foreground">Information We Collect</h2>
        <p>We collect the following categories of personal information:</p>
        <ul className="list-disc space-y-1 pl-6">
          <li><strong>Contact information:</strong> Name, phone number (including mobile), email address, and delivery/billing address.</li>
          <li><strong>Order information:</strong> Products ordered, quantities, delivery details, and project information.</li>
          <li><strong>Payment information:</strong> Credit/debit card details processed through our payment processor (Stripe). We do not store credit card numbers on our servers.</li>
          <li><strong>Communications:</strong> Messages, quote requests, and service inquiries you submit through our website, phone, or SMS.</li>
          <li><strong>Device and usage data:</strong> Browser type, IP address, pages visited, and interaction data collected through cookies and analytics tools.</li>
        </ul>

        <h2 className="text-lg font-semibold text-foreground">How We Use Your Information</h2>
        <ul className="list-disc space-y-1 pl-6">
          <li>Process and fulfill your orders and deliveries</li>
          <li>Send order confirmations, delivery scheduling updates, and delivery status notifications via email and SMS</li>
          <li>Respond to quote requests and customer inquiries</li>
          <li>Send post-delivery review requests</li>
          <li>Improve our website, products, and services</li>
          <li>Prevent fraud and maintain security</li>
          <li>Comply with legal obligations</li>
        </ul>
        <p>
          We do not sell, rent, or share your personal information with third parties for their marketing or promotional purposes.
        </p>

        <h2 className="text-lg font-semibold text-foreground">SMS / Text Messaging</h2>
        <p>
          When you provide your mobile phone number during checkout or account creation, you may receive transactional SMS/text messages related to your orders. These messages may include order confirmations, delivery scheduling, delivery status updates (e.g., &quot;Your delivery is on the way&quot;), and post-delivery review requests.
        </p>
        <p>
          By providing your mobile phone number, you consent to receive these transactional messages. Message frequency varies based on your order activity. Message and data rates may apply. You can opt out of SMS messages at any time by replying <strong>STOP</strong> to any message. Reply <strong>HELP</strong> for assistance, or call {siteConfig.phoneDisplay}.
        </p>
        <p>
          <strong>We will not share, sell, or provide your mobile phone number or SMS opt-in consent data to any third parties or affiliates for their marketing or promotional purposes.</strong> Your phone number and consent information are used solely to deliver the transactional messages described above through our SMS service provider (Twilio).
        </p>

        <h2 className="text-lg font-semibold text-foreground">Third-Party Services</h2>
        <p>We use the following third-party services that may process your data in order to operate our business:</p>
        <ul className="list-disc space-y-1 pl-6">
          <li><strong>Stripe</strong> — payment processing (PCI-DSS compliant)</li>
          <li><strong>Supabase</strong> — database and authentication</li>
          <li><strong>Google Maps</strong> — delivery distance calculation and address autocomplete</li>
          <li><strong>Resend</strong> — transactional email delivery</li>
          <li><strong>Twilio</strong> — SMS/text message delivery</li>
          <li><strong>Vercel Analytics</strong> — anonymous website usage analytics</li>
        </ul>
        <p>
          Each of these providers has their own privacy policy governing how they handle data. We only share the minimum information necessary for each service to function.
        </p>

        <h2 className="text-lg font-semibold text-foreground">Cookies &amp; Analytics</h2>
        <p>
          Our website uses cookies and similar technologies to improve your browsing experience. Specifically:
        </p>
        <ul className="list-disc space-y-1 pl-6">
          <li><strong>Essential cookies:</strong> Required for the website to function properly (e.g., shopping cart, session management).</li>
          <li><strong>Analytics cookies:</strong> We use Vercel Analytics to collect aggregated, anonymized data about how visitors use our site, including pages visited, time on site, and referring sources. This data does not identify individual users and is used solely to improve our website.</li>
        </ul>
        <p>
          Most web browsers allow you to control cookies through their settings. Disabling cookies may affect the functionality of certain features such as the shopping cart.
        </p>

        <h2 className="text-lg font-semibold text-foreground">Credit Card Surcharge Disclosure</h2>
        <p>
          In compliance with New York State law, a surcharge of up to 3% may be applied to credit and debit card transactions to cover payment processing costs. This surcharge is clearly disclosed during checkout before payment is submitted. Cash and check payments are not subject to this surcharge.
        </p>

        <h2 className="text-lg font-semibold text-foreground">Data Security</h2>
        <p>
          We implement reasonable administrative, technical, and physical safeguards to protect your personal information against unauthorized access, alteration, disclosure, or destruction. Payment information is processed by Stripe using industry-standard encryption and PCI-DSS compliant systems. However, no method of transmission over the internet or electronic storage is 100% secure, and we cannot guarantee absolute security.
        </p>

        <h2 className="text-lg font-semibold text-foreground">Data Retention</h2>
        <p>
          We retain order and customer records for as long as necessary to provide our services, maintain business records, and comply with legal and tax requirements. You may request deletion of your personal data by contacting us, subject to our legal retention obligations.
        </p>

        <h2 className="text-lg font-semibold text-foreground">Your Rights</h2>
        <p>
          You may request access to, correction of, or deletion of your personal information at any time by contacting us at {siteConfig.email} or calling {siteConfig.phoneDisplay}. We will respond to your request within a reasonable timeframe.
        </p>

        <h2 className="text-lg font-semibold text-foreground">California Residents (CCPA)</h2>
        <p>
          If you are a California resident, the California Consumer Privacy Act (CCPA) provides you with additional rights regarding your personal information:
        </p>
        <ul className="list-disc space-y-1 pl-6">
          <li><strong>Right to know:</strong> You may request details about the categories and specific pieces of personal information we have collected about you.</li>
          <li><strong>Right to delete:</strong> You may request deletion of your personal information, subject to certain exceptions.</li>
          <li><strong>Right to opt out of sale:</strong> We do not sell your personal information to third parties.</li>
          <li><strong>Non-discrimination:</strong> We will not discriminate against you for exercising your CCPA rights.</li>
        </ul>
        <p>
          To exercise these rights, contact us at {siteConfig.email} or call {siteConfig.phoneDisplay}. We will verify your identity before processing your request.
        </p>

        <h2 className="text-lg font-semibold text-foreground">Children&apos;s Privacy (COPPA)</h2>
        <p>
          Our website and services are not directed at children under the age of 13. We do not knowingly collect personal information from children under 13. If we learn that we have collected personal information from a child under 13, we will take steps to delete that information promptly. If you believe a child under 13 has provided us with personal information, please contact us at {siteConfig.email}.
        </p>

        <h2 className="text-lg font-semibold text-foreground">Changes to This Policy</h2>
        <p>
          We may update this Privacy Policy from time to time. Changes will be posted on this page with an updated effective date. Your continued use of our website after changes are posted constitutes your acceptance of the updated policy.
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
