/**
 * WooCommerce Order Import → Supabase Customers + Order History
 *
 * Reads 3 CSV files (2023, 2024, 2025-26), extracts customer info from
 * billing fields + freeform Order Notes, deduplicates by phone/email,
 * and upserts into customers + order_history tables.
 *
 * Usage: npx tsx scripts/import-wc-orders.ts
 *        npx tsx scripts/import-wc-orders.ts --dry-run   (no DB writes)
 */

import { readFileSync, writeFileSync } from "fs";
import { parse } from "csv-parse/sync";
import { resolve } from "path";
import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";

// Load .env.local
config({ path: resolve(__dirname, "..", ".env.local") });

const DRY_RUN = process.argv.includes("--dry-run");

// ─── Supabase Client ──────────────────────────────────────────────────

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing SUPABASE env vars in .env.local");
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

// ─── Types ────────────────────────────────────────────────────────────

interface CsvRow {
  "Order Number": string;
  "Order Status": string;
  "Order Date": string;
  "Customer Note": string;
  "Order Notes": string;
  "First Name (Billing)": string;
  "Last Name (Billing)": string;
  "Company (Billing)": string;
  "Address 1&2 (Billing)": string;
  "City (Billing)": string;
  "State Code (Billing)": string;
  "Postcode (Billing)": string;
  "Country Code (Billing)": string;
  "Email (Billing)": string;
  "Phone (Billing)": string;
  "First Name (Shipping)": string;
  "Last Name (Shipping)": string;
  "Address 1&2 (Shipping)": string;
  "City (Shipping)": string;
  "State Code (Shipping)": string;
  "Postcode (Shipping)": string;
  "Country Code (Shipping)": string;
  "Payment Method Title": string;
  "Cart Discount Amount": string;
  "Order Subtotal Amount": string;
  "Shipping Method Title": string;
  "Order Shipping Amount": string;
  "Order Refund Amount": string;
  "Order Total Amount": string;
  "Order Total Tax Amount": string;
  SKU: string;
  "Item #": string;
  "Item Name": string;
  "Quantity (- Refund)": string;
  "Item Cost": string;
  "Coupon Code": string;
}

interface ParsedOrder {
  orderNumber: number;
  status: string;
  orderDate: Date;
  paymentMethod: string;
  totalCents: number;
  // From billing fields
  billingFirstName: string;
  billingLastName: string;
  billingCompany: string;
  billingAddress: string;
  billingCity: string;
  billingState: string;
  billingZip: string;
  billingEmail: string;
  billingPhone: string;
  // From notes extraction
  notePhone: string;
  noteAddress: string;
  noteCity: string;
  noteZip: string;
  noteName: string;
  noteInstructions: string;
  rawNotes: string;
  // Line items
  items: Array<{
    sku: string;
    itemNumber: string;
    name: string;
    quantity: number;
    costCents: number;
  }>;
}

interface Customer {
  phone: string | null;
  email: string | null;
  firstName: string;
  lastName: string;
  companyName: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  tags: Set<string>;
  totalOrders: number;
  totalSpentCents: number;
  firstOrderAt: Date;
  lastOrderAt: Date;
  notes: string;
  orderNumbers: number[];
}

// ─── Constants ────────────────────────────────────────────────────────

const EXCLUDE_PHONES = new Set([
  "6318746244", // yard number
  "6313958283", // office number (inv-acct)
]);

const SUFFOLK_TOWNS = new Set([
  "center moriches", "east moriches", "moriches", "manorville", "eastport",
  "shirley", "mastic", "mastic beach", "bellport", "brookhaven", "patchogue",
  "east patchogue", "medford", "yaphank", "ridge", "wading river", "riverhead",
  "hampton bays", "southampton", "westhampton", "westhampton beach", "quogue",
  "east quogue", "calverton", "coram", "selden", "remsenburg", "speonk",
  "flanders", "aquebogue", "bridgehampton", "sag harbor", "watermill",
  "rocky point", "miller place", "sound beach", "mount sinai", "farmingville",
  "holtsville", "blue point", "jamesport", "mattituck", "laurel", "new suffolk",
  "sayville", "west sayville", "east islip", "islip", "bay shore", "deer park",
  "babylon", "west babylon", "lindenhurst", "amityville", "north babylon",
  "commack", "smithtown", "st james", "stony brook", "port jefferson",
  "port jefferson station", "setauket", "east setauket", "centereach",
  "lake ronkonkoma", "holbrook", "ronkonkoma", "bohemia", "oakdale",
  "central islip", "brentwood", "hauppauge", "nesconset", "lake grove",
  "middle island", "shoreham", "south haven", "north patchogue",
  "west hampton dunes", "hampton", "east hampton", "amagansett",
  "montauk", "shelter island", "greenport", "southold", "cutchogue",
  "peconic", "orient", "sagaponack", "water mill", "north haven",
  "springs", "noyack", "north sea", "tuckahoe", "hampton bays",
]);

