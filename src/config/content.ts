export type Category = {
  name: string;
  slug: string;
  description: string;
};

export type Service = {
  name: string;
  slug: string;
  description: string;
};

export const featuredCategories: Category[] = [
  {
    name: "Mulch",
    slug: "mulch",
    description: "Dyed and natural bulk mulch for beds, trees, and erosion control.",
  },
  {
    name: "Topsoil & Fill",
    slug: "topsoil-fill",
    description: "Screened topsoil, compost, clean fill, and bank run for grading and planting.",
  },
  {
    name: "Gravel & Stone",
    slug: "gravel-stone",
    description: "Bulk crushed stone, gravel, and aggregate for driveways, drainage, and bases.",
  },
  {
    name: "Sand",
    slug: "sand",
    description: "Fine mason sand and concrete sand for patios, pavers, and concrete prep.",
  },
  {
    name: "Natural Stone",
    slug: "natural-stone",
    description: "Flagstone, cobblestone, boulders, steppers, treads, and veneer stone.",
  },
  {
    name: "Masonry & Concrete",
    slug: "masonry-concrete",
    description: "Cement blocks, brick, mortar, portland, concrete mix, rebar, and reinforcement.",
  },
  {
    name: "Pavers & Hardscape",
    slug: "pavers",
    description: "Cambridge, Nicolock pavers, polymeric sand, and paver accessories.",
  },
  {
    name: "Bagged Materials",
    slug: "bagged-material",
    description: "Bagged mulch, soil, gravel, salt, and bucket-size materials for small projects.",
  },
  {
    name: "Tools & Supplies",
    slug: "tools",
    description: "Masonry tools, blades, levels, trowels, shovels, and job site essentials.",
  },
  {
    name: "Chemicals & Sealers",
    slug: "chemicals",
    description: "Paver sealers, cleaners, stain removers, cement color, and muriatic acid.",
  },
  {
    name: "Landscape & Drainage",
    slug: "landscape",
    description: "Weed fabric, edging, drain covers, drainage rock, and landscape accessories.",
  },
  {
    name: "Outdoor Living",
    slug: "outdoor-living",
    description: "Propane fills, firewood, grass seed, and outdoor fireplace units.",
  },
  {
    name: "Rentals & Services",
    slug: "rentals-services",
    description: "Dump trailer rental, mulch installation, dumping fees, and delivery services.",
  },
];

export const coreServices: Service[] = [
  {
    name: "Landscaping",
    slug: "landscaping",
    description: "Planting, grading, and outdoor environment improvements.",
  },
  {
    name: "Masonry",
    slug: "masonry",
    description: "Patios, walkways, retaining walls, and stone features.",
  },
  {
    name: "Driveways",
    slug: "driveways",
    description: "Gravel and stone driveway installs, repairs, and resurfacing.",
  },
  {
    name: "Property Maintenance",
    slug: "property-maintenance",
    description: "Seasonal upkeep, cleanup, and ongoing site maintenance.",
  },
];
