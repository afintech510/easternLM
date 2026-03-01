# Eastern Landscape & Mason Supply — New Website Build Plan
## For Claude Code Implementation

---

## 1. CURRENT SITE AUDIT

**Platform:** GoDaddy Website Builder  
**URL:** https://easternlm.com/  
**Secondary domain:** https://easternbuilding.supply/

### Current Pages
| Page | Status |
|------|--------|
| Home | Generic template feel, video background, limited content |
| Shop | GoDaddy e-commerce — limited categories (Hardscape, etc.) |
| Driveways | Gravel driveway resurfacing scheduling |
| Landscaping | Service page (thin content) |
| Masonry | Service page (thin content) |
| Property Maintenance | Service page (thin content) |
| Gallery | Placeholder text ("Say something interesting about your business") |
| Material Calculator | Exists but unclear functionality |

### Key Weaknesses
- **Template look & feel** — generic GoDaddy builder, not professional enough for a 30+ year business
- **Placeholder content** on Gallery page ("Say something interesting about your business here")
- **Thin service pages** — Landscaping, Masonry, and Property Maintenance lack depth, project examples, and SEO content
- **Limited e-commerce** — no delivery/pickup toggle, no bulk yard calculator tied to cart, no delivery pricing
- **No customer reviews/testimonials** displayed on site
- **No blog/content strategy** for SEO
- **No Pro/Contractor portal** despite having a "PRO Members get 5% OFF" email signup
- **Mobile experience** constrained by GoDaddy template
- **No service area pages** for local SEO (competitors like CMM have 50+ location pages)

---

## 2. COMPETITIVE LANDSCAPE ANALYSIS

### Direct Competitors (Suffolk County / Long Island)

#### CMM Landscape Supply — cmmlandscapesupply.com ⭐ Best-in-class
- **Platform:** WordPress + WooCommerce
- **Strengths:** Clean modern design, online ordering with clear pricing, yard calculator that binds to cart, product filtering by category, Google Reviews integration, blog/content strategy, **50+ local SEO landing pages** (per-town delivery pages for mulch, topsoil, gravel), mobile-responsive
- **What to steal:** Yard calculator → cart integration, local SEO page strategy, review display, category filtering

#### Bay Aggregates — bayaggregates.com ⭐ Strong e-commerce
- **Platform:** WordPress + WooCommerce
- **Strengths:** Bilingual (English/Spanish), excellent product categorization (9 categories), delivery zone map, DIY guides section, fleet showcase, yardage calculator, clear call-to-action for same-day delivery
- **What to steal:** Product categorization depth, bilingual support, DIY guides, fleet/equipment showcase

#### American Landscape Supply — americanlandscapesupply.com ⭐ Solid e-commerce
- **Platform:** WordPress + WooCommerce
- **Strengths:** Clear per-yard pricing displayed on products, material calculator page, specials/sale section, newsletter signup, serving area clearly stated, checkout/cart/account system
- **What to steal:** Transparent pricing display, specials section, clear delivery policies

#### Lake Landscape & Mason Supplies — lakelandscapeandmason.com
- Lots of local SEO service area pages but weaker design

#### Jos M. Troffa Materials — troffa.com
- 45+ years in business, strong content/SEO articles, delivery focus

#### Lily Landscapes Inc — lilylandscapesinc.com
- Local competitor in Center Moriches, services only (no supply e-commerce), 3D design offering

#### G Pellegrino Landscaping & Masonry — suffolklandscapeandmasonry.com
- Center Moriches service pages, free consultations, services-only model

### Key Competitive Insights
1. **Every strong competitor uses WordPress + WooCommerce** — it's the industry standard
2. **Yard/material calculators tied to cart** are table stakes
3. **Local SEO pages** (per-town, per-product) drive organic traffic significantly
4. **Same-day delivery messaging** is a major conversion driver
5. **Google Reviews integration** builds trust instantly
6. Eastern LM has a **unique advantage**: they offer BOTH supplies AND services (landscaping, masonry, driveways, property maintenance). Most competitors are either supply-only or service-only.

---

## 3. RECOMMENDED TECH STACK

### Recommended Stack: Next.js + Supabase + Stripe (Single Database, No CMS)
```
Framework:       Next.js 14+ (App Router, TypeScript)
Styling:         Tailwind CSS + shadcn/ui component library
State Mgmt:      Zustand (cart state, delivery calculations)
Database:        Supabase (PostgreSQL) — SINGLE source of truth for everything:
                   products, categories, orders, accounts, delivery fee cache,
                   gallery, blog posts, town pages, Pro members, settings
Content:         MDX files for static service pages + blog posts (no CMS needed)
E-Commerce:      Custom cart logic + Stripe Checkout Sessions (server-side)
Payments:        Stripe Checkout (client has existing account) + 3% CC surcharge
Email:           Resend (order confirmations, delivery notifications)
Maps:            Google Maps Distance Matrix API (delivery fee calculation) +
                   Maps JavaScript API (route embeds on town pages)
Analytics:       Google Analytics 4 + Google Search Console
Reviews:         Google Places API or Elfsight widget
Testing:         Jest + React Testing Library (critical for delivery fee logic)
Admin:           Simple protected /admin routes with Supabase Auth (no separate CMS)
```

### Why NO Sanity (or any headless CMS)
- This is a local supply yard with ~20-50 products — NOT a content-heavy media site
- Adding Sanity means **two systems to manage** (Sanity for content + Supabase for orders/fees) which doubles admin complexity for a small business
- Products, delivery fee cache, gallery images, blog posts, and town pages ALL live in **one Supabase PostgreSQL database** with a simple admin UI built into the site
- Static content (service pages, about page) uses **MDX files** in the codebase — they rarely change and don't need a CMS
- This cuts an entire dependency, reduces cost, and makes the whole system easier to maintain

### Why Custom Cart + Stripe Checkout
- **100% control** over the cart UI and delivery fee math — this is the most complex part of the site and the business logic MUST live in your own code
- **Stripe Checkout Sessions** handle payment securely server-side — we pass computed line items (products + delivery fees + CC surcharge + tax) to Stripe, so the math is validated on the backend
- **3% credit card surcharge** applied at checkout and shown as a separate line item (legal in NY with proper disclosure)
- **Zustand** keeps cart state simple and testable without Redux boilerplate

### Future Migration Path
If the business grows and needs barcode scanning, multi-location inventory, or POS integration at the yard, the Shopify Storefront API can serve as the product backend while the custom frontend remains unchanged.

---

## 4. SITEMAP & PAGE STRUCTURE

```
easternlm.com/
├── / (Home)
├── /shop (Product Catalog)
│   ├── /shop/mulch
│   ├── /shop/topsoil
│   ├── /shop/gravel-stone
│   ├── /shop/sand
│   ├── /shop/natural-stone
│   ├── /shop/pavers
│   ├── /shop/concrete-supplies
│   ├── /shop/mason-supplies
│   └── /shop/[product-slug] (Individual product pages)
├── /services
│   ├── /services/landscaping
│   ├── /services/masonry
│   ├── /services/driveways
│   └── /services/property-maintenance
├── /gallery
│   ├── /gallery/landscaping
│   ├── /gallery/masonry
│   ├── /gallery/driveways
│   └── /gallery/property-maintenance
├── /calculator (Material Calculator)
├── /delivery (Delivery Info & Pricing)
├── /about (Our Story — 30+ year history)
├── /blog (SEO Content Hub)
│   └── /blog/[slug]
├── /contact
├── /account
│   ├── /account/orders
│   └── /account/settings
├── /cart
├── /checkout
├── /pro (Pro/Contractor Program)
├── /delivery/[town-name] (Local SEO pages — 20+ towns)
└── /legal
    ├── /privacy-policy
    └── /terms-and-conditions
```

---

## 5. PAGE-BY-PAGE SPECIFICATIONS

### 5.1 HOME PAGE
**Goal:** Immediately communicate who you are, what you sell, and drive action

**Hero Section**
- Full-width background image/video of the yard with materials
- Headline: "Your Local Landscape & Mason Supply Yard — Serving Suffolk County for 30+ Years"
- Two CTAs: "Shop Materials" | "Request a Service Quote"
- Phone number prominent: (631) 874-6244

**Trust Bar**
- "Family-Owned Since [Year]" | "Same-Day Delivery (Order by 11 AM)" | "Pro Contractor Discounts" | "Pickup or Delivery"

**Featured Product Categories** (with images)
- 6-8 card grid: Mulch, Topsoil, Gravel & Stone, Sand, Natural Stone, Pavers, Concrete, Mason Supplies

**Services Overview**
- 4-column cards: Landscaping, Masonry, Driveways, Property Maintenance
- Each with hero image, brief description, "Learn More" CTA

**Material Calculator CTA**
- Inline calculator widget or link: "Not sure how much you need? Use our Material Calculator"

**Testimonials/Reviews**
- Google Reviews carousel (aim for 3-5 featured reviews)

**About Teaser**
- Family photo, brief story, "Learn More" link

**Newsletter/Pro Signup**
- "Join our Pro Program — 5% off pickup orders"

**Map & Hours**
- Embedded Google Map, business hours, contact info

---

### 5.2 SHOP / E-COMMERCE
**Goal:** Browse, calculate, and order materials for delivery or pickup

