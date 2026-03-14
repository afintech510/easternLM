/**
 * Generate product × town programmatic SEO pages
 *
 * Creates 150 pages (6 product groups × 25 towns) with unique content.
 *
 * Usage: npx tsx scripts/generate-product-town-pages.ts
 *        npx tsx scripts/generate-product-town-pages.ts --dry-run
 */

import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import { resolve } from "path";

config({ path: resolve(__dirname, "..", ".env.local") });

const DRY_RUN = process.argv.includes("--dry-run");

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(url, key, { auth: { persistSession: false } });
}

// ─── Product Groups ──────────────────────────────────────────────

type ProductGroup = {
  key: string;
  label: string;
  shortLabel: string;
  productSlugs: string[];
  calculatorType: string;
  relatedService: string;
  priceHint: string;
  commonUsesBase: string[];
};

const PRODUCT_GROUPS: ProductGroup[] = [
  {
    key: "mulch",
    label: "Mulch",
    shortLabel: "mulch",
    productSlugs: ["dark-natural-mulch", "black-mulch", "chocolate-mulch", "red-mulch"],
    calculatorType: "mulch",
    relatedService: "landscaping",
    priceHint: "From $20/yd",
    commonUsesBase: ["Garden bed refresh", "Tree ring mulching", "Weed suppression", "Foundation plantings", "Walkway borders", "Playground surfacing"],
  },
  {
    key: "topsoil",
    label: "Topsoil & Compost",
    shortLabel: "topsoil",
    productSlugs: ["topsoil-screened-organic", "compost-certified-organic-rich-in-nutrients"],
    calculatorType: "topsoil",
    relatedService: "landscaping",
    priceHint: "From $24/yd",
    commonUsesBase: ["Lawn installation", "Garden beds", "Grading and leveling", "Raised bed fill", "Sod preparation", "Bare spot repair"],
  },
  {
    key: "gravel",
    label: "Gravel & Stone",
    shortLabel: "gravel",
    productSlugs: ["34-inch-wash-gravel", "38-inch-pea-gravel", "34-inch-bluestone", "38-inch-bluestone", "bluestone-screenings-stone-dust-fines"],
    calculatorType: "gravel",
    relatedService: "driveways",
    priceHint: "From $75/yd",
    commonUsesBase: ["Driveway surfacing", "French drains", "Walkway base", "Patio sub-base", "Drainage beds", "Parking areas"],
  },
  {
    key: "sand",
    label: "Sand",
    shortLabel: "sand",
    productSlugs: ["fine-sand", "state-concrete-sand"],
    calculatorType: "sand",
    relatedService: "masonry",
    priceHint: "From $60/yd",
    commonUsesBase: ["Paver bedding", "Mortar mixing", "Pool base", "Concrete work", "Sandbox fill", "Leveling"],
  },
  {
    key: "rca-fill",
    label: "RCA & Fill",
    shortLabel: "RCA and fill",
    productSlugs: ["state-grade-rca-95-concrete-made-to-spec-not-certified", "regular-rca-blend-of-concrete-brick-and-blacktop", "clean-fill-exc-dirt-unscreened", "bank-run-sandy-fill-w-gravel-varying-in-size"],
    calculatorType: "fill",
    relatedService: "driveways",
    priceHint: "From $15/yd",
    commonUsesBase: ["Driveway base", "Backfill", "Grade raising", "Construction pad", "Pothole repair", "Access road"],
  },
  {
    key: "decorative-stone",
    label: "Decorative Stone",
    shortLabel: "decorative stone",
    productSlugs: ["34-inch-whitestone", "12-inch-whitestone", "34-inch-burgundy-red-stone", "large-pocono-river-rock-1-12-inch-2-12-inch-2", "small-pocono-river-rock-58-inch-1-inch-1"],
    calculatorType: "gravel",
    relatedService: "landscaping",
    priceHint: "From $105/yd",
    commonUsesBase: ["Garden borders", "Dry creek beds", "Pool surrounds", "Rock gardens", "Decorative accents", "Water features"],
  },
];

// ─── Town Context ────────────────────────────────────────────────

type TownInfo = {
  slug: string;
  name: string;
  deliveryFeeCents: number;
  driveMiles: number;
  driveMinutes: number;
};

