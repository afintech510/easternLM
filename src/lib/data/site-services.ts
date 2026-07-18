/**
 * Data-driven catalog for service LEAD-FORM pages.
 *
 * Pattern ported from Hamptons Tree Experts `lib/data/services.ts`: one typed array
 * drives the `/[slug]` page template, its metadata + JSON-LD, and the sitemap. Add an
 * entry here and it auto-renders + auto-appears in the sitemap.
 */

export type SiteServiceMaterial = { name: string; use: string };
export type SiteServiceStep = { step: string; detail: string };
export type SiteServiceFaq = { question: string; answer: string };
export type SiteServiceLink = { label: string; href: string; note?: string };

export type SiteService = {
  slug: string;
  /** ServiceQuoteForm defaultServiceType — must exist in SERVICE_TYPES in /api/leads. Omit for hub pages that show the full service picker. */
  leadServiceType?: string;
  serviceCategory: "paving" | "tree-care" | "landscaping" | "driveways";

  /** Override the default PAVING_TOWNS_LINE in the page footer. */
  townsLine?: string;

  metaTitle: string;
  metaDescription: string;
  ogTitle: string;
  ogDescription: string;

  heroTitle: string;
  heroSubtitle: string;
  ctaLabel: string;
  /** Anchor id for the quote form / hero CTA target. */
  ctaAnchor: string;

  scopeHeading: string;
  scope: string[];
  scopeColumns: 1 | 2;
  badges?: string[];

  materialsHeading?: string;
  materials?: SiteServiceMaterial[];
  materialsNote?: string;

  /** Optional "Do It Yourself" material-shop card (driveway page only). */
  diy?: { heading: string; blurb: string; href: string; label: string };

  process: SiteServiceStep[];
  faqs: SiteServiceFaq[];

  /** Small card under the quote form pointing at a sibling service. */
  crossLink: { prefix: string; href: string; label: string };
  /** "Serving <towns>. <link>" footer line. */
  footerLink: SiteServiceLink;

  /** JSON-LD Service node fields. */
  schemaName: string;
  schemaDescription: string;
  schemaServiceType: string;

  heroImage?: string;
};

/** Shared coverage-area string used in the FAQ footer line. */
export const PAVING_TOWNS_LINE =
  "Center Moriches, Mastic, Shirley, Patchogue, Bellport, Brookhaven, Manorville, Eastport, Westhampton, Riverhead, and Port Jefferson";

