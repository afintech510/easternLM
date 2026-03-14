/**
 * Generate service × town programmatic SEO pages
 * 4 services × 15 top towns = 60 pages
 *
 * Usage: npx tsx scripts/generate-service-town-pages.ts
 */

import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import { resolve } from "path";

config({ path: resolve(__dirname, "..", ".env.local") });

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } },
);

type ServiceDef = {
  type: string;
  label: string;
  productSlugs: string[];
  servicesIncluded: string[];
};

const SERVICES: ServiceDef[] = [
  {
    type: "driveways",
    label: "Driveway Services",
    productSlugs: ["34-inch-wash-gravel", "34-inch-bluestone", "state-grade-rca-95-concrete-made-to-spec-not-certified", "regular-rca-blend-of-concrete-brick-and-blacktop", "bluestone-screenings-stone-dust-fines"],
    servicesIncluded: ["New gravel driveway installation", "Resurfacing and regrading", "Pothole and edge repair", "Drainage correction", "Belgian block edging"],
  },
  {
    type: "landscaping",
    label: "Landscaping Services",
    productSlugs: ["topsoil-screened-organic", "compost-certified-organic-rich-in-nutrients", "black-mulch", "dark-natural-mulch"],
    servicesIncluded: ["Garden bed design and planting", "Soil grading and leveling", "Retaining walls and borders", "Drainage solutions", "Seasonal bed refresh"],
  },
  {
    type: "masonry",
    label: "Masonry Services",
    productSlugs: ["34-inch-bluestone", "38-inch-bluestone", "bluestone-screenings-stone-dust-fines", "fine-sand"],
    servicesIncluded: ["Patio installation", "Walkway construction", "Retaining walls", "Stone veneer and steps", "Fireplace and outdoor kitchen"],
  },
  {
    type: "property-maintenance",
    label: "Property Maintenance",
    productSlugs: ["dark-natural-mulch", "black-mulch", "topsoil-screened-organic"],
    servicesIncluded: ["Seasonal cleanup", "Mulch refresh and edging", "General grounds maintenance", "Storm debris removal", "Weed control and bed care"],
  },
];

type TownCtx = {
  character: string;
  driveways: string;
  landscaping: string;
  masonry: string;
  maintenance: string;
};

