export type MaterialLandingPage = {
  slug: string;
  title: string;
  metaTitle: string;
  metaDescription: string;
  heroTitle: string;
  heroSubtitle: string;
  seasonalCta: string;
  variants: MaterialVariant[];
  calculatorType: string | null;
  estimatorConfig: EstimatorConfig | null;
  useCases: UseCase[];
  faqs: { q: string; a: string }[];
  serviceUpsell: ServiceUpsell;
  relatedSlugs: string[];
};

export type MaterialVariant = {
  name: string;
  productSlug: string;
  description: string;
  badge?: string;
};

export type UseCase = {
  icon: string;
  title: string;
  description: string;
};

export type EstimatorConfig = {
  title: string;
  description: string;
  depthLabel: string;
  defaultDepthInches: number;
};

export type ServiceUpsell = {
  headline: string;
  description: string;
  serviceCategory: string;
  cta: string;
};

const pages: MaterialLandingPage[] = [
  {
    slug: "topsoil",
    title: "Topsoil & Compost",
    metaTitle: "Topsoil & Compost Delivery — Suffolk County | Eastern LM",
    metaDescription: "Screened organic topsoil and compost delivered across Suffolk County. Calculate how much you need, order online, delivered same-day.",
    heroTitle: "Topsoil & Compost Delivery",
    heroSubtitle: "Screened organic topsoil and premium compost for gardens, lawns, and grading. Delivered across Suffolk County.",
    seasonalCta: "Spring planting season — delivery slots filling fast",
    variants: [
      { name: "Screened Organic Topsoil", productSlug: "topsoil-screened-organic", description: "Rich, screened topsoil for planting beds, lawns, and raised gardens.", badge: "Most Popular" },
      { name: "Premium Compost", productSlug: "premium-compost", description: "Aged organic compost to improve soil structure, drainage, and nutrients." },
      { name: "Topsoil/Compost Blend", productSlug: "topsoil-compost-blend", description: "50/50 mix — best for new lawns, gardens, and overseeding." },
      { name: "Clean Fill", productSlug: "clean-fill", description: "Unscreened fill dirt for grading, filling holes, and raising low spots." },
    ],
    calculatorType: "topsoil",
    estimatorConfig: null,
    useCases: [
      { icon: "sprout", title: "New Lawn / Overseeding", description: "3-4 inches of topsoil blend for new sod or seed beds." },
      { icon: "flower", title: "Garden Beds & Planting", description: "Fill raised beds or amend existing beds with compost." },
      { icon: "ruler", title: "Grading & Leveling", description: "Fill low spots, level yards, prep for patios or pools." },
      { icon: "tree", title: "Tree & Shrub Planting", description: "Backfill planting holes with enriched topsoil blend." },
    ],
    faqs: [
      { q: "What's the difference between topsoil and compost?", a: "Topsoil is screened native soil — great as a base. Compost is fully decomposed organic matter that enriches existing soil. For most projects, a blend of both works best." },
      { q: "How much topsoil do I need?", a: "Use our calculator above. As a rule of thumb: 1 cubic yard covers about 100 sq ft at 3 inches deep." },
      { q: "Can I get same-day delivery?", a: "Orders placed before 11 AM on weekdays typically qualify for same-day delivery." },
      { q: "Do you deliver to my area?", a: "We deliver across Suffolk County from Patchogue to Southampton and Miller Place to Mattituck." },
    ],
    serviceUpsell: {
      headline: "Need it spread? We'll do it.",
      description: "Our crew delivers and spreads topsoil for new lawns, garden beds, and grading projects. Materials come from our yard — no markup.",
      serviceCategory: "landscaping",
      cta: "Get a Free Install Quote",
    },
    relatedSlugs: ["mulch", "sand", "fill-dirt"],
  },
  {
    slug: "mulch",
    title: "Mulch",
    metaTitle: "Mulch Delivery — Black, Brown, Red, Natural | Eastern LM",
    metaDescription: "Bulk mulch delivery across Suffolk County. Black, brown, red, and natural double-ground mulch. Order online, same-day delivery available.",
    heroTitle: "Bulk Mulch Delivery",
    heroSubtitle: "Double-ground dyed and natural mulch delivered to your property. Choose your color, calculate your quantity, order online.",
    seasonalCta: "Spring mulch season — book your delivery today",
    variants: [
      { name: "Black Mulch", productSlug: "black-mulch", description: "Premium black dyed mulch. Rich color lasts the full season.", badge: "Best Seller" },
      { name: "Brown Mulch", productSlug: "brown-mulch", description: "Classic brown dyed mulch — natural look with lasting color." },
      { name: "Red Mulch", productSlug: "red-mulch", description: "Vibrant red dyed mulch for bold curb appeal." },
      { name: "Dark Natural Mulch", productSlug: "dark-natural-mulch", description: "No dye, no chemicals. Double-ground natural hardwood." },
    ],
    calculatorType: "mulch",
    estimatorConfig: null,
    useCases: [
      { icon: "home", title: "Curb Appeal Refresh", description: "Fresh mulch transforms beds in a single delivery." },
      { icon: "droplets", title: "Moisture Retention", description: "Reduces watering by slowing evaporation." },
      { icon: "shield", title: "Weed Prevention", description: "3-4 inch layer suppresses weed growth naturally." },
      { icon: "tree", title: "Tree Rings & Beds", description: "Protect root zones and define planting areas." },
    ],
    faqs: [
      { q: "How much mulch do I need?", a: "Use our calculator above. Standard coverage: 1 cubic yard covers ~100 sq ft at 3 inches deep. Most residential jobs need 3-8 yards." },
      { q: "Is your mulch double-ground?", a: "Yes — all our mulch is double-ground for a finer texture, better coverage, and cleaner look." },
      { q: "How long does the color last?", a: "Dyed mulch holds color for a full season (6-12 months). Black and brown hold longest." },
      { q: "What size truck do you deliver with?", a: "Small dump (up to 7 yards mulch), medium dump (10 yards), or tri-axle (20 yards) depending on your order size." },
    ],
    serviceUpsell: {
      headline: "Want it installed? We'll do it.",
      description: "Our crew delivers, spreads, and edges mulch beds for you. Same materials, same prices — we just do the labor.",
      serviceCategory: "landscaping",
      cta: "Get a Free Install Quote",
    },
    relatedSlugs: ["topsoil", "pea-gravel", "sand"],
  },
  {
    slug: "sand",
    title: "Sand",
    metaTitle: "Sand Delivery — Mason, Pool, Play, Concrete | Eastern LM",
    metaDescription: "Bulk sand delivery across Suffolk County. Mason sand, concrete sand, pool sand, play sand. Choose the right sand for your project.",
    heroTitle: "Long Island Sand Delivery",
    heroSubtitle: "The right sand for every application — pool, beach, playground, masonry, concrete, and drainage. Delivered across Suffolk County.",
    seasonalCta: "Pool season prep — sand delivery available this week",
    variants: [
      { name: "Mason Sand", productSlug: "mason-sand", description: "Fine, washed sand for setting pavers, mortar mix, and masonry joints.", badge: "Most Popular" },
      { name: "Concrete Sand", productSlug: "concrete-sand", description: "Coarser washed sand for mixing concrete and structural applications." },
      { name: "Pool Filter Sand", productSlug: "pool-filter-sand", description: "Graded silica sand for pool filters and pool base leveling." },
      { name: "Play Sand / Beach Sand", productSlug: "play-sand", description: "Clean, fine-grain sand for sandboxes, play areas, and beach volleyball courts." },
      { name: "Drainage Sand", productSlug: "drainage-sand", description: "Coarse sand for French drains, septic systems, and drainage behind retaining walls." },
    ],
    calculatorType: "sand",
    estimatorConfig: null,
    useCases: [
      { icon: "waves", title: "Pool Base & Filters", description: "Level pool bases and refill sand filters for the season." },
      { icon: "baby", title: "Playground & Sandbox", description: "Safe, clean play sand for kids' areas and play structures." },
      { icon: "brick", title: "Paver & Masonry Work", description: "Setting bed sand for pavers, flagstone, and brick joints." },
      { icon: "concrete", title: "Concrete Mixing", description: "Properly graded concrete sand for structural pours." },
      { icon: "drain", title: "Drainage & Septic", description: "Behind retaining walls, French drains, and leach fields." },
    ],
    faqs: [
      { q: "What type of sand do I need for pavers?", a: "Mason sand — it's fine and washed, perfect for the setting bed under pavers. You'll also want polymeric sand for the joints." },
      { q: "What sand is safe for playgrounds?", a: "Our play sand is washed and screened, suitable for sandboxes and playground surfaces." },
      { q: "How much sand do I need for a patio base?", a: "Typically 1 inch of sand under pavers. Use our calculator — enter your patio dimensions at 1 inch depth." },
      { q: "Can you deliver sand for a pool install?", a: "Yes — pool filter sand and base sand delivered to your site. Most pool installs need 3-5 yards." },
    ],
    serviceUpsell: {
      headline: "Need masonry or patio work?",
      description: "Our crews install patios, walkways, and retaining walls using sand and stone from our yard. One source, no markup on materials.",
      serviceCategory: "masonry",
      cta: "Get a Free Quote",
    },
    relatedSlugs: ["pea-gravel", "bluestone-gravel", "topsoil"],
  },
  {
    slug: "fill-dirt",
    title: "Fill Dirt",
    metaTitle: "Fill Dirt Delivery — Fill Holes, Level Yards | Eastern LM",
    metaDescription: "Clean fill dirt delivered across Suffolk County. Fill holes, level low spots, raise grades. Calculate how much you need.",
    heroTitle: "Fill a Hole with Dirt",
    heroSubtitle: "Clean fill dirt for grading, leveling, and filling. Calculate exactly how much you need — we'll deliver it.",
    seasonalCta: "Spring grading projects — order fill dirt for delivery",
    variants: [
      { name: "Clean Fill", productSlug: "clean-fill", description: "Unscreened native fill for raising grades and filling large voids.", badge: "Best Value" },
      { name: "Screened Fill", productSlug: "screened-fill", description: "Screened for rocks and debris — smoother finish for visible areas." },
      { name: "Topsoil (Top Layer)", productSlug: "topsoil-screened-organic", description: "Use fill to raise the grade, then top with 3-4 inches of screened topsoil for planting." },
    ],
    calculatorType: "fill",
    estimatorConfig: {
      title: "How Much Fill Do I Need?",
      description: "Measure the hole or area to fill. Enter dimensions below.",
      depthLabel: "Depth to fill",
      defaultDepthInches: 12,
    },
    useCases: [
      { icon: "hole", title: "Fill Holes & Depressions", description: "Pool removal, stump holes, settled areas, and sinkholes." },
      { icon: "ruler", title: "Raise Low Grades", description: "Lift low-lying areas to improve drainage away from foundations." },
      { icon: "foundation", title: "Prep for Slabs & Sheds", description: "Build up grade for concrete pads, sheds, and garage floors." },
      { icon: "pipe", title: "Backfill Trenches", description: "Cover utility lines, French drains, and septic work." },
    ],
    faqs: [
      { q: "How do I estimate how much fill I need?", a: "Measure the length, width, and depth of the area in feet. Use our calculator above — it converts to cubic yards automatically." },
      { q: "Should I use fill dirt or topsoil?", a: "Fill dirt for the bulk of the volume (cheap and stable). Top the last 3-4 inches with screened topsoil if you're planting grass." },
      { q: "Can you deliver fill dirt same-day?", a: "Yes — orders before 11 AM on weekdays qualify for same-day delivery." },
      { q: "What's the minimum order?", a: "We deliver as little as 1 cubic yard. Delivery fee is distance-based — check at checkout." },
    ],
    serviceUpsell: {
      headline: "Need grading done right?",
      description: "Our crew delivers fill, grades the site, and tops with soil. One call for the whole project — no subcontractors.",
      serviceCategory: "landscaping",
      cta: "Get a Free Grading Quote",
    },
    relatedSlugs: ["topsoil", "rca-base", "sand"],
  },
  {
    slug: "pea-gravel",
    title: "Pea Gravel",
    metaTitle: "Pea Gravel Delivery — Walkways, Patios, Drainage | Eastern LM",
    metaDescription: "Bulk pea gravel delivery in Suffolk County. Perfect for walkways, patios, drainage, dog runs, and garden borders. Order online.",
    heroTitle: "Pea Gravel Delivery",
    heroSubtitle: "Smooth, rounded pea gravel for walkways, patios, drainage, and decorative ground cover. Delivered across Suffolk County.",
    seasonalCta: "Spring landscaping projects — pea gravel in stock",
    variants: [
      { name: "Pea Gravel (3/8\")", productSlug: "pea-gravel", description: "Classic small rounded stone for walkways, patios, and ground cover.", badge: "Most Popular" },
      { name: "River Rock (1-3\")", productSlug: "river-rock", description: "Larger smooth stones for dry creek beds, borders, and decorative features." },
    ],
    calculatorType: "gravel",
    estimatorConfig: null,
    useCases: [
      { icon: "footprints", title: "Walkways & Paths", description: "Soft, permeable surface for garden paths and side yards." },
      { icon: "droplets", title: "Drainage & French Drains", description: "Excellent drainage layer around foundations and in drain trenches." },
      { icon: "dog", title: "Dog Runs & Play Areas", description: "Easy to clean, soft underfoot, good drainage." },
      { icon: "flower", title: "Garden Borders", description: "Define planting beds and suppress weeds between pavers." },
    ],
    faqs: [
      { q: "How deep should pea gravel be?", a: "2-3 inches for walkways and patios. 4-6 inches for drainage applications. Use our calculator with your depth." },
      { q: "Do I need landscape fabric under pea gravel?", a: "Yes — we recommend weed fabric underneath to prevent gravel from mixing with soil. We sell landscape fabric in our shop." },
      { q: "Will pea gravel wash away?", a: "On flat surfaces it stays well. For slopes, consider edging or a heavier stone like bluestone gravel." },
      { q: "How much pea gravel for a patio?", a: "Enter your patio dimensions in the calculator above at 3 inches deep for a standard application." },
    ],
    serviceUpsell: {
      headline: "Want a finished walkway or patio?",
      description: "Our crew installs pea gravel walkways with proper edging, fabric, and grading. Materials from our yard — no markup.",
      serviceCategory: "landscaping",
      cta: "Get a Free Install Quote",
    },
    relatedSlugs: ["bluestone-gravel", "sand", "rca-base"],
  },
  {
    slug: "bluestone-gravel",
    title: "Bluestone Gravel",
    metaTitle: "Bluestone Gravel Delivery — Driveways, Walkways | Eastern LM",
    metaDescription: "Bulk bluestone gravel delivery in Suffolk County. Blue-gray crushed stone for driveways, walkways, and decorative landscapes. Order online.",
    heroTitle: "Bluestone Gravel Delivery",
    heroSubtitle: "Crushed bluestone for driveways, walkways, and decorative hardscape. The classic Long Island look. Delivered across Suffolk County.",
    seasonalCta: "Driveway refresh season — bluestone gravel in stock",
    variants: [
      { name: "Bluestone Gravel (3/4\")", productSlug: "bluestone-gravel-3-4", description: "Standard crushed bluestone for driveways, paths, and decorative cover.", badge: "Most Popular" },
      { name: "Bluestone Dust / Screenings", productSlug: "bluestone-dust", description: "Fine bluestone for paver base, compacting, and filling joints." },
      { name: "Bluestone Gravel (1.5\")", productSlug: "bluestone-gravel-1-5", description: "Larger bluestone for drainage layers and heavy traffic areas." },
    ],
    calculatorType: "gravel",
    estimatorConfig: null,
    useCases: [
      { icon: "car", title: "Driveway Top Layer", description: "Classic blue-gray surface stone over compacted base." },
      { icon: "footprints", title: "Garden Walkways", description: "Attractive, natural-look paths through landscape areas." },
      { icon: "layers", title: "Paver Base & Leveling", description: "Bluestone dust compacts tight — ideal under flagstone and pavers." },
      { icon: "palette", title: "Decorative Ground Cover", description: "Clean, uniform blue-gray color for borders and features." },
    ],
    faqs: [
      { q: "What size bluestone gravel for a driveway?", a: "3/4\" bluestone is the standard driveway topping. Lay it 2-3 inches deep over a compacted RCA or Item 4 base." },
      { q: "Do I need a base under bluestone gravel?", a: "For driveways, yes — 4-6 inches of RCA or Item 4 compacted base, then 2-3 inches of bluestone on top." },
      { q: "How much bluestone for my driveway?", a: "Enter your driveway dimensions in the calculator above. A typical 2-car driveway (20×40 ft) needs about 5 yards of surface stone." },
      { q: "What's the difference between bluestone gravel and dust?", a: "Gravel is the top layer you see and walk on. Dust/screenings is the fine material used underneath for leveling and compacting." },
    ],
    serviceUpsell: {
      headline: "Need a driveway built or refreshed?",
      description: "Our crew preps the base, grades properly, and lays the stone. Full driveway installs and resurfaces.",
      serviceCategory: "driveways",
      cta: "Get a Free Driveway Quote",
    },
    relatedSlugs: ["rca-base", "pea-gravel", "sand"],
  },
  {
    slug: "rca-base",
    title: "RCA / Crusher Run Base",
    metaTitle: "RCA & Crusher Run Delivery — Driveways, Shed Pads | Eastern LM",
    metaDescription: "Recycled concrete aggregate (RCA) and crusher run delivered across Suffolk County. Driveways, shed pads, potholes, and base courses.",
    heroTitle: "RCA & Crusher Run Base",
    heroSubtitle: "Recycled concrete aggregate and crusher run for driveways, shed pads, potholes, and base courses. Compacts solid, drains well.",
    seasonalCta: "Driveway season — RCA and base material in stock",
    variants: [
      { name: "RCA (Recycled Concrete)", productSlug: "rca", description: "Crushed recycled concrete. Compacts hard, great drainage. Best value for bases.", badge: "Best Value" },
      { name: "Item 4 / Crusher Run", productSlug: "item-4", description: "Crushed stone and fines mix that locks together when compacted." },
      { name: "3/4\" Processed Gravel", productSlug: "processed-gravel-3-4", description: "Clean crushed stone for drainage layers and base courses." },
    ],
    calculatorType: "rca",
    estimatorConfig: null,
    useCases: [
      { icon: "car", title: "Driveway Base", description: "4-6 inches compacted base under any driveway surface — gravel, bluestone, or asphalt." },
      { icon: "warehouse", title: "Shed & Garage Pads", description: "Level, compacted pad for sheds, garages, and equipment storage." },
      { icon: "construction", title: "Fill Potholes", description: "Quick pothole repair — tamp RCA into holes for an immediate fix." },
      { icon: "layers", title: "Patio & Walkway Base", description: "Structural base layer under pavers, flagstone, and block walls." },
    ],
    faqs: [
      { q: "What's the difference between RCA and Item 4?", a: "RCA is recycled concrete — it's the best value and compacts very hard. Item 4 (crusher run) is virgin crushed stone with fines. Both work great as base material." },
      { q: "How thick should my driveway base be?", a: "4-6 inches of compacted RCA or Item 4 for residential driveways. 8+ inches for heavy truck traffic." },
      { q: "Can I use RCA to fix potholes?", a: "Yes — RCA is excellent for pothole repair. Dump it in, rake level, and tamp or drive over it. It locks together." },
      { q: "How much base for a shed pad?", a: "Enter your shed dimensions in the calculator at 4 inches deep. A 10×12 shed pad needs about 1.5 yards." },
    ],
    serviceUpsell: {
      headline: "Need a driveway or pad built?",
      description: "Our crew excavates, grades, compacts base, and finishes with your choice of surface stone. Full driveway installs.",
      serviceCategory: "driveways",
      cta: "Get a Free Driveway Quote",
    },
    relatedSlugs: ["bluestone-gravel", "pea-gravel", "fill-dirt"],
  },
  {
    slug: "walkways",
    title: "Walkway Materials",
    metaTitle: "Walkway Materials — Flagstone, Gravel, Edging | Eastern LM",
    metaDescription: "Everything for walkway projects: flagstone, pea gravel, bluestone, edging, and paver base. Delivered across Suffolk County.",
    heroTitle: "Walkway Revamp or New Install",
    heroSubtitle: "Flagstone, gravel, edging, and base materials for walkway projects. Whether you're DIY or want us to build it — we supply it all.",
    seasonalCta: "Spring hardscape season — walkway materials in stock",
    variants: [
      { name: "Flagstone (Natural)", productSlug: "flagstone-irregular", description: "Irregular natural flagstone for rustic, organic walkway designs.", badge: "Popular" },
      { name: "Bluestone Gravel (3/4\")", productSlug: "bluestone-gravel-3-4", description: "Crushed bluestone for gravel walkway surfaces." },
      { name: "Pea Gravel (3/8\")", productSlug: "pea-gravel", description: "Smooth rounded stone for casual garden paths." },
      { name: "Paver Base / Item 4", productSlug: "item-4", description: "Compactable base layer for any walkway project." },
      { name: "Steel Edging", productSlug: "steel-edging", description: "Clean metal edge to contain gravel and define walkway borders." },
    ],
    calculatorType: "gravel",
    estimatorConfig: null,
    useCases: [
      { icon: "footprints", title: "Front Walk Upgrade", description: "Replace cracked concrete with natural flagstone or pavers." },
      { icon: "flower", title: "Garden Path", description: "Meandering gravel or stepping-stone path through gardens." },
      { icon: "door", title: "Side Yard Access", description: "Functional gravel path along the house for utility access." },
      { icon: "fence", title: "Property Border Paths", description: "Define property edges with edged gravel walks." },
    ],
    faqs: [
      { q: "What's the best walkway material for DIY?", a: "Pea gravel or bluestone gravel — lay fabric, install edging, spread stone. No cutting or mortar needed." },
      { q: "How wide should a walkway be?", a: "3 feet minimum for a side path, 4-5 feet for a front walk where two people pass." },
      { q: "Do I need a base under flagstone?", a: "Yes — 4 inches of compacted Item 4 or RCA base, 1 inch of mason sand setting bed, then flagstone on top." },
      { q: "How do I keep gravel in place?", a: "Steel or aluminum edging on both sides. We sell steel edging — it hammers in with landscape spikes." },
    ],
    serviceUpsell: {
      headline: "Want a walkway installed?",
      description: "Our masonry crew builds flagstone and paver walkways with proper base, drainage, and edging. Lifetime materials from our yard.",
      serviceCategory: "masonry",
      cta: "Get a Free Walkway Quote",
    },
    relatedSlugs: ["pea-gravel", "bluestone-gravel", "rca-base"],
  },
  {
    slug: "firepits",
    title: "Natural Fire Pit Materials",
    metaTitle: "Fire Pit Installation & Materials — Boulders, Stone | Eastern LM",
    metaDescription: "Natural fire pit materials delivered across Suffolk County. Boulders, fieldstone, gravel base, and fire-rated supplies. DIY or we install.",
    heroTitle: "Natural Fire Pit Installs",
    heroSubtitle: "Build a natural stone fire pit with boulders, fieldstone, and gravel. We supply the materials — or our crew installs it for you.",
    seasonalCta: "Spring projects — fire pit installs booking now",
    variants: [
      { name: "Fieldstone / Wall Stone", productSlug: "fieldstone", description: "Natural irregular stone for stacking a rustic fire pit ring.", badge: "Natural Look" },
      { name: "Boulders (Various Sizes)", productSlug: "boulders", description: "Accent boulders to define the fire pit area and seating." },
      { name: "Pea Gravel (Base)", productSlug: "pea-gravel", description: "Drainage layer and decorative surround for the fire pit area." },
      { name: "RCA / Base Material", productSlug: "rca", description: "Compacted base under the fire pit for stability and drainage." },
    ],
    calculatorType: null,
    estimatorConfig: null,
    useCases: [
      { icon: "flame", title: "Backyard Gathering", description: "A natural stone fire pit becomes the center of your outdoor space." },
      { icon: "mountain", title: "Boulder Seating Ring", description: "Large boulders double as seating around the fire." },
      { icon: "compass", title: "Rustic, Natural Look", description: "Fieldstone and boulders — no manufactured block, all natural." },
      { icon: "home", title: "Property Value", description: "Outdoor fire features add value and appeal to any home." },
    ],
    faqs: [
      { q: "How big should a fire pit be?", a: "The fire ring itself is typically 3-4 feet in diameter. With a gravel surround and seating, plan for a 12-15 foot diameter area." },
      { q: "Do I need a permit?", a: "Most Suffolk County towns allow recreational fire pits. Check your local fire department for setback rules (typically 15 feet from structures)." },
      { q: "What goes under a fire pit?", a: "6 inches of compacted RCA or gravel base for drainage. Never build directly on grass — it kills the root system and can smolder." },
      { q: "Can you install a fire pit for me?", a: "Yes — our masonry crew builds natural fire pits with proper base, stone ring, and gravel surround. Request a quote below." },
    ],
    serviceUpsell: {
      headline: "Want us to build it?",
      description: "Our masonry crew installs natural stone fire pits with proper drainage, stone ring, and gravel surround. One crew, one source for materials.",
      serviceCategory: "masonry",
      cta: "Get a Free Fire Pit Quote",
    },
    relatedSlugs: ["boulders", "pea-gravel", "rca-base"],
  },
  {
    slug: "boulders",
    title: "Boulders",
    metaTitle: "Boulders & Accent Stones — Delivery & Placement | Eastern LM",
    metaDescription: "Natural boulders delivered and placed across Suffolk County. Retaining walls, garden accents, property borders, fire pit seating.",
    heroTitle: "Boulders & Accent Stones",
    heroSubtitle: "Natural boulders for retaining walls, garden accents, borders, and landscape features. We deliver and place with our equipment.",
    seasonalCta: "Spring landscaping — boulders in stock, delivery available",
    variants: [
      { name: "Accent Boulders (1-2 ft)", productSlug: "boulders-small", description: "Smaller boulders for garden accents, borders, and decorative placement." },
      { name: "Feature Boulders (2-4 ft)", productSlug: "boulders-medium", description: "Statement pieces for landscape focal points and fire pit areas.", badge: "Popular" },
      { name: "Wall Boulders (3-5 ft)", productSlug: "boulders-large", description: "Large boulders for natural retaining walls and property borders." },
      { name: "Fieldstone / Wall Stone", productSlug: "fieldstone", description: "Stackable natural stone for walls, borders, and fire pits." },
    ],
    calculatorType: null,
    estimatorConfig: null,
    useCases: [
      { icon: "mountain", title: "Natural Retaining Walls", description: "Stack boulders to hold slopes — no mortar, natural drainage." },
      { icon: "flower", title: "Garden Focal Points", description: "Anchor your landscape design with a statement boulder." },
      { icon: "fence", title: "Property Borders", description: "Define property lines and prevent vehicle encroachment." },
      { icon: "flame", title: "Fire Pit Seating", description: "Flat-top boulders double as permanent seating around fire pits." },
    ],
    faqs: [
      { q: "How do you deliver boulders?", a: "We deliver on our trucks and use equipment to place them. Tell us where you want them — we'll set them in position." },
      { q: "How do I choose boulder sizes?", a: "For accents, 1-2 ft. For fire pit seating, 2-3 ft with flat tops. For retaining walls, 3-5 ft depending on the slope." },
      { q: "Can boulders work as a retaining wall?", a: "Yes — stacked boulders make excellent natural retaining walls for slopes up to 3-4 feet. Taller walls may need engineering." },
      { q: "How much do boulders cost?", a: "Pricing depends on size and type. Call us at (631) 874-6244 for availability and pricing on specific sizes." },
    ],
    serviceUpsell: {
      headline: "Need boulders placed?",
      description: "Our crew delivers and places boulders with equipment — no heavy lifting on your end. Retaining walls, accents, and borders.",
      serviceCategory: "landscaping",
      cta: "Get a Free Placement Quote",
    },
    relatedSlugs: ["firepits", "pea-gravel", "rca-base"],
  },
];

export function getMaterialLandingPage(slug: string): MaterialLandingPage | undefined {
  return pages.find((p) => p.slug === slug);
}

export function getAllMaterialLandingPageSlugs(): string[] {
  return pages.map((p) => p.slug);
}

export function getAllMaterialLandingPages(): MaterialLandingPage[] {
  return pages;
}
