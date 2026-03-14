/**
 * WooCommerce → Supabase Product Migration Script
 *
 * Reads the WC product export CSV and generates:
 *   1. SQL INSERT statements for seed.sql (stdout)
 *   2. migration-report.md (written to project root)
 *
 * Usage: npx tsx scripts/migrate-wc-products.ts
 */

import { readFileSync, writeFileSync } from "fs";
import { parse } from "csv-parse/sync";
import { resolve } from "path";

// ─── Types ──────────────────────────────────────────────────────────

interface WcRow {
  ID: string;
  Type: string;
  Name: string;
  Published: string;
  "Visibility in catalog": string;
  "Short description": string;
  Description: string;
  "Regular price": string;
  Categories: string;
  Images: string;
  Parent: string;
  "Attribute 1 name": string;
  "Attribute 1 value(s)": string;
  "Attribute 2 name": string;
  "Attribute 2 value(s)": string;
  "Attribute 3 name": string;
  "Attribute 3 value(s)": string;
  "In stock?": string;
  "Tax status": string;
}

interface Product {
  wcId: number;
  name: string;
  slug: string;
  categorySlug: string;
  deliveryType: "bulk" | "non-bulk";
  materialClass: "mulch" | "default";
  pricePerUnitCents: number;
  unit: string;
  unitDisplay: string;
  minQty: number;
  maxQty: number;
  stepQty: number;
  description: string;
  images: string[];
  isTaxable: boolean;
  isActive: boolean;
  sortOrder: number;
  priceNote: string;
}

// ─── Constants ──────────────────────────────────────────────────────

const SKIP_IDS = new Set([3270, 3271]); // Delivery products

const SKIP_CATEGORIES = new Set([
  "Capital-Forest",
  "Capital Forest Products",
  "Fence",
  "Lumber",
  "Shingles",
  "Siding",
  "Trim",
  "Underlayment",
]);

const SKIP_NAMES = new Set([
  "Custom-Item",
  "Red Pencil",
  "SHAY428",
]);

const FB_SPECIAL_PREFIX = "FB-Special";

// WC category → website category slug mapping
const CATEGORY_MAP: Record<string, string> = {
  // Bulk materials
  Mulch: "mulch",
  Topsoil: "topsoil-fill",
  Fill: "topsoil-fill",
  Gravel: "gravel-stone",
  Bluestone: "gravel-stone",
  Redstone: "gravel-stone",
  Whitestone: "gravel-stone",
  "River Rock": "gravel-stone",
  Dust: "gravel-stone",
  GravelWhitestone: "gravel-stone",
  Sand: "sand",
  // Natural stone
  "2024-Stone": "natural-stone",
  Flagstone: "natural-stone",
  "Stepping Stones": "natural-stone",
  Boulders: "natural-stone",
  Cobblestone: "natural-stone",
  Wallstone: "natural-stone",
  "Stacking Stone": "natural-stone",
  Ledgestone: "natural-stone",
  Flagging: "natural-stone",
  Treads: "natural-stone",
  "Colonial Flagstone": "natural-stone",
  "Cultured Stone Veneer": "natural-stone",
  // Masonry & Concrete (merged)
  "Cement Block": "masonry-concrete",
  Chimney: "masonry-concrete",
  Brick: "masonry-concrete",
  Construction: "masonry-concrete",
  Reinforcement: "masonry-concrete",
  Masonry: "masonry-concrete",
  Concrete: "masonry-concrete",
  Cement: "masonry-concrete",
  // Pavers & Hardscape
  Pavers: "pavers",
  "Patio Block": "pavers",
  // Bagged & Bucket
  "Bagged Material": "bagged-material",
  // Tools
  Tools: "tools",
  Hardware: "tools",
  Shop: "tools",
  // Chemicals
  Chemicals: "chemicals",
  // Landscape (merged with drainage)
  Landscape: "landscape",
  Drainage: "landscape",
  // Outdoor Living
  "Fireplace & Access.": "outdoor-living",
  Propane: "outdoor-living",
  "Grass Seed": "outdoor-living",
  // Rentals & Services
  Rental: "rentals-services",
  Dumping: "rentals-services",
  "Gravel Driveway Service": "rentals-services",
  Uncategorized: "outdoor-living", // fallback for miscategorized items
};

