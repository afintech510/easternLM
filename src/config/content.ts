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
    description: "Dyed and natural mulch for beds, trees, and erosion control.",
  },
  {
    name: "Topsoil",
    slug: "topsoil",
    description: "Screened soils for lawns, grading, and planting work.",
  },
  {
    name: "Gravel & Stone",
    slug: "gravel-stone",
    description: "Crushed stone blends for drainage, driveways, and bases.",
  },
  {
    name: "Sand",
    slug: "sand",
    description: "Masonry and leveling sand for patios, pavers, and concrete prep.",
  },
  {
    name: "Natural Stone",
    slug: "natural-stone",
    description: "Decorative and structural stone for custom outdoor projects.",
  },
  {
    name: "Mason Supplies",
    slug: "mason-supplies",
    description: "Cement, mix, and essentials for masonry and hardscape installs.",
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