type TownContext = {
  character: string;
  soilNote: string;
  commonProjects: string;
};

const TOWN_CONTEXTS: Record<string, TownContext> = {
  "center-moriches": { character: "close to our yard", soilNote: "Sandy loam soil typical of the south shore drains fast", commonProjects: "bed refresh, lawn repair, driveway maintenance" },
  "east-moriches": { character: "our core delivery zone", soilNote: "Low-lying areas near the bay need good drainage", commonProjects: "drainage projects, garden beds, foundation plantings" },
  "moriches": { character: "short drive from the yard", soilNote: "Mix of sandy and clay pockets depending on elevation", commonProjects: "driveway resurfacing, bed mulching, grading" },
  "eastport": { character: "quiet residential area east of us", soilNote: "Generally sandy soil with good drainage", commonProjects: "large-lot landscaping, garden bed installs" },
  "manorville": { character: "large lots and long driveways", soilNote: "Sandy pine barrens soil drains quickly — topsoil helps retention", commonProjects: "long driveway installs, horse property work, large clearing projects" },
  "shirley": { character: "dense residential neighborhoods", soilNote: "Mature oak canopy means acidic leaf litter — fresh mulch helps", commonProjects: "garden bed refresh, tree rings, walkway borders" },
  "mastic": { character: "budget-conscious homeowners", soilNote: "Sandy flat terrain, straightforward delivery access", commonProjects: "RCA driveways, fill for low spots, basic landscaping" },
  "mastic-beach": { character: "waterfront and near-water properties", soilNote: "Sandy soil near the bay, salt air can stress plantings", commonProjects: "drainage correction, mulch beds, erosion control" },
  "brookhaven": { character: "mix of rural lots and village center", soilNote: "Variable terrain — check grade before ordering fill", commonProjects: "driveway maintenance, garden beds, retaining walls" },
  "patchogue": { character: "village center with smaller lots", soilNote: "Established neighborhoods with mature landscaping", commonProjects: "mulch refresh, patio base, small driveway repairs" },
  "bellport": { character: "historic village with waterfront homes", soilNote: "Elevation varies — waterfront lots may need drainage stone", commonProjects: "period-appropriate stone paths, garden beds" },
  "east-patchogue": { character: "suburban residential", soilNote: "Flat terrain with standard south shore drainage", commonProjects: "lawn installs, bed mulching, driveway resurfacing" },
  "medford": { character: "suburban residential and commercial mix", soilNote: "Standard Long Island sandy loam", commonProjects: "driveway base work, commercial landscaping, parking areas" },
  "yaphank": { character: "rural and agricultural", soilNote: "Sandy soil, some wetland areas to the south", commonProjects: "property clearing, grading, access roads" },
  "ridge": { character: "wooded residential lots", soilNote: "Pine barrens soil — sandy, acidic, drains fast", commonProjects: "driveway installs, clearing debris, garden beds" },
  "wading-river": { character: "North Shore residential", soilNote: "Hilly terrain with clay pockets — check drainage needs", commonProjects: "retaining walls, driveway grading, terracing" },
  "riverhead": { character: "farms, wineries, and commercial", soilNote: "Agricultural soil — often needs amendment for landscaping", commonProjects: "commercial properties, farm access roads, vineyard paths" },
  "hampton-bays": { character: "mix of residential and beach properties", soilNote: "Sandy near the water, better soil inland", commonProjects: "patio work, driveway upgrades, pool surrounds" },
  "east-hampton": { character: "high-end estates and luxury properties", soilNote: "Well-maintained properties expect premium materials", commonProjects: "estate landscaping, decorative stone, premium driveways" },
  "southampton": { character: "upscale village with historic homes", soilNote: "Established gardens need regular mulch and soil amendment", commonProjects: "estate maintenance, patio installs, decorative borders" },
  "quogue": { character: "quiet beach community", soilNote: "Sandy soil, salt exposure — choose salt-tolerant plantings", commonProjects: "beach property landscaping, drainage, driveway work" },
  "westhampton": { character: "residential with waterfront access", soilNote: "South shore sandy soil, drainage usually straightforward", commonProjects: "property upgrades, mulch beds, paver patios" },
  "calverton": { character: "rural with large properties", soilNote: "Agricultural land — soil quality varies by parcel", commonProjects: "farm roads, clearing fill, large-scale grading" },
  "coram": { character: "suburban residential", soilNote: "Standard Long Island sandy loam, flat terrain", commonProjects: "mulch refresh, driveway maintenance, lawn repair" },
  "selden": { character: "suburban residential near 25A", soilNote: "Flat suburban lots with typical south shore drainage", commonProjects: "garden beds, driveway resurfacing, backyard patios" },
  "remsenburg": { character: "quiet hamlet close to our yard", soilNote: "Sandy south shore soil with good natural drainage", commonProjects: "garden beds, estate landscaping, decorative borders" },
  "speonk": { character: "one of our closest delivery zones", soilNote: "Flat sandy terrain, easy access for our trucks", commonProjects: "bed mulching, driveway maintenance, fill work" },
  "westhampton-beach": { character: "upscale beach village", soilNote: "Sandy soil near the ocean — salt-tolerant plantings preferred", commonProjects: "estate driveways, decorative stone, premium landscaping" },
  "east-quogue": { character: "beach community between Quogue and Hampton Bays", soilNote: "Sandy soil, some areas prone to flooding after storms", commonProjects: "driveway resurfacing, drainage work, beach property landscaping" },
  "middle-island": { character: "wooded pine barrens community", soilNote: "Sandy acidic soil from the pine barrens — needs amendment for lawns", commonProjects: "clearing and grading, driveway installs, garden beds" },
  "sound-beach": { character: "North Shore waterfront community", soilNote: "Hilly terrain with clay subsoil — drainage is critical", commonProjects: "retaining walls, drainage stone, erosion control" },
  "rocky-point": { character: "hilly North Shore residential", soilNote: "Sloped lots with rock outcrops — grading work common", commonProjects: "retaining walls, terraced landscaping, driveway grading" },
  "flanders": { character: "rural Peconic River area", soilNote: "Agricultural soil transitioning from sandy to loam", commonProjects: "farm roads, large-lot grading, residential landscaping" },
  "centereach": { character: "central Suffolk suburban", soilNote: "Standard Long Island sandy loam, flat terrain", commonProjects: "mulch refresh, lawn repair, driveway maintenance" },
  "sayville": { character: "Great South Bay waterfront village", soilNote: "Low elevation near water — drainage materials needed", commonProjects: "garden maintenance, drainage stone, walkway borders" },
  "oakdale": { character: "Connetquot River waterfront", soilNote: "Low-lying areas near the river need drainage attention", commonProjects: "waterfront landscaping, drainage, garden beds" },
  "bohemia": { character: "suburban residential", soilNote: "Standard sandy loam, flat lots with easy truck access", commonProjects: "mulch beds, driveway repairs, backyard patios" },
  "bay-shore": { character: "south shore village and ferry hub", soilNote: "Near the bay — sandy soil with some clay pockets", commonProjects: "commercial landscaping, residential beds, driveway work" },
  "holbrook": { character: "accessible suburb near major highways", soilNote: "Flat terrain between LIE and Sunrise, easy delivery", commonProjects: "driveway resurfacing, mulch beds, lawn installs" },
  "holtsville": { character: "quiet residential area", soilNote: "Standard suburban lots with typical drainage", commonProjects: "garden beds, driveway maintenance, topsoil for lawns" },
  "ronkonkoma": { character: "lakeside community", soilNote: "Sandy soil near the lake, standard suburban elsewhere", commonProjects: "landscaping, driveway repairs, commercial properties" },
  "farmingville": { character: "suburban residential", soilNote: "Flat terrain with standard Long Island soil", commonProjects: "mulch refresh, lawn repair, backyard projects" },
  "blue-point": { character: "compact bay-side village", soilNote: "Low elevation near Great South Bay — watch drainage", commonProjects: "garden beds, drainage improvement, walkway stone" },
  "stony-brook": { character: "university town with hilly terrain", soilNote: "North Shore hills with clay subsoil in spots", commonProjects: "retaining walls, grading, terraced landscaping" },
  "mount-sinai": { character: "wooded North Shore community", soilNote: "Sloped terrain with rocky subsoil — grading needed", commonProjects: "retaining walls, drainage stone, driveway grading" },
  "smithtown": { character: "established western Suffolk town", soilNote: "Mature properties with established landscapes needing refresh", commonProjects: "mulch refresh, patio base work, lawn renovation" },
  "hauppauge": { character: "residential and commercial mix", soilNote: "Flat terrain, commercial parks have large paving needs", commonProjects: "commercial landscaping, parking areas, residential beds" },
  "sag-harbor": { character: "historic whaling village", soilNote: "Village lots are compact — smaller orders, premium materials", commonProjects: "period-appropriate stone, garden restoration, walkways" },
  "bridgehampton": { character: "Hamptons estate country", soilNote: "Large properties expect premium materials and reliable scheduling", commonProjects: "estate driveways, decorative stone, large mulch orders" },
  "montauk": { character: "easternmost point — beach and wind exposure", soilNote: "Sandy coastal soil, salt spray, wind exposure — tough on plantings", commonProjects: "erosion control, wind-break landscaping, beach property hardscaping" },
  "amagansett": { character: "luxury beach community", soilNote: "Sandy soil with ocean influence — premium materials expected", commonProjects: "estate landscaping, decorative stone, driveway resurfacing" },
  "east-setauket": { character: "North Shore near Stony Brook", soilNote: "Hilly terrain with established residential lots", commonProjects: "retaining walls, garden beds, driveway grading" },
  "port-jefferson": { character: "harbor village with steep terrain", soilNote: "Steep grades near the harbor — retaining walls and drainage critical", commonProjects: "retaining walls, drainage stone, terraced gardens" },
  "miller-place": { character: "wooded North Shore residential", soilNote: "Wooded lots with standard north shore clay/sand mix", commonProjects: "garden beds, driveway work, woodland landscaping" },
  "shoreham": { character: "small North Shore village", soilNote: "Residential lots with standard north shore terrain", commonProjects: "garden maintenance, driveway repairs, small landscaping" },
  "mattituck": { character: "North Fork farm and vineyard town", soilNote: "Rich agricultural soil — great for gardens, less great for drainage", commonProjects: "vineyard paths, farm access roads, garden installs" },
  "greenport": { character: "North Fork tip waterfront village", soilNote: "Maritime climate, salt exposure, compact village lots", commonProjects: "maritime landscaping, walkways, small-lot garden beds" },
  "southold": { character: "North Fork farming community", soilNote: "Agricultural loam — excellent for gardens but drainage can be slow", commonProjects: "farm roads, vineyard work, residential landscaping" },
  "cutchogue": { character: "wine country center", soilNote: "Prime agricultural soil amid the vineyards", commonProjects: "vineyard paths, estate landscaping, decorative stone" },
  "jamesport": { character: "North Fork gateway", soilNote: "Transitional soil between south shore sand and North Fork loam", commonProjects: "farm access, residential driveway, garden beds" },
  "aquebogue": { character: "small hamlet near Riverhead", soilNote: "Mix of agricultural and residential soil conditions", commonProjects: "farm roads, garden beds, driveway maintenance" },
  "water-mill": { character: "luxury Hamptons estate area", soilNote: "Large estate lots with premium landscape expectations", commonProjects: "estate driveways, decorative stone borders, premium mulch" },
  "north-babylon": { character: "western Suffolk suburb", soilNote: "Flat suburban terrain at the edge of our regular range", commonProjects: "mulch beds, driveway maintenance, lawn repair" },
  "west-babylon": { character: "western Suffolk south shore", soilNote: "South shore flat terrain near the bay", commonProjects: "landscaping, driveway work, garden beds" },
  "deer-park": { character: "suburban residential and commercial", soilNote: "Flat terrain with standard suburban drainage", commonProjects: "commercial landscaping, residential beds, parking areas" },
};

