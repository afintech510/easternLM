import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export const metadata: Metadata = {
  title: "Book-a-Crew Platform Terms | Eastern Landscape & Mason Supply",
  description: "Platform terms of service for the Eastern LM book-a-crew marketplace — how the service works, payment, liability, and non-compete.",
};

export default function BookNowTermsPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-12 md:py-16">
      <Link href="/services/book-now" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> Back to services
      </Link>

      <h1 className="[font-family:var(--font-display)] text-4xl text-primary">Book-a-Crew Platform Terms</h1>
      <p className="text-sm text-muted-foreground">Last updated: April 17, 2026</p>

      <section className="space-y-4 text-sm leading-relaxed text-muted-foreground">
        <h2 className="text-lg font-semibold text-foreground">1. What This Platform Is</h2>
        <p>
          Eastern Landscape &amp; Mason Supply operates a <strong>booking platform (marketplace)</strong> that
          connects customers with independent landscape service providers ("Providers"). When you book a
          service here, you are reserving a service slot with a Provider through our platform. We may
          also dispatch members of our own crew to fulfill bookings where available.
        </p>
        <p>
          <strong>We are a marketplace.</strong> We do not directly perform all services — Providers are
          independent contractors unless clearly identified as Eastern LM employees. Eastern LM is not
          responsible for Providers' acts or omissions except as specifically set out in these terms.
        </p>

        <h2 className="text-lg font-semibold text-foreground">2. How Payment Works</h2>
        <ol className="list-decimal space-y-2 pl-6">
          <li>
            <strong>Authorization on booking.</strong> When you book, we place an <strong>authorization hold</strong> on
            your credit/debit card for the full quoted service amount. This is <em>not a charge</em> — it
            reserves funds to confirm your commitment.
          </li>
          <li>
            <strong>Platform fee capture on confirmation.</strong> Once you confirm the date, time, terms,
            sign our Non-Compete and Liability Waiver, we <strong>capture the platform booking fee only</strong>
            (typically 15–25% of the service total, shown during booking). This fee is{" "}
            <strong>non-refundable</strong>. The remaining authorization is released back to your card.
          </li>
          <li>
            <strong>Service payment in cash.</strong> You pay the Provider directly:
            <ul className="mt-1 list-disc space-y-1 pl-6">
              <li><strong>50% in cash before services begin.</strong></li>
              <li><strong>50% in cash after services are completed</strong> to your satisfaction per the agreed terms.</li>
            </ul>
          </li>
          <li>
            <strong>Cancellation.</strong> Before capture of the platform fee, you can cancel at no cost — the
            authorization releases automatically. After capture, the platform fee is non-refundable (you
            may still cancel the service, but the booking fee is retained).
          </li>
        </ol>

        <h2 className="text-lg font-semibold text-foreground">3. Confirmation &amp; Provider Introduction</h2>
        <p>
          After booking, we review availability and contact you (call, text, or email) with a confirmed
          date/time and specific terms of service. Once you <strong>accept the terms and sign the
          Non-Compete and Liability Waiver</strong>, we introduce you to the assigned Provider (contact
          info, arrival window). Provider details are not released before this step.
        </p>

        <h2 className="text-lg font-semibold text-foreground">4. Non-Compete</h2>
        <p>
          By using this platform, you agree <strong>not to hire, engage, or solicit</strong> any Provider or
          Eastern LM crew member introduced to you through this platform outside of the Eastern LM
          platform for a period of <strong>12 months</strong> from the date of introduction. This protects
          the investment Eastern LM makes in vetting, insuring, and supplying Providers.
        </p>

        <h2 className="text-lg font-semibold text-foreground">5. Liability Waiver</h2>
        <p>
          Landscape services involve physical labor, machinery, and natural conditions outside our
          control. By booking, you acknowledge:
        </p>
        <ul className="list-disc space-y-1 pl-6">
          <li>You are responsible for disclosing underground utilities, sprinkler heads, pets, and any site hazards.</li>
          <li>Providers carry their own liability insurance. Eastern LM is not liable for Provider-caused damage except where directly supervised by Eastern LM.</li>
          <li>Plants, lawns, or hardscape may be affected by weather or settling after service — we do not guarantee results for natural elements.</li>
          <li>You agree to release Eastern LM and the Platform from claims arising from service performance by third-party Providers.</li>
        </ul>
        <p>
          Before Providers are dispatched, you will be asked to sign this waiver digitally.
        </p>

        <h2 className="text-lg font-semibold text-foreground">6. Pricing &amp; Changes</h2>
        <p>
          Prices shown are <strong>quoted rates</strong> for the described scope. If on-site conditions
          differ materially (e.g., significantly larger area, hidden debris, added requests), the
          Provider may quote an adjustment before proceeding. You can accept, decline, or reschedule.
          Platform fees already captured are non-refundable regardless of adjustments.
        </p>

        <h2 className="text-lg font-semibold text-foreground">7. Customer Responsibilities</h2>
        <ul className="list-disc space-y-1 pl-6">
          <li>Provide accurate service address and contact information.</li>
          <li>Be reachable during the confirmation window.</li>
          <li>Mark or disclose any underground utilities, sprinklers, invisible fences, or sensitive plantings.</li>
          <li>Have cash ready for the 50% pre-service and 50% post-service payments.</li>
          <li>Remove vehicles and personal belongings from service areas.</li>
        </ul>

        <h2 className="text-lg font-semibold text-foreground">8. Provider Status</h2>
        <p>
          Providers are vetted by Eastern LM for trade skill and reliability. Eastern LM does not
          employ all Providers — most are independent local crews. Some bookings may be fulfilled by
          Eastern LM's in-house team, clearly identified if so.
        </p>

        <h2 className="text-lg font-semibold text-foreground">9. Disputes &amp; Refunds</h2>
        <p>
          If service quality is substantially different from what was agreed, contact Eastern LM
          within 48 hours at {`(631) 874-6244`}. We will mediate between you and the Provider. Platform fees
          are non-refundable, but we will work in good faith to make things right — including sending
          a second crew at no additional platform fee if conditions warrant.
        </p>

        <h2 className="text-lg font-semibold text-foreground">10. Service Area &amp; Availability</h2>
        <p>
          Platform availability limited to Suffolk County, New York. Not all services are available in
          all seasons or locations. We may decline bookings where no Provider is available.
        </p>

        <h2 className="text-lg font-semibold text-foreground">11. Governing Law</h2>
        <p>
          These terms are governed by the laws of the State of New York. Disputes shall be resolved in
          the courts of Suffolk County, New York.
        </p>

        <h2 className="text-lg font-semibold text-foreground">12. Changes</h2>
        <p>
          We may update these terms. Continued use of the platform after changes constitutes acceptance.
        </p>

        <h2 className="text-lg font-semibold text-foreground">Contact</h2>
        <p>
          Eastern Landscape &amp; Mason Supply<br />
          110 Frowein Road, Center Moriches, NY 11934<br />
          {`(631) 874-6244`} |{" "}
          <a href="mailto:sales@easternlm.com" className="text-primary underline hover:no-underline">
            sales@easternlm.com
          </a>
        </p>
      </section>

      <div className="border-t pt-6">
        <Button asChild>
          <Link href="/services/book-now">Continue to Services</Link>
        </Button>
      </div>
    </div>
  );
}
