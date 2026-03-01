import type { Metadata } from "next";
import { GalleryPageClient } from "@/components/gallery/gallery-page-client";
import { getGalleryProjects } from "@/lib/data/gallery";

export const metadata: Metadata = {
  title: "Project Gallery | Eastern Landscape & Mason Supply",
  description:
    "Browse landscaping, masonry, driveway, and maintenance projects completed across Suffolk County.",
};

export default async function GalleryPage() {
  const projects = await getGalleryProjects();

  return (
    <div className="mx-auto max-w-6xl space-y-8 px-4 py-12 md:py-16">
      <section className="space-y-4">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground">Gallery</p>
        <h1 className="[font-family:var(--font-display)] text-4xl text-primary md:text-5xl">
          Recent Project Work Across Suffolk County
        </h1>
        <p className="max-w-3xl text-muted-foreground">
          Filter by service type, inspect before/after results, and open full-size project images.
        </p>
      </section>

      <GalleryPageClient projects={projects} />
    </div>
  );
}
