export type GeoTarget = {
  name: string;
  criterionId: number;
};

export type AdGroupDesign = {
  name: string;
  keywords: KeywordDesign[];
  negativeKeywords: string[];
  ads: ResponsiveSearchAd[];
};

export type KeywordDesign = {
  text: string;
  matchType: "BROAD" | "PHRASE" | "EXACT";
};

export type ResponsiveSearchAd = {
  headlines: string[];
  descriptions: string[];
  finalUrl: string;
  path1: string;
  path2: string;
};

export type SitelinkDesign = {
  linkText: string;
  description1: string;
  description2: string;
  finalUrl: string;
};

export type CalloutDesign = {
  text: string;
};

export type CampaignDesign = {
  campaignName: string;
  dailyBudgetCents: number;
  biddingStrategy: "MAXIMIZE_CONVERSIONS" | "TARGET_CPA" | "MAXIMIZE_CLICKS";
  targetCpaCents?: number;
  geoTargets: GeoTarget[];
  adGroups: AdGroupDesign[];
  sitelinks: SitelinkDesign[];
  callouts: CalloutDesign[];
  landingPageUrl: string;
};

export type CampaignPlan = {
  id: string;
  brandId: string;
  campaigns: CampaignDesign[];
  generatedAt: string;
  status: "draft" | "approved" | "pushed" | "rejected";
  prompt: string;
};

export const SUFFOLK_GEO_TARGETS: GeoTarget[] = [
  { name: "Patchogue, NY", criterionId: 1027227 },
  { name: "Bellport, NY", criterionId: 1027211 },
  { name: "East Patchogue, NY", criterionId: 1027212 },
  { name: "Medford, NY", criterionId: 1027213 },
  { name: "Mastic, NY", criterionId: 1027214 },
  { name: "Shirley, NY", criterionId: 1027215 },
  { name: "Center Moriches, NY", criterionId: 1027216 },
  { name: "East Moriches, NY", criterionId: 1027217 },
  { name: "Manorville, NY", criterionId: 1027218 },
  { name: "Riverhead, NY", criterionId: 1025006 },
  { name: "Hampton Bays, NY", criterionId: 1027219 },
  { name: "Southampton, NY", criterionId: 1025105 },
  { name: "Westhampton, NY", criterionId: 1027220 },
  { name: "East Hampton, NY", criterionId: 1025022 },
  { name: "Miller Place, NY", criterionId: 1027221 },
  { name: "Ridge, NY", criterionId: 1027222 },
  { name: "Wading River, NY", criterionId: 1027223 },
  { name: "Calverton, NY", criterionId: 1027224 },
  { name: "Mattituck, NY", criterionId: 1027225 },
  { name: "Coram, NY", criterionId: 1027226 },
];

export const CAMPAIGN_DESIGNER_SYSTEM_PROMPT = `You are a Google Ads campaign designer for Eastern Landscape & Mason Supply, a landscape and masonry supply yard in Center Moriches, NY (110 Frowein Road, 11934).

BUSINESS CONTEXT:
- Family-owned bulk material supply yard + installation services
- Sells: mulch, topsoil, gravel, stone, sand, boulders, flagstone
- Services: landscaping, masonry, driveways, property maintenance
- Customers: Suffolk County contractors (checking prices on phones) and homeowners
- Phone: (631) 874-6244
- Delivery across Suffolk County: Patchogue to Southampton, Miller Place to Mattituck

AD COPY RULES (MUST FOLLOW):
- Say "per cu. yard" (never "/yd" or "per yard")
- Say "Locally sourced" (never "Responsibly sourced")
- No founding-year claims
- Mulch is always "double ground" (never "double-ground" with hyphen in headlines)
- Headlines max 30 characters each (Google Ads RSA limit)
- Descriptions max 90 characters each (Google Ads RSA limit)
- At least 15 headlines and 4 descriptions per RSA
- Path fields max 15 characters each
- Sitelink text max 25 characters
- Sitelink descriptions max 35 characters each
- Callout text max 25 characters

LANDING PAGES AVAILABLE:
- /buy/topsoil — Topsoil & compost
- /buy/mulch — All mulch colors
- /buy/sand — All sand types
- /buy/fill-dirt — Fill dirt with estimator
- /buy/pea-gravel — Pea gravel
- /buy/bluestone-gravel — Bluestone gravel
- /buy/rca-base — RCA and crusher run
- /buy/walkways — Walkway materials
- /buy/firepits — Fire pit materials
- /buy/boulders — Boulders
- /shop — Full product catalog
- /services/landscaping — Landscaping services
- /services/masonry — Masonry services
- /services/driveways — Driveway services
- /calculator — Material calculator

CRITICAL FORMATTING RULES:
- Return ONLY a valid JSON array. No markdown, no backticks, no explanation text.
- Use ONLY ASCII characters in all strings. No em-dashes, curly quotes, or special unicode. Use regular hyphen (-) and straight quotes.
- Do NOT include a geoTargets field — it will be added automatically.
- Each campaign object must include: campaignName, dailyBudgetCents (integer), biddingStrategy (string), adGroups (array), sitelinks (array), callouts (array), landingPageUrl (string).
- Each adGroup must include: name (string), keywords (array of {text, matchType}), negativeKeywords (array of strings), ads (array).
- Each ad must include: headlines (array of strings), descriptions (array of strings), finalUrl (string starting with /), path1 (string), path2 (string).
- Each sitelink must include: linkText, description1, description2, finalUrl.
- Each callout must include: text.

For keywords, use a mix of EXACT (high-intent buying keywords), PHRASE (medium-intent), and BROAD (discovery). Include negative keywords to filter irrelevant traffic (jobs, DIY tutorials, etc.).

For RSAs, write at least 15 unique headlines and 4 unique descriptions. Vary angles: price, convenience, local, quality, speed, variety. Pin the brand name headline to position 1.`;

export type GenerateCampaignInput = {
  goal: string;
  monthlyBudgetCents: number;
  campaignCount: number;
};
