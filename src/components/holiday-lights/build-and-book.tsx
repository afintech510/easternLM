"use client";

import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { HOLIDAY_LIGHTS, SMS_CONSENT_TEXT, isEarlyBirdActive, type HomeStyle } from "@/config/holiday-lights";
import {
  BUILD_STYLES,
  DEFAULT_STORIES,
  LIMITS,
  defaultBuild,
  presetFeet,
  priceBuild,
  UNIT_PRICES,
  type BuildInput,
  type BuildStyle,
} from "@/lib/holiday-lights/pricing";
import { trackBeginCheckout, trackEvent, trackGenerateLead } from "@/lib/bulk-analytics";
import { CostEstimatorChips } from "./cost-estimator";
import { getUtm } from "./events";
import { PhoneInput, phoneDigits } from "./phone-input";
import { useInstallWeeks, WeekPicker } from "./week-picker";

type ErrorKey = "week" | "name" | "phone" | "address" | "zip" | "consent";
type Errors = Partial<Record<ErrorKey, string>>;

const FIELD_ORDER: ErrorKey[] = ["week", "name", "phone", "address", "zip", "consent"];

/** .input is hard-coded white (it's shared with the always-white .vcard); outside the vcard, override to the themed surface/ink so fields track light/dark mode. */
const fieldStyle = { background: "var(--surface)", color: "var(--ink)" };

/** Unit prices for the extras steppers, derived from priceBuild itself (never hard-coded) via a 1-unit probe. */
const UNIT = UNIT_PRICES;

function clamp(n: number, min: number, max: number): number {
  if (!Number.isFinite(n)) return min;
  return Math.min(max, Math.max(min, Math.round(n)));
}

/** cents → "$1,234.56", dropping ".00" for whole dollars. */
function fmtUsd(cents: number): string {
  const hasCents = Math.round(Math.abs(cents)) % 100 !== 0;
  return (cents / 100).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: hasCents ? 2 : 0,
    maximumFractionDigits: 2,
  });
}

