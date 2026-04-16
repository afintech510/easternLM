import type { Metadata } from "next";
import { siteConfig } from "@/config/site";

export const metadata: Metadata = {
  title: "Privacy Policy | Eastern Landscape & Mason Supply",
  description:
    "How Eastern Landscape & Mason Supply collects, uses, and protects your personal information.",
};

export default function PrivacyPolicyPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-8 px-4 py-12 md:py-16">
      <h1 className="[font-family:var(--font-display)] text-4xl text-primary">Privacy Policy</h1>
      <p className="text-sm text-muted-foreground">Last updated: April 16, 2026</p>

      <section className="space-y-4 text-sm leading-relaxed text-muted-foreground">
        {/* ── 1. Who We Are ── */}
        <h2 className="text-lg font-semibold text-foreground">Who We Are</h2>
        <p>
          Eastern Landscape &amp; Mason Supply (&quot;we,&quot; &quot;us,&quot; or &quot;our&quot;) operates the
          website easternlm.com and related services. Our mailing address is 110 Frowein Road,
          Center Moriches, NY 11934. You can reach us at {siteConfig.phoneDisplay} or{" "}
          <a href={`mailto:${siteConfig.email}`} className="text-primary underline hover:no-underline">{siteConfig.email}</a>.
        </p>

        {/* ── 2. What We Collect ── */}
        <h2 className="text-lg font-semibold text-foreground">What We Collect</h2>
        <ul className="list-disc space-y-1 pl-6">
          <li><strong>Contact information:</strong> Name, phone number (including mobile), email address, and delivery or billing address.</li>
          <li><strong>Order information:</strong> Products ordered, quantities, delivery details, and project information.</li>
          <li><strong>Payment information:</strong> Credit/debit card details are processed by Stripe, Klarna, or Afterpay. We never see or store full card numbers on our servers.</li>
          <li><strong>Communications:</strong> Messages, quote requests, and service inquiries you submit through our website, phone, or SMS.</li>
          <li><strong>Device and usage data:</strong> Browser type, IP address, pages visited, and interaction data collected through cookies and analytics tools.</li>
        </ul>

        {/* ── 3. How We Use It ── */}
        <h2 className="text-lg font-semibold text-foreground">How We Use Your Information</h2>
        <ul className="list-disc space-y-1 pl-6">
          <li>Process and fulfill your orders and deliveries</li>
          <li>Send order confirmations, delivery scheduling updates, and delivery status notifications via email and SMS</li>
          <li>Respond to quote requests and customer inquiries</li>
          <li>Send post-delivery review requests</li>
          <li>Serve relevant advertising through Google Ads and Meta (Facebook/Instagram) when you have given consent or where permitted by law</li>
          <li>Improve our website, products, and services</li>
          <li>Prevent fraud and maintain security</li>
          <li>Comply with legal obligations</li>
        </ul>
        <p>
          We do not sell, rent, or share your personal information with third parties for their own marketing or promotional purposes.
        </p>

        {/* ── 4. Who We Share It With ── */}
        <h2 className="text-lg font-semibold text-foreground">Who We Share It With</h2>
        <p>We use the following third-party services that may process your data in order to operate our business:</p>
        <ul className="list-disc space-y-1 pl-6">
          <li>
            <strong>Stripe</strong> — payment processing (PCI-DSS compliant).{" "}
            <a href="https://stripe.com/privacy" target="_blank" rel="noopener noreferrer" className="text-primary underline hover:no-underline">Privacy policy</a>
          </li>
          <li>
            <strong>Klarna</strong> — buy-now-pay-later payment option.{" "}
            <a href="https://www.klarna.com/us/privacy/" target="_blank" rel="noopener noreferrer" className="text-primary underline hover:no-underline">Privacy policy</a>
          </li>
          <li>
            <strong>Afterpay</strong> — buy-now-pay-later payment option.{" "}
            <a href="https://www.afterpay.com/privacy-policy" target="_blank" rel="noopener noreferrer" className="text-primary underline hover:no-underline">Privacy policy</a>
          </li>
          <li>
            <strong>Supabase</strong> — database and authentication (PostgreSQL, hosted in the US).{" "}
            <a href="https://supabase.com/privacy" target="_blank" rel="noopener noreferrer" className="text-primary underline hover:no-underline">Privacy policy</a>
          </li>
          <li>
            <strong>Resend</strong> — transactional email delivery (order confirmations, delivery updates).{" "}
            <a href="https://resend.com/legal/privacy-policy" target="_blank" rel="noopener noreferrer" className="text-primary underline hover:no-underline">Privacy policy</a>
          </li>
          <li>
            <strong>RingCentral</strong> — voice and SMS messaging (primary).{" "}
            <a href="https://www.ringcentral.com/legal/privacy-notice.html" target="_blank" rel="noopener noreferrer" className="text-primary underline hover:no-underline">Privacy policy</a>
          </li>
          <li>
            <strong>Twilio</strong> — SMS messaging (fallback).{" "}
            <a href="https://www.twilio.com/legal/privacy" target="_blank" rel="noopener noreferrer" className="text-primary underline hover:no-underline">Privacy policy</a>
          </li>
          <li>
            <strong>Google Maps Platform</strong> — delivery distance calculation and address autocomplete.{" "}
            <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer" className="text-primary underline hover:no-underline">Privacy policy</a>
          </li>
          <li>
            <strong>Google Ads</strong> — remarketing and conversion tracking.{" "}
            <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer" className="text-primary underline hover:no-underline">Privacy policy</a>
          </li>
          <li>
            <strong>Meta Pixel</strong> — remarketing on Facebook and Instagram.{" "}
            <a href="https://www.facebook.com/privacy/policy/" target="_blank" rel="noopener noreferrer" className="text-primary underline hover:no-underline">Privacy policy</a>
          </li>
          <li>
            <strong>Cloudflare</strong> — DNS, CDN, and web application firewall.{" "}
            <a href="https://www.cloudflare.com/privacypolicy/" target="_blank" rel="noopener noreferrer" className="text-primary underline hover:no-underline">Privacy policy</a>
          </li>
        </ul>
        <p>
          We only share the minimum information necessary for each service to function.
        </p>

        {/* ── 5. Cookies and Tracking ── */}
        <h2 className="text-lg font-semibold text-foreground">Cookies &amp; Tracking</h2>
        <ul className="list-disc space-y-1 pl-6">
          <li><strong>Essential cookies:</strong> Required for the website to function (shopping cart, session management, Cloudflare security tokens).</li>
          <li><strong>Google Ads cookies:</strong> Used for remarketing and conversion tracking. You can opt out via <a href="https://adssettings.google.com" target="_blank" rel="noopener noreferrer" className="text-primary underline hover:no-underline">Google Ads Settings</a>.</li>
          <li><strong>Meta Pixel:</strong> Used for remarketing on Facebook and Instagram. You can opt out via <a href="https://www.facebook.com/settings/?tab=ads" target="_blank" rel="noopener noreferrer" className="text-primary underline hover:no-underline">Facebook Ad Preferences</a>.</li>
        </ul>
        <p>
          Most web browsers allow you to control cookies through their settings. Disabling cookies may affect the functionality of certain features such as the shopping cart.
        </p>

        {/* ── 6. SMS / Text Messaging ── */}
        <h2 className="text-lg font-semibold text-foreground">SMS / Text Messaging</h2>
        <p>
          When you provide your mobile phone number during checkout, quote requests, account creation, or other interactions, you may receive SMS/text messages related to your orders and services. These messages may include order confirmations, delivery scheduling updates, delivery status notifications, quote notifications, payment reminders, and post-delivery review requests.
        </p>
        <p>
          By providing your mobile phone number and opting in to receive text messages, you consent to receive these messages from Eastern Landscape &amp; Mason Supply. Message frequency varies based on your order and service activity. Message and data rates may apply. You can opt out at any time by replying <strong>STOP</strong> to any message. Reply <strong>HELP</strong> for assistance, or contact us at {siteConfig.phoneDisplay} or {siteConfig.email}.
        </p>
        <p>
          <strong>We do not share, sell, rent, or trade mobile phone numbers or any personal information collected through our SMS messaging program with third parties or affiliates for marketing or promotional purposes. Mobile opt-in data and consent will not be shared with any third parties.</strong> Your phone number and consent information are used solely by Eastern Landscape &amp; Mason Supply to deliver the messages described above.
        </p>

        {/* ── 7. Your Rights ── */}
        <h2 className="text-lg font-semibold text-foreground">Your Rights</h2>
        <p>
          You may request access to, correction of, or deletion of your personal information at any time by emailing{" "}
          <a href={`mailto:${siteConfig.email}`} className="text-primary underline hover:no-underline">{siteConfig.email}</a>{" "}
          or calling {siteConfig.phoneDisplay}. We will respond within a reasonable timeframe.
        </p>

        {/* ── 8. Data Retention ── */}
        <h2 className="text-lg font-semibold text-foreground">Data Retention</h2>
        <p>
          We retain order and customer records for seven (7) years to comply with New York State tax and business record requirements. Marketing contacts are retained until you unsubscribe. You may request deletion of your personal data at any time, subject to our legal retention obligations.
        </p>

        {/* ── 9. Credit Card Surcharge Disclosure ── */}
        <h2 className="text-lg font-semibold text-foreground">Credit Card Surcharge Disclosure</h2>
        <p>
          In compliance with New York State law, a surcharge of up to 3.5% may be applied to credit and debit card transactions to cover payment processing costs. This surcharge is clearly disclosed during checkout before payment is submitted. Cash and check payments are not subject to this surcharge.
        </p>

        {/* ── 10. Data Security ── */}
        <h2 className="text-lg font-semibold text-foreground">Data Security</h2>
        <p>
          We implement reasonable administrative, technical, and physical safeguards to protect your personal information against unauthorized access, alteration, disclosure, or destruction. Payment information is processed by Stripe, Klarna, and Afterpay using industry-standard encryption and PCI-DSS compliant systems. Our website is served over HTTPS with TLS encryption and protected by Cloudflare&apos;s web application firewall. However, no method of transmission over the internet or electronic storage is 100% secure, and we cannot guarantee absolute security.
        </p>

        {/* ── 11. Children ── */}
        <h2 className="text-lg font-semibold text-foreground">Children&apos;s Privacy</h2>
        <p>
          Our website and services are not directed at children under the age of 13. We do not knowingly collect personal information from children under 13. If you believe a child under 13 has provided us with personal information, please contact us at{" "}
          <a href={`mailto:${siteConfig.email}`} className="text-primary underline hover:no-underline">{siteConfig.email}</a>{" "}
          and we will take steps to delete that information promptly.
        </p>

        {/* ── 12. Changes ── */}
        <h2 className="text-lg font-semibold text-foreground">Changes to This Policy</h2>
        <p>
          We may update this Privacy Policy from time to time. Changes will be posted on this page with an updated &quot;Last updated&quot; date at the top. Your continued use of our website after changes are posted constitutes your acceptance of the updated policy.
        </p>

        {/* ── 13. Contact ── */}
        <h2 className="text-lg font-semibold text-foreground">Contact</h2>
        <p>
          {siteConfig.name}<br />
          {siteConfig.addressLine1}, {siteConfig.addressLine2}<br />
          {siteConfig.phoneDisplay}<br />
          <a href={`mailto:${siteConfig.email}`} className="text-primary underline hover:no-underline">{siteConfig.email}</a>
        </p>
      </section>
    </div>
  );
}