**Catalog Page (/shop)**
- Category sidebar/filter: Mulch, Topsoil, Gravel & Stone, Sand, Natural Stone, Pavers, Concrete, Mason Supplies
- Product cards: Image, name, price per yard/unit, "Add to Cart" button
- Sort by: Price, Popular, Category

**Product Detail Page (/shop/[slug])**
- Large product image(s)
- Product name, description, specs
- Price per unit (yard, bag, pallet, etc.) with `unitDisplay` label
- **Quantity selector** respecting `minQty`, `maxQty`, `stepQty` (e.g., 0.25 yard increments for bulk)
- **Integrated yard calculator**: Enter Length × Width × Depth → auto-calculates yards needed
- "Recommended uses" tags (e.g., "Great for: patios, walkways, driveways")
- **Delivery or Pickup toggle**
  - Delivery: Enter delivery address → Google Maps API calculates fee in real-time → show "Delivery: $XX per load (X miles, ~XX min)" + same-day banner
  - Pickup: Show yard address and hours
- "Add to Cart" button
- **"Pairs well with"** cross-sell section (e.g., landscape fabric with gravel, edging with mulch)

**Cart (/cart)**
- Line items with quantity adjustment
- Delivery/Pickup selection for whole order
- Delivery date/time selection
- Promo code field (Pro member discount)
- **Delivery fee breakdown clearly displayed** (see Delivery Pricing Logic below)
- Order subtotal, delivery fee(s), tax, total

**Checkout (/checkout)**
- Guest checkout + account creation option
- Shipping/delivery address
- Payment: Stripe (credit card)
- Order confirmation page + email

---

### 5.8 DELIVERY PRICING LOGIC ⚠️ CRITICAL BUSINESS RULES

Eastern LM delivers via dump truck locally. Delivery pricing is calculated dynamically based on the actual driving distance from the yard to the customer's address via Google Maps, and varies by the number of bulk loads required.

#### Product Classification
Every product in the catalog must be tagged as one of:
```
type: "bulk"     → Delivered by dump truck load (mulch, topsoil, gravel, sand, stone by the yard)
type: "non-bulk" → Bags, tools, concrete mix, pavers by the piece, etc.
```

#### Truck Fleet & Capacity

Eastern LM operates THREE truck types. The system must select the most efficient truck(s) to **minimize loads for the customer**:

```
TRUCK FLEET:
┌──────────────┬───────────────────────────────────────────────┐
│ Truck Type   │ Capacity                                      │
├──────────────┼───────────────────────────────────────────────┤
│ Small Dump   │ 7 yards mulch / 5 yards soil, dirt, gravel,  │
│              │ stone, sand                                    │
├──────────────┼───────────────────────────────────────────────┤
│ Medium Dump  │ 10 yards of ANY material                      │
├──────────────┼───────────────────────────────────────────────┤
│ Tri-Axle     │ 20 yards of ANY material                      │
└──────────────┴───────────────────────────────────────────────┘

Truck selection logic (system auto-selects to minimize trips):
  qty ≤ small capacity  → Small Dump (1 load)
  qty ≤ 10              → Medium Dump (1 load)
  qty ≤ 20              → Tri-Axle (1 load)
  qty > 20              → Tri-Axle (20) + additional truck(s) for remainder
```

#### Core Delivery Rules

**Rule 1 — Minimum Delivery Order: $125**
All delivery orders must meet a **$125 minimum order** (materials subtotal, before tax/fees).
- If a customer's cart is below $125 and they select delivery, show: "Minimum order for delivery is $125. Your current subtotal is $XX.XX. Add more items or select pickup."
- **Exception — Within ~5 miles of yard:** 1 yard minimum with no dollar minimum. Determined dynamically by the distance calculation (if one-way distance ≤ 5 miles, waive dollar minimum).

**Rule 2 — Dynamic Distance-Based Delivery Fee (NOT Zone-Based)**

⚠️ **This is the core pricing engine.** Delivery fees are NOT based on predefined zones with fixed fees. They are calculated in real-time using the Google Maps Distance Matrix API based on the actual driving route from the yard to the customer's address.

**Origin:** `110 Frowein Rd, Center Moriches, NY 11934`
**Destination:** Customer's delivery address

**The Formula:**
```
STEP 1: Get driving distance + duration from Google Maps Distance Matrix API

STEP 2: Calculate round trip
  roundTripMiles = (distanceMeters × 2) / 1609.34
  roundTripMinutes = (durationSeconds × 2) / 60 + 5    // +5 min buffer for dumping

STEP 3: Calculate raw operational cost
  fuelCostPerMile = fuelPricePerGallon / milesPerGallon   // $4.00 / 6 MPG = $0.667/mile
  laborCostPerMinute = hourlyRate / 60                     // $30/hr / 60 = $0.50/min

  rawCost = roundTripMiles × fuelCostPerMile + roundTripMinutes × laborCostPerMinute

STEP 4: Double for profit margin
  deliveryCostRaw = rawCost × 2

STEP 5: Round up to nearest $5, minimum $25
  deliveryFee = max( ceil(deliveryCostRaw / 5) × 5,  25 )
```

**Configurable Parameters (admin-editable):**
```typescript
interface DeliveryPricingConfig {
  originAddress: string;        // "110 Frowein Rd, Center Moriches, NY 11934"
  milesPerGallon: number;       // 6
  fuelPricePerGallon: number;   // 4.00 (in dollars, update seasonally)
  hourlyLaborRate: number;      // 30.00
  dumpTimeBuffer: number;       // 5 (minutes added to round trip)
  profitMultiplier: number;     // 2.0 (doubles the raw cost)
  roundToNearest: number;       // 5 (dollars)
  minimumFee: number;           // 25.00
  minimumOrderCents: number;    // 12500 ($125)
  localRadiusMiles: number;     // 5 (no minimum order within this radius)
}
```

**Example Calculations:**
```
📍 Shirley, NY (8 miles one-way, ~15 min drive)
  Round trip: 16 miles, 35 min
  Raw cost: (16/6 × $4) + (35/60 × $30) = $10.67 + $17.50 = $28.17
  Doubled: $56.33
  Rounded: $60.00 per load

📍 Riverhead, NY (15 miles one-way, ~25 min drive)
  Round trip: 30 miles, 55 min
  Raw cost: (30/6 × $4) + (55/60 × $30) = $20.00 + $27.50 = $47.50
  Doubled: $95.00
  Rounded: $95.00 per load

📍 Southampton, NY (25 miles one-way, ~35 min drive)
  Round trip: 50 miles, 75 min
  Raw cost: (50/6 × $4) + (75/60 × $30) = $33.33 + $37.50 = $70.83
  Doubled: $141.67
  Rounded: $145.00 per load
```

**Rule 3 — Multi-Load Pricing: 25% Off Loads 2+**
Each truck trip = one delivery fee. Load 1 pays the full calculated fee. Loads 2+ get **25% off**, rounded to nearest $5, minimum $25:
```
secondLoadFee = max( ceil(firstLoadFee × 0.75 / 5) × 5,  25 )

Example — Shirley customer ($60 first load), 3-load order:
  Load 1:  $60.00
  Load 2:  max(ceil($45.00 / 5) × 5, $25) = $45.00  (25% off)
  Load 3:  $45.00  (25% off)
  ─────────────────
  Total:   $150.00
```

**Rule 4 — ⚠️ MAXIMUM 1 LOAD DELIVERED PER DAY**
Only **one truck load can be delivered per address per day**. Multi-load orders = multi-day deliveries:
```
1 load  → Delivered on Day 1
2 loads → Day 1 + Day 2
3 loads → Day 1 + Day 2 + Day 3
```
The cart and checkout MUST clearly communicate this:
- For 1-load orders: "📅 Estimated delivery: [selected date]"
- For multi-load orders: "📅 Delivery over [N] days starting [selected date]. We deliver 1 load per day and will confirm your schedule."
- The delivery date picker selects the FIRST delivery date; subsequent loads follow on next business days

**Rule 5 — Bulk Materials CAN Share a Truck (With Customer Consent)**
Eastern LM allows small quantities of different bulk materials on the same truck IF:
- Combined volume fits within the truck's capacity
- Customer explicitly accepts cross-contamination risk

Implementation:
- When multiple bulk items fit on one truck, show a checkbox: "☐ Combine materials on one truck to save on delivery (materials may mix slightly)"
- If checked: system combines compatible items into fewer loads
- If unchecked (default): each material gets its own truck = more loads
- The combining logic uses the LOWEST capacity among the materials being combined

**Rule 6 — Non-Bulk Items Ride Free with Bulk**
Non-bulk items (bags, tools, etc.) ride on any bulk delivery truck at **no extra fee**. If ONLY non-bulk items need delivery, charge a single delivery fee (still subject to $125 minimum).

**Rule 7 — Pickup = No Delivery Fee**
If customer selects pickup, no delivery fee is charged. No minimum order for pickup.

**Rule 8 — Same-Day Delivery Cutoff**
Orders placed **before 11:00 AM Monday–Friday** are eligible for same-day delivery (first load). Orders after 11:00 AM or on weekends = next business day.
- Display dynamic banner:
  - **Before 11 AM (Mon–Fri):** "⚡ Order now for same-day delivery!"
  - **After 11 AM (Mon–Fri):** "Order today — delivery available tomorrow"
  - **Saturday/Sunday:** "Order today — delivery available Monday"
