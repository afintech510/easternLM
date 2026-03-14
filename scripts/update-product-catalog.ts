/**
 * Product Catalog Enhancement Script
 *
 * Updates all bulk products with:
 *   - Professional descriptions (Suffolk County focused)
 *   - Recommended uses tags
 *   - Pairs-well-with cross-sell slugs
 *
 * Usage: npx tsx scripts/update-product-catalog.ts
 *        npx tsx scripts/update-product-catalog.ts --dry-run
 */

import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import { resolve } from "path";

config({ path: resolve(__dirname, "..", ".env.local") });

const DRY_RUN = process.argv.includes("--dry-run");

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing SUPABASE env vars");
  return createClient(url, key, { auth: { persistSession: false } });
}

// ─── Bulk Product Content ────────────────────────────────────────────

interface ProductUpdate {
  slug: string;
  description: string;
  recommended_uses: string[];
  pairs_well_with: string[];
}

const BULK_UPDATES: ProductUpdate[] = [
  // ── MULCH ──────────────────────────────────────────────────────────
  {
    slug: "black-mulch",
    description:
      "Our most popular mulch across Suffolk County. Triple-ground, dyed black for a clean, uniform look that holds color through the season. Suppresses weeds, retains moisture, and gives beds a finished, professional appearance.",
    recommended_uses: ["Garden beds", "Foundation plantings", "Tree rings", "Walkway borders", "Commercial landscaping"],
    pairs_well_with: ["topsoil-screened-organic", "compost-certified-organic-rich-in-nutrients", "dark-natural-mulch"],
  },
  {
    slug: "chocolate-mulch",
    description:
      "Rich chocolate-brown triple-ground mulch popular with homeowners in Manorville, Westhampton, and the Hamptons for a warm, natural aesthetic. Holds its deep brown color and breaks down slowly for lasting coverage.",
    recommended_uses: ["Garden beds", "Decorative borders", "Estate landscaping", "Perennial beds", "Entryway plantings"],
    pairs_well_with: ["topsoil-screened-organic", "compost-certified-organic-rich-in-nutrients", "black-mulch"],
  },
  {
    slug: "dark-natural-mulch",
    description:
      "Uncolored, natural hardwood mulch with a dark brown tone. The budget-friendly choice for large coverage areas — ideal for contractors and landscapers handling multiple jobs across the East End. Breaks down to enrich soil over time.",
    recommended_uses: ["Large area coverage", "Contractor projects", "Playground surfacing", "Erosion control", "Budget landscaping"],
    pairs_well_with: ["topsoil-screened-organic", "black-mulch", "clean-fill-exc-dirt-unscreened"],
  },
  {
    slug: "red-mulch",
    description:
      "Vibrant red-dyed triple-ground hardwood mulch for bold landscape statements. Holds its bright color through summer and stands out against green foliage and light-colored stone. Popular for commercial properties and accent beds.",
    recommended_uses: ["Accent beds", "Commercial properties", "Contrast plantings", "Curb appeal upgrades", "Municipal landscaping"],
    pairs_well_with: ["34-inch-whitestone", "12-inch-whitestone", "topsoil-screened-organic"],
  },

  // ── TOPSOIL & FILL ────────────────────────────────────────────────
  {
    slug: "topsoil-screened-organic",
    description:
      "Screened organic topsoil, free of rocks and debris. The go-to for lawn installations, garden beds, and grading projects across Suffolk County. Rich in organic matter for healthy root establishment in Long Island's sandy soil.",
    recommended_uses: ["Lawn installation", "Garden beds", "Grading and leveling", "Raised beds", "Sod preparation"],
    pairs_well_with: ["compost-certified-organic-rich-in-nutrients", "fine-sand", "black-mulch"],
  },
  {
    slug: "compost-certified-organic-rich-in-nutrients",
    description:
      "Certified organic compost packed with nutrients. Mix into sandy Long Island soil to improve water retention and feed plantings naturally. Ideal as a top-dress for lawns or amendment for vegetable gardens throughout the East End.",
    recommended_uses: ["Soil amendment", "Top-dressing lawns", "Vegetable gardens", "Flower beds", "Organic farming"],
    pairs_well_with: ["topsoil-screened-organic", "black-mulch", "fine-sand"],
  },
  {
    slug: "clean-fill-exc-dirt-unscreened",
    description:
      "Excavated fill dirt, unscreened. Used for raising grade, backfilling foundations, and filling low spots. An economical solution for large-volume grading and site prep work on Suffolk County properties.",
    recommended_uses: ["Grade raising", "Backfill", "Site preparation", "Low spot filling", "Foundation work"],
    pairs_well_with: ["bank-run-sandy-fill-w-gravel-varying-in-size", "topsoil-screened-organic", "dump-fill-per-yard"],
  },
  {
    slug: "bank-run-sandy-fill-w-gravel-varying-in-size",
    description:
      "Natural mix of sand and gravel in varying sizes, excavated directly from the bank. Compacts well and drains freely — ideal for sub-base work, driveway foundations, and drainage projects across Long Island.",
    recommended_uses: ["Driveway sub-base", "Drainage backfill", "Compactable fill", "French drain bedding", "Pipe bedding"],
    pairs_well_with: ["clean-fill-exc-dirt-unscreened", "34-inch-wash-gravel", "state-concrete-sand"],
  },
  {
    slug: "dump-fill-per-yard",
    description:
      "Economical fill material for large-volume projects. Use for raising grade, filling holes, and general site work where screened material isn't required.",
    recommended_uses: ["Grade raising", "Hole filling", "Site work", "Backfill"],
    pairs_well_with: ["clean-fill-exc-dirt-unscreened", "bank-run-sandy-fill-w-gravel-varying-in-size"],
  },

  // ── GRAVEL & STONE ────────────────────────────────────────────────
  {
    slug: "34-inch-wash-gravel",
    description:
      "Clean, washed 3/4\" gravel — the standard choice for drainage, driveways, and sub-base work. Compacts well while maintaining excellent drainage. A workhorse material used daily by contractors and homeowners across Suffolk County.",
    recommended_uses: ["Driveways", "Drainage systems", "French drains", "Sub-base layer", "Parking areas"],
    pairs_well_with: ["state-concrete-sand", "bank-run-sandy-fill-w-gravel-varying-in-size", "34-inch-bluestone"],
  },
  {
    slug: "38-inch-pea-gravel",
    description:
      "Smooth, rounded 3/8\" pea gravel with natural earth tones. A popular decorative stone for walkways, patios, and around pools throughout the Hamptons and South Shore. Comfortable underfoot and excellent for drainage applications.",
    recommended_uses: ["Walkways", "Patio fill", "Pool surrounds", "Dog runs", "Drainage beds"],
    pairs_well_with: ["34-inch-wash-gravel", "fine-sand", "38-inch-bluestone"],
  },
  {
    slug: "14-inch-pea-gravel-birdeye",
    description:
      "Fine 1/4\" birdeye pea gravel with a smooth, rounded profile. Perfect for filling paver joints, decorative ground cover, and areas where a more refined stone finish is needed.",
    recommended_uses: ["Paver joints", "Decorative ground cover", "Zen gardens", "Bocce courts", "Playground surfacing"],
    pairs_well_with: ["38-inch-pea-gravel", "fine-sand", "bluestone-screenings-stone-dust-fines"],
  },
  {
    slug: "34-inch-bluestone",
    description:
      "Angular 3/4\" Pennsylvania bluestone with a blue-gray color. Compacts firmly for driveways and paths while providing superior drainage. The premium driveway material favored across the East End for its clean look and durability.",
    recommended_uses: ["Premium driveways", "Walkways", "Drainage base", "Landscape borders", "Patio sub-base"],
    pairs_well_with: ["bluestone-screenings-stone-dust-fines", "38-inch-bluestone", "34-inch-wash-gravel"],
  },
  {
    slug: "38-inch-bluestone",
    description:
      "Crushed 3/8\" bluestone with angular edges. Ideal as a top-dress for walkways and patios — packs tight for a firm, walkable surface. Also used for drainage and as a decorative driveway topper with classic blue-gray tones.",
    recommended_uses: ["Walkway topping", "Patio surface", "Driveway top-dress", "Landscape accents", "Around flagstone"],
    pairs_well_with: ["bluestone-screenings-stone-dust-fines", "34-inch-bluestone", "38-inch-pea-gravel"],
  },
  {
    slug: "bluestone-screenings-stone-dust-fines",
    description:
      "Fine bluestone dust used as a setting bed under pavers, flagstone, and patio blocks. Compacts to a smooth, level surface and locks paving materials in place. Essential for any hardscape installation in Suffolk County.",
    recommended_uses: ["Paver base", "Flagstone setting bed", "Leveling compound", "Patio block base", "Joint filler"],
    pairs_well_with: ["34-inch-bluestone", "state-concrete-sand", "38-inch-bluestone"],
  },
  {
    slug: "34-inch-burgundy-red-stone",
    description:
      "Distinctive 3/4\" red/burgundy decorative stone that brings warm color contrast to landscapes. Eye-catching in garden borders, around plantings, and as a driveway accent. Popular in Westhampton Beach and Quogue estates.",
    recommended_uses: ["Decorative borders", "Garden accents", "Driveway accents", "Contrast landscaping", "Estate driveways"],
    pairs_well_with: ["38-inch-burgundy-red-stone", "34-inch-whitestone", "black-mulch"],
  },
  {
    slug: "38-inch-burgundy-red-stone",
    description:
      "Fine 3/8\" red/burgundy crushed stone for a refined decorative finish. Use as walkway topping, in garden beds for color contrast, or around pools. The smaller size packs tighter for a smoother surface.",
    recommended_uses: ["Walkway topping", "Pool surrounds", "Garden beds", "Decorative ground cover", "Accent borders"],
    pairs_well_with: ["34-inch-burgundy-red-stone", "12-inch-whitestone", "38-inch-pea-gravel"],
  },
  {
    slug: "34-inch-whitestone",
    description:
      "Bright white 3/4\" decorative stone that reflects light and creates clean, modern landscape aesthetics. A standout choice for driveways, borders, and garden beds across the Hamptons where a crisp, polished look is desired.",
    recommended_uses: ["Modern landscapes", "Hampton estate driveways", "Light-reflecting borders", "Pool surrounds", "Rock gardens"],
    pairs_well_with: ["12-inch-whitestone", "34-inch-burgundy-red-stone", "black-mulch"],
  },
  {
    slug: "12-inch-whitestone",
    description:
      "Smaller 1/2\" white decorative stone with a refined, clean finish. Perfect for tight spaces, garden accents, and applications where a finer white stone coverage is preferred. Drains well and reflects light beautifully.",
    recommended_uses: ["Garden accents", "Patio edging", "Fine decorative cover", "Around stepping stones", "Planter beds"],
    pairs_well_with: ["34-inch-whitestone", "38-inch-burgundy-red-stone", "chocolate-mulch"],
  },
  {
    slug: "large-pocono-river-rock-1-12-inch-2-12-inch-2",
    description:
      "Natural Pocono river rock in 1.5\"–2.5\" sizes with smooth, rounded profiles and mixed earth tones. Used for dry creek beds, water features, and decorative borders. Each stone is naturally tumbled for an organic, high-end look.",
    recommended_uses: ["Dry creek beds", "Water features", "Decorative borders", "Erosion control", "Drainage swales"],
    pairs_well_with: ["small-pocono-river-rock-58-inch-1-inch-1", "38-inch-pea-gravel", "topsoil-screened-organic"],
  },
  {
    slug: "small-pocono-river-rock-58-inch-1-inch-1",
    description:
      "Smaller 5/8\"–1\" Pocono river rock with smooth, naturally tumbled profiles. Ideal for ground cover, between stepping stones, and smaller-scale water features. Beautiful mixed earth tones complement any landscape style.",
    recommended_uses: ["Ground cover", "Stepping stone fill", "Small water features", "Garden paths", "Japanese gardens"],
    pairs_well_with: ["large-pocono-river-rock-1-12-inch-2-12-inch-2", "38-inch-pea-gravel", "black-mulch"],
  },
  {
    slug: "58-inch-crushed-natural-gravel",
    description:
      "Crushed 5/8\" natural gravel with angular edges and natural earth tones. Compacts well for stable walking surfaces and driveways while providing good drainage. A versatile material for both functional and decorative applications.",
    recommended_uses: ["Driveways", "Walking paths", "Decorative surfaces", "Landscape borders", "Drainage areas"],
    pairs_well_with: ["34-inch-wash-gravel", "38-inch-pea-gravel", "bluestone-screenings-stone-dust-fines"],
  },
  {
    slug: "xlarge-natural-gravel-per-yard",
    description:
      "Extra-large natural gravel for heavy-duty drainage, erosion control, and decorative boulder borders. The largest loose stone we carry — ideal for stabilizing slopes and creating bold landscape features.",
    recommended_uses: ["Heavy drainage", "Erosion control", "Slope stabilization", "Bold landscape features", "Retaining wall backfill"],
    pairs_well_with: ["34-inch-wash-gravel", "large-pocono-river-rock-1-12-inch-2-12-inch-2", "bank-run-sandy-fill-w-gravel-varying-in-size"],
  },
  {
    slug: "34-inch-drainage-rock-per-yard",
    description:
      "Clean 3/4\" drainage rock specifically graded for French drains, retaining wall backfill, and foundation drainage systems. Free of fines to ensure maximum water flow. Essential for any drainage project on Long Island.",
    recommended_uses: ["French drains", "Retaining wall backfill", "Foundation drainage", "Curtain drains", "Dry wells"],
    pairs_well_with: ["34-inch-wash-gravel", "bank-run-sandy-fill-w-gravel-varying-in-size", "fine-sand"],
  },

  // ── SAND ───────────────────────────────────────────────────────────
  {
    slug: "fine-sand",
    description:
      "Fine-grain washed sand for masonry work, leveling, and above-ground pool bases. Smooth and consistent texture makes it the right choice for mixing mortar, setting pavers, and sandbox applications across Suffolk County.",
    recommended_uses: ["Mason sand", "Paver bedding", "Pool bases", "Sandbox fill", "Mortar mixing"],
    pairs_well_with: ["state-concrete-sand", "bluestone-screenings-stone-dust-fines", "topsoil-screened-organic"],
  },
  {
    slug: "state-concrete-sand",
    description:
      "State-spec concrete sand meeting NY DOT standards. Used in concrete mixes, pipe bedding, and as a structural fill. Coarser than mason sand with controlled gradation for consistent performance in structural applications.",
    recommended_uses: ["Concrete mixing", "Pipe bedding", "Structural fill", "Road base", "Utility trench backfill"],
    pairs_well_with: ["fine-sand", "34-inch-wash-gravel", "bank-run-sandy-fill-w-gravel-varying-in-size"],
  },

  // ── RCA (Recycled Concrete Aggregate) ──────────────────────────────
  {
    slug: "state-grade-rca-95-concrete-made-to-spec-not-certified",
    description:
      "95% recycled concrete aggregate made to state specifications. Compacts into a solid, durable base for driveways, parking areas, and construction pads. A cost-effective, eco-friendly alternative to virgin stone.",
    recommended_uses: ["Driveway base", "Parking areas", "Construction pads", "Road base", "Temporary access roads"],
    pairs_well_with: ["regular-rca-blend-of-concrete-brick-and-blacktop", "34-inch-wash-gravel", "bank-run-sandy-fill-w-gravel-varying-in-size"],
  },
  {
    slug: "regular-rca-blend-of-concrete-brick-and-blacktop",
    description:
      "Recycled aggregate blend of concrete, brick, and blacktop. The most economical base material for driveways, access roads, and fill applications. Compacts well and hardens over time for a stable surface.",
    recommended_uses: ["Budget driveways", "Access roads", "Construction fill", "Yard stabilization", "Equipment pads"],
    pairs_well_with: ["state-grade-rca-95-concrete-made-to-spec-not-certified", "bank-run-sandy-fill-w-gravel-varying-in-size", "34-inch-wash-gravel"],
  },
  {
    slug: "concrete-screenings-concrete-dust-fines",
    description:
      "Fine recycled concrete dust and screenings. Packs extremely tight for a solid, hard surface. Used as a budget-friendly alternative to bluestone screenings for setting beds, leveling, and packing under pavers.",
    recommended_uses: ["Budget paver base", "Leveling compound", "Surface packing", "Pathway base", "Under slab fill"],
    pairs_well_with: ["bluestone-screenings-stone-dust-fines", "state-grade-rca-95-concrete-made-to-spec-not-certified", "state-concrete-sand"],
  },

  // ── SALT & WINTER ──────────────────────────────────────────────────
  {
    slug: "sand-salt-mix-8020-per-yard",
    description:
      "80/20 sand-salt mix for winter road and parking lot treatment. The sand provides traction while the salt melts ice. Bulk quantities available for municipal, commercial, and residential snow removal operations on Long Island.",
    recommended_uses: ["Parking lot deicing", "Road treatment", "Residential driveways", "Commercial snow removal", "Municipal stockpiling"],
    pairs_well_with: ["rock-salt-per-yard", "sand-salt-mix-8020-12-yard"],
  },
  {
    slug: "sand-salt-mix-8020-12-yard",
    description:
      "Half-yard of 80/20 sand-salt mix — perfect for homeowners and small commercial properties preparing for Suffolk County winters. Same effective formula in a quantity that fits a pickup truck.",
    recommended_uses: ["Residential deicing", "Small parking areas", "Walkway treatment", "Pickup truck loads"],
    pairs_well_with: ["sand-salt-mix-8020-per-yard", "rock-salt-12-yard"],
  },
  {
    slug: "rock-salt-per-yard",
    description:
      "Pure rock salt in bulk for serious winter operations. Melts ice fast down to 15°F. Used by snow removal contractors, municipalities, and property managers across Long Island for efficient winter storm response.",
    recommended_uses: ["Snow removal operations", "Parking lot deicing", "Road treatment", "Municipal stockpiles", "Commercial properties"],
    pairs_well_with: ["sand-salt-mix-8020-per-yard", "rock-salt-12-yard"],
  },
  {
    slug: "rock-salt-12-yard",
    description:
      "Half-yard of rock salt for homeowners and small-scale winter prep. Enough to treat a residential driveway and walkways through several storms. Keep a stockpile ready for Suffolk County's unpredictable winters.",
    recommended_uses: ["Residential driveways", "Walkways", "Home winter prep", "Small commercial lots"],
    pairs_well_with: ["rock-salt-per-yard", "sand-salt-mix-8020-12-yard"],
  },
];