const TOWN_SERVICE_CTX: Record<string, TownCtx> = {
  "center-moriches": { character: "close to the yard", driveways: "Short driveways typical of south shore lots. Quick turnaround on resurfacing.", landscaping: "Established neighborhoods with mature gardens needing regular mulch and topsoil refresh.", masonry: "Smaller patios and walkways common in the village center.", maintenance: "Regular seasonal cleanup keeps properties looking sharp year-round." },
  "east-moriches": { character: "our core zone", driveways: "Flat terrain makes grading straightforward. RCA and bluestone are popular.", landscaping: "Bay-side properties need drainage-aware plantings and erosion-resistant materials.", masonry: "Waterfront homes use natural stone for salt-resistant patios and seawalls.", maintenance: "Salt air takes a toll — regular bed care and mulch refresh are standard." },
  "manorville": { character: "large lots, long driveways", driveways: "Long rural driveways are our specialty. 15-20 yard loads are common. Tri-axle trucks handle the volume.", landscaping: "Large lots mean bigger projects — full property grading, multiple garden zones, extensive bed work.", masonry: "Horse properties and estate-style homes often want stone patios, fire pits, and decorative walls.", maintenance: "Large properties need consistent seasonal care. Multi-visit contracts are common." },
  "shirley": { character: "dense residential", driveways: "Shorter residential driveways that benefit from fresh bluestone or RCA top-off every few years.", landscaping: "Garden bed refresh is the top request — mulch, edging, and seasonal plantings under the oak canopy.", masonry: "Backyard patios and walkways to the pool or shed are the most common projects.", maintenance: "Weekly or bi-weekly service keeps yards clean through the growing season." },
  "mastic": { character: "budget-conscious homeowners", driveways: "RCA is the go-to for Mastic driveways — solid base at half the price of virgin stone.", landscaping: "Basic bed mulching and lawn repair are the most requested services.", masonry: "Practical walkways and small patio installations fit the neighborhood scale.", maintenance: "Seasonal cleanup and mulch refresh keep properties maintained without breaking the budget." },
  "westhampton-beach": { character: "upscale beach village", driveways: "Premium bluestone driveways that meet village drainage requirements. Permeable surfaces preferred.", landscaping: "Estate-level design with salt-tolerant plantings, decorative stone borders, and professional grading.", masonry: "High-end patio installations, outdoor kitchens, and decorative stone walls.", maintenance: "Meticulous property care for absentee owners — we keep estates looking perfect between visits." },
  "hampton-bays": { character: "mixed residential and beach", driveways: "Beach traffic and sand erosion mean driveways need a solid base and regular top-off.", landscaping: "Mix of year-round homes and seasonal properties needing different service levels.", masonry: "Outdoor living spaces — patios, fire pits, and grilling areas for beach house entertaining.", maintenance: "Pre-season and post-season property prep for seasonal homeowners." },
  "riverhead": { character: "farms, wineries, commercial", driveways: "Commercial properties and farm access roads need heavy-duty base work.", landscaping: "Winery and farm properties need grading, drainage, and professional landscape design.", masonry: "Tasting room patios and commercial walkways require durable construction.", maintenance: "Commercial properties need year-round grounds maintenance and seasonal prep." },
  "southampton": { character: "luxury estates", driveways: "Estate driveways with premium 3/4 bluestone, proper drainage, and manicured edges.", landscaping: "Full-service estate landscaping — design, installation, and seasonal management.", masonry: "Premium stone patios, pool decks, outdoor kitchens, and decorative walls.", maintenance: "White-glove property care for high-end estates — weekly visits, seasonal color, constant attention." },
  "quogue": { character: "quiet beach community", driveways: "Beach property driveways need drainage-friendly materials that handle sand and salt.", landscaping: "Salt-tolerant plantings and wind-resistant garden design.", masonry: "Pool surrounds and beachfront patios built to handle salt air.", maintenance: "Regular upkeep for vacation properties between owner visits." },
  "patchogue": { character: "village center", driveways: "Village lots have shorter driveways — clean resurfacing keeps curb appeal high.", landscaping: "Established neighborhoods with mature landscaping needing refresh and update.", masonry: "Walkway repairs and small patio additions are the bread and butter.", maintenance: "Village properties benefit from regular cleanup and seasonal bed care." },
  "bellport": { character: "historic waterfront village", driveways: "Historic village properties need period-appropriate stone and careful grading.", landscaping: "Waterfront gardens need drainage-aware design and salt-resistant plantings.", masonry: "Stone paths and walls that complement the village's historic character.", maintenance: "Careful maintenance that preserves the character of established landscapes." },
  "ridge": { character: "wooded North Shore lots", driveways: "Wooded lot driveways need clearing, grading, and proper drainage.", landscaping: "Pine barrens soil needs amendment — topsoil and compost before planting.", masonry: "Retaining walls on sloped terrain are a common request.", maintenance: "Leaf cleanup is a big deal in fall — wooded lots generate volume." },
  "east-hampton": { character: "luxury East End", driveways: "Estate-grade bluestone driveways with professional grading and Belgian block edging.", landscaping: "High-end landscape design with premium materials — decorative stone, specimen plantings.", masonry: "Pool houses, outdoor kitchens, stone walls, and custom patio installations.", maintenance: "Full-service estate management — our crew visits weekly to maintain grounds." },
  "calverton": { character: "rural and agricultural", driveways: "Farm and rural property driveways — RCA and gravel for long access roads.", landscaping: "Large property grading, drainage, and agricultural land prep.", masonry: "Functional stone work for farm buildings, walls, and outdoor spaces.", maintenance: "Seasonal property care for large rural lots." },
  "mastic-beach": { character: "waterfront neighborhood", driveways: "Flat terrain makes driveway work straightforward. RCA is the budget favorite.", landscaping: "Sandy soil near the bay needs mulch and topsoil amendment for gardens.", masonry: "Small patios and walkways for waterfront enjoyment.", maintenance: "Salt air and storms mean regular cleanup and bed restoration." },
  "brookhaven": { character: "village center and rural lots", driveways: "Mix of village driveways and rural access roads needing different approaches.", landscaping: "Variable terrain — some lots need grading before any planting work.", masonry: "Retaining walls on sloped lots are a frequent request.", maintenance: "Mixed property sizes mean flexible service plans." },
  "eastport": { character: "residential east of the yard", driveways: "Standard residential driveways with easy truck access.", landscaping: "Large-lot properties perfect for full landscape design.", masonry: "Backyard patio installations and garden wall features.", maintenance: "Regular seasonal service for well-maintained neighborhoods." },
  "moriches": { character: "close to the yard", driveways: "Quick turnaround on driveway resurfacing — we're just minutes away.", landscaping: "Local gardens benefit from our proximity — material delivery is fast and flexible.", masonry: "Stone work for residential properties in the heart of our service area.", maintenance: "Our closest service area means lower costs and faster response." },
  "remsenburg": { character: "quiet residential hamlet", driveways: "Well-maintained residential driveways in a quiet neighborhood.", landscaping: "Established gardens needing seasonal refresh and professional care.", masonry: "Elegant walkways and small patio additions complement the hamlet's character.", maintenance: "Regular upkeep maintains Remsenburg's well-kept residential feel." },
  "speonk": { character: "close and accessible", driveways: "One of our closest delivery zones — fast turnaround on driveway projects.", landscaping: "Quick material delivery means competitive pricing on landscaping work.", masonry: "Residential stone work with fast project turnaround.", maintenance: "Cost-effective service given our proximity." },
  "westhampton": { character: "residential with waterfront", driveways: "South shore properties need proper drainage in driveway design.", landscaping: "Mix of year-round and seasonal properties needing different service levels.", masonry: "Patio and walkway work for both permanent and vacation homes.", maintenance: "Property prep for seasonal homeowners." },
  "east-patchogue": { character: "suburban residential", driveways: "Standard suburban driveways — bluestone and RCA are the top choices.", landscaping: "Garden bed installations and lawn renovation for residential lots.", masonry: "Backyard patio and walkway additions for family outdoor spaces.", maintenance: "Regular seasonal cleanup and bed maintenance." },
  "medford": { character: "central Suffolk suburban", driveways: "Suburban driveways with straightforward access and standard sizing.", landscaping: "Residential landscaping with focus on curb appeal and garden beds.", masonry: "Practical patio and walkway installations.", maintenance: "Standard residential maintenance plans." },
  "yaphank": { character: "rural and semi-rural", driveways: "Longer driveways on rural lots — gravel and RCA base work.", landscaping: "Large properties needing clearing, grading, and garden design.", masonry: "Retaining walls and functional stone features for rural properties.", maintenance: "Large-lot maintenance including clearing and seasonal prep." },
  "wading-river": { character: "North Shore residential", driveways: "Hilly North Shore terrain requires proper grading and drainage planning.", landscaping: "Wooded lots need clearing before garden work. Topsoil amendment common.", masonry: "Retaining walls on slopes and terraced garden construction.", maintenance: "Wooded lots generate heavy leaf fall — seasonal cleanup is essential." },
  "selden": { character: "suburban near 25A", driveways: "Standard suburban driveways along the Route 25A corridor.", landscaping: "Residential garden beds and lawn renovations.", masonry: "Backyard patios and walkway installations.", maintenance: "Regular seasonal service for suburban properties." },
  "coram": { character: "central Suffolk suburb", driveways: "Suburban residential driveways with standard sizing.", landscaping: "Garden bed mulching and lawn installation are top requests.", masonry: "Patio installations and walkway repairs.", maintenance: "Year-round grounds care for residential properties." },
};