// Town name normalization for report consistency
const TOWN_NORMALIZE: Record<string, string> = {
  "center moriches": "Center Moriches",
  "east moriches": "East Moriches",
  "moriches": "Moriches",
  "manorville": "Manorville",
  "eastport": "Eastport",
  "shirley": "Shirley",
  "mastic": "Mastic",
  "mastic beach": "Mastic Beach",
  "bellport": "Bellport",
  "brookhaven": "Brookhaven",
  "patchogue": "Patchogue",
  "east patchogue": "East Patchogue",
  "medford": "Medford",
  "yaphank": "Yaphank",
  "ridge": "Ridge",
  "wading river": "Wading River",
  "riverhead": "Riverhead",
  "hampton bays": "Hampton Bays",
  "southampton": "Southampton",
  "westhampton": "Westhampton",
  "westhampton beach": "Westhampton Beach",
  "quogue": "Quogue",
  "east quogue": "East Quogue",
  "calverton": "Calverton",
  "coram": "Coram",
  "selden": "Selden",
  "remsenburg": "Remsenburg",
  "speonk": "Speonk",
  "flanders": "Flanders",
  "aquebogue": "Aquebogue",
  "bridgehampton": "Bridgehampton",
  "sag harbor": "Sag Harbor",
  "watermill": "Water Mill",
  "water mill": "Water Mill",
  "rocky point": "Rocky Point",
  "miller place": "Miller Place",
  "sound beach": "Sound Beach",
  "mount sinai": "Mount Sinai",
  "farmingville": "Farmingville",
  "holtsville": "Holtsville",
  "blue point": "Blue Point",
  "jamesport": "Jamesport",
  "mattituck": "Mattituck",
  "laurel": "Laurel",
  "new suffolk": "New Suffolk",
  "sayville": "Sayville",
  "west sayville": "West Sayville",
  "east islip": "East Islip",
  "islip": "Islip",
  "bay shore": "Bay Shore",
  "deer park": "Deer Park",
  "babylon": "Babylon",
  "west babylon": "West Babylon",
  "lindenhurst": "Lindenhurst",
  "amityville": "Amityville",
  "north babylon": "North Babylon",
  "commack": "Commack",
  "smithtown": "Smithtown",
  "st james": "St. James",
  "stony brook": "Stony Brook",
  "port jefferson": "Port Jefferson",
  "port jefferson station": "Port Jefferson Station",
  "setauket": "Setauket",
  "east setauket": "East Setauket",
  "centereach": "Centereach",
  "lake ronkonkoma": "Lake Ronkonkoma",
  "holbrook": "Holbrook",
  "ronkonkoma": "Ronkonkoma",
  "bohemia": "Bohemia",
  "oakdale": "Oakdale",
  "central islip": "Central Islip",
  "brentwood": "Brentwood",
  "hauppauge": "Hauppauge",
  "nesconset": "Nesconset",
  "lake grove": "Lake Grove",
  "middle island": "Middle Island",
  "shoreham": "Shoreham",
  "east hampton": "East Hampton",
  "amagansett": "Amagansett",
  "montauk": "Montauk",
  "shelter island": "Shelter Island",
  "greenport": "Greenport",
  "southold": "Southold",
  "cutchogue": "Cutchogue",
  "peconic": "Peconic",
  "orient": "Orient",
  "sagaponack": "Sagaponack",
  "north haven": "North Haven",
  "springs": "Springs",
  "noyack": "Noyack",
  "north sea": "North Sea",
  "hampton": "Hampton",
};

// ─── CSV Loading ──────────────────────────────────────────────────────

function loadCsv(filename: string): CsvRow[] {
  const filepath = resolve(__dirname, "..", filename);
  const raw = readFileSync(filepath, "utf-8").replace(/^\uFEFF/, ""); // strip BOM
  return parse(raw, {
    columns: true,
    skip_empty_lines: true,
    relax_column_count: true,
    relax_quotes: true,
  });
}

// ─── Date Parsing ─────────────────────────────────────────────────────

function parseDate(dateStr: string): Date {
  if (!dateStr) return new Date(0);
  const s = dateStr.trim();

  // ISO-ish: "2026-03-13 10:08:18" or "2026-03-13 10:08"
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) {
    return new Date(s.replace(" ", "T") + (s.includes(":") && s.split(":").length < 3 ? ":00" : ""));
  }

  // US format: "03/13/2026 10:08" or "11/19/2024 04:16"
  const usMatch = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
  if (usMatch) {
    const [, mm, dd, yyyy, hh, min, sec] = usMatch;
    return new Date(
      parseInt(yyyy), parseInt(mm) - 1, parseInt(dd),
      parseInt(hh), parseInt(min), parseInt(sec || "0")
    );
  }

  return new Date(s);
}

// ─── Note Parsing ─────────────────────────────────────────────────────

function stripSystemMessages(notes: string): string {
  if (!notes) return "";
  let cleaned = notes;
  // Remove system patterns
  cleaned = cleaned.replace(/Order status changed[^.]*\./g, "");
  cleaned = cleaned.replace(/POS Checkout\s*/g, "");
  cleaned = cleaned.replace(/Payment done with:[^\n]*/g, "");
  cleaned = cleaned.replace(/Stock levels reduced:[^\n]*/g, "");
  cleaned = cleaned.replace(/Refund payment done with:[^\n]*/g, "");
  // Remove EMV terminal receipt data (2023 orders had these)
  cleaned = cleaned.replace(/TVR:[\s\S]*?(?:AIDNAME:[^\n]*|AC:\s*[a-f0-9]+\s*)/gi, "");
  cleaned = cleaned.replace(/AID:\s*[a-f0-9]+/gi, "");
  cleaned = cleaned.replace(/PAN:\s*\*+\d+/gi, "");
  // Remove WooCommerce Payments details
  cleaned = cleaned.replace(/Fee details:[\s\S]*?(?:USD\s*)/gi, "");
  cleaned = cleaned.replace(/A payment of[\s\S]*?(?:\)\.?\s*)/g, "");
  cleaned = cleaned.replace(/<[^>]+>/g, ""); // HTML tags
  cleaned = cleaned.replace(/&rarr;/g, "");
  cleaned = cleaned.replace(/&amp;/g, "&");
  cleaned = cleaned.replace(/&quot;/g, '"');
  cleaned = cleaned.replace(/&#?\w+;/g, ""); // other HTML entities
  // Clean whitespace
  cleaned = cleaned.replace(/\n{3,}/g, "\n\n");
  return cleaned.trim();
}

function extractPhone(text: string): string | null {
  if (!text) return null;

  // Match phone number patterns: xxx-xxx-xxxx, (xxx) xxx-xxxx, xxx xxx xxxx, xxxxxxxxxx
  const phonePatterns = [
    /\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}/g,
    /\b\d{10}\b/g,
  ];

  for (const pattern of phonePatterns) {
    const matches = text.match(pattern);
    if (matches) {
      for (const match of matches) {
        const digits = match.replace(/\D/g, "");
        if (digits.length === 10 && isValidPhone(digits)) {
          return digits;
        }
        // Handle 1+10 digit numbers
        if (digits.length === 11 && digits.startsWith("1")) {
          const tenDigit = digits.slice(1);
          if (isValidPhone(tenDigit)) return tenDigit;
        }
      }
    }
  }
  return null;
}

