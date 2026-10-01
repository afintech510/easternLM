import type { Metadata } from "next";
import Link from "next/link";
import { JsonLd } from "@/components/seo/json-ld";
import { faqSchema, serviceSchema } from "@/lib/seo/business";
import { getGoogleReviews, type ReviewsData } from "@/lib/data/reviews";
import { HOLIDAY_LIGHTS, isEarlyBirdActive } from "@/config/holiday-lights";
import { HouseSvg } from "@/components/holiday-lights/house-svg";
import { CompareSlider } from "@/components/holiday-lights/compare-slider";
import { CostEstimator } from "@/components/holiday-lights/cost-estimator";
import { CtaButton } from "@/components/holiday-lights/cta-button";
import { NavMenu, type NavLinkItem } from "@/components/holiday-lights/nav-menu";
import { ReserveDialog } from "@/components/holiday-lights/reserve-dialog";
import { VisualizerCard } from "@/components/holiday-lights/visualizer-card";
import { WaitlistForm } from "@/components/holiday-lights/waitlist-form";

export const revalidate = 3600;

const TITLE = "Christmas Light Installation on Long Island | Tinsel Time Long Island";
const DESCRIPTION =
  "Tinsel Time Long Island: professional Christmas light installation in Brookhaven, Riverhead, Southold and Southampton. Roofline lights from $9/ft, installed, and the lights are yours. See your own house lit up, free.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: HOLIDAY_LIGHTS.path },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    type: "website",
    url: HOLIDAY_LIGHTS.path,
    siteName: HOLIDAY_LIGHTS.brand,
    images: [{ url: "/api/holiday-lights/og", width: 1200, height: 630, alt: HOLIDAY_LIGHTS.brand }],
  },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION, images: ["/api/holiday-lights/og"] },
};

const P = HOLIDAY_LIGHTS.pricing;
const $ = (cents: number) => `$${(cents / 100).toLocaleString("en-US", { maximumFractionDigits: 2 })}`;
const RATE = $(P.rooflinePerFtCents);
const MIN = $(P.minimumCents);
const REINSTALL = $(P.reinstallPerFtCents);
const DEPOSIT = $(P.depositCents);
const EXAMPLE_CENTS = 120 * P.rooflinePerFtCents + 2 * P.wreathCents.in24;
const TOWN_LIST = "Brookhaven, Riverhead, Southold and Southampton";

const FAQS = [
  {
    question: "How much does Christmas light installation cost?",
    answer: `Roofline lighting starts at ${RATE} per foot, installed, with an ${MIN} minimum project. Use the cost simulator for a range, or the designer for an exact price. NY sales tax applies.`,
  },
  {
    question: "When should I book?",
    answer: `Installs run Nov 1 – Dec 12, and we take ${HOLIDAY_LIGHTS.capacity} spots this season. Book by Oct 31 to take $100 off. A ${DEPOSIT} deposit holds your week and is credited to your total.`,
  },
  {
    question: "Do I really own the lights?",
    answer: `Yes. You buy commercial-grade LED C9 lights once. Next year you pay installation labor only, about ${REINSTALL}/ft.`,
  },
  {
    question: "What's included?",
    answer: "Design, lights, clips, installation and a final check. Takedown and labeled storage are optional. Our team confirms your final price before install.",
  },
  { question: "What if a bulb goes out?", answer: "We fix outages during the season. Call or text us and we'll get it lit again." },
  { question: "Will you damage my gutters or roof?", answer: "No. We use clips, never nails." },
  {
    question: "How exact is the AI preview?",
    answer: "It's a concept only. Your exact price comes from the designer, and our team verifies everything before install.",
  },
  {
    question: "Do you serve my area?",
    answer: `We serve the towns of ${TOWN_LIST}. Outside those? Join the waitlist and we'll tell you if we expand.`,
  },
];