// ─── Content Generation ──────────────────────────────────────────

function generateIntro(group: ProductGroup, town: TownInfo, ctx: TownContext): string {
  const feeDisplay = `$${(town.deliveryFeeCents / 100).toFixed(0)}`;
  const templates = [
    `Order ${group.shortLabel} online and we deliver to ${town.name} from our Center Moriches yard, about ${town.driveMinutes} minutes away. First load starts at ${feeDisplay}. ${ctx.character.charAt(0).toUpperCase() + ctx.character.slice(1)} — ${ctx.commonProjects} are what we see most here.`,
    `We deliver ${group.shortLabel} to ${town.name} daily from our yard in Center Moriches. ${ctx.soilNote}, so ${group.shortLabel} is a common order for ${ctx.commonProjects.split(",")[0].trim()}. Delivery starts at ${feeDisplay} per load.`,
    `${town.name} is ${ctx.character} — ${town.driveMiles.toFixed(1)} miles, about ${town.driveMinutes} minutes each way. ${group.label} delivery starts at ${feeDisplay}. Most ${town.name} customers order for ${ctx.commonProjects.split(",").slice(0, 2).join(" and").trim()}.`,
  ];
  return templates[hashCode(group.key + town.slug) % templates.length];
}

function generateLocalContext(group: ProductGroup, town: TownInfo, ctx: TownContext): string {
  const contexts: Record<string, Record<string, string>> = {
    mulch: {
      default: `${ctx.soilNote}. A 3-inch layer of ${group.shortLabel} helps retain moisture and suppress weeds in ${town.name} gardens.`,
      "manorville": "Manorville's large lots mean bigger mulch orders — 10+ yards is common. Our trucks handle long driveways without issue.",
      "shirley": "Shirley homeowners often pick black mulch for contrast against the mature oak canopy. Two inches for refresh, three for new beds.",
      "westhampton": "Westhampton properties use chocolate or black mulch for a clean, manicured look. We deliver to gated properties with advance notice.",
      "east-hampton": "East Hampton estate properties often order 20+ yards at a time. We schedule multi-load deliveries across consecutive days.",
    },
    topsoil: {
      default: `${ctx.soilNote}. Adding screened topsoil before seeding or sodding gives roots the organic matter Long Island's sandy soil lacks.`,
      "manorville": "Manorville's sandy pine barrens soil drains too fast for most lawns. A 2-inch topsoil layer before seeding makes the difference.",
      "mastic": "Mastic lots are flat and sandy — topsoil plus compost gives new lawns the best chance to establish before summer heat.",
    },
    gravel: {
      default: `${ctx.soilNote}. Gravel compacts well on ${town.name}'s terrain and provides year-round stability for driveways and paths.`,
      "manorville": "Long Manorville driveways need a solid base — 4 inches of 3/4 wash gravel under 2 inches of bluestone is the standard recipe.",
      "hampton-bays": "Hampton Bays properties often use bluestone for driveways that look clean and handle beach traffic well.",
      "east-hampton": "East Hampton driveways favor 3/4 bluestone for its classic blue-gray color. Permeable surfaces also meet local drainage codes.",
    },
    sand: {
      default: `${ctx.soilNote}. Fine sand and concrete sand are used for paver installs, mortar work, and pool bases throughout ${town.name}.`,
    },
    "rca-fill": {
      default: `${ctx.soilNote}. RCA compacts into a solid surface over time — it's the budget pick for driveways and construction pads in ${town.name}.`,
      "mastic": "Mastic homeowners choose RCA over virgin stone for driveways — same durability at half the price. State Grade RCA is the most popular.",
      "mastic-beach": "Mastic Beach lots are flat and easy to deliver to. Regular RCA is the go-to for quick driveway repairs and base work.",
      "manorville": "Manorville's long driveways can take 15-20 yards of RCA base. We run tri-axle loads to keep delivery costs down.",
    },
    "decorative-stone": {
      default: `Decorative stone adds texture and color to ${town.name} landscapes. ${ctx.soilNote}.`,
      "westhampton": "Westhampton properties frequently use whitestone and burgundy stone for clean, modern landscape borders and pool areas.",
      "southampton": "Southampton estates favor Pocono river rock for dry creek beds and natural-looking drainage features.",
      "east-hampton": "East Hampton's luxury properties use premium decorative stone for garden borders, water features, and accent beds.",
    },
  };

  return contexts[group.key]?.[town.slug] || contexts[group.key]?.default || `${ctx.soilNote}. ${group.label} is commonly used in ${town.name} for ${ctx.commonProjects.split(",")[0].trim()}.`;
}

