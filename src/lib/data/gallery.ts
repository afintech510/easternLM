import { getSupabaseServerClient } from "@/lib/supabase/server";

export type GalleryServiceType = "landscaping" | "masonry" | "driveways" | "maintenance";

export type GalleryProject = {
  id: string;
  title: string;
  description: string;
  images: string[];
  townTags: string[];
  serviceType: GalleryServiceType;
  beforeAfter: boolean;
  isFeatured: boolean;
  createdAt: string;
};

const fallbackProjects: GalleryProject[] = [
  {
    id: "fallback-1",
    title: "Driveway Regrade and Stone Refresh",
    description: "Compacting stone base upgrade with final surface reshape for drainage.",
    images: [
      "/images/placeholder-product.svg",
      "/images/placeholder-product.svg",
    ],
    townTags: ["center-moriches"],
    serviceType: "driveways",
    beforeAfter: true,
    isFeatured: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: "fallback-2",
    title: "Patio Stone and Border Install",
    description: "Natural stone feature with clean edge restraint and sand-set joints.",
    images: ["/images/placeholder-product.svg"],
    townTags: ["shirley"],
    serviceType: "masonry",
    beforeAfter: false,
    isFeatured: false,
    createdAt: new Date().toISOString(),
  },
  {
    id: "fallback-3",
    title: "Seasonal Bed Refresh",
    description: "Old beds cleaned, re-edged, and topped with premium mulch.",
    images: ["/images/placeholder-product.svg"],
    townTags: ["east-moriches"],
    serviceType: "maintenance",
    beforeAfter: false,
    isFeatured: false,
    createdAt: new Date().toISOString(),
  },
];

function normalizeServiceType(value: string): GalleryServiceType {
  if (value === "masonry") {
    return "masonry";
  }

  if (value === "driveways") {
    return "driveways";
  }

  if (value === "maintenance" || value === "property-maintenance") {
    return "maintenance";
  }

  return "landscaping";
}

export async function getGalleryProjects(): Promise<GalleryProject[]> {
  try {
    const supabase = getSupabaseServerClient();
    const result = await supabase
      .from("gallery_projects")
      .select("id, title, description, images, town_tags, service_type, before_after, is_featured, created_at")
      .order("is_featured", { ascending: false })
      .order("created_at", { ascending: false });

    if (result.error) {
      throw result.error;
    }

    if (!result.data?.length) {
      return fallbackProjects;
    }

    return result.data.map((row) => ({
      id: row.id,
      title: row.title,
      description: row.description,
      images: row.images ?? [],
      townTags: row.town_tags ?? [],
      serviceType: normalizeServiceType(row.service_type),
      beforeAfter: row.before_after,
      isFeatured: row.is_featured,
      createdAt: row.created_at,
    }));
  } catch {
    return fallbackProjects;
  }
}
