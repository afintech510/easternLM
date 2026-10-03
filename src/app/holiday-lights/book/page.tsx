import type { Metadata } from "next";
import { HOLIDAY_LIGHTS, type HomeStyle } from "@/config/holiday-lights";
import { BuildAndBook } from "@/components/holiday-lights/build-and-book";
import { SubPageShell } from "@/components/holiday-lights/sub-page-shell";
import { getDesignByToken } from "@/lib/holiday-lights/designs";
import { defaultBuild, type BuildInput } from "@/lib/holiday-lights/pricing";
import { parseVisualizerOptions } from "@/lib/holiday-lights/visualize";

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

/** ?design=<visualizer token> → start the build from the style + extras they previewed. */
async function buildFromPreview(token: string | undefined, home: HomeStyle | undefined): Promise<BuildInput | undefined> {
  if (!token) return undefined;
  const design = await getDesignByToken(token).catch(() => null);
  const options = parseVisualizerOptions(design?.build);
  if (!options) return undefined;
  const base = defaultBuild(home ?? "ranch");
  return { ...base, style: options.style, extras: { ...base.extras, ...options.extras } };
}

/** Build & Book on its own page (keeps the landing page light). */
export default async function BookPage({
  searchParams,
}: {
  searchParams: Promise<{ home?: string; canceled?: string; design?: string }>;
}) {
  const { home, canceled, design } = await searchParams;
  const initialHome = HOMES.includes(home as HomeStyle) ? (home as HomeStyle) : undefined;
  const wasCanceled = canceled === "1";
  const initialBuild = wasCanceled ? undefined : await buildFromPreview(design, initialHome);

  return (
    <SubPageShell>
      <section className="sec" aria-label="Build and book your lights">
        <div className="wrap">
          {wasCanceled && (
            <p className="card" role="status" style={{ marginBottom: 20, padding: "14px 18px" }}>
              Your deposit wasn&apos;t completed, so nothing was charged. Your design is still here. Pick up where you left off.
            </p>
          )}
          {initialBuild && (
            <p className="card" role="status" style={{ marginBottom: 20, padding: "14px 18px" }}>
              We started your build from your AI preview. Set your house size below to see your exact price.
            </p>
          )}
          {/* Coming from the cost simulator or an AI preview: start fresh from it; otherwise restore the saved design. */}
          <BuildAndBook initialHome={initialHome} initialBuild={initialBuild} restore={wasCanceled || (!initialHome && !initialBuild)} />
        </div>
      </section>
    </SubPageShell>
  );
}