function generateFaqs(group: ProductGroup, town: TownInfo, ctx: TownContext): Array<{ q: string; a: string }> {
  const feeDisplay = `$${(town.deliveryFeeCents / 100).toFixed(0)}`;
  const base = [
    {
      q: `How much does ${group.shortLabel} delivery to ${town.name} cost?`,
      a: `First load delivery to ${town.name} starts at ${feeDisplay}. Additional loads on the same job are discounted 25%. Your exact fee is calculated at checkout based on your address.`,
    },
    {
      q: `How much ${group.shortLabel} do I need for my ${town.name} project?`,
      a: `Use our material calculator — enter your area dimensions (length x width x depth) and it calculates cubic yards. For example, a 20x10 foot area at 3 inches deep needs about 1.9 cubic yards.`,
    },
  ];

  const groupFaqs: Record<string, Array<{ q: string; a: string }>> = {
    mulch: [
      { q: `What mulch colors do you deliver to ${town.name}?`, a: `We carry dark natural ($20/yd), black ($30/yd), chocolate ($30/yd), and red ($38/yd). All are triple-ground and hold color through the season.` },
      { q: `How deep should I spread mulch in ${town.name}?`, a: `3 inches for new beds, 2 inches for annual refresh. ${ctx.soilNote.split(".")[0]} — mulch helps retain moisture.` },
    ],
    topsoil: [
      { q: `Do you deliver compost to ${town.name} too?`, a: `Yes. We carry screened topsoil ($24/yd) and certified organic compost ($32/yd). Many ${town.name} customers mix them 50/50 for garden beds.` },
      { q: `How much topsoil do I need for a new lawn in ${town.name}?`, a: `Plan for 2 inches of screened topsoil across the area. A 2,000 sq ft lawn needs about 12.3 cubic yards.` },
    ],
    gravel: [
      { q: `What gravel is best for driveways in ${town.name}?`, a: `3/4 bluestone ($88/yd) for a premium look, or 3/4 wash gravel ($80/yd) for a budget option. Both compact well and drain properly.` },
      { q: `Can you deliver gravel to a backyard in ${town.name}?`, a: `It depends on access. Our trucks need at least 10 feet of width. Add access notes at checkout — narrow driveway, low wires, gates — and dispatch will plan the right truck.` },
    ],
    sand: [
      { q: `Which sand do I need for pavers in ${town.name}?`, a: `Fine mason sand ($60/yd) for the setting bed under pavers. Concrete sand ($60/yd) for mixing concrete or pipe bedding. Both available for ${town.name} delivery.` },
    ],
    "rca-fill": [
      { q: `What's the difference between State RCA and Regular RCA?`, a: `State Grade RCA ($27/yd) is 95% concrete — cleaner and more uniform. Regular RCA ($20/yd) is a blend of concrete, brick, and blacktop — cheaper but more varied. Both compact well.` },
      { q: `Can RCA be used as a finished driveway surface in ${town.name}?`, a: `State Grade RCA makes a solid finished surface once compacted. Regular RCA works too but has more color variation. Both are popular in ${town.name} for budget driveway work.` },
    ],
    "decorative-stone": [
      { q: `What decorative stone colors do you carry?`, a: `White ($125/yd), burgundy/red ($105/yd), and Pocono river rock in two sizes ($135/yd). All delivered to ${town.name}.` },
      { q: `How much decorative stone do I need for borders?`, a: `For a 2-foot wide border, measure the total length and multiply by depth. A 50-foot border at 3 inches deep needs about 0.9 yards.` },
    ],
  };

  const extras = groupFaqs[group.key] || [];
  // Pick 2-3 from extras based on town hash to vary FAQ sets
  const hash = hashCode(group.key + town.slug);
  const picked = extras.slice(hash % 2, (hash % 2) + 2);
  return [...base, ...picked];
}