const siteServices: SiteService[] = [
  {
    slug: "gravel-driveway-repair",
    leadServiceType: "gravel-driveway-repair",
    serviceCategory: "paving",
    metaTitle: "Gravel Driveway Repair — Suffolk County, Long Island | Eastern LM",
    metaDescription:
      "Gravel driveway repair on Long Island: pothole & washout fix, regrading, fresh stone (RCA, bluestone), drainage correction, and compaction. Yard-direct material pricing. Free estimates across Suffolk County.",
    ogTitle: "Gravel Driveway Repair — Suffolk County, Long Island",
    ogDescription:
      "Pothole & washout repair, regrading, fresh stone, and drainage correction for gravel driveways. Material straight from our yard.",
    heroTitle: "Gravel Driveway Repair — Suffolk County, Long Island",
    heroSubtitle:
      "Potholes, ruts, and washouts fixed. Regrading, fresh stone, and drainage that holds up — with RCA, bluestone, and stone blends straight from our yard, so you skip the middleman markup.",
    ctaLabel: "Get a Free Estimate",
    ctaAnchor: "estimate",
    scopeHeading: "What we fix",
    scope: [
      "Pothole, rut & washout repair",
      "Regrading & crowning for runoff",
      'Fresh stone top-dress (RCA, 3/4" bluestone, stone blend)',
      "Erosion control & drainage correction",
      "Edge restoration & Belgian block edging",
      "Machine compaction & leveling",
      "Full re-base for failed driveways",
      "Old-material haul-away",
    ],
    scopeColumns: 1,
    badges: ["Free estimates", "Yard-direct material pricing", "Machine compaction"],
    diy: {
      heading: "Prefer to DIY?",
      blurb:
        "Order RCA, bluestone, and stone blends by the yard — we deliver across Suffolk County.",
      href: "/shop?category=gravel-stone",
      label: "Shop Stone & Gravel",
    },
    process: [
      { step: "Driveway Inspection", detail: "We look at the surface, base condition, grade, and where water is sitting or running." },
      { step: "Material & Grade Plan", detail: "We pick the right stone and depth for your traffic and terrain — at yard-direct pricing." },
      { step: "Compact, Grade & Finish", detail: "Machine compaction for stability, final grading for drainage, and clean edges." },
    ],
    faqs: [
      { question: "How much does gravel driveway repair cost on Long Island?", answer: "It depends on length, how much stone is needed, and whether the base has failed. A top-dress and regrade is far cheaper than a full re-base. We give a firm price after a quick inspection — and because we own the material yard, you're not paying a middleman markup on stone." },
      { question: "What stone is best for a Suffolk County driveway?", answer: '3/4" bluestone gives a clean, locked surface; RCA (recycled concrete aggregate) packs hard and is the most economical base. For most driveways we recommend an RCA base with a bluestone or stone-blend wearing course. We\'ll match it to your conditions.' },
      { question: "How do you stop my gravel driveway from washing out?", answer: "Washouts are almost always a grade and drainage problem. We re-crown the driveway so water sheds to the sides, add stone where it's thin, and correct or add drainage (swales, culverts) so the surface stays put." },
      { question: "Do you service long private or rural driveways?", answer: "Yes — long private drives are a specialty. We regularly regrade and re-stone driveways hundreds of feet long across eastern Suffolk." },
      { question: "How often should gravel be topped off?", answer: "Most driveways benefit from a fresh top-dress every 2–4 years depending on traffic. Catching it early keeps the base from rutting and saves a much bigger repair later." },
      { question: "Do you haul away the old material?", answer: "When needed, yes. For failed or contaminated sections we can strip and remove material before rebuilding the base." },
    ],
    crossLink: {
      prefix: "Sealcoating an asphalt driveway instead?",
      href: "/driveway-seal-coating-crack-repair",
      label: "See sealcoating & crack repair",
    },
    footerLink: { label: "All driveway services", href: "/services/driveways" },
    schemaName: "Gravel Driveway Repair",
    schemaDescription:
      "Gravel driveway repair across Suffolk County, Long Island: pothole and washout repair, regrading, fresh stone top-dress, drainage correction, and compaction.",
    schemaServiceType: "Gravel Driveway Repair",
  },
  {
    slug: "gravel-parking-lot-rehab",
    leadServiceType: "gravel-parking-lot",
    serviceCategory: "paving",
    metaTitle: "Gravel Parking Lot Rehab & Rebuilds — Suffolk County, LI | Eastern LM",
    metaDescription:
      "Commercial gravel parking lot rehab on Long Island: pothole repair, regrading, fresh stone, drainage, and full rebuilds with RCA & asphalt millings. Minimal downtime, yard-direct pricing. Suffolk County.",
    ogTitle: "Gravel Parking Lot Rehab & Rebuilds — Suffolk County, Long Island",
    ogDescription:
      "Pothole repair, regrading, drainage, and full rebuilds for commercial gravel lots using RCA and asphalt millings.",
    heroTitle: "Gravel Parking Lot Rehab & Rebuilds — Suffolk County, Long Island",
    heroSubtitle:
      "Pothole repair, regrading, fresh stone, drainage, and full rebuilds for commercial gravel lots — with RCA and asphalt millings, minimal downtime, and yard-direct material pricing.",
    ctaLabel: "Request a Commercial Lot Quote",
    ctaAnchor: "quote",
    scopeHeading: "Scope of work",
    scope: [
      "Pothole & rut repair",
      "Regrading & crowning for drainage",
      "RCA base rebuild",
      "Asphalt millings resurfacing (paved-look, low cost)",
      "Stone / bluestone top-dress",
      "Leveling & compaction along traffic lanes",
      "Drainage & runoff correction",
      "Dust control",
      "Edging & containment",
      "Recurring maintenance contracts",
    ],
    scopeColumns: 2,
    materialsHeading: "Materials we use",
    materials: [
      { name: "RCA (recycled concrete aggregate)", use: "Economical, hard-packing structural base." },
      { name: "Asphalt millings", use: "Paved appearance and a firm surface at low cost." },
      { name: '3/4" bluestone gravel', use: "Clean finished wearing course." },
      { name: "Stone blend", use: "Traction and compaction for traffic lanes." },
    ],
    process: [
      { step: "Lot Assessment & Measure", detail: "We assess traffic patterns, failure points, drainage, and measure for accurate material." },
      { step: "Material & Drainage Plan", detail: "Base depth, wearing course, crown, and runoff spec'd for your lot and budget." },
      { step: "Rebuild, Compact & Finish", detail: "Machine-laid base and surface, compacted and graded — striping-ready if paved later." },
    ],
    faqs: [
      { question: "How much does a gravel parking lot rebuild cost?", answer: "It depends on square footage, base condition, and material. A regrade and fresh top-dress is far cheaper than a full base rebuild. Because we own the material yard, the stone in your lot is priced direct — we give firm pricing after measuring the lot." },
      { question: "Asphalt millings vs gravel for a parking lot?", answer: "Asphalt millings compact into a firm, paved-looking surface that sheds water and handles vehicle traffic well, at a fraction of hot asphalt's cost. Clean stone gives a tidier look. Many lots use an RCA base with a millings or stone surface." },
      { question: "Can you work after-hours to avoid disrupting my business?", answer: "Yes. For active commercial lots we can phase the work or schedule after-hours/weekends to keep your lot usable and minimize downtime." },
      { question: "How do you keep dust and potholes down?", answer: "Potholes are a base and drainage issue — we rebuild soft spots and re-crown for runoff. For dry-season dust we offer dust-control treatment, and recurring grading keeps the surface tight." },
      { question: "Do you offer maintenance contracts for commercial lots?", answer: "Yes. Seasonal or annual grading, patching, dust control, and top-dressing keep a lot in good shape and avoid expensive emergency repairs." },
      { question: "Can you improve drainage and stop ponding?", answer: "We re-grade and crown the lot so water moves to the right places, and correct or add drainage so you don't get standing water or freeze-thaw damage." },
    ],
    crossLink: {
      prefix: "Private road or HOA?",
      href: "/private-road-maintenance",
      label: "See private road maintenance & rehab",
    },
    footerLink: { label: "Private road maintenance", href: "/private-road-maintenance" },
    schemaName: "Gravel Parking Lot Rehab & Rebuilds",
    schemaDescription:
      "Commercial gravel parking lot rehab and rebuilds across Suffolk County, Long Island: pothole repair, regrading, fresh stone, drainage correction, and full rebuilds using RCA and asphalt millings.",
    schemaServiceType: "Gravel Parking Lot Rehab",
  },
  {
    slug: "private-road-maintenance",
    leadServiceType: "private-road-maintenance",
    serviceCategory: "paving",
    metaTitle: "Private Road Maintenance & Rehab — Suffolk County, LI | Eastern LM",
    metaDescription:
      "Private road rebuild & maintenance on Long Island: RCA base, asphalt millings, bluestone gravel, grading, compaction, edging, and drainage. HOA & association contracts. Serving Suffolk County.",
    ogTitle: "Private Road Maintenance & Rehab — Suffolk County, Long Island",
    ogDescription:
      "Full rebuild and ongoing maintenance of private roads with RCA, asphalt millings, and bluestone. HOA & association contracts.",
    heroTitle: "Private Road Maintenance & Rehab — Suffolk County, Long Island",
    heroSubtitle:
      "Full rebuilds and ongoing upkeep of private roads and rights-of-way — RCA base, asphalt millings, and bluestone gravel, with grading, compaction, edging, and drainage. Built for HOAs, associations, and long shared drives.",
    ctaLabel: "Request a Road Assessment",
    ctaAnchor: "assessment",
    scopeHeading: "Scope of work",
    scope: [
      "Pothole & washout repair",
      "Regrading & crowning for drainage",
      "RCA base rebuild",
      "Asphalt millings resurfacing",
      "Bluestone gravel top-dress",
      "Edging & shoulder restoration",
      "Machine compaction & leveling",
      "Drainage & culvert correction",
      "Dust control",
      "Seasonal/contract maintenance for HOAs & associations",
    ],
    scopeColumns: 2,
    materialsHeading: "Materials we use",
    materials: [
      { name: "RCA (recycled concrete aggregate)", use: "Hard-packing, economical structural base." },
      { name: "Asphalt millings", use: "Paved-look wearing course at a fraction of asphalt cost." },
      { name: '3/4" bluestone gravel', use: "Clean, locking surface stone for a finished look." },
      { name: "Stone blend", use: "Balanced mix for traction and compaction." },
    ],
    materialsNote:
      "We own the supply yard — material is priced direct, which keeps large rehab budgets in check.",
    process: [
      { step: "Site Assessment & Measure", detail: "We walk the road, find the failure points, and measure for accurate material planning." },
      { step: "Engineered Material & Grade Plan", detail: "Base depth, wearing course, crown, and drainage spec'd to your traffic and budget." },
      { step: "Rebuild, Compact & Maintain", detail: "Machine-laid and compacted base + surface, with optional recurring maintenance." },
    ],
    faqs: [
      { question: "Do you contract with HOAs and private communities?", answer: "Yes. We work with HOAs, beach and civic associations, and property managers on both one-time rehabs and recurring seasonal maintenance contracts. We can present a scope and firm pricing for board approval." },
      { question: "What's the most cost-effective way to rebuild a private road?", answer: "For most private roads, an RCA base with an asphalt-millings or bluestone wearing course gives the best durability per dollar — far cheaper than hot asphalt while holding up to real traffic. We size the base to your conditions." },
      { question: "Asphalt millings vs gravel vs RCA — which is best?", answer: "RCA is the workhorse base; it packs hard. Asphalt millings give a paved appearance and shed water well as a surface. Bluestone gravel is the cleanest finished look. Many roads use a combination, and we'll recommend the right layering." },
      { question: "Can you set up a recurring maintenance contract?", answer: "Yes. We can schedule grading, pothole patching, dust control, and top-dressing on a seasonal or annual basis so the road never gets ahead of you." },
      { question: "Do you handle dust and washboarding?", answer: "Washboarding comes from a soft base and poor grade; we correct both, and offer dust-control treatment for unpaved surfaces in dry months." },
      { question: "How do you fix a road that floods?", answer: "We re-crown the road so water sheds, restore or add roadside swales and culverts, and rebuild any soft, water-damaged base so the surface stops failing." },
    ],
    crossLink: {
      prefix: "Commercial parking lot instead?",
      href: "/gravel-parking-lot-rehab",
      label: "See gravel parking lot rehab",
    },
    footerLink: { label: "Gravel driveway repair", href: "/gravel-driveway-repair" },
    schemaName: "Private Road Maintenance & Rehab",
    schemaDescription:
      "Private road rebuild and maintenance across Suffolk County, Long Island using RCA, asphalt millings, and bluestone gravel — grading, compaction, edging, and drainage. HOA and association contracts available.",
    schemaServiceType: "Private Road Maintenance",
  },

  // ── Tree Care ──────────────────────────────────────────────────────────────

  {
    slug: "tree-removal-trimming",
    leadServiceType: "tree-removal",
    serviceCategory: "tree-care",
    metaTitle: "Tree Removal & Trimming — Suffolk County, Long Island | Eastern LM",
    metaDescription:
      "Professional tree removal and trimming across Suffolk County, Long Island. Hazardous tree takedown, storm damage cleanup, pruning, lot clearing, and stump grinding. Free estimates.",
    ogTitle: "Tree Removal & Trimming — Suffolk County, Long Island",
    ogDescription:
      "Hazardous tree removal, trimming, pruning, storm damage cleanup, and lot clearing. Free estimates across Suffolk County.",
    heroTitle: "Tree Removal & Trimming — Suffolk County, Long Island",
    heroSubtitle:
      "Dead, damaged, and overgrown trees handled safely — hazardous takedowns, storm damage cleanup, crown reduction, and lot clearing. We chip, haul, and leave your property clean.",
    ctaLabel: "Get a Free Estimate",
    ctaAnchor: "estimate",
    scopeHeading: "What we handle",
    scope: [
      "Hazardous & dead tree removal",
      "Storm damage cleanup & emergency response",
      "Crown reduction & canopy thinning",
      "Pruning & shaping for health and clearance",
      "Lot & land clearing",
      "Limb removal over structures & power lines",
      "Crane-assisted removals for tight access",
      "Wood chipping, log bucking & haul-away",
    ],
    scopeColumns: 2,
    badges: ["Free estimates", "Fully insured", "Same-week response"],
    process: [
      { step: "On-site assessment", detail: "We evaluate the tree, access, drop zone, and any utility or structure conflicts." },
      { step: "Scope & price", detail: "A firm written quote before any work starts — no surprises." },
      { step: "Remove, chip & clean", detail: "Crew takes the tree down in sections, chips brush, bucks logs, and rakes the site clean." },
    ],
    faqs: [
      { question: "How much does tree removal cost on Long Island?", answer: "It depends on height, trunk diameter, access, and proximity to structures. Small ornamentals start around $300–$500; large hardwoods near a house or wires can run $1,500–$4,000+. We give a firm price after a quick on-site look." },
      { question: "Do I need a permit to remove a tree in Suffolk County?", answer: "Most Towns of Brookhaven, Southampton, and Riverhead don't require a permit for removing a single residential tree on your own property unless it's in a designated protected zone (wetlands buffer, historic district). We'll let you know if your situation needs a town check." },
      { question: "Can you remove a tree close to my house or power line?", answer: "Yes. We section-fell trees next to structures and use rigging or a crane when the drop zone is tight. For trees in contact with utility lines, we coordinate with PSEG Long Island." },
      { question: "What happens to the wood and brush?", answer: "Brush is chipped on site. Logs can be bucked and left for firewood or hauled away — your call. The site is raked clean." },
      { question: "Do you grind the stump too?", answer: "Stump grinding is a separate service we offer. Many customers bundle it with the removal for a package price." },
      { question: "How quickly can you respond to storm damage?", answer: "We prioritize storm calls and can usually have a crew out within 24–48 hours. Hazardous situations blocking driveways or threatening structures get same-day attention when possible." },
    ],
    crossLink: {
      prefix: "Need the stump ground too?",
      href: "/stump-grinding",
      label: "See stump grinding",
    },
    footerLink: { label: "Stump grinding", href: "/stump-grinding" },
    schemaName: "Tree Removal & Trimming",
    schemaDescription:
      "Professional tree removal and trimming across Suffolk County, Long Island — hazardous tree takedown, storm damage cleanup, pruning, crown reduction, lot clearing, and haul-away.",
    schemaServiceType: "Tree Removal",
  },
  {
    slug: "stump-grinding",
    leadServiceType: "stump-grinding",
    serviceCategory: "tree-care",
    metaTitle: "Stump Grinding & Removal — Suffolk County, Long Island | Eastern LM",
    metaDescription:
      "Stump grinding and removal across Suffolk County, Long Island. Below-grade grinding, root cleanup, backfill, and grade restoration. Free estimates.",
    ogTitle: "Stump Grinding & Removal — Suffolk County, Long Island",
    ogDescription:
      "Below-grade stump grinding, root cleanup, backfill, and grade restoration. Free estimates across Suffolk County.",
    heroTitle: "Stump Grinding & Removal — Suffolk County, Long Island",
    heroSubtitle:
      "Old stumps ground below grade, roots cleaned out, and the hole backfilled and graded flat — ready for grass, garden, or whatever you want the space for.",
    ctaLabel: "Get a Free Estimate",
    ctaAnchor: "estimate",
    scopeHeading: "What we handle",
    scope: [
      "Below-grade stump grinding (6–12\" below surface)",
      "Surface root grinding",
      "Grindings removal or spread on site",
      "Backfill with topsoil",
      "Grade restoration & seeding prep",
      "Multi-stump and lot-clearing grinding",
    ],
    scopeColumns: 1,
    badges: ["Free estimates", "Same-week scheduling", "Topsoil from our yard"],
    diy: {
      heading: "Need topsoil to fill the hole?",
      blurb:
        "Order screened topsoil by the yard — we deliver across Suffolk County.",
      href: "/shop?category=topsoil-compost",
      label: "Shop Topsoil",
    },
    process: [
      { step: "Stump assessment", detail: "We check diameter, root spread, access, and whether there are underground utilities to mark." },
      { step: "Grind & clean", detail: "The stump is ground 6–12\" below grade. Grindings are raked out or spread as mulch — your choice." },
      { step: "Backfill & grade", detail: "We backfill with screened topsoil from our yard and grade the area flat for seeding or landscaping." },
    ],
    faqs: [
      { question: "How much does stump grinding cost?", answer: "Most residential stumps run $150–$400 depending on diameter and root spread. Multi-stump jobs get a per-stump discount. We give a firm price on site." },
      { question: "How deep do you grind?", answer: "Standard is 6–12 inches below grade — deep enough for lawn, garden beds, or new planting. If you need deeper for construction, we can accommodate." },
      { question: "What do you do with the grindings?", answer: "Grindings can be spread on site as mulch, raked into the hole, or hauled away. Most homeowners keep them — they make decent path or bed mulch." },
      { question: "Can you grind stumps in tight spaces?", answer: "Yes. We have equipment that fits through 36\" gates and can reach stumps next to foundations, fences, and garden beds." },
      { question: "Should I grind or remove the stump?", answer: "Grinding is faster, cheaper, and less disruptive. Full extraction (pulling the root ball) is only needed if you're excavating for construction. For lawns and landscaping, grinding is the right call." },
    ],
    crossLink: {
      prefix: "Tree still standing?",
      href: "/tree-removal-trimming",
      label: "See tree removal & trimming",
    },
    footerLink: { label: "Tree removal", href: "/tree-removal-trimming" },
    schemaName: "Stump Grinding & Removal",
    schemaDescription:
      "Stump grinding and removal across Suffolk County, Long Island — below-grade grinding, root cleanup, backfill with screened topsoil, and grade restoration.",
    schemaServiceType: "Stump Grinding",
  },

  {
    slug: "tree-services",
    serviceCategory: "tree-care",
    townsLine: "Center Moriches, Mastic, Shirley, Patchogue, Bellport, Brookhaven, Manorville, Eastport, Westhampton, Riverhead, and surrounding Suffolk County",
    metaTitle: "Tree Services — Suffolk County, Long Island | Eastern LM",
    metaDescription:
      "Tree removal, trimming, stump grinding, land clearing, and storm damage cleanup across Suffolk County, Long Island. Free estimates, fully insured, same-week response.",
    ogTitle: "Tree Services — Suffolk County, Long Island",
    ogDescription:
      "Tree removal, trimming, stump grinding, land clearing, and storm cleanup. Free estimates across Suffolk County.",
    heroTitle: "Tree Services — Suffolk County, Long Island",
    heroSubtitle:
      "Tree removal, trimming, stump grinding, land clearing, and storm damage cleanup — fully insured crews with same-week response across Suffolk County.",
    ctaLabel: "Get a Free Estimate",
    ctaAnchor: "estimate",
    scopeHeading: "What we handle",
    scope: [
      "Hazardous & dead tree removal",
      "Crown reduction & canopy thinning",
      "Pruning & shaping for health and clearance",
      "Below-grade stump grinding",
      "Lot & land clearing",
      "Storm damage cleanup & emergency response",
      "Limb removal over structures & power lines",
      "Wood chipping, log bucking & haul-away",
    ],
    scopeColumns: 2,
    badges: ["Free estimates", "Fully insured", "Same-week response"],
    process: [
      { step: "On-site assessment", detail: "We evaluate the trees, access, drop zone, and any utility or structure conflicts." },
      { step: "Scope & price", detail: "A firm written quote before any work starts — no surprises." },
      { step: "Crew handles it", detail: "Trees taken down in sections, stumps ground, brush chipped, and site raked clean." },
    ],
    faqs: [
      { question: "How much does tree removal cost on Long Island?", answer: "It depends on height, trunk diameter, access, and proximity to structures. Small ornamentals start around $300–$500; large hardwoods near a house or wires can run $1,500–$4,000+. We give a firm price after a quick on-site look." },
      { question: "Do I need a permit to remove a tree in Suffolk County?", answer: "Most Towns of Brookhaven, Southampton, and Riverhead don't require a permit for removing a single residential tree on your own property unless it's in a designated protected zone (wetlands buffer, historic district). We'll let you know if your situation needs a town check." },
      { question: "Can you remove a tree close to my house or power line?", answer: "Yes. We section-fell trees next to structures and use rigging or a crane when the drop zone is tight. For trees in contact with utility lines, we coordinate with PSEG Long Island." },
      { question: "How deep do you grind stumps?", answer: "Standard is 6–12 inches below grade — deep enough for lawn, garden beds, or new planting. We backfill with topsoil and grade the area flat." },
      { question: "Do you handle storm damage emergencies?", answer: "Yes. We prioritize storm calls and can usually have a crew out within 24–48 hours. Hazardous situations blocking driveways or threatening structures get same-day attention when possible." },
      { question: "Can you clear an overgrown lot?", answer: "Yes. We clear brush, saplings, and mature trees for building sites, garden expansions, and sight-line improvements. Debris is chipped and hauled." },
    ],
    crossLink: {
      prefix: "Need landscaping after tree work?",
      href: "/plantings",
      label: "See plantings & garden beds",
    },
    footerLink: { label: "All services", href: "/services" },
    schemaName: "Tree Services",
    schemaDescription:
      "Professional tree services across Suffolk County, Long Island — tree removal, trimming, stump grinding, land clearing, and storm damage cleanup.",
    schemaServiceType: "Tree Service",
  },

  // ── Landscaping ────────────────────────────────────────────────────────────

  {
    slug: "plantings",
    leadServiceType: "landscaping-garden-beds",
    serviceCategory: "landscaping",
    metaTitle: "Plantings & Garden Bed Installation — Suffolk County, LI | Eastern LM",
    metaDescription:
      "Professional planting services across Suffolk County, Long Island. Foundation plantings, privacy screening, garden beds, shrubs, ornamental trees, and seasonal color. Materials from our yard.",
    ogTitle: "Plantings & Garden Bed Installation — Suffolk County, Long Island",
    ogDescription:
      "Foundation plantings, privacy screening, garden beds, shrubs, and ornamental trees. Materials from our yard, installed by our crew.",
    heroTitle: "Plantings & Garden Bed Installation — Suffolk County, Long Island",
    heroSubtitle:
      "Foundation plantings, privacy hedges, garden beds, ornamental trees, and seasonal color — designed for Long Island soil and climate, installed with topsoil and mulch straight from our yard.",
    ctaLabel: "Get a Free Estimate",
    ctaAnchor: "estimate",
    scopeHeading: "What we install",
    scope: [
      "Foundation plantings & curb appeal upgrades",
      "Privacy screening (arborvitae, green giant, skip laurel)",
      "Garden bed design & installation",
      "Ornamental & shade tree planting",
      "Shrub & hedge installation",
      "Seasonal color (annuals, perennials, bulbs)",
      "Mulch, edging & weed barrier",
      "Soil amendment & bed prep with screened topsoil",
    ],
    scopeColumns: 2,
    badges: ["Free estimates", "Topsoil & mulch from our yard", "Deer-resistant options"],
    materialsHeading: "Materials we supply",
    materials: [
      { name: "Screened topsoil", use: "Bed prep and backfill — sold by the yard from our lot." },
      { name: "Double-ground mulch", use: "Weed suppression and moisture retention around plantings." },
      { name: "Compost blend", use: "Soil amendment for sandy Long Island ground." },
      { name: "Decorative stone", use: "Borders, accents, and low-maintenance bed surfaces." },
    ],
    materialsNote:
      "We own the supply yard — topsoil, mulch, and compost are priced direct with no middleman markup.",
    diy: {
      heading: "Planting yourself?",
      blurb:
        "Order topsoil, mulch, and compost by the yard — we deliver across Suffolk County.",
      href: "/shop?category=topsoil-compost",
      label: "Shop Topsoil & Mulch",
    },
    process: [
      { step: "Site walk & design", detail: "We assess sun, soil, drainage, and deer pressure, then propose a planting plan that fits your property and budget." },
      { step: "Source plants & materials", detail: "Plants sourced from Long Island nurseries; topsoil, mulch, and compost come from our yard." },
      { step: "Install, mulch & clean", detail: "Crew preps beds, plants, mulches, edges, and leaves the site clean. We include care instructions." },
    ],
    faqs: [
      { question: "When is the best time to plant on Long Island?", answer: "Spring (April–May) and fall (September–October) are ideal. Fall planting gives roots a head start before summer stress. We can plant year-round for container-grown stock, but avoid frozen ground and extreme heat." },
      { question: "Do you use deer-resistant plants?", answer: "Yes. We default to deer-resistant varieties (boxwood, holly, ornamental grasses, lavender) unless you prefer something specific. We'll flag anything deer love before we plant it." },
      { question: "Do you supply the topsoil and mulch?", answer: "Yes — from our own yard at 110 Frowein Road. Screened topsoil and double-ground mulch are priced direct, so you're not paying a middleman." },
      { question: "Can you work with my existing landscaping?", answer: "Absolutely. We integrate new plantings with what's already there — matching scale, style, and spacing." },
      { question: "What areas do you serve?", answer: "All of Suffolk County, from Patchogue to the Hamptons and the North Fork. Our yard is in Center Moriches." },
    ],
    crossLink: {
      prefix: "Need grading or drainage first?",
      href: "/services/landscaping",
      label: "See full landscaping services",
    },
    footerLink: { label: "All landscaping services", href: "/services/landscaping" },
    schemaName: "Plantings & Garden Bed Installation",
    schemaDescription:
      "Professional planting services across Suffolk County, Long Island — foundation plantings, privacy screening, garden beds, ornamental trees, and seasonal color with topsoil and mulch from our yard.",
    schemaServiceType: "Planting Service",
  },

  // ── Driveways (new installs) ───────────────────────────────────────────────

  {
    slug: "new-gravel-driveway",
    leadServiceType: "gravel-driveway-new",
    serviceCategory: "driveways",
    metaTitle: "New Gravel Driveway Installation — Suffolk County, LI | Eastern LM",
    metaDescription:
      "New gravel driveway installation across Suffolk County, Long Island. Excavation, geotextile, RCA base, bluestone or stone blend surface, edging, and compaction. Yard-direct material pricing.",
    ogTitle: "New Gravel Driveway Installation — Suffolk County, Long Island",
    ogDescription:
      "Full gravel driveway construction: excavation, base, surface stone, edging, and compaction. Material straight from our yard.",
    heroTitle: "New Gravel Driveway Installation — Suffolk County, Long Island",
    heroSubtitle:
      "New gravel driveways built from the ground up — excavation, geotextile fabric, engineered RCA base, and your choice of bluestone, stone blend, or asphalt millings on top. Material comes direct from our yard, so you skip the markup.",
    ctaLabel: "Get a Free Estimate",
    ctaAnchor: "estimate",
    scopeHeading: "What's included",
    scope: [
      "Excavation & subgrade prep",
      "Geotextile fabric installation",
      "RCA or processed gravel base course",
      'Wearing surface (3/4" bluestone, stone blend, or asphalt millings)',
      "Belgian block, steel, or timber edging",
      "Machine compaction & final grading",
      "Crown & drainage grading for runoff",
      "Turnaround and parking pad add-ons",
    ],
    scopeColumns: 2,
    badges: ["Free estimates", "Yard-direct pricing", "Machine compaction"],
    materialsHeading: "Materials we use",
    materials: [
      { name: "RCA (recycled concrete aggregate)", use: "Hard-packing structural base — the industry standard." },
      { name: '3/4" bluestone gravel', use: "Clean, angular stone that locks tight as a finished surface." },
      { name: "Stone blend", use: "Balanced mix of fines and aggregate for traction and compaction." },
      { name: "Asphalt millings", use: "Paved look and feel at a fraction of hot-mix cost." },
    ],
    materialsNote:
      "All stone and aggregate comes from our yard at 110 Frowein Road — no middleman, no markup.",
    diy: {
      heading: "Prefer to build it yourself?",
      blurb:
        "Order RCA, bluestone, and stone blends by the yard — we deliver across Suffolk County.",
      href: "/shop?category=gravel-stone",
      label: "Shop Stone & Gravel",
    },
    process: [
      { step: "Site survey & layout", detail: "We measure, mark the driveway path, check drainage, and plan material depth for your traffic." },
      { step: "Excavate & prep", detail: "Strip topsoil, lay geotextile, and build a compacted base course to the right depth." },
      { step: "Surface, edge & compact", detail: "Spread and compact the wearing course, install edging, and finish-grade for drainage." },
    ],
    faqs: [
      { question: "How much does a new gravel driveway cost on Long Island?", answer: "A typical two-car residential driveway (12' × 60') runs $3,000–$6,000 depending on base depth, surface stone, and edging. Longer rural drives scale linearly. We give a firm price after measuring." },
      { question: "What's the best stone for a new driveway?", answer: '3/4" bluestone is our most popular surface — it locks, drains well, and looks clean. RCA packs harder and costs less. Many driveways use an RCA base with a bluestone or stone-blend surface.' },
      { question: "How thick should a gravel driveway be?", answer: "We typically spec 4–6\" of compacted base (RCA) plus 2–3\" of surface stone. Heavy-traffic or soft-soil sites get deeper base — we adjust to your conditions." },
      { question: "Do you install edging?", answer: "Yes. Belgian block, steel, or timber edging keeps stone in place and gives a finished look. Belgian block is the most popular choice on Long Island." },
      { question: "How long does installation take?", answer: "Most residential driveways are complete in 1–2 days. Longer rural drives or soft-ground sites that need extra base work may take 3 days." },
      { question: "Gravel vs asphalt — which should I choose?", answer: "Gravel costs 40–60% less than asphalt, drains naturally, and is easy to maintain. Asphalt gives a paved look but needs sealing every 2–3 years and cracks in freeze-thaw. We install both gravel and asphalt-millings driveways." },
    ],
    crossLink: {
      prefix: "Existing gravel driveway need repair?",
      href: "/gravel-driveway-repair",
      label: "See gravel driveway repair",
    },
    footerLink: { label: "Gravel driveway repair", href: "/gravel-driveway-repair" },
    schemaName: "New Gravel Driveway Installation",
    schemaDescription:
      "New gravel driveway installation across Suffolk County, Long Island — excavation, geotextile, RCA base, bluestone or stone blend surface, edging, and machine compaction. Yard-direct material pricing.",
    schemaServiceType: "Gravel Driveway Installation",
  },
];

export const SITE_SERVICE_SLUGS = siteServices.map((s) => s.slug);

export function getSiteServices(): SiteService[] {
  return siteServices;
}

export function getSiteServiceBySlug(slug: string): SiteService | undefined {
  return siteServices.find((s) => s.slug === slug);
}
