"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { X, ChevronLeft, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BeforeAfterSlider } from "@/components/gallery/before-after-slider";
import type { GalleryProject, GalleryServiceType } from "@/lib/data/gallery";

type GalleryPageClientProps = {
  projects: GalleryProject[];
};

type GalleryFilter = "all" | GalleryServiceType;

const filterLabels: Record<GalleryFilter, string> = {
  all: "All Projects",
  landscaping: "Landscaping",
  masonry: "Masonry",
  driveways: "Driveways",
  maintenance: "Maintenance",
};

function toTownLabel(slug: string) {
  return slug
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function GalleryPageClient({ projects }: GalleryPageClientProps) {
  const [activeFilter, setActiveFilter] = useState<GalleryFilter>("all");
  const [lightboxState, setLightboxState] = useState<{ projectId: string; imageIndex: number } | null>(null);

  const filteredProjects = useMemo(
    () => projects.filter((project) => activeFilter === "all" || project.serviceType === activeFilter),
    [activeFilter, projects],
  );

  const activeProject = useMemo(
    () => filteredProjects.find((project) => project.id === lightboxState?.projectId) ?? null,
    [filteredProjects, lightboxState?.projectId],
  );

  useEffect(() => {
    if (!lightboxState) {
      return;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setLightboxState(null);
      }
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [lightboxState]);

  const canRenderLightbox = Boolean(lightboxState && activeProject);
  const activeImageIndex = lightboxState?.imageIndex ?? 0;
  const activeImage = activeProject?.images[activeImageIndex] ?? null;

  const moveLightboxImage = (direction: "prev" | "next") => {
    if (!activeProject) {
      return;
    }

    setLightboxState((current) => {
      if (!current || current.projectId !== activeProject.id) {
        return current;
      }

      const imageCount = Math.max(activeProject.images.length, 1);
      const nextIndex =
        direction === "next"
          ? (current.imageIndex + 1) % imageCount
          : (current.imageIndex - 1 + imageCount) % imageCount;

      return {
        ...current,
        imageIndex: nextIndex,
      };
    });
  };

  return (
    <>
      <section className="space-y-6">
        <div className="flex flex-wrap gap-2">
          {(Object.keys(filterLabels) as GalleryFilter[]).map((filter) => (
            <Button
              key={filter}
              variant={activeFilter === filter ? "default" : "outline"}
              size="sm"
              onClick={() => setActiveFilter(filter)}
              className="rounded-full"
            >
              {filterLabels[filter]}
            </Button>
          ))}
        </div>

        {filteredProjects.length > 0 ? (
          <div className="columns-1 gap-4 space-y-4 md:columns-2 lg:columns-3">
            {filteredProjects.map((project) => {
              const previewImage = project.images[0] ?? "https://via.placeholder.com/800x600?text=Project";
              const hasBeforeAfter = project.beforeAfter && project.images.length >= 2;

              return (
                <article
                  key={project.id}
                  className="break-inside-avoid rounded-2xl border bg-card p-3 shadow-sm"
                >
                  {hasBeforeAfter ? (
                    <div className="space-y-2">
                      <BeforeAfterSlider
                        beforeImage={project.images[0]}
                        afterImage={project.images[1]}
                        alt={project.title}
                      />
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="w-full"
                        onClick={() => setLightboxState({ projectId: project.id, imageIndex: 0 })}
                      >
                        Open Full View
                      </Button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      className="relative block aspect-[4/3] w-full overflow-hidden rounded-xl"
                      onClick={() => setLightboxState({ projectId: project.id, imageIndex: 0 })}
                    >
                      <Image
                        src={previewImage}
                        alt={project.title}
                        fill
                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                        className="object-cover transition-transform duration-300 hover:scale-[1.03]"
                      />
                    </button>
                  )}

                  <div className="space-y-2 px-1 pb-1 pt-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="secondary">{filterLabels[project.serviceType]}</Badge>
                      {project.beforeAfter ? <Badge variant="outline">Before/After</Badge> : null}
                    </div>
                    <h3 className="text-base font-semibold">{project.title}</h3>
                    <p className="text-sm text-muted-foreground">{project.description}</p>
                    {project.townTags.length > 0 ? (
                      <p className="text-xs text-muted-foreground">
                        Towns: {project.townTags.slice(0, 3).map(toTownLabel).join(", ")}
                      </p>
                    ) : null}
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <article className="rounded-2xl border bg-card p-6 text-sm text-muted-foreground">
            No projects found for this filter.
          </article>
        )}
      </section>

      {canRenderLightbox && activeProject && activeImage ? (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/90 p-4">
          <div className="relative w-full max-w-5xl rounded-2xl border border-white/20 bg-black/20 p-3 md:p-5">
            <Button
              type="button"
              variant="outline"
              size="icon-sm"
              className="absolute right-3 top-3 z-10 border-white/40 bg-black/40 text-white hover:bg-black/70"
              onClick={() => setLightboxState(null)}
            >
              <X className="size-4" />
              <span className="sr-only">Close image viewer</span>
            </Button>

            <div className="space-y-3">
              {activeProject.beforeAfter && activeProject.images.length >= 2 ? (
                <BeforeAfterSlider
                  beforeImage={activeProject.images[0]}
                  afterImage={activeProject.images[1]}
                  alt={activeProject.title}
                  className="rounded-xl bg-black"
                />
              ) : (
                <div className="relative aspect-[16/10] w-full overflow-hidden rounded-xl">
                  <Image
                    src={activeImage}
                    alt={activeProject.title}
                    fill
                    sizes="95vw"
                    className="object-contain"
                  />
                </div>
              )}

              {activeProject.images.length > 1 ? (
                <div className="flex items-center justify-between gap-3">
                  <Button type="button" variant="outline" onClick={() => moveLightboxImage("prev")}>
                    <ChevronLeft className="size-4" />
                    Prev
                  </Button>
                  <p className="text-xs text-white/80">
                    {activeImageIndex + 1} / {activeProject.images.length}
                  </p>
                  <Button type="button" variant="outline" onClick={() => moveLightboxImage("next")}>
                    Next
                    <ChevronRight className="size-4" />
                  </Button>
                </div>
              ) : null}

              <div className="rounded-xl bg-black/40 p-3 text-white">
                <p className="text-sm font-semibold">{activeProject.title}</p>
                <p className="mt-1 text-sm text-white/80">{activeProject.description}</p>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
