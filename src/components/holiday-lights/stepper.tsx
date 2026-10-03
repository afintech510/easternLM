"use client";

export function clamp(n: number, min: number, max: number): number {
  if (!Number.isFinite(n)) return min;
  return Math.min(max, Math.max(min, Math.round(n)));
}

/** − value + row used by Build & Book extras and the AI visualizer's extras. */
export function Stepper({
  id,
  label,
  priceLabel,
  unitSuffix,
  value,
  min,
  max,
  step = 1,
  onChange,
}: {
  id: string;
  label: string;
  priceLabel?: string;
  unitSuffix?: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (n: number) => void;
}) {
  return (
    <div className="stepper-row">
      <span className="stepper-label" id={`${id}-label`}>
        {label}
        {priceLabel && (
          <span className="stepper-price">
            {priceLabel}
            {unitSuffix ? `/${unitSuffix}` : ""}
          </span>
        )}
      </span>
      <div className="stepper">
        <button
          type="button"
          className="stepbtn"
          aria-label={`Decrease ${label}`}
          onClick={() => onChange(clamp(value - step, min, max))}
          disabled={value <= min}
        >
          −
        </button>
        <span className="stepval" aria-live="polite" aria-labelledby={`${id}-label`}>
          {value}
          {unitSuffix ? ` ${unitSuffix}` : ""}
        </span>
        <button
          type="button"
          className="stepbtn"
          aria-label={`Increase ${label}`}
          onClick={() => onChange(clamp(value + step, min, max))}
          disabled={value >= max}
        >
          +
        </button>
      </div>
    </div>
  );
}
