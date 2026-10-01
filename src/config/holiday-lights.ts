import { siteConfig } from "@/config/site";

/**
 * Tinsel Time Long Island — seasonal holiday-lighting brand operated by Eastern LM.
 *
 * Single source of truth for the landing page copy values, rate card defaults and
 * feature flags. Anything left `null` is hidden on the page (we never ship
 * bracketed placeholder text). Pricing is in cents, per project convention.
 */

export const TOWNS = ["Brookhaven", "Riverhead", "Southold", "Southampton"] as const;
export type HolidayTown = (typeof TOWNS)[number];

export const HOLIDAY_LIGHTS = {
  brand: "Tinsel Time Long Island",
  shortBrand: "Tinsel Time",
  operator: "Eastern Landscape & Mason Supply",
  path: "/holiday-lights",

  // Contact — no dedicated Tinsel Time line yet, so these fall back to the yard.
  phoneDisplay: siteConfig.phoneDisplay,
  phoneTel: siteConfig.telephone,
  phoneSms: siteConfig.telephone,
  email: siteConfig.email,
  hours: siteConfig.hours.join(" · "),
  /** Suffolk home-improvement license # (Suffolk Code §563). Shown on the page once set. */
  license: null as string | null,
  social: {
    instagram: null as string | null,
    facebook: null as string | null,
    youtube: null as string | null,
    tiktok: null as string | null,
  },

  towns: TOWNS,

  // Season + capacity
  season: 2026,
  capacity: 75,
  /** Spots left. `null` until holiday_install_weeks exists — the page then says "75 spots this season". */
  spotsLeft: null as number | null,
  installWeeks: [
    "Nov 1 – Nov 7",
    "Nov 8 – Nov 14",
    "Nov 15 – Nov 21",
    "Nov 22 – Nov 28",
    "Nov 29 – Dec 5",
    "Dec 6 – Dec 12",
  ],

  // Rate card defaults (admin-editable copy moves to site_settings.holiday_lights_pricing later)
  pricing: {
    rooflinePerFtCents: 900,
    secondStoryUpliftPct: 20,
    takedownPerFtCents: 300,
    reinstallPerFtCents: 350,
    bushWrapCents: { s: 4500, m: 7500, l: 12000 },
    wreathCents: { in24: 9500, in36: 16500, in48: 24500 },
    minimumCents: 89900,
    depositCents: 19900,
    taxRate: 0.0875,
  },
  earlyBird: {
    amountCents: 10000,
    deadline: "2026-10-31T23:59:59-04:00",
    label: "Oct 31",
  },

  /** Typical roofline lengths (ft) per home style for the cost simulator. Confirm against install data. */
  homes: {
    ranch: { label: "Ranch", short: "Ranch", ft: [100, 150] },
    colonial: { label: "Colonial", short: "Colonial", ft: [140, 200] },
    cape: { label: "Cape", short: "Cape", ft: [110, 160] },
    split: { label: "Split-level", short: "Split", ft: [130, 190] },
  },

  /** Online designer (Slice 3). Until it exists, "Get my exact price" goes to the quote form. */
  designerUrl: null as string | null,
  quoteUrl: "/holiday-lights/quote",

  // Content flags — sections stay hidden until real content exists.
  show: {
    /** Eastern LM's Google rating + reviews (same family/crew). Set false to keep brands separate. */
    easternReviews: true,
  },
  /** Video stories (public URLs). Section is hidden while empty. */
  videos: [] as { src: string; poster?: string; caption: string }[],
  /** Gallery before/after photos (public URLs). Section is hidden while empty. */
  gallery: [] as { before: string; after: string; label: string; caption: string }[],
} as const;

export type HomeStyle = keyof typeof HOLIDAY_LIGHTS.homes;

/** Shown next to the consent checkbox AND stored verbatim in sms_consent_log. */
export const SMS_CONSENT_TEXT =
  "I agree to receive texts about my design. Msg & data rates may apply. Reply STOP to opt out.";

export function isEarlyBirdActive(now: Date = new Date()): boolean {
  return now.getTime() <= new Date(HOLIDAY_LIGHTS.earlyBird.deadline).getTime();
}

export function getDesignUrl(): string {
  return HOLIDAY_LIGHTS.designerUrl ?? HOLIDAY_LIGHTS.quoteUrl;
}

/**
 * Absolute origin for links that leave the site (SMS, email, OG).
 * HOLIDAY_SITE_URL overrides NEXT_PUBLIC_SITE_URL for Tinsel Time only (staging and
 * prod share one env file, and the vanity domain comes later).
 */
export function getSiteOrigin(): string {
  const raw = (process.env.HOLIDAY_SITE_URL || process.env.NEXT_PUBLIC_SITE_URL)?.trim();
  if (!raw) return siteConfig.url;
  try {
    return new URL(raw).origin;
  } catch {
    try {
      return new URL(`https://${raw}`).origin;
    } catch {
      return siteConfig.url;
    }
  }
}
