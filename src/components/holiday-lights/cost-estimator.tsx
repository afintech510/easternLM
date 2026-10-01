"use client";

import { useRef, useState, type KeyboardEvent } from "react";
import { HOLIDAY_LIGHTS, type HomeStyle } from "@/config/holiday-lights";

const KEYS = Object.keys(HOLIDAY_LIGHTS.homes) as HomeStyle[];
const RATE = HOLIDAY_LIGHTS.pricing.rooflinePerFtCents / 100;
const MIN = HOLIDAY_LIGHTS.pricing.minimumCents / 100;

function money(n: number) {
  return "$" + Math.round(n).toLocaleString("en-US");
}

export function estimateRange(key: HomeStyle) {
  const [lo, hi] = HOLIDAY_LIGHTS.homes[key].ft;
  return { lo: Math.max(MIN, lo * RATE), hi: Math.max(MIN, hi * RATE), ftLo: lo, ftHi: hi };
}

/** Home-style chips (radiogroup) — the left half of the cost simulator. */
export function CostEstimatorChips({ value, onChange }: { value: HomeStyle; onChange: (k: HomeStyle) => void }) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);

  function onKey(e: KeyboardEvent) {
    const i = KEYS.indexOf(value);
    const n = KEYS.length;
    let next: number | null = null;
    if (e.key === "ArrowRight" || e.key === "ArrowDown") next = (i + 1) % n;
    if (e.key === "ArrowLeft" || e.key === "ArrowUp") next = (i + n - 1) % n;
    if (next === null) return;
    e.preventDefault();
    onChange(KEYS[next]);
    refs.current[next]?.focus();
  }

  return (
    <div className="chips4" role="radiogroup" aria-labelledby="est-label" id="homes" onKeyDown={onKey}>
      {KEYS.map((k, i) => (
        <button
          key={k}
          ref={(el) => { refs.current[i] = el; }}
          type="button"
          className="chipb"
          role="radio"
          aria-checked={k === value}
          aria-label={HOLIDAY_LIGHTS.homes[k].label}
          tabIndex={k === value ? 0 : -1}
          onClick={() => onChange(k)}
        >
          {HOLIDAY_LIGHTS.homes[k].short}
        </button>
      ))}
    </div>
  );
}

/** The cost simulator card body: chips on the left, live range on the right. */
export function CostEstimator({ children, bookHref }: { children?: React.ReactNode; bookHref?: string }) {
  const [cur, setCur] = useState<HomeStyle>("ranch");
  const r = estimateRange(cur);

  return (
    <div className="card sim" id="estimator">
      <div>
        <span className="eyebrow">Cost simulator</span>
        <h3 id="est-label" style={{ fontSize: "1.5rem" }}>What does your home look like?</h3>
        <CostEstimatorChips value={cur} onChange={setCur} />
        <ul className="addons" aria-label="Add-ons">
          <li>Takedown + storage</li>
          <li>Wreaths</li>
          <li>Bushes</li>
          <li>Trees</li>
        </ul>
      </div>
      <div>
        <div className="est-range" id="est-range" aria-live="polite">
          {money(r.lo)} – {money(r.hi)}
        </div>
        <span className="est-note" id="est-note">
          Roofline, installed. About {r.ftLo}–{r.ftHi} ft. The lights are yours.
        </span>
        {bookHref && (
          <a className="btn btn-gold btn-block" href={`${bookHref}?home=${cur}`}>
            Get my exact price
          </a>
        )}
        {children}
      </div>
    </div>
  );
}
