import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { HOLIDAY_LIGHTS } from "@/config/holiday-lights";
import { getDesignByToken, imageUrl } from "@/lib/holiday-lights/designs";
import { CompareSlider } from "@/components/holiday-lights/compare-slider";
import { CtaButton } from "@/components/holiday-lights/cta-button";
import { SubPageShell } from "@/components/holiday-lights/sub-page-shell";
import { ResultTracker } from "@/components/holiday-lights/result-tracker";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ token: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { token } = await params;
  const design = await getDesignByToken(token);
  const ready = design?.visualizer_status === "ready" && !!design.unlocked_at;
  const title = "My house, lit up for Christmas 🎄";
  const description = `A concept preview from ${HOLIDAY_LIGHTS.brand}. See your own house lit up, free.`;
  return {
    title: `${title} | ${HOLIDAY_LIGHTS.brand}`,
    description,
    robots: { index: false, follow: false },
    openGraph: {
      title,
      description,
      siteName: HOLIDAY_LIGHTS.brand,
      images: ready && design ? [{ url: imageUrl(design, "result", true) }] : [{ url: "/api/holiday-lights/og", width: 1200, height: 630 }],
    },
    twitter: { card: "summary_large_image", title, description },
  };
}

/** Shareable result page — the link that goes out by SMS. */
export default async function VisualizerResultPage({ params }: Props) {
  const { token } = await params;
  const design = await getDesignByToken(token);
  if (!design) notFound();

  const ready = design.visualizer_status === "ready" && !!design.unlocked_at && !!design.visualizer_image_path;
  const ratio = design.image_width && design.image_height ? `${design.image_width} / ${design.image_height}` : undefined;

  return (
    <SubPageShell>
      <section className="sec nv" id="visualizer" aria-labelledby="r-h">
        <div className="wrap page-narrow">
          <span className="eyebrow">Concept preview</span>
          <h1 id="r-h" style={{ color: "#fff", fontSize: "clamp(2rem,7vw,3rem)" }}>
            {ready ? `${design.name ? `${design.name}'s` : "Your"} house, lit up.` : "Still lighting it up…"}
          </h1>
          {ready ? (
            <>
              <div style={{ marginTop: 20 }}>
                <CompareSlider
                  label="This house"
                  tagLeft="Before"
                  tagRight="Concept preview"
                  ratio={ratio}
                  tagsTop
                  // eslint-disable-next-line @next/next/no-img-element
                  before={<img src={imageUrl(design, "original")} alt="" />}
                  // eslint-disable-next-line @next/next/no-img-element
                  after={<img src={imageUrl(design, "result")} alt="" />}
                />
              </div>
              <p className="fine">Artistic concept, not your design or price. Drag the slider to compare.</p>
              <ResultTracker style={design.visualizer_style} />
            </>
          ) : (
            <p className="lead">This preview isn&apos;t ready yet. Give it a minute and refresh, or make your own below.</p>
          )}
          <div className="acts" style={{ display: "grid", gap: 12, marginTop: 22, maxWidth: 520 }}>
            <CtaButton act="design" className="btn btn-gold">Make it real: get my exact price</CtaButton>
            <CtaButton act="reserve" className="btn btn-line">Reserve my week (${HOLIDAY_LIGHTS.pricing.depositCents / 100})</CtaButton>
            <a className="btn btn-line" href={`${HOLIDAY_LIGHTS.path}#visualizer`}>See your own house lit up, free</a>
          </div>
        </div>
      </section>
    </SubPageShell>
  );
}