function generateH1(group: ProductGroup, town: TownInfo): string {
  const templates = [
    `${group.label} Delivered to ${town.name}, NY`,
    `${group.label} Delivery in ${town.name} — Same-Week Available`,
    `Order ${group.label} for ${town.name} Delivery`,
    `${group.label} for ${town.name} Projects — Delivered from Our Yard`,
  ];
  return templates[hashCode(group.key + town.slug + "h1") % templates.length];
}

function generateCommonUses(group: ProductGroup, town: TownInfo, ctx: TownContext): string[] {
  const base = [...group.commonUsesBase];
  // Add 1-2 town-specific uses
  const townSpecific: string[] = [];
  if (ctx.commonProjects.includes("driveway")) townSpecific.push(`${town.name} driveway projects`);
  if (ctx.commonProjects.includes("garden")) townSpecific.push("Residential garden beds");
  if (ctx.commonProjects.includes("lawn")) townSpecific.push("Lawn establishment");
  if (ctx.commonProjects.includes("drainage")) townSpecific.push("Drainage improvement");
  if (ctx.commonProjects.includes("retaining")) townSpecific.push("Retaining wall backfill");
  if (ctx.commonProjects.includes("commercial")) townSpecific.push("Commercial property maintenance");

  // Mix in 1-2 town-specific, keep total at 5-6
  const combined = [...base.slice(0, 4), ...townSpecific.slice(0, 2)];
  return combined.slice(0, 6);
}

