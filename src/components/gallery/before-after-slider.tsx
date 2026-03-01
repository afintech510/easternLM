"use client";

import Image from "next/image";
import { useId, useState } from "react";
import { cn } from "@/lib/utils";

type BeforeAfterSliderProps = {
  beforeImage: string;
  afterImage: string;
  alt: string;
  className?: string;
};

export function BeforeAfterSlider({ beforeImage, afterImage, alt, className }: BeforeAfterSliderProps) {
  const [splitPercent, setSplitPercent] = useState(50);
  const sliderId = useId();

  return (
    <div className={cn("space-y-2", className)}>
      <div className="relative overflow-hidden rounded-xl border bg-muted">
        <div className="relative aspect-[5/4] w-full">
          <Image
            src={beforeImage}
            alt={`${alt} before`}
            fill
            sizes="(max-width: 768px) 100vw, 600px"
            className="object-cover"
          />
          <div
            className="pointer-events-none absolute inset-0"
            style={{ clipPath: `polygon(${splitPercent}% 0, 100% 0, 100% 100%, ${splitPercent}% 100%)` }}
          >
            <Image
              src={afterImage}
              alt={`${alt} after`}
              fill
              sizes="(max-width: 768px) 100vw, 600px"
              className="object-cover"
            />
          </div>
          <div
            className="pointer-events-none absolute inset-y-0 w-0.5 bg-white/90"
            style={{ left: `${splitPercent}%` }}
          />
          <div className="absolute left-3 top-3 rounded-full bg-black/60 px-2 py-1 text-[11px] font-semibold text-white">
            Before
          </div>
          <div className="absolute right-3 top-3 rounded-full bg-black/60 px-2 py-1 text-[11px] font-semibold text-white">
            After
          </div>
        </div>
      </div>
      <label htmlFor={sliderId} className="sr-only">
        Compare before and after
      </label>
      <input
        id={sliderId}
        type="range"
        min={5}
        max={95}
        value={splitPercent}
        onChange={(event) => setSplitPercent(Number(event.target.value))}
        className="h-2 w-full cursor-pointer accent-primary"
      />
    </div>
  );
}
