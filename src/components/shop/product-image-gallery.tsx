"use client";

import { useState, useCallback, useEffect } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight, Expand, X } from "lucide-react";

const FALLBACK = "https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=1200&h=800&fit=crop";

interface Props {
  images: string[];
  productName: string;
}

export function ProductImageGallery({ images, productName }: Props) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [imgErrors, setImgErrors] = useState<Set<number>>(new Set());

  const imageList = images.length > 0 ? images : [FALLBACK];

  const goNext = useCallback(() => {
    setActiveIndex((prev) => (prev + 1) % imageList.length);
  }, [imageList.length]);

  const goPrev = useCallback(() => {
    setActiveIndex((prev) => (prev - 1 + imageList.length) % imageList.length);
  }, [imageList.length]);

  // Keyboard navigation
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "ArrowLeft") goPrev();
      if (e.key === "ArrowRight") goNext();
      if (e.key === "Escape" && lightboxOpen) setLightboxOpen(false);
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [goPrev, goNext, lightboxOpen]);

  // Touch swipe
  const [touchStart, setTouchStart] = useState<number | null>(null);
  function handleTouchStart(e: React.TouchEvent) { setTouchStart(e.touches[0].clientX); }
  function handleTouchEnd(e: React.TouchEvent) {
    if (touchStart === null) return;
    const diff = touchStart - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 50) { diff > 0 ? goNext() : goPrev(); }
    setTouchStart(null);
  }

  function getSrc(index: number) {
    return imgErrors.has(index) ? FALLBACK : imageList[index];
  }

  return (
    <div className="space-y-3">
      {/* Main Image */}
      <div
        className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl border bg-muted cursor-pointer"
        onClick={() => setLightboxOpen(true)}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <Image
          src={getSrc(activeIndex)}
          alt={`${productName} — image ${activeIndex + 1} of ${imageList.length}`}
          fill
          className="object-cover transition-opacity duration-300"
          sizes="(max-width: 768px) 100vw, 50vw"
          priority={activeIndex === 0}
          onError={() => setImgErrors((prev) => new Set(prev).add(activeIndex))}
        />

        {/* Arrows */}
        {imageList.length > 1 && (
          <>
            <button onClick={(e) => { e.stopPropagation(); goPrev(); }}
              className="absolute left-2 top-1/2 -translate-y-1/2 flex size-10 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-sm hover:bg-black/70"
              aria-label="Previous image">
              <ChevronLeft className="size-5" />
            </button>
            <button onClick={(e) => { e.stopPropagation(); goNext(); }}
              className="absolute right-2 top-1/2 -translate-y-1/2 flex size-10 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-sm hover:bg-black/70"
              aria-label="Next image">
              <ChevronRight className="size-5" />
            </button>
          </>
        )}

        {/* Counter */}
        {imageList.length > 1 && (
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-black/60 px-3 py-1 text-xs font-medium text-white backdrop-blur-sm">
            {activeIndex + 1} / {imageList.length}
          </div>
        )}

        {/* Expand */}
        <button onClick={(e) => { e.stopPropagation(); setLightboxOpen(true); }}
          className="absolute right-3 top-3 flex size-9 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-sm hover:bg-black/70"
          aria-label="View full size">
          <Expand className="size-4" />
        </button>
      </div>

      {/* Thumbnail Strip */}
      {imageList.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: "thin" }}>
          {imageList.map((src, i) => (
            <button key={`thumb-${i}`} onClick={() => setActiveIndex(i)}
              className={`relative size-16 shrink-0 overflow-hidden rounded-lg border-2 transition-all sm:size-20 ${
                i === activeIndex ? "border-accent ring-1 ring-accent/50 opacity-100" : "border-transparent opacity-60 hover:opacity-90"
              }`}
              aria-label={`View image ${i + 1}`}>
              <Image src={getSrc(i)} alt={`${productName} thumbnail ${i + 1}`} fill className="object-cover" sizes="80px"
                onError={() => setImgErrors((prev) => new Set(prev).add(i))} />
            </button>
          ))}
        </div>
      )}

      {/* Mobile dot indicators */}
      {imageList.length > 1 && (
        <div className="flex justify-center gap-1.5 sm:hidden">
          {imageList.map((_, i) => (
            <button key={`dot-${i}`} onClick={() => setActiveIndex(i)}
              className={`h-2 rounded-full transition-all ${i === activeIndex ? "w-6 bg-accent" : "w-2 bg-zinc-300"}`}
              aria-label={`Go to image ${i + 1}`} />
          ))}
        </div>
      )}

      {/* Lightbox */}
      {lightboxOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/95" onClick={() => setLightboxOpen(false)}>
          <button onClick={() => setLightboxOpen(false)}
            className="absolute right-4 top-4 z-50 flex size-12 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
            aria-label="Close">
            <X className="size-6" />
          </button>
          {imageList.length > 1 && (
            <>
              <button onClick={(e) => { e.stopPropagation(); goPrev(); }}
                className="absolute left-4 top-1/2 z-50 -translate-y-1/2 flex size-12 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20">
                <ChevronLeft className="size-6" />
              </button>
              <button onClick={(e) => { e.stopPropagation(); goNext(); }}
                className="absolute right-4 top-1/2 z-50 -translate-y-1/2 flex size-12 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20">
                <ChevronRight className="size-6" />
              </button>
            </>
          )}
          <div className="relative m-8 h-full max-h-[80vh] w-full max-w-4xl" onClick={(e) => e.stopPropagation()}
            onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
            <Image src={getSrc(activeIndex)} alt={`${productName} — full size`} fill className="object-contain" sizes="100vw" />
          </div>
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 text-sm text-white/80">
            {activeIndex + 1} / {imageList.length}
          </div>
        </div>
      )}
    </div>
  );
}