function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

function escSql(s: string): string {
  return s.replace(/'/g, "''");
}

// ─── Main ─────────────────────────────────────────────────────────

async function main() {
  const supabase = getSupabase();

  // Fetch towns
  const { data: townRows } = await supabase
    .from("town_pages")
    .select("slug, name, delivery_fee_cents, distance_miles, drive_minutes")
    .eq("is_active", true)
    .order("sort_order");

  const towns: TownInfo[] = (townRows ?? []).map((t) => ({
    slug: t.slug,
    name: t.name,
    deliveryFeeCents: t.delivery_fee_cents,
    driveMiles: Number(t.distance_miles),
    driveMinutes: t.drive_minutes,
  }));

  console.log(`Generating ${PRODUCT_GROUPS.length} groups × ${towns.length} towns = ${PRODUCT_GROUPS.length * towns.length} pages\n`);

  const rows: Array<Record<string, unknown>> = [];

  for (const group of PRODUCT_GROUPS) {
    for (const town of towns) {
      const ctx = TOWN_CONTEXTS[town.slug] || {
        character: "within our delivery area",
        soilNote: "Standard Long Island sandy soil",
        commonProjects: "landscaping, driveway work, general property maintenance",
      };

      const slug = `${group.key}-delivery-${town.slug}`;
      const title = `${group.label} Delivery to ${town.name}, NY | Eastern LM`;
      const metaDesc = `${group.label} delivered to ${town.name}, NY. ${group.priceHint} with same-week delivery. Calculate how much you need and order online.`.substring(0, 155);

      rows.push({
        slug,
        product_group: group.label,
        town_slug: town.slug,
        title: title.substring(0, 60),
        meta_description: metaDesc,
        h1: generateH1(group, town),
        intro_paragraph: generateIntro(group, town, ctx),
        local_context: generateLocalContext(group, town, ctx),
        project_tips: null,
        common_uses: generateCommonUses(group, town, ctx),
        featured_product_slugs: group.productSlugs,
        calculator_type: group.calculatorType,
        related_service_slug: group.relatedService,
        faqs: generateFaqs(group, town, ctx),
        schema_type: "Product",
      });
    }
  }

  console.log(`Generated ${rows.length} pages`);

  if (DRY_RUN) {
    console.log("\n[DRY RUN] Sample pages:");
    for (const r of rows.slice(0, 3)) {
      console.log(`\n  ${r.slug}`);
      console.log(`  Title: ${r.title}`);
      console.log(`  H1: ${r.h1}`);
      console.log(`  Intro: ${(r.intro_paragraph as string).substring(0, 100)}...`);
      console.log(`  Local: ${(r.local_context as string).substring(0, 100)}...`);
      console.log(`  FAQs: ${(r.faqs as Array<unknown>).length}`);
    }
    return;
  }

  // Upsert in batches
  const BATCH = 25;
  let inserted = 0;
  for (let i = 0; i < rows.length; i += BATCH) {
    const batch = rows.slice(i, i + BATCH);
    const { error } = await supabase.from("product_town_pages").upsert(batch, { onConflict: "slug" });
    if (error) {
      console.error(`Error at batch ${i}: ${error.message}`);
    } else {
      inserted += batch.length;
    }
    process.stdout.write(`\r  Inserted: ${inserted}/${rows.length}`);
  }

  console.log(`\n\nDone! ${inserted} product-town pages seeded.`);
}

main().catch((err) => { console.error("Fatal:", err); process.exit(1); });