- For multi-load orders, subsequent loads start the following business day
- Same-day is not guaranteed — display as "typically"

#### Google Maps API Integration — Implementation Details

**Client-Side (Cart/Product Page): Real-Time Fee Preview**
When a customer enters their delivery address or zip code:
1. Call Google Maps Distance Matrix API from the client
2. Calculate the delivery fee using the formula above
3. Display fee immediately: "Delivery to [address]: $XX per load"
4. If distance > configured max service radius: "Delivery not available to this address. Please call (631) 874-6244."

**Server-Side (/api/checkout): Fee Validation**
The checkout API route MUST independently call the Distance Matrix API and recalculate the fee. **Never trust the client-side calculation.** If the server-calculated fee differs from the client-submitted fee, reject the checkout and force a recalculation.

**API Usage & Caching**
- **Cache delivery fees** in Supabase for each unique address (address hash → fee, timestamp)
- Cache TTL: 24 hours (addresses don't move, but traffic patterns change slightly)
- This reduces API calls dramatically since repeat customers and nearby addresses will hit cache
- Google Maps Distance Matrix API pricing: ~$5 per 1,000 requests — very affordable for a local supply yard
- Set a **max service radius** (e.g., 50 miles one-way) in admin settings. Beyond this, show "call for delivery quote"

```typescript
// Address fee cache schema — stored in Supabase
interface DeliveryFeeCache {
  id: string;
  addressHash: string;          // SHA-256 of normalized address
  address: string;              // full address text
  distanceMeters: number;       // one-way from Google
  durationSeconds: number;      // one-way from Google
  oneWayMiles: number;          // computed
  calculatedFee: number;        // in CENTS (first load)
  secondLoadFee: number;        // in CENTS (25% off, rounded)
  isLocal: boolean;             // true if ≤ localRadiusMiles (no order minimum)
  createdAt: string;
  expiresAt: string;            // createdAt + 24h
}
```

**Fallback: What If Google Maps API Is Down?**
If the Distance Matrix API call fails:
1. Show: "We're having trouble calculating your delivery fee. Please call (631) 874-6244 for a quote."
2. Log the error for admin visibility
3. Do NOT allow checkout to proceed without a validated delivery fee

#### Cart UI — Delivery Fee Display

The cart must clearly show the delivery math so customers understand the charges.

**UX Note:** Default view should show **collapsed summary** ("Delivery to Shirley: $150 — 3 loads over 3 days") with expand/collapse for per-load detail. Tooltip: "We deliver 1 truck load per day."

```
┌─────────────────────────────────────────────────────┐
│  YOUR ORDER                                         │
│                                                     │
│  ⚡ Order within 1hr 23min for same-day delivery!   │
│  (applies to first load)                            │
│                                                     │
│  🚛 Delivering to: 123 Main St, Shirley, NY 11967  │
│     📍 8 miles from yard (16 min drive)             │
│     [Change Address]                                │
│                                                     │
│  BULK MATERIALS                                     │
│  ├─ Screened Topsoil × 25 yards ...... $875.00      │
│  │  └─ 🚛 Day 1: Tri-Axle (20 yds).. $60.00       │
│  │  └─ 🚛 Day 2: Small Dump (5 yds). $45.00 -25%  │
│  ├─ Pea Gravel × 5 yards ............ $225.00      │
│  │  └─ 🚛 Day 3: Small Dump (5 yds). $45.00 -25%  │
│  │                                                  │
│  ☐ Combine materials on one truck to save on        │
│    delivery (materials may mix slightly)             │
│                                                     │
│  OTHER ITEMS (rides with bulk — no extra fee)       │
│  ├─ Sakrete Concrete Mix 80lb × 5 ... $45.00       │
│  ├─ Landscape Fabric 4×50ft ......... $28.00        │
│                                                     │
│  ─────────────────────────────────────               │
│  Subtotal (materials):         $1,173.00            │
│  Delivery (3 loads, 3 days):     $150.00            │
│  Tax (8.75%):                    $115.76            │
│  CC Processing Fee (3%):          $43.16            │
│  ─────────────────────────────────────               │
│  TOTAL:                        $1,481.92            │
│                                                     │
│  ℹ️ A 3% processing fee applies to credit card      │
│     transactions.                                   │
│                                                     │
│  📅 First delivery date: [ Select Date ]            │
│  📆 Full schedule: Day 1: Topsoil (Tri-Axle)       │
│                     Day 2: Topsoil (Small Dump)     │
│                     Day 3: Pea Gravel (Small Dump)  │
│  ⚠️ We deliver 1 load per day. We'll confirm your  │
│     delivery schedule by phone.                     │
│                                                     │
│  💬 Delivery instructions: [                ]       │
│                                                     │
│  🚧 DELIVERY ACCESS (check all that apply)          │
│  [ ] Low wires/branches  [ ] Narrow driveway       │
│  [ ] Soft ground/lawn    [ ] Gated/access code      │
│  [ ] Steep driveway                                 │
│  ⚠️ We may not be able to deliver to locations      │
│     with soft ground or low overhead wires.          │
│     We will call to confirm access before delivery. │
│  Notes: [                                    ]      │
│                                                     │
│  [PROCEED TO CHECKOUT]                              │
└─────────────────────────────────────────────────────┘
```

#### Data Model (for Claude Code implementation)

```typescript
// ──────────────────────────────────────────────
// TRUCK FLEET — stored in Supabase, admin-editable
// ──────────────────────────────────────────────
interface TruckType {
  id: string;
  name: string;                         // "Small Dump", "Medium Dump", "Tri-Axle"
  capacityByMaterial: {
    mulch: number;                      // 7, 10, 20
    default: number;                    // 5, 10, 20 (soil, dirt, gravel, stone, sand)
  };
  sortOrder: number;                    // 1=small, 2=med, 3=triaxle
}

// FLEET DEFAULTS:
// Small Dump:  { mulch: 7,  default: 5  }
// Medium Dump: { mulch: 10, default: 10 }
// Tri-Axle:    { mulch: 20, default: 20 }

// ──────────────────────────────────────────────
// PRODUCT — stored in Supabase
// ──────────────────────────────────────────────
interface Product {
  id: string;
  name: string;
  slug: string;
  category: string;
  deliveryType: "bulk" | "non-bulk";
  materialClass: "mulch" | "default";   // determines truck capacity lookup
  pricePerUnit: number;                 // stored in CENTS (integer)
  unit: "yard" | "bag" | "piece" | "pallet" | "each";
  unitDisplay: string;                  // "per yard" or "per 80lb bag"
  minQty: number;
  maxQty: number;
  stepQty: number;                      // 0.25 for quarter-yard increments
  description: string;
  images: string[];
  recommendedUses: string[];
  pairsWellWith: string[];
  isTaxable: boolean;                   // always true
  isActive: boolean;
}

// ──────────────────────────────────────────────
// DELIVERY PRICING CONFIG — stored in Supabase site_settings
// ──────────────────────────────────────────────
interface DeliveryPricingConfig {
  originAddress: string;                // "110 Frowein Rd, Center Moriches, NY 11934"
  milesPerGallon: number;               // 6
  fuelPricePerGallon: number;           // 4.00
  hourlyLaborRate: number;              // 30.00
  dumpTimeBufferMinutes: number;        // 5
  profitMultiplier: number;             // 2.0
  roundToNearest: number;               // 5 (dollars)
  minimumDeliveryFee: number;           // 25.00
  additionalLoadDiscount: number;       // 0.25 (25% off loads 2+)
  minimumOrderCents: number;            // 12500 ($125)
  localRadiusMiles: number;             // 5 (no minimum within this)
  maxServiceRadiusMiles: number;        // 50 (beyond this = "call for quote")
}

// ──────────────────────────────────────────────
// SITE SETTINGS — stored in Supabase, admin-editable
// ──────────────────────────────────────────────
interface SiteSettings {
  deliveryPricing: DeliveryPricingConfig;

  // Scheduling
  sameDayCutoffHour: number;            // 11
  timezone: string;                     // "America/New_York"
  operatingDays: number[];              // [1,2,3,4,5]
  blackoutDates: string[];
  maxLoadsPerDayPerAddress: number;     // 1

  // Taxes & Fees
  taxRate: number;                      // 0.0875
  deliveryTaxable: boolean;             // true
  ccSurchargeRate: number;              // 0.03

  // Pro Program
  proDiscountRate: number;              // 0.05
  proDiscountPickupOnly: boolean;       // true
}

// ──────────────────────────────────────────────
// GOOGLE MAPS DISTANCE RESULT (from API)
// ──────────────────────────────────────────────
interface DistanceResult {
  distanceMeters: number;               // one-way
  durationSeconds: number;              // one-way
  oneWayMiles: number;                  // computed: distanceMeters / 1609.34
  originAddress: string;
  destinationAddress: string;
}

// ──────────────────────────────────────────────
// DELIVERY FEE CACHE — stored in Supabase
// ──────────────────────────────────────────────
interface DeliveryFeeCache {
  id: string;
  addressHash: string;                  // SHA-256 of normalized address
  address: string;
  distanceMeters: number;
  durationSeconds: number;
  oneWayMiles: number;
  firstLoadFee: number;                 // in CENTS
  additionalLoadFee: number;            // in CENTS (25% off, rounded)
  isLocal: boolean;                     // ≤ localRadiusMiles → no order minimum
  isOutOfRange: boolean;                // > maxServiceRadiusMiles → call for quote
  createdAt: string;
  expiresAt: string;                    // +24 hours
}

// ──────────────────────────────────────────────
// DELIVERY CALCULATION TYPES
// ──────────────────────────────────────────────
interface DeliveryLoad {
  loadNumber: number;
  dayNumber: number;                    // = loadNumber (1 per day)
  materials: string[];                  // 1 if separate, 2+ if combined
  yardsPerMaterial: Record<string, number>;
  totalYards: number;
  truckType: string;
  fee: number;                          // in CENTS
  isDiscounted: boolean;
}

interface DeliveryCalculation {
  distance: DistanceResult | null;
  firstLoadFee: number;                 // in CENTS
  additionalLoadFee: number;            // in CENTS
  totalLoads: number;
  totalDeliveryDays: number;
  loads: DeliveryLoad[];
  nonBulkItems: CartItem[];
  totalDeliveryFee: number;             // in CENTS
  combineLoadsAvailable: boolean;
  combineLoadsSelected: boolean;
  belowMinimum: boolean;
  minimumRequired: number;              // in CENTS
  isLocal: boolean;                     // within 5 miles
  outsideServiceArea: boolean;          // beyond max radius
}

interface DeliveryAccessInfo {
  lowWires: boolean;                    // ⚠️ MAY PREVENT DELIVERY
  narrowDriveway: boolean;
  softGround: boolean;                  // ⚠️ MAY PREVENT DELIVERY
  gatedAccess: boolean;
  steepDriveway: boolean;
  accessCode?: string;
  specialInstructions?: string;
}

interface CartItem {
  product: Product;
  quantity: number;
}

// ──────────────────────────────────────────────
// DELIVERY FEE CALCULATION ENGINE
// ──────────────────────────────────────────────

/**
 * Calculates the per-load delivery fee from Google Maps distance data.
 * This is the CORE FORMULA — must match the business's existing calculator.
 */
function calculatePerLoadFee(
  distance: DistanceResult,
  config: DeliveryPricingConfig
): { firstLoadFee: number; additionalLoadFee: number; isLocal: boolean; isOutOfRange: boolean } {
  // Check service radius
  if (distance.oneWayMiles > config.maxServiceRadiusMiles) {
    return { firstLoadFee: 0, additionalLoadFee: 0, isLocal: false, isOutOfRange: true };
  }

  const isLocal = distance.oneWayMiles <= config.localRadiusMiles;

  // Round trip
  const roundTripMiles = (distance.distanceMeters * 2) / 1609.34;
  const roundTripMinutes = (distance.durationSeconds * 2) / 60 + config.dumpTimeBufferMinutes;

  // Raw operational cost
  const fuelCost = roundTripMiles / config.milesPerGallon * config.fuelPricePerGallon;
  const laborCost = roundTripMinutes / 60 * config.hourlyLaborRate;
  const rawCost = fuelCost + laborCost;

  // Apply profit multiplier
  const withProfit = rawCost * config.profitMultiplier;

  // Round up to nearest $5, minimum $25
  const firstLoadFee = Math.max(
    Math.ceil(withProfit / config.roundToNearest) * config.roundToNearest,
    config.minimumDeliveryFee
  );

  // Additional loads: 25% off, rounded to $5, minimum $25
  const discountedRaw = firstLoadFee * (1 - config.additionalLoadDiscount);
  const additionalLoadFee = Math.max(
    Math.ceil(discountedRaw / config.roundToNearest) * config.roundToNearest,
    config.minimumDeliveryFee
  );

  // Convert to cents for storage
  return {
    firstLoadFee: firstLoadFee * 100,
    additionalLoadFee: additionalLoadFee * 100,
    isLocal,
    isOutOfRange: false,
  };
}

/**
 * Full delivery calculation — truck selection, load assignment, fee totaling.
 */
function calculateDeliveryFees(
  cartItems: CartItem[],
  distance: DistanceResult | null,
  config: DeliveryPricingConfig,
  truckFleet: TruckType[],
  combineLoads: boolean = false
): DeliveryCalculation {
  if (!distance) {
    return { outsideServiceArea: true, /* ... */ } as DeliveryCalculation;
  }

  const { firstLoadFee, additionalLoadFee, isLocal, isOutOfRange } =
    calculatePerLoadFee(distance, config);

  if (isOutOfRange) {
    return { outsideServiceArea: true, /* ... */ } as DeliveryCalculation;
  }

  // Check $125 minimum (waived for local)
  const materialsTotal = cartItems.reduce(
    (sum, i) => sum + i.product.pricePerUnit * i.quantity, 0
  );
  if (!isLocal && materialsTotal < config.minimumOrderCents) {
    return { belowMinimum: true, minimumRequired: config.minimumOrderCents, /* ... */ } as DeliveryCalculation;
  }

  const bulkItems = cartItems.filter(i => i.product.deliveryType === "bulk");
  const nonBulkItems = cartItems.filter(i => i.product.deliveryType === "non-bulk");

  // Truck selection + load assignment (same logic as before)
  // ... assign trucks, optionally combine, then price each load
  const loads: DeliveryLoad[] = assignTrucksAndLoads(bulkItems, truckFleet, combineLoads);

  // Apply fees: load 1 = firstLoadFee, loads 2+ = additionalLoadFee
  const pricedLoads = loads.map((load, i) => ({
    ...load,
    fee: i === 0 ? firstLoadFee : additionalLoadFee,
    isDiscounted: i > 0,
    dayNumber: i + 1,
  }));

  return {
    distance,
    firstLoadFee,
    additionalLoadFee,
    totalLoads: pricedLoads.length,
    totalDeliveryDays: pricedLoads.length,
    loads: pricedLoads,
    nonBulkItems,
    totalDeliveryFee: pricedLoads.reduce((sum, l) => sum + l.fee, 0),
    combineLoadsAvailable: /* check if combining reduces loads */,
    combineLoadsSelected: combineLoads,
    belowMinimum: false,
    minimumRequired: isLocal ? 0 : config.minimumOrderCents,
    isLocal,
    outsideServiceArea: false,
  };
}
```

#### Admin Panel — Delivery & Site Configuration (Supabase-backed)
The admin UI must allow the client to:

**Delivery Pricing (Distance-Based)**
- Set/update: fuel price per gallon (default $4.00), MPG (default 6), hourly labor rate (default $30)
- Set profit multiplier (default 2.0×)
- Set rounding increment (default $5)
- Set minimum delivery fee (default $25)
- Set additional load discount (default 25%)
- Set minimum order for delivery (default $125)
- Set local radius in miles (default 5 — no order minimum within this)
- Set max service radius in miles (default 50 — beyond = "call for quote")
- **Fee test tool:** enter any address → see the calculated delivery fee (for staff to quote on phone)

**Products**
- Mark products as bulk vs non-bulk
- Set **material class** per bulk product: `mulch` or `default` (determines truck capacity lookup)
- Set min/max/step quantities per product
- Toggle products active/inactive
- Manage "pairs well with" cross-sell relationships

**Truck Fleet**
- Manage truck types and their capacities per material class
- Defaults: Small Dump (5yd/7yd mulch), Medium Dump (10yd), Tri-Axle (20yd)

**Site Settings**
- Set **tax rate** (default 8.75%)
- Set **CC surcharge rate** (default 3%)
- Set **same-day delivery cutoff hour** (default 11 AM)
- Set **max loads per day per address** (default: **1**)
- Set blackout dates (holidays, weather days)

**Orders**
- View delivery schedule/calendar
- Manage load assignments and delivery status
- View access constraint notes per order
- View distance/fee per order for cost analysis

#### Edge Cases to Handle
| # | Scenario | Behavior |
|---|----------|----------|
| 1 | Only non-bulk items, delivery selected | Charge 1× calculated fee (still requires $125 minimum) |
| 2 | Only non-bulk items, pickup selected | No fee, no minimum |
| 3 | 1 bulk + non-bulk items, delivery | 1× delivery fee; non-bulk rides free |
| 4 | 3 different bulk items, separate trucks | 3 loads = 3 days; loads 2-3 at 25% off |
| 5 | 3 different bulk items, customer combines | Merge onto fewer trucks if fits; fewer loads = fewer days |
| 6 | **Address > max service radius** | **"Delivery not available. Call (631) 874-6244 for a quote."** |
| 7 | **Google Maps API down / error** | **"Unable to calculate delivery fee. Call (631) 874-6244." Block checkout.** |
| 8 | **25 yd topsoil** | **2 loads: Tri-Axle(20) + Small(5) = 2 days** |
| 9 | **8 yd gravel** | **1 load: Med Dump (auto-selected)** |
| 10 | **Order subtotal $90** | **"Minimum $125 for delivery. Add more items or select pickup."** |
| 11 | **Order $30, within 5 miles** | **Allowed — local radius waives dollar minimum** |
| 12 | **2 yd topsoil + 2 yd mulch, combine ON** | **1 load: Small Dump (4yd fits 5yd cap). Cross-contamination warning.** |
| 13 | **2 yd topsoil + 2 yd mulch, combine OFF** | **2 loads = 2 days** |
| 14 | Pro member, pickup order | 5% off materials subtotal |
| 15 | Pro member, delivery order | **NO discount — Pro is pickup only** |
| 16 | Customer changes address in cart | **Re-call Google Maps API → recalculate fee** |
| 17 | **Cached address (within 24hr)** | **Use cache — skip API call** |
| 18 | Order before 11 AM Mon–Fri | Same-day for first load |
| 19 | Order after 11 AM or weekend | First load = next business day |
| 20 | Blackout date | Next non-blackout business day |
| 21 | **Soft ground or low wires checked** | **⚠️ "We may not be able to deliver. We'll call to confirm."** |
| 22 | **Server fee ≠ client fee at checkout** | **Reject checkout, force recalculation** |

#### Real-World Delivery Constraints (Confirmed Operational Rules)

**1 Load Per Day Per Address — NON-NEGOTIABLE**
This is the single most important constraint. A 3-load order is a 3-day commitment. The UI must make this crystal clear BEFORE checkout to avoid customer confusion.
- Cart: "📅 This order requires [N] deliveries over [N] business days"
- Checkout: Full day-by-day schedule with truck type per day
- Confirmation email: Day-by-day schedule included

**Site Access — Some Locations Are No-Go**
Unlike a surcharge situation, soft ground and low overhead wires mean Eastern LM physically **cannot deliver** there.
- If "Soft ground" or "Low wires" is checked, show a **hard warning**: "⚠️ We may not be able to deliver to locations with soft ground or low overhead obstructions. Our team will call you to discuss access before confirming your order."
- The order still goes through, but it's flagged for manual review. Staff calls to confirm or suggest alternatives (e.g., curbside dump).
- Other constraints (narrow driveway, gated, steep) are informational — driver needs to know, but delivery is still possible.

**Partial Loads / Minimum Fee**
The calculated delivery fee is per truck trip regardless of how full the truck is. A 1-yard delivery costs the same delivery fee as a 5-yard delivery to the same address. Communicate: "Flat delivery fee per truck load based on distance."

#### Tax & Payment Processing Rules
- **8.75% sales tax** on all materials and delivery fees — no exceptions, all products taxable
- **3% credit card processing surcharge** on all orders — displayed as a separate line item at checkout
  - NY law requires: (a) the surcharge is disclosed before checkout, (b) it's shown as a separate line item, (c) it doesn't exceed the merchant's actual processing cost
  - Display notice on cart page: "A 3% processing fee applies to all credit card transactions"
- Credit card is the only accepted online payment method (no check/cash option)
- Tax rate and CC surcharge percentage are admin-configurable in site settings

---

### 5.3 SERVICES PAGES

#### Landscaping (/services/landscaping)
- Hero image of completed landscape project
- Services list: Design & Installation, Grading, Sod Installation, Garden Beds, Drainage Solutions, Retaining Walls, Outdoor Lighting
- Before/After gallery section
- Process: Consultation → Design → Installation → Enjoy
- CTA: "Request a Free Estimate"
- FAQ section

#### Masonry (/services/masonry)
- Hero image of stonework
- Services: Patios, Walkways, Retaining Walls, Fireplaces, Outdoor Kitchens, Stone Veneers, Steps & Stoops
- Before/After gallery
- Material showcase (types of stone/pavers they work with)
- CTA: "Request a Free Estimate"

#### Driveways (/services/driveways)
- Hero image of completed driveway
- Services: Gravel Driveway Installation, Gravel Resurfacing, Paver Driveways, Asphalt Prep/Grading, Belgian Block Edging
- Material options with images
- Pricing guidance (if appropriate)
- CTA: "Schedule Your Driveway Project"

#### Property Maintenance (/services/property-maintenance)
- Hero image of maintained property
- Services: Lawn Mowing, Leaf Removal, Mulch Refresh, Snow Removal, Seasonal Cleanup, Drainage Maintenance
- Maintenance plan options (weekly, bi-weekly, seasonal)
- CTA: "Get a Maintenance Quote"

---

### 5.4 GALLERY
- Filterable masonry grid layout
- Categories: Landscaping, Masonry, Driveways, Property Maintenance
- Lightbox view for full-size images
- Before/After slider component for applicable projects
- Caption with project details

---

### 5.5 MATERIAL CALCULATOR
- Interactive calculator
- Input: Project type (patio, driveway, garden bed, etc.) → dimensions → depth
- Output: Yards needed + recommended product(s)
- "Add to Cart" button directly from calculator results

---

### 5.6 PRO/CONTRACTOR PROGRAM (/pro)
- Benefits: 5% off pickup, priority delivery, dedicated account rep, volume pricing
- Registration form
- Login for existing Pro members
- Pro-only pricing visible when logged in

---

### 5.7 LOCAL SEO PAGES (/delivery/[town]) — ⚠️ ANTI-DOORWAY PAGE STRATEGY
Generate 20-30 pages for towns in delivery radius:
- Center Moriches, East Moriches, Moriches, Eastport, Manorville, Shirley, Mastic, Mastic Beach, Brookhaven, Patchogue, Bellport, East Patchogue, Medford, Yaphank, Ridge, Wading River, Riverhead, Hampton Bays, East Hampton, Southampton, Quogue, Westhampton, Calverton, Coram, etc.

**IMPORTANT: Google Doorway Page Risk**
Simply swapping the town name in an H1 tag across 30 identical page templates is considered a "doorway page" strategy and can trigger Google algorithmic penalties. Each page must contain **programmatically unique, genuinely useful content**.

**Required Unique Elements Per Town Page:**
1. **Dynamic Google Maps embed** showing the actual driving route from the yard (110 Frowein Rd, Center Moriches) to the town center, with estimated drive time
2. **Calculated delivery time estimate** based on distance (e.g., "Typical delivery to Shirley: same day if ordered by 11 AM, within 30-45 minutes of dispatch")
3. **Calculated delivery fee** from yard to town center (pre-computed via Distance Matrix API, e.g., "Delivery to Shirley starts at ~$60 per load")
4. **Gallery projects tagged to that town** — if there are completed landscaping/masonry projects in Shirley, show those specific photos. Each town page should pull gallery items tagged with that location
5. **Town-specific testimonial** if available (pull from Google Reviews that mention the town)
6. **Contextual copy** — not just "[Town] landscape supply delivery" repeated. Include a sentence or two about the neighborhood (e.g., "Many Shirley homeowners choose our gravel driveway resurfacing to handle the area's sandy soil conditions")
7. **Available products** — show the top 4-6 products most ordered in that zip code area (data-driven once orders accumulate; default to bestsellers initially)
8. **CTA with pre-filled zip code**: "Order for Delivery to [Town]" → links to /shop with the zip code pre-populated in the delivery calculator

**Data Model for Town Pages:**
```typescript
interface TownPage {
  slug: string;              // "shirley"
  name: string;              // "Shirley"
  state: string;             // "NY"
  zipCodes: string[];        // ["11967"]
  deliveryFee: number;       // pre-computed first-load fee from yard to town center
  distanceMiles: number;     // one-way miles from yard
  driveMinutes: number;      // one-way drive time
  estimatedDeliveryMinutes: number;
  distanceMiles: number;
  localDescription: string;  // 2-3 sentences of unique town context
  featuredProjectIds: string[];  // gallery items tagged to this town
  featuredTestimonialId?: string;
}
```

---

## 6. DESIGN DIRECTION

### Brand
- **Colors:** Keep the existing blue from the logo as primary; pair with earthy tones (warm gray, sand, forest green accents)
- **Typography:** Strong, clean sans-serif (e.g., Inter or Plus Jakarta Sans for headings, system fonts for body)
- **Photography:** High-quality images of materials, completed projects, the yard, the family. Replace all placeholder/stock imagery
- **Tone:** Professional but approachable. Family-owned warmth + expertise

### Design Principles
- Mobile-first responsive design
- Large, tappable CTAs (phone calls are critical for this business)
- Fast load times (image optimization, lazy loading)
- Click-to-call phone number on every page
- Sticky header with phone + cart

---

## 7. SEO STRATEGY

### On-Page
- Unique title tags and meta descriptions for every page
- H1/H2 structure optimized for target keywords
- Schema markup: LocalBusiness, Product, Review, FAQ
- Image alt tags with descriptive keywords
- Internal linking between service pages and shop

### Content Strategy (Blog)
- "How Much Mulch Do I Need?" (calculator tie-in)
- "Choosing the Right Gravel for Your Long Island Driveway"
- "Bluestone Paver Installation Guide"
- "Best Natural Stone for Patios on Long Island"
- "Spring Landscaping Checklist for Suffolk County Homeowners"
- "How to Maintain a Gravel Driveway"
- Seasonal content: spring prep, fall cleanup, winter salt/ice melt

### Local SEO
- Google Business Profile optimization
- Per-town delivery landing pages (20-30 pages) — **each with programmatically unique content to avoid Google doorway page penalties** (see Section 5.7 for required unique elements per page)
- Consistent NAP (Name, Address, Phone) across all pages
- Encourage and display Google Reviews
- Tag gallery projects and reviews by town to feed unique content into local pages

---

## 8. CLAUDE CODE EXECUTION STRATEGY

Claude Code operates via the command line with context window limitations. You cannot prompt it with "build the whole site." The build must be broken into focused, modular prompts with clear boundaries. Each prompt should produce testable, committable output.

### 8.1 MVP Phasing — Ship Revenue Faster

Don't build everything at once. Ship the money-making storefront first, then layer on depth.

**MVP (Prompts 1–9, Weeks 1–4): Revenue-Driving Storefront**
- Home + Shop + Product pages + Cart with full delivery engine + Stripe Checkout
- Delivery address validation + Google Maps fee calculation + same-day cutoff logic + access constraints
- CC surcharge + tax calculation
- Google Reviews embed (Elfsight widget — zero code)
- 15-20 products seeded across 6 categories
- Basic /delivery page (how pricing works, service area, policies, address lookup)
- Order confirmation + email
- Simple admin: product manager + delivery pricing config + site settings
- **Goal: accepting orders online**

**Phase 2 (Prompts 10–11, Weeks 5–6): SEO & Content**
- Gallery with town tagging + before/after sliders
- Service pages expansion (landscaping, masonry, driveways, maintenance)
- Local SEO town pages (Tier A hand-curated, Tier B programmatic)
- Blog setup with initial "Materials Guide" posts
- Schema markup + sitemap + Open Graph

**Phase 3 (Weeks 7–8): Growth Features**
- Pro/Contractor portal with accounts + discount codes
- Full admin dashboard with order management + delivery calendar
- Newsletter integration
- Advanced reporting

### 8.2 Project Bootstrap File: `CLAUDE.md`

Before any prompting, create a `CLAUDE.md` file in the project root. Claude Code reads this automatically. It should define the rules of the codebase:

```markdown
# Eastern Landscape & Mason Supply — Claude Code Instructions

## Tech Stack (DO NOT deviate)
- Next.js 14+ App Router with TypeScript
- Tailwind CSS + shadcn/ui for all UI components
- Zustand for cart/delivery state management
- Supabase (PostgreSQL) for EVERYTHING: products, orders, accounts, delivery fee cache, gallery, blog, settings
- MDX for static service pages (landscaping, masonry, driveways, property maintenance)
- Stripe Checkout Sessions for payment (server-side only)
- Resend for transactional email
- Jest + React Testing Library for tests
- NO Sanity, NO headless CMS — Supabase is the single source of truth

## Conventions
- All components in /src/components, organized by feature folder
- All API routes in /src/app/api/
- All Zustand stores in /src/stores/
- All utility functions in /src/lib/
- Use server components by default; "use client" only when needed
- All prices stored in CENTS (integer), displayed as dollars
- Delivery fee calculation lives in /src/lib/delivery.ts — ALWAYS server-validated
- Admin pages live in /src/app/admin/ — protected by Supabase Auth

## Business Rules (CRITICAL)
- Delivery fee calculated DYNAMICALLY via Google Maps Distance Matrix API (round trip distance + time → cost formula → doubled for profit → rounded to $5, min $25)
- NO zone-based pricing — fee is unique per address based on actual driving distance
- Three truck types: Small Dump (5yd soil / 7yd mulch), Med Dump (10yd any), Tri-Axle (20yd any)
- System auto-selects smallest truck that fits the ordered quantity
- Bulk materials CAN share a truck if customer accepts cross-contamination (opt-in checkbox)
- Multi-load: Load 1 = full fee, Loads 2+ = 25% off (rounded to $5, min $25)
- **MAX 1 LOAD PER DAY PER ADDRESS** — multi-load orders = multi-day deliveries
- Non-bulk items ride free on bulk deliveries
- Minimum delivery order: $125 materials subtotal (waived within 5-mile "local" radius)
- Same-day delivery: orders before 11 AM Mon–Fri (cutoff configurable)
- Tax rate: 8.75% on materials AND delivery fees — all products taxable, no exceptions
- 3% credit card processing surcharge on all orders (separate line item)
- Pro members: 5% off materials, **PICKUP ORDERS ONLY** — no discount on delivery orders
- Access constraints: soft ground and low wires = potential NO-GO, flag for manual review
- All prices stored in CENTS (integer)
- Server MUST recalculate delivery fee independently at checkout — never trust client
- Cache delivery fees per address (24hr TTL) to reduce Google Maps API calls
```

### 8.3 Modular Prompt Sequence

#### Prompt 1 — Scaffold & Layout
```
Scaffold the Next.js app with TypeScript and Tailwind. Install shadcn/ui.
Set up Supabase client. Build the shared layout: responsive Header
(sticky, with logo, nav links, phone number click-to-call, cart icon
with count), Footer (contact info, hours, nav links, newsletter signup
form), and MobileMenu (hamburger drawer). Deploy to Vercel.
```

#### Prompt 2 — Static Content Pages
```
Build the Home, About, Contact, and Delivery Info pages per the sitemap.
Home page sections: Hero with CTA, Trust Bar, Featured Categories grid,
Services Overview cards, Material Calculator CTA, Testimonials placeholder,
About teaser, Map & Hours. Contact page: form with react-hook-form + zod
validation, Google Maps embed, business hours.
```

#### Prompt 3 — Service Pages
```
Build 4 service pages: /services/landscaping, /services/masonry,
/services/driveways, /services/property-maintenance. Each page:
hero image section, services list, before/after gallery section (placeholder),
process steps, FAQ accordion (shadcn), and "Request Free Estimate" CTA form.
```

#### Prompt 4 — Database Schema & Product Seeding
```
Set up Supabase PostgreSQL tables:

truck_types: name, capacityMulch, capacityDefault, sortOrder
  → Seed: Small Dump (7/5/1), Medium Dump (10/10/2), Tri-Axle (20/20/3)

products: name, slug, category, deliveryType (bulk|non-bulk),
  materialClass (mulch|default), pricePerUnit (cents), unit, unitDisplay,
  minQty, maxQty, stepQty, description, images[], recommendedUses[],
  pairsWellWith[], isTaxable (always true), isActive

categories: name, slug, sortOrder, image

delivery_fee_cache: addressHash (unique index), address, distanceMeters,
  durationSeconds, oneWayMiles, firstLoadFee (cents), additionalLoadFee (cents),
  isLocal, isOutOfRange, createdAt, expiresAt (24hr TTL)

site_settings: single row —
  originAddress, milesPerGallon (6), fuelPricePerGallon (4.00),
  hourlyLaborRate (30), dumpTimeBufferMinutes (5), profitMultiplier (2.0),
  roundToNearest (5), minimumDeliveryFee (25), additionalLoadDiscount (0.25),
  minimumOrderCents (12500), localRadiusMiles (5), maxServiceRadiusMiles (50),
  taxRate (0.0875), ccSurchargeRate (0.03),
  sameDayCutoffHour (11), timezone, operatingDays[], blackoutDates[],
  maxLoadsPerDayPerAddress (1), proDiscountRate (0.05),
  proDiscountPickupOnly (true)

gallery_projects: images, townTags, serviceType, beforeAfter
orders, order_items, accounts

Seed 15-20 products with correct materialClass (mulch = "mulch", all
others = "default"). Set up Supabase Storage for images.
NO delivery_zones table — fees calculated dynamically via Google Maps API.
```

#### Prompt 5 — Delivery Fee Engine (TDD) ⚠️ MOST CRITICAL PROMPT
```
Implement the delivery fee calculation engine in /src/lib/delivery.ts.
This function accepts cart items, a Google Maps distance result, the
delivery pricing config, the truck fleet, and a combineLoads boolean.
It must:
- Calculate per-load fee from distance using the cost formula
- Auto-select the smallest truck that fits each material's quantity
- Support combining materials on one truck (if combineLoads=true)
- Calculate total loads, assign 1 load per day, price loads
  (load 1 = full, loads 2+ = 25% off, rounded to $5, min $25)
- Enforce $125 order minimum (waived within local radius)

Write Jest tests FIRST for these scenarios, then implement:

Test 1:  Address 8mi away → fee formula: round trip 16mi/35min → raw $28.17 → ×2 → $56.33 → rounded $60
Test 2:  Address 15mi away → fee ~$95
Test 3:  Address 25mi away → fee ~$145
Test 4:  Very close address (2mi) → raw cost low → minimum $25 kicks in
Test 5:  Address > 50mi (max radius) → outsideServiceArea: true
Test 6:  2nd load fee = 75% of first, rounded to $5, min $25 ($60 first → $45 second)
Test 7:  3 loads: load 1 = $60, loads 2-3 = $45 each → total $150
Test 8:  3 yd topsoil → Small Dump selected → 1 load
Test 9:  8 yd topsoil → Med Dump selected → 1 load
Test 10: 25 yd topsoil → Tri-Axle(20) + Small(5) → 2 loads = 2 days
Test 11: 5 yd mulch → Small Dump (7yd mulch cap) → 1 load
Test 12: 2yd topsoil + 2yd mulch, combineLoads=true → 1 Small Dump (4yd fits 5yd cap)
Test 13: 2yd topsoil + 2yd mulch, combineLoads=false → 2 loads = 2 days
Test 14: Only non-bulk, delivery → 1 fee
Test 15: Bulk + non-bulk → non-bulk rides free
Test 16: All items pickup → $0 delivery, no minimum
Test 17: Order total $90 beyond local radius → belowMinimum: true
Test 18: Order total $30 within 5mi → belowMinimum: false (local = no minimum)
Test 19: Pro member, delivery order → NO discount
Test 20: Pro member, pickup order → 5% off materials
Test 21: CC surcharge = 3% of (subtotal + delivery + tax)
Test 22: Cached address hit → returns cached fee without API call
Test 23: Server recalculation matches client calculation (idempotent formula)
Test 24: Google Maps API error → returns error state, blocks checkout

Use the TruckType, Product, DeliveryPricingConfig, and SiteSettings interfaces.
```

#### Prompt 6 — Zustand Cart Store
```
Build the cart store using Zustand in /src/stores/cartStore.ts.
State: items[], deliveryAddress (zip, full address), deliveryMethod
(pickup|delivery), promoCode, combineLoads (boolean, default false),
deliveryCalculation result, accessConstraints (DeliveryAccessInfo).
Actions: addItem, removeItem, updateQuantity, setDeliveryAddress
(triggers Google Maps Distance Matrix API call → fee calculation),
toggleDeliveryMethod, toggleCombineLoads (recalculates fees showing
load reduction), applyPromoCode (validate: Pro = pickup only),
setAccessConstraints. Check Supabase delivery_fee_cache first before
calling Google Maps API. The store must call calculateDeliveryFees()
from /src/lib/delivery.ts whenever items, address, or combineLoads
changes. Then compute:
tax = 8.75% of (subtotal + delivery), CC surcharge = 3% of (subtotal + delivery + tax).
All prices in cents internally, formatted to dollars in UI.
Show totalDeliveryDays prominently when > 1.
```

#### Prompt 7 — Shop Catalog & Product Pages
```
Build /shop catalog page with category sidebar filter, product grid cards
(image, name, price, unit, "Add to Cart" button), and sort options.
Build /shop/[slug] product detail page with image gallery, description,
quantity selector (respecting minQty/maxQty/stepQty), inline yard
calculator (L×W×D → yards), delivery/pickup toggle with ADDRESS entry
(not just zip) — on address entry, call Google Maps Distance Matrix API
to show real-time delivery fee per load + estimated drive time.
Show "Recommended uses" tags, "Pairs well with" cross-sell section,
and Add to Cart button.
```

#### Prompt 8 — Cart & Checkout UI
```
Build /cart page displaying: collapsible delivery fee summary (default:
"Delivery: $XXX — N truck loads" with expand to show per-load breakdown),
bulk items with load assignments, non-bulk grouped as "rides free",
3% credit card processing fee as separate line item with disclosure
notice, 8.75% tax line, delivery date picker (auto-defaulting based
on same-day cutoff logic), delivery access constraints checklist
(low wires, narrow driveway, soft ground, gated, steep + free text),
promo code field.

Build /checkout: guest checkout + optional account creation, delivery
address confirmation, full order summary with all fees, Stripe Checkout
Session integration via /api/checkout route. The API route MUST:
(1) call Google Maps Distance Matrix API server-side to recalculate
    delivery fee (NEVER trust client-side fee),
(2) calculate tax at 8.75%,
(3) calculate 3% CC surcharge,
(4) compare to client total and reject if mismatch,
(5) cache the fee in delivery_fee_cache,
(6) create Stripe session with itemized line items.
```

#### Prompt 9 — Order Confirmation & Email
```
Build order confirmation page and Stripe webhook handler (/api/webhooks/stripe).
Webhook must be IDEMPOTENT — check if order exists in Supabase by
checkout.session.id before processing. On successful payment: save order
to Supabase (items, delivery loads, fees, tax, CC surcharge, access
constraints, delivery schedule, distance/time from yard, customer info),
send confirmation email via Resend (include order details, delivery fee
breakdown with distance, CC fee, day-by-day delivery schedule, yard
address for pickup orders, access constraint notes). Build /account/orders page to list past orders with status.
```

#### Prompt 10 — Gallery & Local SEO Pages
```
Build /gallery page with filterable masonry grid (by service type:
landscaping, masonry, driveways, maintenance), lightbox viewer,
before/after slider component. Pull from Supabase gallery_projects table.

Build /delivery/[town] dynamic pages from Supabase town_pages table.
Each page must include: Google Maps embed with route from yard, calculated
delivery fee for that town center (pre-computed via Distance Matrix API
at build time), drive time, gallery projects tagged to that town,
town testimonial if available, and CTA with pre-filled zip code.
Generate data for 25 towns. Use generateStaticParams() for SSG.

Ship in two tiers:
- Tier A (top 10 towns): hand-curated 2-3 paragraphs + tagged gallery projects
- Tier B (remaining): programmatic with route map, delivery fee, bestsellers, FAQs
```

#### Prompt 11 — Blog, SEO & Analytics
```
Build /blog and /blog/[slug] pages using MDX files in /content/blog/.
Include rich text rendering, table of contents, related posts, and
"Materials Guide" hub page linking to calculator + top products.

Add to all pages: JSON-LD schema markup:
- LocalBusiness on home page
- Product on shop pages
- Service on service pages (landscaping, masonry, driveways, maintenance)
- FAQ on service pages
- Review where applicable

Generate sitemap.xml and robots.txt. Add Open Graph meta tags.
Set up Google Analytics 4 with @vercel/analytics.
Add internal linking blocks: product → related town pages, town → top products.
```

#### Prompt 12 — Admin Dashboard & Polish
```
Build /admin protected by Supabase Auth. Admin pages:
- Product manager: CRUD products, set bulk/non-bulk, material class,
  pricing, images (Supabase Storage), active toggle
- Delivery pricing config: fuel price, MPG, labor rate, profit multiplier,
  rounding, min fee, multi-load discount %, min order amount, local
  radius, max service radius. Include a "Fee Test" tool where staff
  can enter any address and see the calculated delivery fee (for phone quotes).
- Truck fleet manager: CRUD truck types and capacities
- Site settings: tax rate, CC surcharge %, same-day cutoff, operating
  days, blackout dates, Pro discount rate
- Order dashboard: list orders, status, delivery schedule calendar,
  load assignments, distance/fee per order, access constraint notes
- Gallery manager: upload images, tag by town and service type,
  mark before/after pairs
- Delivery fee cache: view cached addresses, clear cache

Final polish: performance audit (Core Web Vitals), image optimization
with next/image + sharp, 301 redirect map from old GoDaddy URLs,
mobile testing pass, accessibility audit.
```

### 8.4 Stripe Checkout Integration Detail

Do NOT handle payment on the client. The flow must be:

```
Client (Cart UI)
  → POST /api/checkout with { cartItems, deliveryAddress, combineLoads, promoCode, accessConstraints }
  → Server calls Google Maps Distance Matrix API (or checks cache)
  → Server recalculates delivery fee using SAME formula (NEVER trust client)
  → Server calculates: subtotal + delivery fees + tax (8.75%) + CC surcharge (3%)
  → Server rejects if fee mismatch (>$1 difference from client-submitted total)
  → Server creates Stripe Checkout Session with line items:
      - Each product as a line item (price in cents)
      - Each delivery load as a separate line item ("Day 1 — Tri-Axle, 20yd Topsoil", etc.)
      - Tax as a line item or Stripe Tax
      - "Credit Card Processing Fee (3%)" as a separate line item
  → Server caches delivery fee in Supabase delivery_fee_cache
  → Server returns Stripe session URL
  → Client redirects to Stripe hosted checkout
  → Stripe webhook → /api/webhooks/stripe (idempotent) → save order to Supabase → send email via Resend
```

**Stripe Webhook Idempotency:** The webhook handler must check if the order already exists in Supabase before processing. Use the Stripe `checkout.session.id` as the idempotency key to prevent duplicate order creation on webhook retries.

---

## 9. KEY FEATURES SUMMARY

| Feature | Priority | Competitor Parity |
|---------|----------|-------------------|
| Online product catalog with prices | 🔴 Critical | CMM, Bay Agg, American LS |
| Delivery/pickup toggle per order | 🔴 Critical | All competitors |
| Material/yard calculator → cart | 🔴 Critical | CMM, Bay Aggregates |
| Mobile-responsive design | 🔴 Critical | All competitors |
| Click-to-call on every page | 🔴 Critical | All competitors |
| Rich service pages (4 services) | 🔴 Critical | Unique advantage |
| Stripe payment processing | 🔴 Critical | American LS |
| 3% CC surcharge with legal disclosure | 🔴 Critical | Industry standard for local yards |
| 8.75% tax auto-calculation | 🔴 Critical | All competitors |
| Delivery access constraint checklist | 🔴 Critical | No competitor does this (reduces failed deliveries) |
| Multi-load delivery fee engine (20% off loads 2+) | 🔴 Critical | Unique — most competitors are call-for-price |
| Truck capacity auto-calculation (multi-trip for large orders) | 🔴 Critical | No competitor does this online |
| Distance-based delivery pricing (Google Maps) | 🔴 Critical | **Unique — no competitor calculates this live** |
| Google Reviews display | 🟡 High | CMM, Bay Aggregates |
| Pro/Contractor program | 🟡 High | Unique differentiator |
| Local SEO town pages | 🟡 High | CMM (50+ pages) |
| Blog/content hub | 🟡 High | CMM, Troffa |
| Before/After gallery | 🟡 High | Lily Landscapes |
| Service area map with fee estimator | 🟢 Medium | Bay Aggregates |
| Bilingual (Spanish) | 🟢 Medium | Bay Aggregates |
| Email newsletter/specials | 🟢 Medium | American LS |
| 3D design showcase | 🟢 Medium | Lily Landscapes |
| Fleet/equipment showcase | 🔵 Low | Bay Aggregates |

---

## 10. CONTENT NEEDED FROM CLIENT

Before Claude Code can build, the following should be gathered:

**Brand & Content**
- [ ] High-resolution logo files (SVG preferred)
- [ ] 20-50 project photos (completed landscaping, masonry, driveways, maintenance)
- [ ] Before/after photo pairs if available
- [ ] Company history and team/family photos
- [ ] Preferred color palette (or approval to evolve the current blue brand)

**Product & Inventory**
- [ ] Product inventory list with: names, descriptions, prices, images, units (yard/bag/pallet)
- [ ] **Bulk vs non-bulk classification per product** (which items require a dump truck vs. can be hand-loaded)
- [ ] Product categories and how they should be organized in the shop

**Delivery Operations**
- [x] **Delivery fee model:** Dynamic distance-based via Google Maps Distance Matrix API ✅
- [x] **Fee formula:** Round trip (fuel + labor) × 2, rounded to $5, min $25 ✅
- [x] **Multi-load discount:** 25% off loads 2+ ✅
- [x] **Truck fleet:** Small Dump (5yd/7yd mulch), Med Dump (10yd), Tri-Axle (20yd) ✅
- [x] **Delivery minimum:** $125 order minimum; within 5mi = no minimum ✅
- [x] **Load sharing:** YES, customer opt-in with cross-contamination warning ✅
- [x] **Max loads per day:** 1 per address ✅
- [x] **Wet weather:** no capacity reduction ✅
- [x] **Access constraints:** no surcharge; soft ground & low wires = potential no-go ✅
- [x] **Same-day cutoff:** 11 AM Mon–Fri ✅
- [ ] **Blackout dates:** holidays, seasonal closures
- [ ] **Max service radius:** confirm 50 miles (beyond = "call for quote")
- [ ] Delivery policies, refund policies, terms & conditions text

**Services**
- [ ] Service descriptions and process details for all 4 service lines
- [ ] Pricing guidance for services (even ranges help, or "call for quote")

**Financial & Legal**
- [x] **Stripe account** — client confirms active account ✅
- [x] **Tax rate: 8.75%** on all materials and delivery fees ✅
- [x] **3% credit card processing surcharge** on all orders ✅
- [ ] Confirm: is ANY product category tax-exempt? (default: all taxable)
- [ ] Pro program details: 5% off materials only — confirm this does NOT apply to delivery fees or CC surcharge
- [ ] Refund/cancellation policy text for the website
- [ ] Terms and conditions text

**SEO & Reputation**
- [ ] Google Business Profile link (for Reviews API integration)
- [ ] Existing customer testimonials (especially any that mention specific towns for local SEO pages)
- [ ] Google Reviews (or permission to display them via API)
- [ ] List of 20-30 towns in delivery radius with any local knowledge (common soil types, popular materials, notable projects completed there)

**Technical**
- [ ] Domain registrar access (for DNS changes when migrating from GoDaddy)
- [ ] Current GoDaddy admin access (to set up 301 redirects or extract customer data)
- [ ] Any existing email lists or customer databases to migrate

---

*This plan positions Eastern Landscape & Mason Supply to leapfrog competitors with a modern, fast, e-commerce-enabled website that highlights their unique dual advantage of being both a supply yard AND a full-service landscaping/masonry company.*

---

## 11. QUESTIONS TO RESOLVE BEFORE CODING

| # | Question | Status | Answer |
|---|----------|--------|--------|
| 1 | Delivery fee model | ✅ Resolved | **Dynamic distance-based** via Google Maps Distance Matrix API. Formula: round trip (fuel@$4/6MPG + labor@$30/hr + 5min buffer) × 2 for profit, rounded to $5, min $25 |
| 2 | Multi-load discount | ✅ Resolved | **25% off loads 2+**, rounded to $5, min $25 |
| 3 | Minimum for delivery | ✅ Resolved | **$125 order minimum.** Within 5mi: no dollar minimum |
| 4 | Can bulk materials share a truck? | ✅ Resolved | **YES, if customer accepts cross-contamination** (opt-in checkbox) |
| 5 | Max loads per day per address? | ✅ Resolved | **1 load per day max.** Multi-load = multi-day |
| 6 | Truck capacity per material | ✅ Resolved | **Small: 5yd (7 mulch), Med: 10yd, Tri-Axle: 20yd** |
| 7 | Tax-exempt products? | ✅ Resolved | **No — all products taxable at 8.75%** |
| 8 | Access constraint surcharges? | ✅ Resolved | **No surcharge.** Soft ground & low wires = potential no-go. |
| 9 | Wet weather capacity reduction? | ✅ Resolved | **No — truck capacity is fixed** |
| 10 | Pro discount scope? | ✅ Resolved | **5% off materials, PICKUP ONLY** |
| 11 | Cash/check payment option? | ✅ Resolved | **No — credit card only** |

**No remaining blockers.** All delivery engine questions are answered. Ready to build.

Minor items to confirm during build:
- Max service radius (suggested: 50 miles — beyond = "call for quote")
- Blackout dates for the initial deployment
- Fuel price update frequency (seasonal? monthly? admin updates manually?)

---

## REVISION LOG

| Version | Date | Reviewer | Changes |
|---------|------|----------|---------|
| v1.0 | 2025-02-28 | Claude (Anthropic) | Initial plan: site audit, competitor analysis, full sitemap, page specs, delivery pricing logic, build order |
| v2.0 | 2025-02-28 | Gemini (Google) + Adam | **Tech stack:** Removed Snipcart/Medusa, replaced with Custom Cart + Zustand + Stripe Checkout Sessions (server-validated). **Delivery engine:** Added truck capacity by weight category (light/medium/heavy), maxYardsPerLoad per product, multi-truck same-material logic, delivery minimums, tax rules. **SEO:** Rewrote local SEO town pages to avoid Google doorway page penalties — each page now requires 8 unique programmatic elements. **Claude Code:** Replaced generic "Phase 1-5" build order with 12 modular prompts optimized for Claude Code's context window, TDD for delivery fee engine, CLAUDE.md bootstrap file, and Stripe Checkout server-side validation flow. **Client checklist:** Expanded from 14 items to 25+ across 6 categories including tax, truck capacity, tipping policy, Stripe account, and domain access. |
| v2.1 | 2025-02-28 | Adam | Added Rule 6: Same-day delivery for orders placed before 11 AM Mon–Fri. Dynamic cart banner with countdown, auto-defaulting delivery date picker, admin-configurable cutoff hour/timezone. Updated trust bar, cart UI mockup, town page templates, edge cases table (cases 14-16), and DeliverySettings data model. |
| v3.0 | 2025-02-28 | OpenAI (GPT) + Adam | **Stack simplification:** Removed Sanity entirely. Single Supabase PostgreSQL database for everything (products, orders, zones, gallery, settings). Static service pages via MDX. **Pricing:** Tax locked at 8.75%. Added 3% CC processing surcharge as separate line item with NY legal disclosure requirements. **Delivery edge cases:** Added split delivery days for large orders (4+ loads), site access constraints checklist (low wires, narrow driveway, soft ground, gated, steep), wet weather capacity reduction toggle, partial load fee policy. **Product model:** Added minQty/maxQty/stepQty, unitDisplay, recommendedUses[], pairsWellWith[] for cross-sell, isTaxable flag, isActive toggle. **Cart UX:** Delivery breakdown now collapsible by default to reduce sticker shock. **MVP phasing:** Added Section 8.1 with 3-phase ship schedule (revenue-driving storefront first → SEO/content → growth features). **Admin:** Expanded to full Supabase-backed dashboard with product manager, zone manager, site settings, order management, gallery manager. **Client checklist:** Expanded to 30+ items with new operational questions (max loads/day, wet weather, access surcharges, multi-load same-day feasibility). |
| v3.1 | 2025-02-28 | Adam | **MAJOR: Delivery pricing model completely replaced.** Removed ALL zone-based pricing (no more zip code lists, no fixed fees per zone). Delivery fees now calculated **dynamically via Google Maps Distance Matrix API** using client's existing formula: round-trip fuel ($4/gal ÷ 6 MPG) + labor ($30/hr) + 5min buffer, doubled for profit, rounded to nearest $5, minimum $25. Multi-load discount changed from 20% to **25% off loads 2+**. Added `delivery_fee_cache` table (24hr TTL per address) to reduce API calls. Added API fallback handling (show "call for quote" if Google Maps down). Added server-side fee validation at checkout (reject if server calc ≠ client calc). Added max service radius (50mi default). Added admin "Fee Test" tool for phone quotes. Removed `delivery_zones` table entirely. Updated all 12 prompts, TDD tests (now 24), cart UI, data model, CLAUDE.md, and client checklist. **All delivery engine questions now resolved — no remaining blockers.** |