// ─── Main ─────────────────────────────────────────────────────────────

async function main() {
  const supabase = getSupabase();

  console.log("=== Product Catalog Update ===\n");
  console.log(`Mode: ${DRY_RUN ? "DRY RUN" : "LIVE"}`);
  console.log(`Bulk product updates: ${BULK_UPDATES.length}\n`);

  // Update bulk products
  let updated = 0;
  let errors = 0;

  for (const update of BULK_UPDATES) {
    if (DRY_RUN) {
      console.log(`  [dry] ${update.slug}: "${update.description.substring(0, 60)}..."`);
      updated++;
      continue;
    }

    const { error } = await supabase
      .from("products")
      .update({
        description: update.description,
        recommended_uses: update.recommended_uses,
        pairs_well_with: update.pairs_well_with,
      })
      .eq("slug", update.slug);

    if (error) {
      console.error(`  ERROR ${update.slug}: ${error.message}`);
      errors++;
    } else {
      console.log(`  Updated: ${update.slug}`);
      updated++;
    }
  }

  console.log(`\nBulk products: ${updated} updated, ${errors} errors`);

  // ── Update non-bulk products with generic category descriptions ────
  // For products with empty descriptions, generate from category + name

  if (!DRY_RUN) {
    const { data: emptyDesc } = await supabase
      .from("products")
      .select("id, name, slug, delivery_type")
      .eq("is_active", true)
      .eq("description", "");

    if (emptyDesc && emptyDesc.length > 0) {
      console.log(`\nUpdating ${emptyDesc.length} products with empty descriptions...`);
      let genCount = 0;
      for (const p of emptyDesc) {
        // Skip bulk products (already handled above)
        if (p.delivery_type === "bulk") continue;

        // Generate a simple description from the product name
        const desc = generateSimpleDescription(p.name);
        if (desc) {
          const { error } = await supabase
            .from("products")
            .update({ description: desc })
            .eq("id", p.id);
          if (!error) genCount++;
        }
      }
      console.log(`  Generated ${genCount} basic descriptions for non-bulk products`);
    }
  }

  console.log("\n=== Complete ===");
}

