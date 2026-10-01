"use client";

import { useState, type CSSProperties, type ReactNode } from "react";

/**
 * Range-input before/after slider (the artifact's `.cmp`). Layers can be any node:
 * the illustrated HouseSvg or a real <img>. `ratio` overrides the 600/320 frame so
 * customer photos aren't cropped.
 */
export function CompareSlider({
  before,
  after,
  label,
  tagLeft = "Before",
  tagRight = "After",
  caption,
  ratio,
  tagsTop = false,
}: {
  before: ReactNode;
  after: ReactNode;
  label: string;
  tagLeft?: string;
  tagRight?: string;
  caption?: string;
  ratio?: string;
  /** Put the Before/After tags at the top (real renders carry a bottom-right watermark). */
  tagsTop?: boolean;
}) {
  const [pos, setPos] = useState(50);
  const style = { "--pos": `${pos}%`, ...(ratio ? { aspectRatio: ratio } : {}) } as CSSProperties;

  return (
    <>
      <div className={tagsTop ? "cmp tags-top" : "cmp"} style={style}>
        <div className="lay" role="img" aria-label={`${label}, before`}>{before}</div>
        <div className="lay top" role="img" aria-label={`${label}, after`}>{after}</div>
        <input
          type="range"
          min={0}
          max={100}
          value={pos}
          onChange={(e) => setPos(Number(e.target.value))}
          aria-label={`Compare before and after: ${label}`}
        />
        <div className="handle" aria-hidden="true" />
        <span className="tag l">{tagLeft}</span>
        <span className="tag r">{tagRight}</span>
      </div>
      {caption && <p className="cap">{caption}</p>}
    </>
  );
}