function isValidPhone(digits: string): boolean {
  if (digits.length !== 10) return false;
  if (digits.startsWith("000") || digits.startsWith("111") || digits.startsWith("555")) return false;
  if (EXCLUDE_PHONES.has(digits)) return false;
  // Don't match numbers that look like order IDs or stock counts
  if (/^[01]\d{9}$/.test(digits) && !digits.startsWith("1")) return false;
  return true;
}

function extractAddress(text: string): { address: string; city: string; zip: string } | null {
  if (!text) return null;

  // Process line-by-line to avoid cross-line matching issues
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);

  // Try multi-line: "address\nTown, NY ZIP" or "address\nTown NY ZIP"
  for (let i = 0; i < lines.length - 1; i++) {
    const line = lines[i];
    const nextLine = lines[i + 1];

    // Current line is a street address
    const streetMatch = line.match(/^(\d+\s+[\w\s.'-]+(?:St|Street|Ave|Avenue|Rd|Road|Dr|Drive|Ct|Court|Ln|Lane|Blvd|Boulevard|Way|Pl|Place|Cir|Circle|Hwy|Highway|Pkwy|Parkway|Ter|Terrace|Trail|Trl|Path|Run|Loop|Pass|Point|Pt)[.]?)$/i);
    if (streetMatch) {
      // Next line might be "Town, NY ZIP"
      const cityMatch = nextLine.match(/^([\w\s]+?)(?:,?\s*(?:NY|New York|ny))\s*(\d{5})?\s*$/i);
      if (cityMatch) {
        const city = cityMatch[1].trim();
        if (isValidTown(city)) {
          return { address: streetMatch[1].trim(), city: normalizeTown(city), zip: cityMatch[2] || "" };
        }
      }
      // Next line might be just a town name
      const townOnly = nextLine.trim().toLowerCase();
      if (isValidTown(townOnly)) {
        return { address: streetMatch[1].trim(), city: normalizeTown(nextLine.trim()), zip: "" };
      }
    }
  }

  // Try single line: "123 Street Name, Town, NY 11934"
  for (const line of lines) {
    const fullMatch = line.match(
      /^(\d+\s+[\w\s.'-]+(?:St|Street|Ave|Avenue|Rd|Road|Dr|Drive|Ct|Court|Ln|Lane|Blvd|Boulevard|Way|Pl|Place|Cir|Circle|Hwy|Highway|Pkwy|Parkway|Ter|Terrace|Trail|Trl|Path|Run|Loop|Pass|Point|Pt)[.]?),?\s+([\w\s]+?),?\s*(?:NY|New York|ny)\s*(\d{5})?\s*$/i
    );
    if (fullMatch) {
      const city = fullMatch[2].trim();
      if (isValidTown(city)) {
        return { address: fullMatch[1].trim(), city: normalizeTown(city), zip: fullMatch[3] || "" };
      }
    }

    // Try: "123 Street, Town ZIP" or "123 Street Town"
    // Use known towns list with word boundaries
    const townPattern = Array.from(SUFFOLK_TOWNS)
      .sort((a, b) => b.length - a.length)
      .map((t) => t.replace(/\s+/g, "\\s+"))
      .join("|");
    const townRegex = new RegExp(
      `^(\\d+\\s+[\\w\\s.'-]+?)(?:,\\s+|\\s{2,}|,\\s*)(${townPattern})(?:\\s*,?\\s*(?:NY|New York|ny))?\\s*(\\d{5})?\\s*$`,
      "i"
    );
    const townMatch = line.match(townRegex);
    if (townMatch) {
      const addr = townMatch[1].trim().replace(/,\s*$/, "");
      // Make sure the address part isn't just a number
      if (addr.length > 5 && /\s/.test(addr)) {
        return { address: addr, city: normalizeTown(townMatch[2].trim()), zip: townMatch[3] || "" };
      }
    }
  }

  // Just a street address with no town: "123 Street Name" on its own line
  for (const line of lines) {
    const streetOnly = line.match(
      /^(\d+\s+[\w\s.'-]+(?:St|Street|Ave|Avenue|Rd|Road|Dr|Drive|Ct|Court|Ln|Lane|Blvd|Boulevard|Way|Pl|Place|Cir|Circle|Hwy|Highway)[.]?)\s*$/i
    );
    if (streetOnly && streetOnly[1].length > 5) {
      return { address: streetOnly[1].trim(), city: "", zip: "" };
    }
  }

  return null;
}

function isValidTown(town: string): boolean {
  const key = town.toLowerCase().trim();
  // Must match a known town exactly
  return SUFFOLK_TOWNS.has(key) || key in TOWN_NORMALIZE;
}

function normalizeTown(town: string): string {
  const key = town.toLowerCase().trim();
  return TOWN_NORMALIZE[key] || town.trim();
}

function extractName(text: string): string {
  if (!text) return "";

  // Look for standalone capitalized names at start of line (not addresses, not system messages)
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);

  for (const line of lines) {
    // Skip lines that look like addresses (start with number)
    if (/^\d/.test(line)) continue;
    // Skip lines that look like instructions
    if (/^(anytime|today|asap|tomorrow|deliver|tarp|dump|call|back|money|\$|cod|next)/i.test(line)) continue;
    // Skip lines with known product references (yards, bags, loads)
    if (/\d+\s*(yard|yd|bag|load|pallet|ton|lb)/i.test(line)) continue;
    // Skip lines that are just numbers (phone already extracted)
    if (/^[\d\s()+.-]+$/.test(line)) continue;
    // Skip price lines
    if (/^\$/.test(line)) continue;
    // Skip "Deliver to" lines
    if (/^deliver\s+to/i.test(line)) continue;
    // Skip "quote" by itself
    if (/^quote$/i.test(line)) continue;

    // Match "FirstName" or "FirstName LastName" (1-3 words, capitalized)
    const nameMatch = line.match(/^([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,2})$/);
    if (nameMatch) {
      return nameMatch[1];
    }

    // Match "Name Phone" pattern: "Josh 774-306-1425"
    const namePhone = line.match(/^([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\s+[\d(]/);
    if (namePhone) {
      return namePhone[1].trim();
    }
  }

  return "";
}

function extractDeliveryInstructions(text: string): string {
  if (!text) return "";

  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  const instructions: string[] = [];

  for (const line of lines) {
    const lower = line.toLowerCase();
    // Match delivery instruction patterns
    if (
      /^(anytime|today|asap|tomorrow|deliver|tarp|dump|call|back|by\s+\d|next|fri|mon|tue|wed|thu|sat|sun)/i.test(line) ||
      /call\s+(ahead|first|before)/i.test(lower) ||
      /\b(driveway|garage|backyard|front|back\s+door|side|gate|porch)\b/i.test(lower) ||
      /\b(tarp\s+down|dump\s+in|drop\s+off|leave\s+at)\b/i.test(lower) ||
      /\b(doesnt have to be home|not home|no one home|won't be home)\b/i.test(lower) ||
      /\b(anytime|morning|afternoon|evening|am|pm)\b/i.test(lower) &&
        !/\d+\s*(yard|yd|bag|load)/i.test(lower)
    ) {
      // Don't include if it's a phone number or address
      if (/^\d{3}[\s.-]?\d{3}[\s.-]?\d{4}$/.test(line.replace(/[() ]/g, ""))) continue;
      if (/^\d+\s+\w+\s+(st|ave|rd|dr|ct|ln|blvd|way|pl|hwy)/i.test(line)) continue;
      instructions.push(line);
    }

    // COD / payment instructions
    if (/\b(cod|cash on delivery|money inside|cash\s+on|collect)\b/i.test(lower)) {
      instructions.push(line);
    }
  }

  return instructions.join("; ").substring(0, 500);
}

// ─── Main Processing ──────────────────────────────────────────────────

function parseAllOrders(): ParsedOrder[] {
  console.log("Loading CSV files...");

  const rows2025: CsvRow[] = loadCsv("orders-2025-26.csv");
  const rows2024: CsvRow[] = loadCsv("orders-2024.csv");
  const rows2023: CsvRow[] = loadCsv("orders-2023.csv");

  console.log(`  File 1 (2025-26): ${rows2025.length} rows`);
  console.log(`  File 2 (2024):    ${rows2024.length} rows`);
  console.log(`  File 3 (2023):    ${rows2023.length} rows`);

  const allRows = [...rows2025, ...rows2024, ...rows2023];
  console.log(`  Combined:         ${allRows.length} rows`);

  // Group by order number (multiple rows = multiple line items)
  const orderGroups = new Map<number, CsvRow[]>();
  for (const row of allRows) {
    const orderNum = parseInt(row["Order Number"], 10);
    if (isNaN(orderNum) || orderNum <= 0) continue;
    if (!orderGroups.has(orderNum)) orderGroups.set(orderNum, []);
    orderGroups.get(orderNum)!.push(row);
  }

  console.log(`  Unique orders:    ${orderGroups.size}`);

  // Parse each order
  const orders: ParsedOrder[] = [];

  for (const [orderNumber, rows] of orderGroups) {
    const first = rows[0]; // All rows for same order share header fields

    const rawNotes = first["Order Notes"] || "";
    const cleanedNotes = stripSystemMessages(rawNotes);

    // Extract from notes
    const notePhone = extractPhone(cleanedNotes);
    const noteAddr = extractAddress(cleanedNotes);
    const noteName = extractName(cleanedNotes);
    const noteInstructions = extractDeliveryInstructions(cleanedNotes);

    // Normalize billing phone
    let billingPhone = "";
    const rawBillingPhone = first["Phone (Billing)"] || "";
    if (rawBillingPhone) {
      const digits = rawBillingPhone.replace(/\D/g, "");
      if (digits.length === 10 && isValidPhone(digits)) {
        billingPhone = digits;
      } else if (digits.length === 11 && digits.startsWith("1")) {
        const tenDigit = digits.slice(1);
        if (isValidPhone(tenDigit)) billingPhone = tenDigit;
      }
    }

    // Normalize billing email
    let billingEmail = (first["Email (Billing)"] || "").trim().toLowerCase();
    // Skip internal email
    if (billingEmail === "office@easternbuilding.supply") billingEmail = "";

    // Parse total amount — use the last "Order Total Amount" column
    const totalStr = first["Order Total Amount"] || "0";
    const totalCents = Math.round(parseFloat(totalStr.replace(/[,$]/g, "") || "0") * 100);

    // Parse line items
    const items = rows
      .filter((r) => r["Item Name"])
      .map((r) => ({
        sku: r.SKU || "",
        itemNumber: r["Item #"] || "",
        name: r["Item Name"] || "",
        quantity: parseFloat(r["Quantity (- Refund)"] || "0"),
        costCents: Math.round(parseFloat((r["Item Cost"] || "0").replace(/[,$]/g, "")) * 100),
      }));

    orders.push({
      orderNumber,
      status: first["Order Status"] || "",
      orderDate: parseDate(first["Order Date"]),
      paymentMethod: first["Payment Method Title"] || "",
      totalCents,
      billingFirstName: first["First Name (Billing)"] || "",
      billingLastName: first["Last Name (Billing)"] || "",
      billingCompany: first["Company (Billing)"] || "",
      billingAddress: first["Address 1&2 (Billing)"] || "",
      billingCity: first["City (Billing)"] || "",
      billingState: first["State Code (Billing)"] || "NY",
      billingZip: first["Postcode (Billing)"] || "",
      billingEmail,
      billingPhone,
      notePhone: notePhone || "",
      noteAddress: noteAddr?.address || "",
      noteCity: noteAddr?.city || "",
      noteZip: noteAddr?.zip || "",
      noteName,
      noteInstructions,
      rawNotes,
      items,
    });
  }

  // Sort by date
  orders.sort((a, b) => a.orderDate.getTime() - b.orderDate.getTime());
  return orders;
}

// ─── Customer Deduplication ───────────────────────────────────────────

function buildCustomerDatabase(orders: ParsedOrder[]): Map<string, Customer> {
  // Key: "phone:XXXXXXXXXX" or "email:xxx@yyy.com"
  const customers = new Map<string, Customer>();
  const phoneToKey = new Map<string, string>();
  const emailToKey = new Map<string, string>();

  let unresolvable = 0;

  for (const order of orders) {
    // Determine best phone and email for this order
    const phone = order.billingPhone || order.notePhone || "";
    const email = order.billingEmail || "";

    // Find existing customer key
    let customerKey: string | null = null;

    if (phone && phoneToKey.has(phone)) {
      customerKey = phoneToKey.get(phone)!;
    } else if (email && emailToKey.has(email)) {
      customerKey = emailToKey.get(email)!;
    }

    if (!customerKey) {
      // Create new customer
      if (phone) {
        customerKey = `phone:${phone}`;
      } else if (email) {
        customerKey = `email:${email}`;
      } else {
        // No identifiable contact — count but skip
        unresolvable++;
        continue;
      }
    }

    // Register lookup keys
    if (phone) phoneToKey.set(phone, customerKey);
    if (email) emailToKey.set(email, customerKey);

    // Get or create customer
    let cust = customers.get(customerKey);
    if (!cust) {
      cust = {
        phone: phone || null,
        email: email || null,
        firstName: "",
        lastName: "",
        companyName: "",
        address: "",
        city: "",
        state: "NY",
        zip: "",
        tags: new Set(),
        totalOrders: 0,
        totalSpentCents: 0,
        firstOrderAt: order.orderDate,
        lastOrderAt: order.orderDate,
        notes: "",
        orderNumbers: [],
      };
      customers.set(customerKey, cust);
    }

    // Update customer with latest data (most recent order wins for name/address)
    cust.totalOrders++;
    cust.totalSpentCents += order.totalCents;
    cust.orderNumbers.push(order.orderNumber);

    if (order.orderDate < cust.firstOrderAt) cust.firstOrderAt = order.orderDate;
    if (order.orderDate > cust.lastOrderAt) cust.lastOrderAt = order.orderDate;

    // Update phone/email if we have new ones
    if (phone && !cust.phone) cust.phone = phone;
    if (email && !cust.email) cust.email = email;

    // Use most recent order's data for name/address
    const isMoreRecent = order.orderDate >= cust.lastOrderAt;

    // Name: prefer billing, fallback to note
    const firstName = order.billingFirstName || order.noteName.split(" ")[0] || "";
    const lastName = order.billingLastName || (order.noteName.split(" ").length > 1 ? order.noteName.split(" ").slice(1).join(" ") : "");
    if (firstName && (isMoreRecent || !cust.firstName)) {
      cust.firstName = firstName;
      cust.lastName = lastName;
    }

    // Company
    if (order.billingCompany && (isMoreRecent || !cust.companyName)) {
      cust.companyName = order.billingCompany;
    }

    // Address: prefer note delivery address, fallback to billing
    // (billing often has the yard's own address for POS orders)
    const YARD_ADDRESS = "110 frowein";
    const billingIsYard = order.billingAddress.toLowerCase().includes(YARD_ADDRESS);

    if (order.noteAddress && (isMoreRecent || !cust.address)) {
      cust.address = order.noteAddress;
      cust.city = order.noteCity;
      cust.zip = order.noteZip;
      cust.state = "NY";
    } else if (order.billingAddress && !billingIsYard && (isMoreRecent || !cust.address)) {
      cust.address = order.billingAddress;
      cust.city = order.billingCity;
      cust.state = order.billingState || "NY";
      cust.zip = order.billingZip;
    }

    // Delivery instructions → notes
    if (order.noteInstructions) {
      cust.notes = order.noteInstructions; // latest wins
    }

    // ── Auto-tagging ──────────────────────────────────────────────────
    // Payment method tags
    const pm = order.paymentMethod.toLowerCase();
    if (pm === "inv-acct" || pm === "cc-account") cust.tags.add("account-customer");
    if (pm === "cash-on-delivery" || pm === "cod") cust.tags.add("cod-customer");

    // Company tag
    if (order.billingCompany) cust.tags.add("contractor");

    // Product-based tags
    for (const item of order.items) {
      const name = item.name.toLowerCase();
      if (name.includes("mulch")) cust.tags.add("mulch-buyer");
      if (name.includes("gravel") || name.includes("rca") || name.includes("stone") || name.includes("bluestone") || name.includes("drainage rock")) {
        cust.tags.add("gravel-buyer");
      }
      if (name.includes("cement") || name.includes("portland") || name.includes("masonry") || name.includes("mortar") || name.includes("concrete block")) {
        cust.tags.add("mason-buyer");
      }
      if (name.includes("topsoil") || name.includes("compost")) cust.tags.add("topsoil-buyer");
      if (name.includes("sand-salt") || name.includes("rock salt")) cust.tags.add("salt-buyer");
    }
  }

  // Post-process: add repeat/high-value tags
  for (const cust of customers.values()) {
    if (cust.totalOrders >= 3) cust.tags.add("repeat");
    if (cust.totalSpentCents >= 100000) cust.tags.add("high-value"); // $1000+
  }

  console.log(`\nCustomer deduplication:`);
  console.log(`  Unique customers:  ${customers.size}`);
  console.log(`  Unresolvable:      ${unresolvable} (no phone or email)`);

  return customers;
}

// ─── Database Upsert ──────────────────────────────────────────────────

async function upsertToDatabase(customers: Map<string, Customer>, orders: ParsedOrder[]) {
  if (DRY_RUN) {
    console.log("\n[DRY RUN] Skipping database writes");
    return;
  }

  const supabase = getSupabase();
  console.log("\nUpserting to database...");

  // Build phone→customerId and email→customerId maps
  const phoneToId = new Map<string, string>();
  const emailToId = new Map<string, string>();

  // Insert customers in batches
  const customerEntries = Array.from(customers.entries());
  const BATCH_SIZE = 100;
  let custCount = 0;

  for (let i = 0; i < customerEntries.length; i += BATCH_SIZE) {
    const batch = customerEntries.slice(i, i + BATCH_SIZE);
    const rows = batch.map(([, c]) => ({
      email: c.email,
      phone: c.phone,
      first_name: c.firstName || null,
      last_name: c.lastName || null,
      company_name: c.companyName || null,
      address: c.address || null,
      city: c.city || null,
      state: c.state || "NY",
      zip: c.zip || null,
      source: "wc_import",
      tags: Array.from(c.tags),
      total_orders: c.totalOrders,
      total_spent_cents: c.totalSpentCents,
      first_order_at: c.firstOrderAt.toISOString(),
      last_order_at: c.lastOrderAt.toISOString(),
      notes: c.notes || null,
    }));

    // We need to handle upsert carefully due to partial unique indexes
    // Insert one by one to handle conflicts properly
    for (let j = 0; j < rows.length; j++) {
      const row = rows[j];
      const [, cust] = batch[j];

      let customerId: string | null = null;

      // Try to find existing by phone
      if (row.phone) {
        const { data: existing } = await supabase
          .from("customers")
          .select("id")
          .eq("phone", row.phone)
          .maybeSingle();

        if (existing) {
          // Update existing
          const { error } = await supabase
            .from("customers")
            .update({
              ...row,
              // Merge tags
              tags: Array.from(cust.tags),
            })
            .eq("id", existing.id);
          if (error) console.error(`  Error updating customer ${row.phone}: ${error.message}`);
          customerId = existing.id;
        }
      }

      // Try by email if no phone match
      if (!customerId && row.email) {
        const { data: existing } = await supabase
          .from("customers")
          .select("id")
          .eq("email", row.email)
          .maybeSingle();

        if (existing) {
          const { error } = await supabase
            .from("customers")
            .update(row)
            .eq("id", existing.id);
          if (error) console.error(`  Error updating customer ${row.email}: ${error.message}`);
          customerId = existing.id;
        }
      }

      // Insert new
      if (!customerId) {
        const { data: inserted, error } = await supabase
          .from("customers")
          .insert(row)
          .select("id")
          .single();
        if (error) {
          console.error(`  Error inserting customer: ${error.message} (phone=${row.phone}, email=${row.email})`);
          continue;
        }
        customerId = inserted.id;
      }

      // Map phone and email to customer ID
      if (row.phone) phoneToId.set(row.phone, customerId);
      if (row.email) emailToId.set(row.email, customerId);
      custCount++;
    }

    process.stdout.write(`\r  Customers: ${custCount}/${customerEntries.length}`);
  }

  console.log(`\n  Customers upserted: ${custCount}`);

  // Insert orders in batches
  let orderCount = 0;
  const orderBatches: Array<Record<string, unknown>>[] = [];
  let currentBatch: Array<Record<string, unknown>> = [];

  for (const order of orders) {
    // Find customer ID
    const phone = order.billingPhone || order.notePhone;
    const email = order.billingEmail;
    let customerId: string | null = null;

    if (phone) customerId = phoneToId.get(phone) || null;
    if (!customerId && email) customerId = emailToId.get(email) || null;

    // Determine delivery address (prefer note, fallback billing)
    const deliveryAddress = order.noteAddress || order.billingAddress || null;
    const deliveryCity = order.noteCity || order.billingCity || null;
    const deliveryZip = order.noteZip || order.billingZip || null;

    currentBatch.push({
      wc_order_id: order.orderNumber,
      customer_id: customerId,
      order_date: order.orderDate.toISOString(),
      status: order.status,
      payment_method: order.paymentMethod,
      order_total_cents: order.totalCents,
      delivery_address: deliveryAddress,
      delivery_city: deliveryCity,
      delivery_zip: deliveryZip,
      delivery_notes: order.noteInstructions || null,
      items: order.items,
      raw_notes: order.rawNotes || null,
    });

    if (currentBatch.length >= BATCH_SIZE) {
      orderBatches.push(currentBatch);
      currentBatch = [];
    }
  }
  if (currentBatch.length > 0) orderBatches.push(currentBatch);

  for (const batch of orderBatches) {
    const { error } = await supabase
      .from("order_history")
      .upsert(batch, { onConflict: "wc_order_id" });
    if (error) {
      console.error(`  Error inserting orders batch: ${error.message}`);
    }
    orderCount += batch.length;
    process.stdout.write(`\r  Orders: ${orderCount}/${orders.length}`);
  }

  console.log(`\n  Orders upserted: ${orderCount}`);
}

// ─── Report Generation ────────────────────────────────────────────────

function generateReports(orders: ParsedOrder[], customers: Map<string, Customer>) {
  const root = resolve(__dirname, "..");

  // ── 1. Customer Database Report ──────────────────────────────────────

  const custArray = Array.from(customers.values());
  const withPhone = custArray.filter((c) => c.phone);
  const withEmail = custArray.filter((c) => c.email);
  const withBoth = custArray.filter((c) => c.phone && c.email);
  const noContact = orders.length - custArray.reduce((sum, c) => sum + c.totalOrders, 0);

  const tagCounts: Record<string, number> = {};
  for (const c of custArray) {
    for (const tag of c.tags) {
      tagCounts[tag] = (tagCounts[tag] || 0) + 1;
    }
  }

  const topCustomers = [...custArray]
    .sort((a, b) => b.totalSpentCents - a.totalSpentCents)
    .slice(0, 25);

  const lines: string[] = [];
  lines.push("# Customer Database Report");
  lines.push(`\nGenerated: ${new Date().toISOString().split("T")[0]}`);
  lines.push(`\nSource: ${orders.length} WooCommerce orders (Apr 2023 - Mar 2026)`);

  lines.push("\n## Summary\n");
  lines.push("| Metric | Count |");
  lines.push("|--------|-------|");
  lines.push(`| Total orders processed | ${orders.length} |`);
  lines.push(`| Unique customers | ${custArray.length} |`);
  lines.push(`| With phone number | ${withPhone.length} |`);
  lines.push(`| With email | ${withEmail.length} |`);
  lines.push(`| With phone + email (full contact) | ${withBoth.length} |`);
  lines.push(`| Phone only (SMS-ready) | ${withPhone.length - withBoth.length} |`);
  lines.push(`| Email only | ${withEmail.length - withBoth.length} |`);
  lines.push(`| Orders with no contact info | ${noContact} |`);

  lines.push("\n## Customers by Tag\n");
  lines.push("| Tag | Count |");
  lines.push("|-----|-------|");
  for (const [tag, count] of Object.entries(tagCounts).sort((a, b) => b[1] - a[1])) {
    lines.push(`| ${tag} | ${count} |`);
  }

  lines.push("\n## Top 25 Customers by Spend\n");
  lines.push("| # | Name / Company | Phone | Orders | Total Spent |");
  lines.push("|---|----------------|-------|--------|-------------|");
  topCustomers.forEach((c, i) => {
    const name = c.companyName || `${c.firstName} ${c.lastName}`.trim() || "(unnamed)";
    const phone = c.phone ? `${c.phone.slice(0, 3)}-${c.phone.slice(3, 6)}-${c.phone.slice(6)}` : "-";
    const spent = `$${(c.totalSpentCents / 100).toFixed(2)}`;
    lines.push(`| ${i + 1} | ${name} | ${phone} | ${c.totalOrders} | ${spent} |`);
  });

  lines.push("\n## Marketing Readiness\n");
  lines.push(`- **SMS-ready** (have phone): ${withPhone.length} customers`);
  lines.push(`- **Email-ready** (have email): ${withEmail.length} customers`);
  lines.push(`- **Full contact** (phone + email): ${withBoth.length} customers`);
  lines.push(`- **Repeat customers** (3+ orders): ${tagCounts["repeat"] || 0}`);
  lines.push(`- **High-value** ($1000+ lifetime): ${tagCounts["high-value"] || 0}`);

  writeFileSync(resolve(root, "customer-database-report.md"), lines.join("\n"), "utf-8");
  console.log("  Written: customer-database-report.md");

  // ── 2. Town Demand Report ────────────────────────────────────────────

  const townOrders: Record<string, { orders: number; revenue: number }> = {};

  for (const order of orders) {
    // Get town from note or billing
    let city = order.noteCity || order.billingCity || "";
    if (!city) continue;

    // Validate: must be a recognized town name
    const cityLower = city.toLowerCase().trim();
    if (!isValidTown(cityLower)) continue;

    // Normalize
    city = normalizeTown(city);
    if (!city) continue;

    // Skip the yard's own city for billing-only addresses
    if (city === "Center Moriches" && !order.noteCity && order.billingAddress.toLowerCase().includes("110 frowein")) {
      continue;
    }

    if (!townOrders[city]) townOrders[city] = { orders: 0, revenue: 0 };
    townOrders[city].orders++;
    townOrders[city].revenue += order.totalCents;
  }

  const sortedTowns = Object.entries(townOrders).sort((a, b) => b[1].orders - a[1].orders);

  const tLines: string[] = [];
  tLines.push("# Town Demand Report — Suffolk County");
  tLines.push(`\nGenerated: ${new Date().toISOString().split("T")[0]}`);
  tLines.push(`\nSource: ${orders.length} WooCommerce orders (Apr 2023 - Mar 2026)`);
  tLines.push(`\nThis report shows delivery demand by town, directly informing:`);
  tLines.push(`- SEO town page prioritization (Phase 2)`);
  tLines.push(`- Delivery zone pricing decisions`);
  tLines.push(`- Marketing/flyer targeting`);

  tLines.push("\n## Orders by Town (ranked by volume)\n");
  tLines.push("| Rank | Town | Orders | Revenue | Avg Order |");
  tLines.push("|------|------|--------|---------|-----------|");

  sortedTowns.forEach(([town, data], i) => {
    const rev = `$${(data.revenue / 100).toFixed(0)}`;
    const avg = data.orders > 0 ? `$${(data.revenue / data.orders / 100).toFixed(0)}` : "-";
    tLines.push(`| ${i + 1} | ${town} | ${data.orders} | ${rev} | ${avg} |`);
  });

  tLines.push(`\n## Total: ${sortedTowns.length} towns with at least 1 delivery`);

  // Identify top towns for SEO pages
  const topTowns = sortedTowns.filter(([, d]) => d.orders >= 10);
  tLines.push(`\n## Recommended SEO Town Pages (10+ orders)\n`);
  tLines.push(`${topTowns.length} towns qualify for dedicated SEO pages:\n`);
  topTowns.forEach(([town, data]) => {
    tLines.push(`- **${town}** — ${data.orders} orders, $${(data.revenue / 100).toFixed(0)} revenue`);
  });

  writeFileSync(resolve(root, "town-demand-report.md"), tLines.join("\n"), "utf-8");
  console.log("  Written: town-demand-report.md");

  // ── 3. Extraction Quality Report ─────────────────────────────────────

  const qLines: string[] = [];
  qLines.push("# Extraction Quality Report");
  qLines.push(`\nGenerated: ${new Date().toISOString().split("T")[0]}`);

  // Orders with notes that yielded no structured data
  const unparsed: Array<{ orderNumber: number; notes: string }> = [];
  const questionablePhones: Array<{ orderNumber: number; phone: string; context: string }> = [];
  const missingTownAddresses: Array<{ orderNumber: number; address: string }> = [];

  for (const order of orders) {
    const cleaned = stripSystemMessages(order.rawNotes);
    if (cleaned.length > 10 && !order.notePhone && !order.noteAddress && !order.noteName) {
      // Has substantial notes but nothing was extracted
      unparsed.push({ orderNumber: order.orderNumber, notes: cleaned.substring(0, 200) });
    }

    // Phone from notes only (not billing) — might be questionable
    if (order.notePhone && !order.billingPhone) {
      const digits = order.notePhone;
      // Flag non-631/516/917/718/212 area codes as potentially out-of-area
      if (!["631", "516", "917", "718", "212", "347", "646", "929", "845"].includes(digits.slice(0, 3))) {
        questionablePhones.push({
          orderNumber: order.orderNumber,
          phone: digits,
          context: stripSystemMessages(order.rawNotes).substring(0, 100),
        });
      }
    }

    // Addresses without city
    if (order.noteAddress && !order.noteCity) {
      missingTownAddresses.push({
        orderNumber: order.orderNumber,
        address: order.noteAddress,
      });
    }
  }

  // Summary stats
  const withNotes = orders.filter((o) => stripSystemMessages(o.rawNotes).length > 5);
  const extractedPhone = orders.filter((o) => o.notePhone);
  const extractedAddr = orders.filter((o) => o.noteAddress);
  const extractedName = orders.filter((o) => o.noteName);

  qLines.push("\n## Extraction Summary\n");
  qLines.push("| Metric | Count |");
  qLines.push("|--------|-------|");
  qLines.push(`| Orders with meaningful notes | ${withNotes.length} |`);
  qLines.push(`| Phone extracted from notes | ${extractedPhone.length} |`);
  qLines.push(`| Address extracted from notes | ${extractedAddr.length} |`);
  qLines.push(`| Name extracted from notes | ${extractedName.length} |`);
  qLines.push(`| Notes with no extraction | ${unparsed.length} |`);
  qLines.push(`| Questionable phone numbers | ${questionablePhones.length} |`);
  qLines.push(`| Addresses missing town/zip | ${missingTownAddresses.length} |`);

  // Billing field coverage
  const withBillingPhone = orders.filter((o) => o.billingPhone);
  const withBillingEmail = orders.filter((o) => o.billingEmail);
  const withBillingAddr = orders.filter((o) => o.billingAddress && !o.billingAddress.toLowerCase().includes("110 frowein"));

  qLines.push("\n## Billing Field Coverage\n");
  qLines.push("| Field | Orders with data | % |");
  qLines.push("|-------|------------------|---|");
  qLines.push(`| Billing Phone | ${withBillingPhone.length} | ${((withBillingPhone.length / orders.length) * 100).toFixed(1)}% |`);
  qLines.push(`| Billing Email | ${withBillingEmail.length} | ${((withBillingEmail.length / orders.length) * 100).toFixed(1)}% |`);
  qLines.push(`| Billing Address (non-yard) | ${withBillingAddr.length} | ${((withBillingAddr.length / orders.length) * 100).toFixed(1)}% |`);

  // Combined phone coverage (billing + notes)
  const anyPhone = orders.filter((o) => o.billingPhone || o.notePhone);
  qLines.push(`\n**Combined phone coverage (billing + notes): ${anyPhone.length} / ${orders.length} orders (${((anyPhone.length / orders.length) * 100).toFixed(1)}%)**`);

  if (unparsed.length > 0) {
    qLines.push(`\n## Unparsed Notes (first 50 — manual review needed)\n`);
    qLines.push("| Order # | Notes Preview |");
    qLines.push("|---------|---------------|");
    for (const u of unparsed.slice(0, 50)) {
      const escaped = u.notes.replace(/\|/g, "\\|").replace(/\n/g, " ");
      qLines.push(`| ${u.orderNumber} | ${escaped} |`);
    }
  }

  if (questionablePhones.length > 0) {
    qLines.push(`\n## Questionable Phone Numbers (non-local area codes)\n`);
    qLines.push("| Order # | Phone | Context |");
    qLines.push("|---------|-------|---------|");
    for (const q of questionablePhones.slice(0, 50)) {
      const escaped = q.context.replace(/\|/g, "\\|").replace(/\n/g, " ");
      qLines.push(`| ${q.orderNumber} | ${q.phone} | ${escaped} |`);
    }
  }

  if (missingTownAddresses.length > 0) {
    qLines.push(`\n## Addresses Missing Town/Zip (need geocoding)\n`);
    qLines.push("| Order # | Address |");
    qLines.push("|---------|---------|");
    for (const a of missingTownAddresses.slice(0, 50)) {
      qLines.push(`| ${a.orderNumber} | ${a.address} |`);
    }
    if (missingTownAddresses.length > 50) {
      qLines.push(`\n*... and ${missingTownAddresses.length - 50} more*`);
    }
  }

  // Payment method breakdown
  const pmCounts: Record<string, number> = {};
  for (const o of orders) {
    const pm = o.paymentMethod || "(empty)";
    pmCounts[pm] = (pmCounts[pm] || 0) + 1;
  }
  qLines.push("\n## Payment Method Distribution\n");
  qLines.push("| Method | Orders |");
  qLines.push("|--------|--------|");
  for (const [method, count] of Object.entries(pmCounts).sort((a, b) => b[1] - a[1])) {
    qLines.push(`| ${method} | ${count} |`);
  }

  writeFileSync(resolve(root, "extraction-quality-report.md"), qLines.join("\n"), "utf-8");
  console.log("  Written: extraction-quality-report.md");
}

// ─── Main ─────────────────────────────────────────────────────────────

async function main() {
  console.log("=== WooCommerce Order Import ===\n");

  const orders = parseAllOrders();
  console.log(`\nParsed ${orders.length} orders`);

  const customers = buildCustomerDatabase(orders);

  console.log("\nGenerating reports...");
  generateReports(orders, customers);

  await upsertToDatabase(customers, orders);

  console.log("\n=== Import complete ===");
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