// Bulk material WC IDs with authoritative per-yard prices (cents)
const BULK_PRODUCTS: Record<number, { pricePerYardCents: number; materialClass: "mulch" | "default" }> = {
  3272: { pricePerYardCents: 6000, materialClass: "default" },   // Fine Sand
  3274: { pricePerYardCents: 6000, materialClass: "default" },   // State Concrete Sand
  3276: { pricePerYardCents: 8000, materialClass: "default" },   // 3/4" Wash Gravel
  3278: { pricePerYardCents: 7500, materialClass: "default" },   // 3/8" Pea Gravel
  3280: { pricePerYardCents: 8800, materialClass: "default" },   // 3/4" Bluestone
  3282: { pricePerYardCents: 8800, materialClass: "default" },   // 3/8" Bluestone
  3284: { pricePerYardCents: 8500, materialClass: "default" },   // Bluestone Screenings
  3285: { pricePerYardCents: 10500, materialClass: "default" },  // 3/4" Burgundy
  3287: { pricePerYardCents: 10500, materialClass: "default" },  // 3/8" Burgundy
  3289: { pricePerYardCents: 12500, materialClass: "default" },  // 3/4" Whitestone
  3291: { pricePerYardCents: 12500, materialClass: "default" },  // 1/2" Whitestone
  3293: { pricePerYardCents: 13500, materialClass: "default" },  // Large Pocono River Rock
  3295: { pricePerYardCents: 13500, materialClass: "default" },  // Small Pocono River Rock
  3297: { pricePerYardCents: 1500, materialClass: "default" },   // Clean Fill
  3299: { pricePerYardCents: 1800, materialClass: "default" },   // Bank Run
  3300: { pricePerYardCents: 2400, materialClass: "default" },   // Topsoil
  3302: { pricePerYardCents: 3200, materialClass: "default" },   // Compost
  3304: { pricePerYardCents: 2000, materialClass: "mulch" },     // Dark Natural Mulch
  3306: { pricePerYardCents: 3000, materialClass: "mulch" },     // Black Mulch
  3308: { pricePerYardCents: 3000, materialClass: "mulch" },     // Chocolate Mulch
  3310: { pricePerYardCents: 3800, materialClass: "mulch" },     // Red Mulch
  3312: { pricePerYardCents: 2700, materialClass: "default" },   // State Grade RCA
  3313: { pricePerYardCents: 2000, materialClass: "default" },   // Regular RCA
  3314: { pricePerYardCents: 3000, materialClass: "default" },   // Concrete Screenings
  11473: { pricePerYardCents: 9000, materialClass: "default" },  // 1/4" Pea Gravel (Birdeye)
};

// Additional bulk products (sold per yard but not in the main table)
const ADDITIONAL_BULK: Set<number> = new Set([
  9316,   // Sand-Salt Mix per yard
  15755,  // Sand-Salt Mix half yard — actually has its own price
  13691,  // 3/4" Drainage Rock per yard
  11977,  // 5/8" Crushed Natural Gravel per yard
  13953,  // XLarge Natural Gravel per yard
  11152,  // Dump Fill per yard
  20451,  // Rock Salt per yard
  20452,  // Rock Salt half yard
]);

// ─── Helpers ────────────────────────────────────────────────────────

function stripHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<\/?(p|div|ul|ol|li|h[1-6]|span|strong|em|b|i|a|table|tr|td|th|thead|tbody)[^>]*>/gi, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/â/g, "—")
    .replace(/â/g, "'")
    .replace(/â/g, '"')
    .replace(/â/g, '"')
    .replace(/Â/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[""]/g, "-inch")
    .replace(/['"']/g, "")
    .replace(/&amp;/g, "and")
    .replace(/&/g, "and")
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .substring(0, 80);
}