function pickReviews(data: ReviewsData | null) {
  if (!data) return [];
  return data.reviews.filter((r) => r.rating >= 5 && r.text && r.text.length >= 40 && r.text.length <= 420).slice(0, 3);
}

const Tick = ({ path }: { path: React.ReactNode }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {path}
  </svg>
);

export default async function HolidayLightsPage() {
  const reviewsData = HOLIDAY_LIGHTS.show.easternReviews ? await getGoogleReviews() : null;
  const hasRating = !!reviewsData && reviewsData.totalReviews > 0;
  const rating = hasRating ? reviewsData!.rating.toFixed(1) : null;
  const reviews = pickReviews(reviewsData);
  const earlyBird = isEarlyBirdActive();
  const spots = HOLIDAY_LIGHTS.spotsLeft;
  const showGallery = HOLIDAY_LIGHTS.gallery.length > 0;
  const { license, social } = HOLIDAY_LIGHTS;
  const socialLinks = (
    [
      ["Instagram", social.instagram],
      ["Facebook", social.facebook],
      ["YouTube", social.youtube],
      ["TikTok", social.tiktok],
    ] as const
  ).filter(([, href]) => !!href);

  const links: NavLinkItem[] = [
    { href: "#pricing", label: "Pricing" },
    { href: "#visualizer", label: "AI Visualizer", spark: true },
    { href: "#how", label: "How it works" },
    ...(showGallery ? [{ href: "#gallery", label: "Gallery" }] : []),
    { href: "#area", label: "Service area" },
    { href: "#faq", label: "FAQ" },
  ];

  const spotsText = spots !== null ? `${spots} of ${HOLIDAY_LIGHTS.capacity} install spots left` : `Only ${HOLIDAY_LIGHTS.capacity} install spots this season`;

  const ld = [
    {
      ...serviceSchema({
        name: "Christmas Light Installation",
        serviceType: "Holiday lighting installation",
        description: DESCRIPTION,
        url: `${HOLIDAY_LIGHTS.path}`,
        offers: {
          "@type": "Offer",
          priceCurrency: "USD",
          priceSpecification: {
            "@type": "UnitPriceSpecification",
            price: (P.rooflinePerFtCents / 100).toFixed(2),
            priceCurrency: "USD",
            unitText: "per linear foot, installed",
          },
        },
      }),
      brand: { "@type": "Brand", name: HOLIDAY_LIGHTS.brand },
      areaServed: HOLIDAY_LIGHTS.towns.map((t) => ({
        "@type": "AdministrativeArea",
        name: `Town of ${t}, Suffolk County, NY`,
      })),
    },
    faqSchema(FAQS),
  ];

  return (
    <>
      <JsonLd data={ld} />

      <div className="offer" role="note">
        {earlyBird ? `$100 off when you book by ${HOLIDAY_LIGHTS.earlyBird.label} · ` : ""}
        <span>{spotsText}</span>
      </div>

      <NavMenu links={links} />

      {/* HERO */}
      <section className="hero nv" id="top">
        <div className="hero-bg" id="hero-bg" role="img" aria-label="A home at dusk with warm white C9 lights glowing along the roofline.">
          <HouseSvg night style="warm" par="xMidYMid slice" />
        </div>
        <div className="wrap hero-in">
          <div className="hero-copy">
            <p className="chip">Serving Brookhaven, Riverhead, Southold &amp; Southampton</p>
            <h1>Long Island Christmas lights, professionally installed and yours to keep.</h1>
            <p className="sub">Custom roofline design from a local yard you can drive to. See your own house lit up before you spend a dollar.</p>
            <div className="cta-row">
              <CtaButton act="visualize" className="btn btn-gold">See your house lit up, free</CtaButton>
              <CtaButton act="design" className="btn btn-line">Get my exact price</CtaButton>
            </div>
            <p className="priceline">
              Roofline lights from <b>{RATE}/ft</b>, installed · {MIN} minimum · the lights are yours
            </p>
            <ul className="trust" aria-label="Why homeowners trust us">
              {hasRating && (
                <li>
                  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="m12 2 3 6.5 7 .9-5.2 4.8 1.4 7L12 17.8 5.8 21.2l1.4-7L2 9.4l7-.9z" /></svg>
                  <span>Google {rating} ★ / {reviewsData!.totalReviews} reviews</span>
                </li>
              )}
              <li>
                <Tick path={<><path d="M3 11 12 3l9 8" /><path d="M5 10v10h14V10" /></>} />
                <span>Family-owned yard, Center Moriches</span>
              </li>
              <li>
                <Tick path={<><path d="M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6z" /><path d="m9 12 2 2 4-4" /></>} />
                <span>Licensed &amp; insured</span>
              </li>
              {license ? (
                <li>
                  <Tick path={<><rect x="4" y="3" width="16" height="18" rx="2" /><path d="M8 8h8M8 12h8M8 16h5" /></>} />
                  <span>Lic. # {license}</span>
                </li>
              ) : (
                <li>
                  <Tick path={<><rect x="4" y="3" width="16" height="18" rx="2" /><path d="M8 8h8M8 12h8M8 16h5" /></>} />
                  <span>No credit card fees</span>
                </li>
              )}
            </ul>
          </div>
        </div>
      </section>

      <main>
        {/* PRICING */}
        <section className="sec" id="pricing" aria-labelledby="pr-h">
          <div className="wrap">
            <span className="eyebrow">Starting prices</span>
            <h2 id="pr-h">Honest pricing. No surprises.</h2>
            <p className="lead">We quote by the foot, we say what is included, and our team confirms your final price before install.</p>
            <div className="grid two">
              <article className="card">
                <p className="tagline">Year 1 · Roofline lighting</p>
                <div className="bigp">{RATE}<small>/ft, from</small></div>
                <p>Installed, with commercial-grade LED C9 lights that you own. {MIN} minimum project.</p>
                <ul className="ticks">
                  <li>Custom design for your house</li>
                  <li>Clips only, no nails</li>
                  <li>Installation and a final check by our own crew</li>
                  <li>No credit card fees (NY sales tax applies)</li>
                </ul>
              </article>
              <article className="card">
                <p className="tagline">Year 2 and after · Reinstall</p>
                <div className="bigp">{REINSTALL}<small>/ft, about</small></div>
                <p>You already own the lights, so you pay installation labor only.</p>
                <ul className="ticks">
                  <li>Optional takedown and labeled storage</li>
                  <li>Same design, or a fresh one</li>
                  <li>Reinstall price confirmed at booking</li>
                </ul>
              </article>
            </div>
            <CostEstimator>
              <CtaButton act="design" className="btn btn-gold btn-block">Get my exact price</CtaButton>
              <p className="fine">
                Example: Ranch home, 120 ft roofline + 2 wreaths ≈ {$(EXAMPLE_CENTS)} before tax. The designer price is exact.
              </p>
            </CostEstimator>
          </div>
        </section>

        {/* OWN VS RENT */}
        <section className="sec alt" id="own" aria-labelledby="own-h">
          <div className="wrap">
            <span className="eyebrow">Own, don&apos;t rent</span>
            <h2 id="own-h">Buy the lights once. Pay for labor after that.</h2>
            <p className="lead">Many companies rent you their lights every season. We sell you commercial-grade LED C9 lights, so they stay yours.</p>
            <div className="tblwrap">
              <table className="cmpt">
                <caption className="vh">Owning lights with Tinsel Time compared with a typical rental service</caption>
                <thead>
                  <tr><th scope="col"></th><th scope="col">Tinsel Time</th><th scope="col">Typical rental service</th></tr>
                </thead>
                <tbody>
                  <tr><th scope="row">Who owns the lights</th><td className="us">You do</td><td>The company</td></tr>
                  <tr><th scope="row">Year 1</th><td className="us">From {RATE}/ft installed ({MIN} minimum)</td><td>Rental plus labor</td></tr>
                  <tr><th scope="row">Year 2 and after</th><td className="us">Installation labor only, about {REINSTALL}/ft</td><td>Rental plus labor, again</td></tr>
                  <tr><th scope="row">After Christmas</th><td className="us">Optional takedown and labeled storage</td><td>They take the lights back</td></tr>
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* AI VISUALIZER */}
        <section className="sec nv" id="visualizer" aria-labelledby="viz-h">
          <div className="wrap">
            <span className="eyebrow">AI Visualizer</span>
            <h2 id="viz-h" style={{ color: "#fff" }}>See your own house lit up, before you buy.</h2>
            <p className="lead">Upload one photo of the front of your home, pick a style, and we send you a concept preview. It&apos;s free, and it&apos;s your house, not a stock photo.</p>
            <div className="viz">
              <div>
                <div id="viz-slider">
                  {/* Real output of our visualizer (Classic Warm White) on a sample house photo. */}
                  <CompareSlider
                    label="Day photo and lit-up concept preview"
                    tagRight="Concept preview"
                    ratio="1200 / 670"
                    tagsTop
                    // eslint-disable-next-line @next/next/no-img-element
                    before={<img src="/holiday-lights/demo-before.webp" alt="" width={1200} height={670} loading="lazy" />}
                    // eslint-disable-next-line @next/next/no-img-element
                    after={<img src="/holiday-lights/demo-after.webp" alt="" width={1200} height={670} loading="lazy" />}
                  />
                </div>
                <p className="fine">Concept preview only. Your exact price comes from the designer, and our team verifies everything before install.</p>
              </div>
              <VisualizerCard />
            </div>
          </div>
        </section>

        {/* NUMBERS */}
        <section className="sec" aria-labelledby="num-h">
          <div className="wrap center">
            <span className="eyebrow">By the numbers</span>
            <h2 id="num-h">Why Long Island homeowners choose Tinsel Time.</h2>
            <div className="stats nv" style={{ padding: "30px 18px", borderRadius: "var(--r)" }}>
              <div className="stat"><b>{HOLIDAY_LIGHTS.capacity}</b><span>install spots this season</span></div>
              <div className="stat"><b>{RATE}/ft</b><span>roofline, installed</span></div>
              {hasRating ? (
                <div className="stat"><b>{rating} ★</b><span>Google rating, {reviewsData!.totalReviews} reviews</span></div>
              ) : (
                <div className="stat"><b>$0</b><span>credit card fees</span></div>
              )}
              <div className="stat"><b>{HOLIDAY_LIGHTS.towns.length}</b><span>towns, no travel surcharge</span></div>
            </div>
          </div>
        </section>

        {/* VIDEO STORIES — hidden until real videos exist */}
        {HOLIDAY_LIGHTS.videos.length > 0 && (
          <section className="sec alt" aria-labelledby="vid-h">
            <div className="wrap">
              <span className="eyebrow">Video stories</span>
              <h2 id="vid-h">Hear it from our neighbors.</h2>
              <p className="lead">Real homeowners, real Long Island houses.</p>
              <div className="vids">
                {HOLIDAY_LIGHTS.videos.map((v) => (
                  <figure className="vid" style={{ margin: 0 }} key={v.src}>
                    <video src={v.src} poster={v.poster} controls preload="none" playsInline style={{ display: "block", width: "100%", aspectRatio: "16/9" }} />
                    <p>{v.caption}</p>
                  </figure>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* SERVICES */}
        <section className="sec" aria-labelledby="svc-h">
          <div className="wrap">
            <span className="eyebrow">Our signature services</span>
            <h2 id="svc-h">Beautifully installed, start to finish.</h2>
            <p className="lead">Pick the look. We design it, install it, check it, and take it down.</p>
            <div className="grid three">
              <article className="card svc">
                <div className="img" id="svc1" role="img" aria-label="House with warm white roofline lights"><HouseSvg night style="warm" /></div>
                <div className="body">
                  <span className="badge">Most popular</span>
                  <h3>Roofline Lighting</h3>
                  <div className="from">From {RATE}/ft</div>
                  <p>Commercial-grade LED C9 lights along your roofline and eaves, custom-cut to your house. Clips only, no nails.</p>
                  <CtaButton act="design" className="btn btn-gold">Get my exact price</CtaButton>
                </div>
              </article>
              <article className="card svc">
                <div className="img" id="svc2" role="img" aria-label="House with elegant white lights and wreaths"><HouseSvg night style="elegant" /></div>
                <div className="body">
                  <h3>Wreaths, Bushes &amp; Trees</h3>
                  <div className="from">From {$(P.bushWrapCents.s)}</div>
                  <p>Finish the look with lit wreaths, wrapped bushes and trees. Add them in the designer and see the price update.</p>
                  <CtaButton act="design" className="btn btn-out">Design it</CtaButton>
                </div>
              </article>
              <article className="card svc">
                <div className="img" id="svc3" role="img" aria-label="House in daylight after takedown"><HouseSvg /></div>
                <div className="body">
                  <h3>Takedown &amp; Labeled Storage</h3>
                  <div className="from">{$(P.takedownPerFtCents)}/ft</div>
                  <p>Optional. We take everything down after the holidays and store it, labeled, so next year is just labor.</p>
                  <CtaButton act="design" className="btn btn-out">Add it to my quote</CtaButton>
                </div>
              </article>
            </div>
          </div>
        </section>

        {/* WHY */}
        <section className="sec alt" aria-labelledby="why-h">
          <div className="wrap">
            <span className="eyebrow">Why Long Island chooses us</span>
            <h2 id="why-h">The easy way to a house everyone slows down for.</h2>
            <div className="why">
              <div className="card"><h3>Custom design</h3><p>Planned around your roofline, not a template.</p></div>
              <div className="card"><h3>You own the lights</h3><p>Pay labor only from year two.</p></div>
              <div className="card"><h3>See it first</h3><p>A free AI preview of your own home.</p></div>
              <div className="card"><h3>A local yard</h3><p>We&apos;re in Center Moriches. Drive over any time.</p></div>
              <div className="card"><h3>Our own crew</h3><p>W-2 employees, licensed and insured.</p></div>
              <div className="card"><h3>Outage fixes</h3><p>We fix outages in season.</p></div>
              <div className="card"><h3>Takedown &amp; storage</h3><p>Optional, labeled, and ready for next year.</p></div>
              <div className="card"><h3>Gentle on your home</h3><p>We use clips, never nails.</p></div>
            </div>
          </div>
        </section>

        {/* PROCESS */}
        <section className="sec nv" id="how" aria-labelledby="how-h">
          <div className="wrap">
            <span className="eyebrow">Our process</span>
            <h2 id="how-h" style={{ color: "#fff" }}>From photo to glowing in four steps.</h2>
            <ol className="proc">
              <li><span className="n">01</span><div><h3>See it</h3><p>Upload a photo. We show your house lit up, free.</p></div></li>
              <li><span className="n">02</span><div><h3>Design &amp; price it</h3><p>Use the online designer for an instant, exact price.</p></div></li>
              <li><span className="n">03</span><div><h3>Reserve your week</h3><p>Pick an install week with a {DEPOSIT} deposit, credited to your job.</p></div></li>
              <li><span className="n">04</span><div><h3>We install and care for it</h3><p>Install, final check, optional takedown and storage.</p></div></li>
            </ol>
            <p style={{ marginTop: 26 }}>
              <CtaButton act="reserve" className="btn btn-gold">Reserve my install week ({DEPOSIT})</CtaButton>
            </p>
          </div>
        </section>

        {/* REVIEWS — Eastern LM's Google reviews (same family, same crew) */}
        {reviews.length > 0 && (
          <section className="sec" aria-labelledby="rev-h">
            <div className="wrap">
              <span className="eyebrow">Real client love</span>
              <h2 id="rev-h">What neighbors say.</h2>
              <p className="lead">
                Google {rating} ★ / {reviewsData!.totalReviews} reviews for our yard, Eastern Landscape &amp; Mason Supply.
              </p>
              <div className="grid three">
                {reviews.map((r) => (
                  <article className="card rev" key={`${r.author_name}-${r.time ?? ""}`}>
                    <span className="st" aria-label={`${r.rating} out of 5 stars`}>{"★".repeat(Math.round(r.rating))}</span>
                    <p>{r.text}</p>
                    <footer>{r.author_name}</footer>
                  </article>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* GALLERY — hidden until real install photos exist */}
        {showGallery && (
          <section className="sec alt" id="gallery" aria-labelledby="gal-h">
            <div className="wrap">
              <span className="eyebrow">Recent work</span>
              <h2 id="gal-h">A peek at our installs.</h2>
              <p className="lead">Drag each slider to see the transformation.</p>
              <div className="gal" id="gal">
                {HOLIDAY_LIGHTS.gallery.map((g) => (
                  <div key={g.after}>
                    <CompareSlider
                      label={g.label}
                      caption={g.caption}
                      // eslint-disable-next-line @next/next/no-img-element
                      before={<img src={g.before} alt="" loading="lazy" />}
                      // eslint-disable-next-line @next/next/no-img-element
                      after={<img src={g.after} alt="" loading="lazy" />}
                    />
                  </div>
                ))}
              </div>
              <p style={{ marginTop: 26 }}>
                <CtaButton act="visualize" className="btn btn-out">See your house lit up, free</CtaButton>
              </p>
            </div>
          </section>
        )}

        {/* AREA */}
        <section className="sec" id="area" aria-labelledby="area-h">
          <div className="wrap area">
            <div>
              <span className="eyebrow">Service area</span>
              <h2 id="area-h">Serving Brookhaven, Riverhead, Southold and Southampton.</h2>
              <ul className="towns" id="towns" aria-label="Towns we serve">
                {HOLIDAY_LIGHTS.towns.map((t) => <li key={t}>{t}</li>)}
              </ul>
              <WaitlistForm />
            </div>
            <div className="map" id="map" role="img" aria-label="Map of the Brookhaven, Riverhead, Southold and Southampton service area">
              <svg viewBox="0 0 400 300" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                <rect width="400" height="300" fill="var(--surface)" />
                <path d="M40 190 Q120 150 200 170 T360 130" fill="none" style={{ stroke: "var(--acc)" }} strokeWidth="3" strokeDasharray="8 6" />
                <g fontFamily="var(--sans)" fontWeight="600" fontSize="15" style={{ fill: "var(--ink)" }} textAnchor="middle">
                  <text x="95" y="215">Brookhaven</text>
                  <text x="215" y="150">Riverhead</text>
                  <text x="305" y="95">Southold</text>
                  <text x="250" y="225">Southampton</text>
                </g>
              </svg>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="sec alt" id="faq" aria-labelledby="faq-h">
          <div className="wrap center">
            <span className="eyebrow">Frequently asked</span>
            <h2 id="faq-h">Questions, answered.</h2>
            <div className="faq">
              {FAQS.map((f) => (
                <details key={f.question}>
                  <summary>{f.question}</summary>
                  <div className="a"><p>{f.answer}</p></div>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* FINAL */}
        <section className="sec nv center final" aria-labelledby="fin-h">
          <div className="wrap">
            <span className="eyebrow">Booking the {HOLIDAY_LIGHTS.season} holiday season</span>
            <h2 id="fin-h">Let&apos;s make your house unforgettable this year.</h2>
            <p className="lead">
              Only {HOLIDAY_LIGHTS.capacity} install spots.
              {spots !== null && <> <b style={{ color: "#fff" }}>{spots} of {HOLIDAY_LIGHTS.capacity} left.</b></>}
              {earlyBird && " Book by October 31 and take $100 off."}
            </p>
            <div className="acts">
              <CtaButton act="visualize" className="btn btn-gold">See your house lit up, free</CtaButton>
              <CtaButton act="design" className="btn btn-line">Get my exact price</CtaButton>
              <CtaButton act="reserve" className="btn btn-line">Reserve my install week ({DEPOSIT})</CtaButton>
            </div>
          </div>
        </section>
      </main>

      <footer className="site">
        <div className="wrap">
          <div className="cols">
            <div>
              <h4 className="fbrand">{HOLIDAY_LIGHTS.brand}</h4>
              <p>
                Family-owned Christmas light installation for {TOWN_LIST}. Operated by {HOLIDAY_LIGHTS.operator}, 110 Frowein Road, Center Moriches, NY 11934.
              </p>
              <p>
                Phone: <a href={`tel:${HOLIDAY_LIGHTS.phoneTel}`}>{HOLIDAY_LIGHTS.phoneDisplay}</a>
                <br />
                Email: <a href={`mailto:${HOLIDAY_LIGHTS.email}`}>{HOLIDAY_LIGHTS.email}</a>
                <br />
                Hours: {HOLIDAY_LIGHTS.hours}
              </p>
            </div>
            <div>
              <h4>Services</h4>
              <ul>
                <li><a href="#pricing">Roofline lighting</a></li>
                <li><a href="#pricing">Wreaths, bushes &amp; trees</a></li>
                <li><a href="#pricing">Takedown &amp; storage</a></li>
                <li><a href="#visualizer">AI Visualizer</a></li>
              </ul>
            </div>
            <div>
              <h4>Company</h4>
              <ul>
                {showGallery && <li><a href="#gallery">Gallery</a></li>}
                <li><a href="#faq">FAQ</a></li>
                <li><a href="#pricing">Pricing</a></li>
                <li><a href="#area">Service area</a></li>
              </ul>
            </div>
            {socialLinks.length > 0 ? (
              <div>
                <h4>Follow us</h4>
                <ul>
                  {socialLinks.map(([label, href]) => (
                    <li key={label}><a href={href!} rel="noopener" target="_blank">{label}</a></li>
                  ))}
                </ul>
              </div>
            ) : (
              <div>
                <h4>Visit the yard</h4>
                <ul>
                  <li><a href="https://maps.google.com/?q=110+Frowein+Road,+Center+Moriches,+NY+11934" rel="noopener" target="_blank">110 Frowein Rd, Center Moriches</a></li>
                  <li><Link href="/">Eastern Landscape &amp; Mason Supply</Link></li>
                </ul>
              </div>
            )}
          </div>
          <p className="legal">
            © {HOLIDAY_LIGHTS.season} {HOLIDAY_LIGHTS.brand}. Licensed &amp; insured.{license ? ` Lic. # ${license}.` : ""} NY sales tax applies.{" "}
            <a href="/privacy-policy">Privacy</a> · <a href="/terms">Terms</a>
          </p>
        </div>
      </footer>

      <nav className="bar" aria-label="Quick actions">
        <CtaButton act="visualize" className="btn btn-gold">See your house lit up, free</CtaButton>
        <CtaButton act="call" className="ibtn" aria-label={`Call ${HOLIDAY_LIGHTS.phoneDisplay}`}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2z" />
          </svg>
        </CtaButton>
        <CtaButton act="text" className="ibtn" aria-label={`Text ${HOLIDAY_LIGHTS.phoneDisplay}`}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M21 12a8 8 0 0 1-11.8 7L3 21l2-5.4A8 8 0 1 1 21 12z" />
          </svg>
        </CtaButton>
      </nav>

      <ReserveDialog />
    </>
  );
}
