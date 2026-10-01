import type { Metadata } from "next";
import { HOLIDAY_LIGHTS } from "@/config/holiday-lights";
import { getDesignByToken } from "@/lib/holiday-lights/designs";
import { summarizeBuild, type BuildInput, type PriceBreakdown } from "@/lib/holiday-lights/pricing";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { SubPageShell } from "@/components/holiday-lights/sub-page-shell";
import { BookedStatus } from "@/components/holiday-lights/booked-status";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: `You're booked | ${HOLIDAY_LIGHTS.brand}`,
  robots: { index: false, follow: false },
};

const money = (c: number) => `$${(c / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

type Booking = {
  token: string;
  name: string | null;
  booking_status: string | null;
  install_week_id: string | null;
  build: BuildInput | null;
  price_breakdown: PriceBreakdown | null;
  deposit_cents: number | null;
};

/** Stripe Checkout success page for Build & Book / Quick Reserve. */
export default async function BookedPage({ searchParams }: { searchParams: Promise<{ t?: string }> }) {
  const { t } = await searchParams;
  const booking = t ? ((await getDesignByToken(t)) as unknown as Booking | null) : null;

  let weekLabel = "";
  if (booking?.install_week_id) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (getSupabaseAdminClient() as any).from("holiday_install_weeks").select("label").eq("id", booking.install_week_id).maybeSingle();
    weekLabel = data?.label ?? "";
  }
  const reserved = booking?.booking_status === "reserved";
  const pending = booking?.booking_status === "pending_deposit";
  const p = booking?.price_breakdown ?? null;
  const deposit = booking?.deposit_cents ?? HOLIDAY_LIGHTS.pricing.depositCents;

  return (
    <SubPageShell>
      <section className="sec nv" aria-labelledby="bk-h">
        <div className="wrap page-narrow">
          <span className="eyebrow">{reserved ? "Booking confirmed" : "Almost there"}</span>
          <h1 id="bk-h" style={{ color: "#fff", fontSize: "clamp(2rem,7vw,3rem)" }}>
            {!booking
              ? "We couldn't find that booking."
              : reserved
                ? `You're booked${booking.name ? `, ${booking.name.split(" ")[0]}` : ""}! 🎄`
                : pending
                  ? "Finishing up your deposit…"
                  : "This booking wasn't completed."}
          </h1>

          {booking && (reserved || pending) && (
            <div className="vcard" style={{ marginTop: 22 }}>
              <p className="steplbl">Install week</p>
              <p style={{ fontSize: "1.25rem", fontWeight: 700, margin: "0 0 14px" }}>{weekLabel}</p>
              <p className="steplbl">{booking.build ? "Your design" : "Quick reserve"}</p>
              <p>{booking.build ? summarizeBuild(booking.build) : "We'll call to design your lights and give you an exact price."}</p>
              {p && (
                <ul className="ticks" style={{ margin: "6px 0 14px" }}>
                  <li>Estimated total: <b>{money(p.totalCents)}</b> incl. 8.75% NY sales tax</li>
                  <li>{reserved ? "Deposit paid" : "Deposit"}: <b>{money(deposit)}</b>, credited to your job</li>
                  <li>Balance after install: <b>{money(Math.max(0, p.totalCents - deposit))}</b></li>
                </ul>
              )}
              <p className="steplbl">What happens next</p>
              <ul className="ticks">
                <li>We verify your roofline footage and text you your final, locked price.</li>
                <li>Our crew installs during your week and does a final check.</li>
                <li>The balance is charged to your saved card after install. No card fees.</li>
              </ul>
              {pending && <p className="fine">Waiting for the payment confirmation from Stripe. This page updates automatically; we&apos;ll also text you.</p>}
            </div>
          )}

          {(!booking || (!reserved && !pending)) && (
            <p className="lead" style={{ marginTop: 16 }}>
              <a href={`${HOLIDAY_LIGHTS.path}#build`} style={{ textDecoration: "underline" }}>Build &amp; book again</a> or call us at{" "}
              <a href={`tel:${HOLIDAY_LIGHTS.phoneTel}`}>{HOLIDAY_LIGHTS.phoneDisplay}</a>.
            </p>
          )}
          {booking && <BookedStatus token={booking.token} reserved={reserved} depositCents={deposit} />}
        </div>
      </section>
    </SubPageShell>
  );
}
