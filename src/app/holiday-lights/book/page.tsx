import type { Metadata } from "next";
import { HOLIDAY_LIGHTS, type HomeStyle } from "@/config/holiday-lights";
import { BuildAndBook } from "@/components/holiday-lights/build-and-book";
import { SubPageShell } from "@/components/holiday-lights/sub-page-shell";

const TITLE = `Design, price & book your Christmas lights | ${HOLIDAY_LIGHTS.brand}`;
const DESCRIPTION =
  "Pick your house style, lights and extras, see your exact price, and reserve your install week with a $199 deposit. Brookhaven, Riverhead, Southold and Southampton.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: `${HOLIDAY_LIGHTS.path}/book` },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    siteName: HOLIDAY_LIGHTS.brand,
    images: [{ url: "/api/holiday-lights/og", width: 1200, height: 630 }],
  },
};

const HOMES = Object.keys(HOLIDAY_LIGHTS.homes) as HomeStyle[];

/** Build & Book on its own page (keeps the landing page light). */
export default async function BookPage({ searchParams }: { searchParams: Promise<{ home?: string; canceled?: string }> }) {
  const { home, canceled } = await searchParams;
  const initialHome = HOMES.includes(home as HomeStyle) ? (home as HomeStyle) : undefined;
  const wasCanceled = canceled === "1";

  return (
    <SubPageShell>
      <section className="sec" aria-label="Build and book your lights">
        <div className="wrap">
          {wasCanceled && (
            <p className="card" role="status" style={{ marginBottom: 20, padding: "14px 18px" }}>
              Your deposit wasn&apos;t completed, so nothing was charged. Your design is still here. Pick up where you left off.
            </p>
          )}
          {/* Coming from the cost simulator with a house style: start fresh from it; otherwise restore the saved design. */}
          <BuildAndBook initialHome={initialHome} restore={wasCanceled || !initialHome} />
        </div>
      </section>
    </SubPageShell>
  );
}
