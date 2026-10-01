import type { Metadata } from "next";
import { ServiceQuoteForm } from "@/components/forms/service-quote-form";
import { SubPageShell } from "@/components/holiday-lights/sub-page-shell";
import { HOLIDAY_LIGHTS } from "@/config/holiday-lights";

export const metadata: Metadata = {
  title: `Get your exact Christmas lights price | ${HOLIDAY_LIGHTS.brand}`,
  description: "Tell us about your house and we'll text you an exact price for professionally installed Christmas lights you own.",
  alternates: { canonical: `${HOLIDAY_LIGHTS.path}/quote` },
};

/** "Get my exact price" until the online designer (Slice 3) ships. */
export default function HolidayLightsQuotePage() {
  return (
    <SubPageShell>
      <section className="sec nv" aria-labelledby="q-h">
        <div className="wrap page-narrow">
          <span className="eyebrow">Get my exact price</span>
          <h1 id="q-h" style={{ color: "#fff", fontSize: "clamp(2rem,7vw,3rem)" }}>Tell us about your house.</h1>
          <p className="lead">
            A few details and a photo if you have one. We&apos;ll text you an exact price, usually the same day. Roofline lights
            from ${HOLIDAY_LIGHTS.pricing.rooflinePerFtCents / 100}/ft installed, and the lights are yours.
          </p>
          <div className="vcard" style={{ marginTop: 24 }}>
            <ServiceQuoteForm defaultServiceType="christmas-lights" serviceCategory="holiday" />
          </div>
        </div>
      </section>
    </SubPageShell>
  );
}