function Stepper({
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

/** One-card "Build & Book": live price build on the left/top, sticky price summary, install week, and booking form. */
export function BuildAndBook() {
  const [build, setBuild] = useState<BuildInput>(() => defaultBuild("ranch"));
  const [footageText, setFootageText] = useState(String(build.rooflineFt));
  const earlyBird = useMemo(() => isEarlyBirdActive(), []);
  const breakdown = useMemo(() => priceBuild(build, { earlyBird }), [build, earlyBird]);

  const { weeks, loading: weeksLoading, error: weeksError, retry: retryWeeks } = useInstallWeeks();
  const [weekId, setWeekId] = useState("");

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [zip, setZip] = useState("");
  const [consent, setConsent] = useState(false);

  const [errors, setErrors] = useState<Errors>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [outOfArea, setOutOfArea] = useState(false);

  const interacted = useRef(false);
  const nameRef = useRef<HTMLInputElement>(null);
  const phoneRef = useRef<HTMLInputElement>(null);
  const addressRef = useRef<HTMLInputElement>(null);
  const zipRef = useRef<HTMLInputElement>(null);
  const consentRef = useRef<HTMLInputElement>(null);
  const weekSectionRef = useRef<HTMLDivElement>(null);
  const honeypotRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setFootageText(String(build.rooflineFt));
  }, [build.rooflineFt]);

  // Optional nicety: let another widget (e.g. a future reserve dialog) pick a week for us.
  useEffect(() => {
    function onWeekEvent(e: Event) {
      const id = (e as CustomEvent<string>).detail;
      if (id) setWeekId(id);
    }
    window.addEventListener("tinsel:build-week", onWeekEvent);
    return () => window.removeEventListener("tinsel:build-week", onWeekEvent);
  }, []);

  // Debounced "lights_priced" — fires once ~1.5s after the last change in a burst.
  useEffect(() => {
    if (!interacted.current) return;
    const t = setTimeout(() => {
      trackEvent("lights_priced", { value: breakdown.totalCents / 100 });
    }, 1500);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [build]);

  function markInteracted() {
    if (!interacted.current) {
      interacted.current = true;
      trackEvent("lights_build_start");
    }
  }

  function updateBuild(mutator: (b: BuildInput) => BuildInput) {
    markInteracted();
    setBuild(mutator);
  }

  function updateExtra<K extends keyof BuildInput["extras"]>(key: K, value: BuildInput["extras"][K]) {
    updateBuild((b) => ({ ...b, extras: { ...b.extras, [key]: value } }));
  }

  function onHomeChange(home: HomeStyle) {
    updateBuild((b) => ({ ...b, homeStyle: home, stories: DEFAULT_STORIES[home], rooflineFt: presetFeet(home) }));
  }

  function onStoriesChange(s: 1 | 2) {
    updateBuild((b) => ({ ...b, stories: s }));
  }

  function onRooflineSlide(n: number) {
    updateBuild((b) => ({ ...b, rooflineFt: clamp(n, LIMITS.rooflineFt.min, LIMITS.rooflineFt.max) }));
  }

  function commitFootage() {
    const n = clamp(parseInt(footageText, 10) || 0, LIMITS.rooflineFt.min, LIMITS.rooflineFt.max);
    updateBuild((b) => ({ ...b, rooflineFt: n }));
    setFootageText(String(n));
  }

  function onStyleChange(key: BuildStyle) {
    updateBuild((b) => ({ ...b, style: key }));
  }

  function validate(): Errors {
    const errs: Errors = {};
    if (!weekId) errs.week = "Choose an install week.";
    if (!name.trim()) errs.name = "Enter your first name.";
    if (phoneDigits(phone).length !== 10) errs.phone = "Enter a 10-digit mobile number.";
    if (!address.trim()) errs.address = "Enter your street address.";
    if (!/^\d{5}$/.test(zip.trim())) errs.zip = "Enter a 5-digit ZIP code.";
    if (!consent) errs.consent = "Check the box so we can text you about your install.";
    return errs;
  }

  function focusFirstError(errs: Errors) {
    const key = FIELD_ORDER.find((k) => errs[k]);
    if (!key) return;
    if (key === "week") weekSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    else if (key === "name") nameRef.current?.focus();
    else if (key === "phone") phoneRef.current?.focus();
    else if (key === "address") addressRef.current?.focus();
    else if (key === "zip") zipRef.current?.focus();
    else if (key === "consent") consentRef.current?.focus();
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const errs = validate();
    setErrors(errs);
    if (Object.keys(errs).length > 0) {
      focusFirstError(errs);
      return;
    }
    trackBeginCheckout(breakdown.depositCents, [{ id: "holiday_lights_deposit", name: "Install deposit", qty: 1 }]);
    trackGenerateLead("holiday_booking");
    setSubmitting(true);
    setSubmitError(null);
    setOutOfArea(false);
    try {
      const res = await fetch("/api/holiday-lights/book", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          build,
          weekId,
          contact: { name: name.trim(), phone, email: email.trim(), address: address.trim(), zip: zip.trim() },
          consent,
          utm: getUtm(),
          website: honeypotRef.current?.value ?? "",
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const code = (data as { code?: string }).code;
        if (code === "out_of_area") {
          setOutOfArea(true);
          setSubmitError((data as { error?: string }).error || "We don't install in that area yet.");
        } else if (code === "week_full") {
          setSubmitError((data as { error?: string }).error || "That week just filled up. Pick another week.");
          retryWeeks();
        } else {
          setSubmitError((data as { error?: string }).error || "Something went wrong. Try again.");
        }
        return;
      }
      if ((data as { url?: string }).url) {
        window.location.href = (data as { url: string }).url;
      }
    } catch {
      setSubmitError("Something went wrong. Check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="card build-card" id="build">
      <span className="eyebrow">Build &amp; book</span>
      <h2 id="build-h">Design it, price it, book it.</h2>
      <p className="lead">Build your exact lighting plan and lock in your install week. Our team verifies footage before your price is final.</p>

      <div className="build-grid">
        {/* Step 1 — Your house */}
        <div className="step" id="build-step-house">
          <div className="step-head">
            <span className="step-num">1</span>
            <h3>Your house</h3>
          </div>
          <span className="field-label" id="est-label">
            Home style
          </span>
          <CostEstimatorChips value={build.homeStyle ?? "ranch"} onChange={onHomeChange} />

          <fieldset className="xgroup">
            <legend>Stories</legend>
            <div className="opts">
              <label className="opt">
                <input className="vh" type="radio" name="build-stories" checked={build.stories === 1} onChange={() => onStoriesChange(1)} />
                <span>1 story</span>
              </label>
              <label className="opt">
                <input className="vh" type="radio" name="build-stories" checked={build.stories === 2} onChange={() => onStoriesChange(2)} />
                <span>
                  2+ stories <b className="hint-pct">+{HOLIDAY_LIGHTS.pricing.secondStoryUpliftPct}%</b>
                </span>
              </label>
            </div>
          </fieldset>

          <label className="field" htmlFor="roofline-range">
            <span>Roofline length: {build.rooflineFt} ft</span>
            <input
              id="roofline-range"
              className="range"
              type="range"
              min={LIMITS.rooflineFt.min}
              max={LIMITS.rooflineFt.max}
              step={5}
              value={build.rooflineFt}
              onChange={(e) => onRooflineSlide(Number(e.target.value))}
            />
          </label>

          <label className="field" htmlFor="roofline-exact">
            <span>I know my footage</span>
            <div className="ftrow">
              <input
                id="roofline-exact"
                className="input"
                style={fieldStyle}
                type="number"
                inputMode="numeric"
                min={LIMITS.rooflineFt.min}
                max={LIMITS.rooflineFt.max}
                step={5}
                value={footageText}
                onChange={(e) => setFootageText(e.target.value)}
                onBlur={commitFootage}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    commitFootage();
                  }
                }}
              />
              <span className="ftrow-suffix">ft</span>
            </div>
          </label>

          <details className="howto">
            <summary>How to measure</summary>
            <div className="a">
              <p>Walk the front of the house: the eaves along the front, plus each gable&apos;s two sloped sides (the rakes).</p>
              <p>Quick estimate: house width × 2 for a ranch. Add the gable rakes for capes and colonials. Garage counts too if you want it lit.</p>
            </div>
          </details>
        </div>

        {/* Step 2 — Color & style */}
        <div className="step" id="build-step-style">
          <div className="step-head">
            <span className="step-num">2</span>
            <h3>Color &amp; style</h3>
          </div>
          <fieldset className="xgroup" style={{ margin: 0 }}>
            <legend className="vh">Light color &amp; style</legend>
            <div className="opts">
              {BUILD_STYLES.map((s) => (
                <label className="opt" key={s.key}>
                  <input className="vh" type="radio" name="build-style" value={s.key} checked={build.style === s.key} onChange={() => onStyleChange(s.key)} />
                  <span>
                    <span className="dot-row">
                      {s.colors.map((c, i) => (
                        <i key={i} style={{ background: c }} />
                      ))}
                    </span>
                    <span className="opt-label">{s.label}</span>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
        </div>

        {/* Step 3 — Extras */}
        <div className="step" id="build-step-extras">
          <div className="step-head">
            <span className="step-num">3</span>
            <h3>Extras</h3>
          </div>

          <label className="consent xrow">
            <input type="checkbox" checked={build.extras.takedown} onChange={(e) => updateExtra("takedown", e.target.checked)} />
            <span>
              Takedown + labeled storage <b className="stepper-price">{fmtUsd(UNIT.takedownFt)}/ft</b>
            </span>
          </label>

          <fieldset className="xgroup">
            <legend>Wreaths</legend>
            <Stepper id="wreath24" label={'24" wreath'} priceLabel={fmtUsd(UNIT.wreath24)} value={build.extras.wreath24} min={LIMITS.count.min} max={LIMITS.count.max} onChange={(n) => updateExtra("wreath24", n)} />
            <Stepper id="wreath36" label={'36" wreath'} priceLabel={fmtUsd(UNIT.wreath36)} value={build.extras.wreath36} min={LIMITS.count.min} max={LIMITS.count.max} onChange={(n) => updateExtra("wreath36", n)} />
            <Stepper id="wreath48" label={'48" wreath'} priceLabel={fmtUsd(UNIT.wreath48)} value={build.extras.wreath48} min={LIMITS.count.min} max={LIMITS.count.max} onChange={(n) => updateExtra("wreath48", n)} />
          </fieldset>

          <fieldset className="xgroup">
            <legend>Bush wraps</legend>
            <Stepper id="bushS" label="Small bush wrap" priceLabel={fmtUsd(UNIT.bushS)} value={build.extras.bushS} min={LIMITS.count.min} max={LIMITS.count.max} onChange={(n) => updateExtra("bushS", n)} />
            <Stepper id="bushM" label="Medium bush wrap" priceLabel={fmtUsd(UNIT.bushM)} value={build.extras.bushM} min={LIMITS.count.min} max={LIMITS.count.max} onChange={(n) => updateExtra("bushM", n)} />
            <Stepper id="bushL" label="Large bush wrap" priceLabel={fmtUsd(UNIT.bushL)} value={build.extras.bushL} min={LIMITS.count.min} max={LIMITS.count.max} onChange={(n) => updateExtra("bushL", n)} />
          </fieldset>

          <fieldset className="xgroup">
            <legend>Trees, windows &amp; garland</legend>
            <Stepper id="treeFt" label="Tree trunk wrap" unitSuffix="ft" priceLabel={fmtUsd(UNIT.treeFt)} value={build.extras.treeFt} min={LIMITS.feet.min} max={LIMITS.feet.max} step={5} onChange={(n) => updateExtra("treeFt", n)} />
            <Stepper id="windowFt" label="Window &amp; door outlines" unitSuffix="ft" priceLabel={fmtUsd(UNIT.windowFt)} value={build.extras.windowFt} min={LIMITS.feet.min} max={LIMITS.feet.max} step={5} onChange={(n) => updateExtra("windowFt", n)} />
            <Stepper id="garlandFt" label="Lit garland" unitSuffix="ft" priceLabel={fmtUsd(UNIT.garlandFt)} value={build.extras.garlandFt} min={LIMITS.feet.min} max={LIMITS.feet.max} step={5} onChange={(n) => updateExtra("garlandFt", n)} />
          </fieldset>

          <fieldset className="xgroup">
            <legend>Pathway</legend>
            <Stepper id="stakes" label="Pathway light stakes" priceLabel={fmtUsd(UNIT.stakes)} value={build.extras.stakes} min={LIMITS.count.min} max={LIMITS.count.max} onChange={(n) => updateExtra("stakes", n)} />
          </fieldset>
        </div>

        {/* Step 4 — Your price (sticky on desktop) */}
        <div className="step build-price" id="build-step-price">
          <div className="step-head">
            <span className="step-num">4</span>
            <h3>Your price</h3>
          </div>
          <div aria-live="polite" aria-atomic="true">
            <ul className="pricelines">
              {breakdown.lines.map((l) => (
                <li key={l.key}>
                  <span className="pl-text">
                    <span className="pl-label">{l.label}</span>
                    <span className="pl-detail">{l.detail}</span>
                  </span>
                  <span className="pl-amt">{fmtUsd(l.cents)}</span>
                </li>
              ))}
              {breakdown.minimumAdjustmentCents > 0 && (
                <li>
                  <span className="pl-text">
                    <span className="pl-label">Minimum project ({fmtUsd(HOLIDAY_LIGHTS.pricing.minimumCents)})</span>
                  </span>
                  <span className="pl-amt">{fmtUsd(breakdown.minimumAdjustmentCents)}</span>
                </li>
              )}
              {breakdown.earlyBirdCents > 0 && (
                <li className="pl-discount">
                  <span className="pl-text">
                    <span className="pl-label">Early-bird discount (book by {HOLIDAY_LIGHTS.earlyBird.label})</span>
                  </span>
                  <span className="pl-amt">-{fmtUsd(breakdown.earlyBirdCents)}</span>
                </li>
              )}
              <li>
                <span className="pl-text">
                  <span className="pl-label">NY sales tax (8.75%)</span>
                </span>
                <span className="pl-amt">{fmtUsd(breakdown.taxCents)}</span>
              </li>
            </ul>
            <div className="est-range">{fmtUsd(breakdown.totalCents)}</div>
            <p className="fine">Due today: {fmtUsd(breakdown.depositCents)} deposit (credited to your job)</p>
            <p className="fine">Balance after install: {fmtUsd(breakdown.balanceCents)}</p>
            <p className="fine">No credit card fees. Our team verifies footage before your price is locked.</p>
          </div>
        </div>

        {/* Step 5 — Pick your install week */}
        <div className="step" id="build-step-week" ref={weekSectionRef}>
          <div className="step-head">
            <span className="step-num">5</span>
            <h3>Pick your install week</h3>
          </div>
          <WeekPicker value={weekId} onChange={setWeekId} weeks={weeks} loading={weeksLoading} error={weeksError} onRetry={retryWeeks} />
          {errors.week && <p className="err">{errors.week}</p>}
        </div>

        {/* Step 6 — Your info */}
        <div className="step" id="build-step-info">
          <div className="step-head">
            <span className="step-num">6</span>
            <h3>Your info</h3>
          </div>
          <form onSubmit={onSubmit} noValidate>
            <label className="field">
              <span>First name</span>
              <input ref={nameRef} className="input" style={fieldStyle} autoComplete="given-name" value={name} onChange={(e) => setName(e.target.value)} />
            </label>
            {errors.name && <p className="err">{errors.name}</p>}

            <label className="field">
              <span>Mobile number</span>
              <PhoneInput ref={phoneRef} style={fieldStyle} value={phone} onValueChange={setPhone} />
            </label>
            {errors.phone && <p className="err">{errors.phone}</p>}

            <label className="field">
              <span>Email (optional)</span>
              <input className="input" style={fieldStyle} type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </label>

            <label className="field">
              <span>Street address</span>
              <input ref={addressRef} className="input" style={fieldStyle} autoComplete="street-address" value={address} onChange={(e) => setAddress(e.target.value)} />
            </label>
            {errors.address && <p className="err">{errors.address}</p>}

            <label className="field">
              <span>ZIP code</span>
              <input
                ref={zipRef}
                className="input"
                style={fieldStyle}
                inputMode="numeric"
                autoComplete="postal-code"
                maxLength={5}
                value={zip}
                onChange={(e) => setZip(e.target.value.replace(/\D/g, "").slice(0, 5))}
              />
            </label>
            {errors.zip && <p className="err">{errors.zip}</p>}

            {/* Honeypot for bots — hidden from people and assistive tech. */}
            <input ref={honeypotRef} type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" className="vh" defaultValue="" />

            <label className="consent">
              <input ref={consentRef} type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
              <span>{SMS_CONSENT_TEXT}</span>
            </label>
            {errors.consent && <p className="err">{errors.consent}</p>}

            {submitError && (
              <p className="err">
                {submitError}
                {outOfArea && (
                  <>
                    {" "}
                    <a className="link" href="#area">
                      Join the waitlist
                    </a>
                  </>
                )}
              </p>
            )}

            <button className="btn btn-gold btn-block" type="submit" disabled={submitting}>
              {submitting ? "One moment…" : `Book it — pay ${fmtUsd(breakdown.depositCents)} deposit`}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