function escSql(s: string): string {
  return s.replace(/'/g, "''");
}

function parseImages(imagesStr: string): string[] {
  if (!imagesStr || imagesStr.trim() === "") return [];
  return imagesStr
    .split(", ")
    .map((u) => u.trim())
    .filter((u) => u.startsWith("http"))
    .filter((u) => !u.includes("get_start.jpg")); // filter placeholder images
}

function parseParentId(parentStr: string): number | null {
  if (!parentStr) return null;
  const match = parentStr.match(/id:(\d+)/);
  return match ? parseInt(match[1], 10) : null;
}

function parsePriceCents(priceStr: string): number {
  if (!priceStr || priceStr.trim() === "") return 0;
  const cleaned = priceStr.replace(/[,$]/g, "").trim();
  const val = parseFloat(cleaned);
  return isNaN(val) ? 0 : Math.round(val * 100);
}

function mapCategory(wcCategories: string, wcId: number, name: string): string {
  if (!wcCategories) return "outdoor-living";

  const cats = wcCategories.split(", ").map((c) => c.trim());

  // ── Bagged items override: if "Bagged Material" is a category, always bag it ──
  if (cats.includes("Bagged Material")) return "bagged-material";

  // ── Bucket items: 5-gallon buckets of gravel/sand go to bagged-material ──
  if (name.includes("5 gallon bucket") || name.includes("5-Gallons")) return "bagged-material";

  // ── Bagged mulch (2 cu ft bags) ──
  if (name.includes("Mulch") && (name.includes("cu ft") || name.includes("cu. ft"))) return "bagged-material";

  // ── Bagged gravel (50lbs bags) ──
  if (name.startsWith("Bagged ") && name.includes("Lbs")) return "bagged-material";

  // ── Bagged salt ──
  if (name.includes("Bagged Rock Salt") || name.includes("50 LB Bag Rock Salt")) return "bagged-material";

  // ── Bagged soil/lawn products ──
  if (name.includes("Scotts Turf") || name.includes("Miracle-Gro") || name.includes("Compost Manure")) return "bagged-material";

  // ── Name-based overrides ──
  if (name.includes("MSI Mountain Bluestone")) return "natural-stone";
  if (name.includes("ESW Slate Southern Ledgestone")) return "natural-stone";
  if (name.includes("Vintage White") && name.includes("Sawcut")) return "natural-stone";
  if (name.includes("Bluestone Thermal Flagging")) return "natural-stone";
  if (name.includes("Treads - Bluestone")) return "natural-stone";
  if (name.includes("Smooth Bluestone Steppers")) return "natural-stone";
  if (name.includes("Glacial Black Stacked")) return "natural-stone";
  if (name.includes("HiGro Guard")) return "chemicals";
  if (name.includes("Mulch Installation")) return "rentals-services";
  if (name.includes("INSTALL PER YARD")) return "rentals-services";
  if (name.includes("Pallet Deposit")) return "rentals-services";
  if (name.includes("Clean fill dumping")) return "rentals-services";
  if (name.includes("Dump Fill")) return "rentals-services";
  if (name.includes("Dump Leaves")) return "rentals-services";
  if (name.includes("Dump Trailer") || name.includes("DEPOSIT Dump")) return "rentals-services";
  if (name.includes("Firewood") || name.includes("FIREWOOD")) return "outdoor-living";
  if (name.includes("Grass Seed") || cats.includes("Grass Seed")) return "outdoor-living";
  if (name.includes("Dynamite 25lb") || name.includes("Sun & Shade Mix") || name.includes("Super Mix 25lb")) return "outdoor-living";
  if (name.includes("Sand-Salt") || name.includes("Rock Salt per") || name === "Rock Salt (1/2 Yard)") return "gravel-stone";
  if (name.includes("Clean Fill") || name.includes("Bank Run")) return "topsoil-fill";
  if (name.includes("Driveway Gravel Service")) return "rentals-services";
  if (name.includes("Poly Sweep")) return "pavers";
  if (name.includes("Drainage Cover") || name.includes("Drainage Rock")) return "landscape";

  // Priority order for category resolution
  const priorityOrder = [
    "Mulch", "Topsoil", "Sand", "Gravel", "Bluestone", "Cobblestone",
    "Flagstone", "Stepping Stones", "Boulders", "Wallstone", "Stacking Stone",
    "Ledgestone", "Treads", "Flagging", "2024-Stone", "Colonial Flagstone",
    "Cultured Stone Veneer", "River Rock", "Redstone", "Whitestone", "Dust",
    "Cement Block", "Chimney", "Brick", "Reinforcement",
    "Concrete", "Cement",
    "Pavers", "Patio Block",
    "Bagged Material",
    "Tools", "Hardware", "Shop",
    "Chemicals",
    "Landscape", "Drainage",
    "Rental", "Dumping",
    "Propane", "Fireplace & Access.", "Grass Seed",
    "Construction", "Masonry",
    "Fill", "GravelWhitestone",
  ];

  for (const pc of priorityOrder) {
    if (cats.includes(pc)) {
      return CATEGORY_MAP[pc] || "outdoor-living";
    }
  }

  // Fallback
  for (const cat of cats) {
    if (CATEGORY_MAP[cat]) return CATEGORY_MAP[cat];
  }

  return "outdoor-living";
}

function shouldSkip(row: WcRow): { skip: boolean; reason?: string } {
  const id = parseInt(row.ID, 10);
  const name = row.Name?.trim() || "";
  const cats = row.Categories || "";

  if (SKIP_IDS.has(id)) return { skip: true, reason: "Delivery product" };
  if (SKIP_NAMES.has(name)) return { skip: true, reason: "POS/internal item" };

  // Skip Capital-Forest products
  const catList = cats.split(", ").map((c) => c.trim());
  for (const cat of catList) {
    if (SKIP_CATEGORIES.has(cat)) return { skip: true, reason: `Capital-Forest category: ${cat}` };
  }

  // Skip FB-Special
  if (catList.includes(FB_SPECIAL_PREFIX) || catList.some(c => c.startsWith("FB-"))) {
    return { skip: true, reason: "FB-Special promo duplicate" };
  }

  // Skip Tea Shirt products (test items)
  if (name.includes("Tea Shirt")) return { skip: true, reason: "Test product" };

  return { skip: false };
}

// ─── Main ───────────────────────────────────────────────────────────

const csvPath = resolve(__dirname, "..", "wc-product-export-14-3-2026-1773468192445.csv");
const csvContent = readFileSync(csvPath, "utf-8").replace(/^\uFEFF/, ""); // strip BOM

const rows: WcRow[] = parse(csvContent, {
  columns: true,
  skip_empty_lines: true,
  relax_column_count: true,
  relax_quotes: true,
});

// Build parent → variations map
const variationsByParent = new Map<number, WcRow[]>();
const parentRows = new Map<number, WcRow>();
const simpleRows: WcRow[] = [];

for (const row of rows) {
  const id = parseInt(row.ID, 10);
  const type = row.Type?.trim();

  if (type === "variation") {
    const parentId = parseParentId(row.Parent);
    if (parentId) {
      if (!variationsByParent.has(parentId)) variationsByParent.set(parentId, []);
      variationsByParent.get(parentId)!.push(row);
    }
  } else if (type === "variable") {
    parentRows.set(id, row);
  } else if (type === "simple") {
    simpleRows.push(row);
  }
}

// Process products
const products: Product[] = [];
const skipped: { id: number; name: string; reason: string }[] = [];
const needsReview: { id: number; name: string; reason: string }[] = [];
const slugSet = new Set<string>();

function ensureUniqueSlug(base: string, wcId: number): string {
  let slug = base;
  let attempt = 0;
  while (slugSet.has(slug)) {
    attempt++;
    slug = `${base}-${attempt}`;
  }
  slugSet.add(slug);
  return slug;
}

function getVariationPrice(variations: WcRow[], preferredLabels: string[]): { priceCents: number; priceNote: string } {
  let bestPrice = 0;
  const priceNotes: string[] = [];

  for (const v of variations) {
    const price = parsePriceCents(v["Regular price"]);
    const name = v.Name?.trim() || "";

    if (price > 0) {
      // Check if this is a preferred (single unit) variation
      const isPreferred = preferredLabels.some(
        (label) =>
          name.toLowerCase().includes(label.toLowerCase()) ||
          (v["Attribute 1 value(s)"] || "").toLowerCase().includes(label.toLowerCase()) ||
          (v["Attribute 2 value(s)"] || "").toLowerCase().includes(label.toLowerCase())
      );

      if (isPreferred && (bestPrice === 0 || price < bestPrice)) {
        bestPrice = price;
      }

      // Build price note for non-preferred variants
      const attrVal = v["Attribute 1 value(s)"] || v["Attribute 2 value(s)"] || "";
      if (attrVal && price > 0) {
        priceNotes.push(`${attrVal}: $${(price / 100).toFixed(2)}`);
      }
    }
  }

  // If no preferred found, use cheapest
  if (bestPrice === 0) {
    for (const v of variations) {
      const price = parsePriceCents(v["Regular price"]);
      if (price > 0 && (bestPrice === 0 || price < bestPrice)) {
        bestPrice = price;
      }
    }
  }

  return { priceCents: bestPrice, priceNote: priceNotes.join(" | ") };
}

// Process variable products
for (const [wcId, parent] of parentRows) {
  const skipCheck = shouldSkip(parent);
  if (skipCheck.skip) {
    skipped.push({ id: wcId, name: parent.Name, reason: skipCheck.reason! });
    continue;
  }

  const variations = variationsByParent.get(wcId) || [];
  const isBulk = BULK_PRODUCTS[wcId] !== undefined;
  const isAdditionalBulk = ADDITIONAL_BULK.has(wcId);
  const catSlug = mapCategory(parent.Categories, wcId, parent.Name);

  let priceCents = 0;
  let unit = "each";
  let unitDisplay = "each";
  let minQty = 1;
  let maxQty = 100;
  let stepQty = 1;
  let materialClass: "mulch" | "default" = "default";
  let deliveryType: "bulk" | "non-bulk" = "non-bulk";
  let priceNote = "";

  if (isBulk) {
    const bulkInfo = BULK_PRODUCTS[wcId];
    priceCents = bulkInfo.pricePerYardCents;
    materialClass = bulkInfo.materialClass;
    deliveryType = "bulk";
    unit = "yard";
    unitDisplay = "per cubic yard";
    minQty = 0.5;
    maxQty = 30;
    stepQty = 0.5;

    // Build price note from half-yard price
    const halfYardVariation = variations.find((v) => {
      const n = v.Name?.toLowerCase() || "";
      return n.includes("half yard") || n.includes("0.5 yard") || n.includes("half yd");
    });
    if (halfYardVariation) {
      const halfPrice = parsePriceCents(halfYardVariation["Regular price"]);
      if (halfPrice > 0) {
        priceNote = `Half yard: $${(halfPrice / 100).toFixed(2)}`;
      }
    }
  } else {
    // Non-bulk variable product
    const { priceCents: varPrice, priceNote: varNote } = getVariationPrice(variations, [
      "Each", "Per Pound", "Sq Ft", "per yard", "20 lb", "Bag",
    ]);
    priceCents = varPrice;
    priceNote = varNote;

    // Determine unit based on category and attributes
    if (catSlug === "masonry-concrete" || parent.Name.includes("Cement Block") || parent.Name.includes("Chimney")) {
      unit = "each";
      unitDisplay = "each";
    } else if (parent.Name.includes("Wallstone") && parent.Name.includes("Per Pound")) {
      unit = "lb";
      unitDisplay = "per pound";
    } else if (parent.Name.includes("Flagstone") || parent.Name.includes("Flagging")) {
      unit = "sqft";
      unitDisplay = "per sq ft";
    } else if (parent.Name.includes("Propane")) {
      unit = "each";
      unitDisplay = "per fill";
    } else if (parent.Name.includes("Boulder")) {
      unit = "each";
      unitDisplay = "each";
    } else if (parent.Name.includes("Stepper")) {
      unit = "each";
      unitDisplay = "each";
    } else if (parent.Name.includes("Cobblestone") || parent.Name.includes("Jumbo Cobblestones")) {
      unit = "each";
      unitDisplay = "each";
    } else if (parent.Name.includes("Treads")) {
      unit = "each";
      unitDisplay = "per piece";
    } else if (parent.Name.includes("Ledgestone") || parent.Name.includes("Ledgstone")) {
      unit = "box";
      unitDisplay = "per box";
    } else if (parent.Name.includes("Patio Block")) {
      unit = "each";
      unitDisplay = "each";
    } else if (parent.Name.includes("INSTALL") || parent.Name.includes("Driveway Gravel")) {
      unit = "yard";
      unitDisplay = "per yard";
    } else if (parent.Name.includes("Rebar")) {
      unit = "each";
      unitDisplay = "per piece";
    } else if (parent.Name.includes("Rock Salt") || parent.Name.includes("Salt")) {
      unit = "each";
      unitDisplay = "each";
    } else {
      unit = "each";
      unitDisplay = "each";
    }
  }

  const description = stripHtml(parent["Short description"] || parent.Description || "");
  const images = parseImages(parent.Images);
  const slug = ensureUniqueSlug(slugify(parent.Name), wcId);

  const isActive = priceCents > 0 && parent.Published === "1";

  if (priceCents === 0 && parent.Published === "1") {
    needsReview.push({ id: wcId, name: parent.Name, reason: "No price found" });
  }

  products.push({
    wcId,
    name: parent.Name.replace(/&amp;/g, "&"),
    slug,
    categorySlug: catSlug,
    deliveryType,
    materialClass,
    pricePerUnitCents: priceCents,
    unit,
    unitDisplay,
    minQty,
    maxQty,
    stepQty,
    description: description.substring(0, 500),
    images,
    isTaxable: true,
    isActive,
    sortOrder: isBulk ? 10 : 100,
    priceNote,
  });
}

// Process simple products
for (const row of simpleRows) {
  const wcId = parseInt(row.ID, 10);
  const skipCheck = shouldSkip(row);
  if (skipCheck.skip) {
    skipped.push({ id: wcId, name: row.Name, reason: skipCheck.reason! });
    continue;
  }

  const priceCents = parsePriceCents(row["Regular price"]);
  const catSlug = mapCategory(row.Categories, wcId, row.Name);
  const name = (row.Name || "").replace(/&amp;/g, "&");

  // Skip unpublished Capital Forest items (they have SKUs starting with FE/LU/PA/SH)
  const cats = (row.Categories || "").split(", ").map((c) => c.trim());
  if (cats.some(c => c.startsWith("Capital"))) {
    skipped.push({ id: wcId, name, reason: "Capital-Forest product" });
    continue;
  }

  let unit = "each";
  let unitDisplay = "each";
  let minQty = 1;
  let maxQty = 100;
  let stepQty = 1;
  let deliveryType: "bulk" | "non-bulk" = "non-bulk";
  let materialClass: "mulch" | "default" = "default";

  // Check if additional bulk
  if (ADDITIONAL_BULK.has(wcId)) {
    deliveryType = "bulk";
    unit = "yard";
    unitDisplay = "per cubic yard";
    minQty = 0.5;
    maxQty = 30;
    stepQty = 0.5;
  } else if (name.includes("per yard") || name.includes("/yd")) {
    // Products sold per yard as simple items
    if (name.includes("Sand-Salt") || name.includes("Rock Salt")) {
      deliveryType = "bulk";
      unit = "yard";
      unitDisplay = "per cubic yard";
      minQty = 0.5;
      maxQty = 30;
      stepQty = 0.5;
    }
  } else if (catSlug === "bagged-material") {
    unit = "bag";
    unitDisplay = "per bag";
  } else if (catSlug === "tools") {
    unit = "each";
    unitDisplay = "each";
  } else if (catSlug === "chemicals") {
    unit = "each";
    unitDisplay = "each";
  } else if (name.includes("Mulch Installation") || name.includes("INSTALL")) {
    unit = "yard";
    unitDisplay = "per yard";
  } else if (catSlug === "yard-services") {
    unit = "each";
    unitDisplay = "each";
  } else if (name.includes("per yard") || name.includes("/yd")) {
    unit = "yard";
    unitDisplay = "per yard";
  } else if (name.includes("sqft") || name.includes("sq ft") || name.includes("sq.ft")) {
    unit = "sqft";
    unitDisplay = "per sq ft";
  }

  const description = stripHtml(row["Short description"] || row.Description || "");
  const images = parseImages(row.Images);
  const slug = ensureUniqueSlug(slugify(name), wcId);

  // Published check: -1 means draft/unpublished
  const published = row.Published === "1";
  const isActive = priceCents > 0 && published;

  if (priceCents === 0 && published) {
    needsReview.push({ id: wcId, name, reason: "No price" });
  }

  products.push({
    wcId,
    name,
    slug,
    categorySlug: catSlug,
    deliveryType,
    materialClass,
    pricePerUnitCents: priceCents,
    unit,
    unitDisplay,
    minQty,
    maxQty,
    stepQty,
    description: description.substring(0, 500),
    images,
    isTaxable: row["Tax status"] !== "none",
    isActive,
    sortOrder: 100,
    priceNote: "",
  });
}

// ─── Sort products by category then name ────────────────────────────

products.sort((a, b) => {
  if (a.categorySlug !== b.categorySlug) return a.categorySlug.localeCompare(b.categorySlug);
  // Bulk before non-bulk
  if (a.deliveryType !== b.deliveryType) return a.deliveryType === "bulk" ? -1 : 1;
  return a.name.localeCompare(b.name);
});

// ─── Generate SQL ───────────────────────────────────────────────────

const sqlLines: string[] = [];

// Categories
sqlLines.push(`-- Categories (14 total)`);
sqlLines.push(`insert into public.categories (name, slug, sort_order, image, is_active)`);
sqlLines.push(`values`);

const categories = [
  { name: "Mulch", slug: "mulch", sort: 1 },
  { name: "Topsoil & Fill", slug: "topsoil-fill", sort: 2 },
  { name: "Gravel & Stone", slug: "gravel-stone", sort: 3 },
  { name: "Sand", slug: "sand", sort: 4 },
  { name: "Natural Stone", slug: "natural-stone", sort: 5 },
  { name: "Masonry & Concrete", slug: "masonry-concrete", sort: 6 },
  { name: "Pavers & Hardscape", slug: "pavers", sort: 7 },
  { name: "Bagged & Bucket", slug: "bagged-material", sort: 8 },
  { name: "Tools & Supplies", slug: "tools", sort: 9 },
  { name: "Chemicals & Sealers", slug: "chemicals", sort: 10 },
  { name: "Landscape & Drainage", slug: "landscape", sort: 11 },
  { name: "Outdoor Living", slug: "outdoor-living", sort: 12 },
  { name: "Rentals & Services", slug: "rentals-services", sort: 13 },
];

const catSqlParts = categories.map(
  (c, i) =>
    `  ('${escSql(c.name)}', '${c.slug}', ${c.sort}, '/images/categories/${c.slug}.jpg', true)${i < categories.length - 1 ? "," : ""}`
);
sqlLines.push(...catSqlParts);
sqlLines.push(`on conflict (slug) do update`);
sqlLines.push(`set`);
sqlLines.push(`  name = excluded.name,`);
sqlLines.push(`  sort_order = excluded.sort_order,`);
sqlLines.push(`  image = excluded.image,`);
sqlLines.push(`  is_active = excluded.is_active;`);
sqlLines.push(``);

// Products
sqlLines.push(`-- Products (${products.length} total — imported from WooCommerce)`);
sqlLines.push(`with category_map as (`);
sqlLines.push(`  select slug, id from public.categories`);
sqlLines.push(`)`);
sqlLines.push(`insert into public.products (`);
sqlLines.push(`  name, slug, category_id, delivery_type, material_class,`);
sqlLines.push(`  price_per_unit_cents, unit, unit_display,`);
sqlLines.push(`  min_qty, max_qty, step_qty,`);
sqlLines.push(`  description, images,`);
sqlLines.push(`  is_taxable, is_active, sort_order,`);
sqlLines.push(`  wc_id, price_note`);
sqlLines.push(`)`);
sqlLines.push(`values`);

const productSqlParts: string[] = [];
for (let i = 0; i < products.length; i++) {
  const p = products[i];
  const imagesArray =
    p.images.length > 0
      ? `'{"${p.images.map((img) => escSql(img)).join('","')}"}'`
      : "'{}'";

  const comma = i < products.length - 1 ? "," : "";

  productSqlParts.push(`  (
    '${escSql(p.name)}',
    '${escSql(p.slug)}',
    (select id from category_map where slug = '${p.categorySlug}'),
    '${p.deliveryType}',
    '${p.materialClass}',
    ${p.pricePerUnitCents},
    '${escSql(p.unit)}',
    '${escSql(p.unitDisplay)}',
    ${p.minQty},
    ${p.maxQty},
    ${p.stepQty},
    '${escSql(p.description)}',
    ${imagesArray},
    ${p.isTaxable},
    ${p.isActive},
    ${p.sortOrder},
    ${p.wcId},
    '${escSql(p.priceNote)}'
  )${comma}`);
}
sqlLines.push(productSqlParts.join("\n"));
sqlLines.push(`on conflict (slug) do update`);
sqlLines.push(`set`);
sqlLines.push(`  name = excluded.name,`);
sqlLines.push(`  category_id = excluded.category_id,`);
sqlLines.push(`  delivery_type = excluded.delivery_type,`);
sqlLines.push(`  material_class = excluded.material_class,`);
sqlLines.push(`  price_per_unit_cents = excluded.price_per_unit_cents,`);
sqlLines.push(`  unit = excluded.unit,`);
sqlLines.push(`  unit_display = excluded.unit_display,`);
sqlLines.push(`  min_qty = excluded.min_qty,`);
sqlLines.push(`  max_qty = excluded.max_qty,`);
sqlLines.push(`  step_qty = excluded.step_qty,`);
sqlLines.push(`  description = excluded.description,`);
sqlLines.push(`  images = excluded.images,`);
sqlLines.push(`  is_taxable = excluded.is_taxable,`);
sqlLines.push(`  is_active = excluded.is_active,`);
sqlLines.push(`  sort_order = excluded.sort_order,`);
sqlLines.push(`  wc_id = excluded.wc_id,`);
sqlLines.push(`  price_note = excluded.price_note;`);

// Write SQL to file
const sqlOutputPath = resolve(__dirname, "..", "supabase", "seed-products.sql");
writeFileSync(sqlOutputPath, sqlLines.join("\n"), "utf-8");
console.log(`\n✓ SQL written to: supabase/seed-products.sql`);

// ─── Generate Report ────────────────────────────────────────────────

const categoryCounts: Record<string, { total: number; active: number; inactive: number }> = {};
for (const p of products) {
  if (!categoryCounts[p.categorySlug]) {
    categoryCounts[p.categorySlug] = { total: 0, active: 0, inactive: 0 };
  }
  categoryCounts[p.categorySlug].total++;
  if (p.isActive) categoryCounts[p.categorySlug].active++;
  else categoryCounts[p.categorySlug].inactive++;
}

const noImageProducts = products.filter((p) => p.images.length === 0 && p.isActive);

const reportLines: string[] = [];
reportLines.push(`# WooCommerce → Supabase Migration Report`);
reportLines.push(`\nGenerated: ${new Date().toISOString().split("T")[0]}`);
reportLines.push(`\n## Summary`);
reportLines.push(`\n| Metric | Count |`);
reportLines.push(`|--------|-------|`);
reportLines.push(`| Total CSV rows | ${rows.length} |`);
reportLines.push(`| Products imported | ${products.length} |`);
reportLines.push(`| Active (with prices) | ${products.filter((p) => p.isActive).length} |`);
reportLines.push(`| Inactive (no price/unpublished) | ${products.filter((p) => !p.isActive).length} |`);
reportLines.push(`| Skipped | ${skipped.length} |`);
reportLines.push(`| Need review | ${needsReview.length} |`);
reportLines.push(`| Missing images | ${noImageProducts.length} |`);
reportLines.push(`| Bulk products | ${products.filter((p) => p.deliveryType === "bulk").length} |`);
reportLines.push(`| Non-bulk products | ${products.filter((p) => p.deliveryType === "non-bulk").length} |`);

reportLines.push(`\n## Products by Category`);
reportLines.push(`\n| Category | Slug | Total | Active | Inactive |`);
reportLines.push(`|----------|------|-------|--------|----------|`);
for (const cat of categories) {
  const counts = categoryCounts[cat.slug] || { total: 0, active: 0, inactive: 0 };
  reportLines.push(`| ${cat.name} | ${cat.slug} | ${counts.total} | ${counts.active} | ${counts.inactive} |`);
}

reportLines.push(`\n## Skipped Products (${skipped.length})`);
reportLines.push(`\n| WC ID | Name | Reason |`);
reportLines.push(`|-------|------|--------|`);
for (const s of skipped) {
  reportLines.push(`| ${s.id} | ${s.name} | ${s.reason} |`);
}

if (needsReview.length > 0) {
  reportLines.push(`\n## Products Needing Review (${needsReview.length})`);
  reportLines.push(`\n| WC ID | Name | Reason |`);
  reportLines.push(`|-------|------|--------|`);
  for (const r of needsReview) {
    reportLines.push(`| ${r.id} | ${r.name} | ${r.reason} |`);
  }
}

if (noImageProducts.length > 0) {
  reportLines.push(`\n## Active Products Missing Images (${noImageProducts.length})`);
  reportLines.push(`\n| WC ID | Name | Category |`);
  reportLines.push(`|-------|------|----------|`);
  for (const p of noImageProducts) {
    reportLines.push(`| ${p.wcId} | ${p.name} | ${p.categorySlug} |`);
  }
}

reportLines.push(`\n## Bulk Materials (${products.filter((p) => p.deliveryType === "bulk").length})`);
reportLines.push(`\n| WC ID | Name | $/yard | Category |`);
reportLines.push(`|-------|------|--------|----------|`);
for (const p of products.filter((p) => p.deliveryType === "bulk")) {
  reportLines.push(
    `| ${p.wcId} | ${p.name} | $${(p.pricePerUnitCents / 100).toFixed(2)} | ${p.categorySlug} |`
  );
}

const reportPath = resolve(__dirname, "..", "migration-report.md");
writeFileSync(reportPath, reportLines.join("\n"), "utf-8");
console.log(`✓ Report written to: migration-report.md`);
console.log(`\n  ${products.length} products imported, ${skipped.length} skipped, ${needsReview.length} need review`);