function hashCode(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = ((h << 5) - h + str.charCodeAt(i)) | 0;
  return Math.abs(h);
}

async function main() {
  const { data: towns } = await sb.from("town_pages").select("slug, name, delivery_fee_cents, drive_minutes").eq("is_active", true).order("sort_order");

  if (!towns || towns.length === 0) { console.error("No towns"); return; }

  const targetTowns = towns.filter((t) => TOWN_SERVICE_CTX[t.slug]);
  console.log(`Generating ${SERVICES.length} services × ${targetTowns.length} towns = ${SERVICES.length * targetTowns.length} pages\n`);

  const rows: Array<Record<string, unknown>> = [];

  for (const svc of SERVICES) {
    for (const town of targetTowns) {
      const ctx = TOWN_SERVICE_CTX[town.slug];
      const slug = `${svc.type}-in-${town.slug}`;
      const svcLabel = svc.type.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
      const feeDisplay = `$${(town.delivery_fee_cents / 100).toFixed(0)}`;

      const h1Templates = [
        `${svcLabel} in ${town.name}, NY`,
        `${svcLabel} for ${town.name} Properties`,
        `Professional ${svcLabel} — ${town.name}, NY`,
        `${town.name} ${svcLabel} — Free Estimates`,
      ];

      const introTemplates = [
        `We provide ${svc.type.replace(/-/g, " ")} services across ${town.name} and surrounding areas. ${ctx[svc.type as keyof TownCtx] || ""} Materials come from our yard in Center Moriches, ${town.drive_minutes} minutes away.`,
        `${town.name} is ${ctx.character} — we know the area well. ${ctx[svc.type as keyof TownCtx] || ""} All materials sourced from our own supply yard.`,
        `${ctx[svc.type as keyof TownCtx] || ""} We handle the full job in ${town.name} — from material delivery (starting at ${feeDisplay}) to finished installation.`,
      ];

      const hash = hashCode(slug);

      const faqs = [
        { q: `How much do ${svc.type.replace(/-/g, " ")} services cost in ${town.name}?`, a: `Every project is different. We provide free on-site estimates — call (631) 874-6244 or submit a quote request online. Material delivery to ${town.name} starts at ${feeDisplay}.` },
        { q: `Do you do free estimates in ${town.name}?`, a: `Yes. We come to your ${town.name} property, assess the site, and give you a detailed quote with material and labor costs — no charge, no obligation.` },
        { q: `Can I supply my own materials or use your yard?`, a: `You can do either. Most customers choose our materials because they come from our own yard — no middleman markup, quality we control, and delivery is already built into the project.` },
      ];

      // Add service-specific FAQ
      if (svc.type === "driveways") {
        faqs.push({ q: `What stone do you recommend for ${town.name} driveways?`, a: `3/4" bluestone ($88/yd) is the premium choice. RCA ($20-27/yd) is the budget option. Both compact well — we'll recommend based on your conditions.` });
      } else if (svc.type === "landscaping") {
        faqs.push({ q: `What's included in a landscaping project?`, a: `Design, materials, labor, and cleanup. We handle everything from grading and soil prep to planting and mulching. Materials come from our yard at cost.` });
      } else if (svc.type === "masonry") {
        faqs.push({ q: `How long does a patio installation take?`, a: `Most residential patios take 3-5 days depending on size and base conditions. We handle base prep, drainage, stone installation, jointing, and cleanup.` });
      }

      rows.push({
        slug,
        service_type: svc.type,
        town_slug: town.slug,
        title: `${svcLabel} in ${town.name}, NY | Eastern LM`.substring(0, 60),
        meta_description: `Professional ${svc.type.replace(/-/g, " ")} in ${town.name}, NY. Free estimates, 30+ years experience. Materials from our own yard. Call (631) 874-6244.`.substring(0, 155),
        h1: h1Templates[hash % h1Templates.length],
        intro_paragraph: introTemplates[hash % introTemplates.length],
        local_context: ctx[svc.type as keyof TownCtx] || null,
        services_included: svc.servicesIncluded,
        related_product_slugs: svc.productSlugs,
        faqs,
      });
    }
  }

  console.log(`Generated ${rows.length} pages`);

  let count = 0;
  for (let i = 0; i < rows.length; i += 20) {
    const batch = rows.slice(i, i + 20);
    const { error } = await sb.from("service_town_pages").upsert(batch, { onConflict: "slug" });
    if (error) console.error(`Error at ${i}:`, error.message);
    else count += batch.length;
  }

  console.log(`Seeded ${count} service-town pages`);
}

main().catch(console.error);