function generateSimpleDescription(name: string): string {
  const lower = name.toLowerCase();

  // Bagged products
  if (lower.includes("bag") || lower.includes("50 lb") || lower.includes("94lb") || lower.includes("80 lb")) {
    if (lower.includes("portland")) return "Portland cement for concrete and mortar work. Available in convenient bags for small to medium projects.";
    if (lower.includes("mortar")) return "Pre-mixed mortar for brick, block, and stone work. Ready to use with just water.";
    if (lower.includes("concrete")) return "Pre-mixed concrete for posts, footings, and small structural projects. Just add water.";
    if (lower.includes("quikrete")) return "Fast-setting concrete and masonry product for quick repairs and small projects.";
    if (lower.includes("salt")) return "Bagged rock salt for winter ice treatment on driveways, walkways, and parking areas.";
    if (lower.includes("mulch")) return "Bagged mulch for small garden beds and touch-up applications. Convenient for pickup.";
    if (lower.includes("topsoil") || lower.includes("soil")) return "Bagged topsoil for small garden and planting projects. Easy to transport and spread.";
    if (lower.includes("sand")) return "Bagged sand for small masonry and leveling projects. Convenient for pickup customers.";
    if (lower.includes("gravel") || lower.includes("stone")) return "Bagged stone for small landscape and drainage projects. Easy to handle and transport.";
    if (lower.includes("stucco")) return "Stucco mix for exterior wall finishing and repair. Professional-grade formula.";
    return "Available in convenient bags for smaller projects and easy transport.";
  }

  // Cement blocks
  if (lower.includes("block") || lower.includes("cmu")) {
    return "Concrete masonry unit for walls, foundations, and structural applications. Standard construction grade.";
  }

  // Rebar / reinforcement
  if (lower.includes("rebar") || lower.includes("wire mesh") || lower.includes("reinforc")) {
    return "Steel reinforcement for concrete foundations, slabs, and structural work. Standard construction grade.";
  }

  // Pavers
  if (lower.includes("paver") || lower.includes("patio block")) {
    return "Concrete paver for patios, walkways, and outdoor living spaces. Durable and weather-resistant.";
  }

  // Tools
  if (lower.includes("wheelbarrow") || lower.includes("shovel") || lower.includes("rake") || lower.includes("tool")) {
    return "Quality landscape and masonry tool built for professional daily use.";
  }

  // Brick
  if (lower.includes("brick")) {
    return "Construction brick for walls, veneer, and masonry projects. Available for pickup or delivery.";
  }

  // Chimney
  if (lower.includes("chimney") || lower.includes("flue")) {
    return "Chimney and flue component for fireplace and heating system construction.";
  }

  // Flagstone / stepping stones
  if (lower.includes("flagstone") || lower.includes("stepper") || lower.includes("stepping")) {
    return "Natural stone for walkways, patios, and landscape stepping paths. Each piece has unique character.";
  }

  // Wallstone
  if (lower.includes("wallstone") || lower.includes("wall stone") || lower.includes("ledgestone") || lower.includes("stacking")) {
    return "Natural stone for retaining walls, garden borders, and decorative landscape walls.";
  }

  // Treads
  if (lower.includes("tread")) {
    return "Natural stone tread for steps, staircases, and raised patio transitions. Cut to consistent dimensions.";
  }

  // Drainage
  if (lower.includes("drain")) {
    return "Drainage component for managing water flow and protecting foundations and landscapes.";
  }

  // Propane
  if (lower.includes("propane")) {
    return "Propane tank fill service. Bring your tank to the yard for a quick refill.";
  }

  // Firewood
  if (lower.includes("firewood") || lower.includes("fire wood")) {
    return "Seasoned firewood for fireplaces, fire pits, and outdoor heating. Split and ready to burn.";
  }

  // Grass seed
  if (lower.includes("grass seed") || lower.includes("seed mix")) {
    return "Premium grass seed blend suited for Long Island's climate and soil conditions.";
  }

  // Chemicals
  if (lower.includes("sealer") || lower.includes("poly sweep") || lower.includes("chemical")) {
    return "Professional-grade landscape and hardscape chemical product.";
  }

  // Generic fallback based on name
  return `${name}. Available for pickup at our Center Moriches yard or delivery across Suffolk County.`;
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
