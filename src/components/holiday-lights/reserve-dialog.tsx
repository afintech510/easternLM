"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { HOLIDAY_LIGHTS, SMS_CONSENT_TEXT } from "@/config/holiday-lights";
import { trackBeginCheckout, trackEvent, trackGenerateLead } from "@/lib/bulk-analytics";
import { getUtm, onOpenReserve } from "./events";
import { PhoneInput, phoneDigits } from "./phone-input";
import { WeekPicker, useInstallWeeks } from "./week-picker";

const DEPOSIT_CENTS = HOLIDAY_LIGHTS.pricing.depositCents;
const DEPOSIT = DEPOSIT_CENTS / 100;
const fieldStyle = { background: "var(--surface)", color: "var(--ink)" };

/**
 * "Reserve your install week" — Quick Reserve: pick a live week, leave contact
 * details, pay the $199 deposit in Stripe Checkout. The design + exact price come
 * later with our team (or in Build & Book on the page).
 */
export function ReserveDialog() {
  const ref = useRef<HTMLDialogElement>(null);
  const { weeks, loading, error: weeksError, retry } = useInstallWeeks();
  const [week, setWeek] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [zip, setZip] = useState("");
  const [consent, setConsent] = useState(false);
  const [website, setWebsite] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [outOfArea, setOutOfArea] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(
    () =>
      onOpenReserve(() => {
        setErr(null);
        setOutOfArea(false);
        retry();
        trackEvent("lights_reserve_open");
        ref.current?.showModal();
      }),
    [retry],
  );

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!week) return setErr("Choose an install week.");
    if (!name.trim()) return setErr("Enter your first name.");
    if (phoneDigits(phone).length !== 10) return setErr("Enter a 10-digit mobile number.");
    if (address.trim().length < 5) return setErr("Enter your street address.");
    if (!/^\d{5}$/.test(zip.trim())) return setErr("Enter a 5-digit ZIP.");
    if (!consent) return setErr("Check the box so we can text you about your booking.");
    setErr(null);
    setOutOfArea(false);
    setBusy(true);
    try {
      const res = await fetch("/api/holiday-lights/book", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          build: null,
          weekId: week,
          contact: { name: name.trim(), phone, address: address.trim(), zip: zip.trim() },
          consent: true,
          utm: getUtm(),
          website,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (data.code === "out_of_area") setOutOfArea(true);
        if (data.code === "week_full") retry();
        throw new Error(data.error || "Something went wrong. Call us instead.");
      }
      trackGenerateLead("holiday_quick_reserve");
      trackBeginCheckout(DEPOSIT_CENTS, [{ id: "holiday_lights_deposit", name: "Install deposit", qty: 1 }]);
      window.location.href = data.url;
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Something went wrong.");
      setBusy(false);
    }
  }

  return (
    <dialog
      id="reserve"
      aria-labelledby="res-h"
      ref={ref}
      onClick={(e) => {
        if (e.target === ref.current) ref.current?.close();
      }}
    >
      <button type="button" className="close" aria-label="Close" onClick={() => ref.current?.close()}>
        ×
      </button>
      <h2 id="res-h">Reserve your install week</h2>
      <p>A ${DEPOSIT} deposit holds your week and is credited to your total. Our team designs it with you and confirms the final price before install.</p>
      <form onSubmit={submit} noValidate>
        <div className="field">
          <span>Install week</span>
          <WeekPicker value={week} onChange={setWeek} weeks={weeks} loading={loading} error={weeksError} onRetry={retry} />
        </div>
        <label className="field">
          <span>First name</span>
          <input className="input" autoComplete="given-name" required style={fieldStyle} value={name} onChange={(e) => setName(e.target.value)} />
        </label>
        <label className="field">
          <span>Mobile number</span>
          <PhoneInput required style={fieldStyle} value={phone} onValueChange={setPhone} />
        </label>
        <label className="field">
          <span>Street address</span>
          <input className="input" autoComplete="street-address" required style={fieldStyle} value={address} onChange={(e) => setAddress(e.target.value)} />
        </label>
        <label className="field">
          <span>ZIP code</span>
          <input
            className="input"
            inputMode="numeric"
            autoComplete="postal-code"
            maxLength={5}
            required
            style={fieldStyle}
            value={zip}
            onChange={(e) => setZip(e.target.value.replace(/\D/g, "").slice(0, 5))}
          />
        </label>
        <input type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" className="vh" value={website} onChange={(e) => setWebsite(e.target.value)} />
        <label className="consent">
          <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
          <span>{SMS_CONSENT_TEXT}</span>
        </label>
        {err && (
          <p className="err">
            {err}
            {outOfArea && (
              <>
                {" "}
                <a href="#area" onClick={() => ref.current?.close()}>Join the waitlist</a>
              </>
            )}
          </p>
        )}
        <button className="btn btn-gold btn-block" type="submit" disabled={busy}>
          {busy ? "Opening secure checkout…" : `Pay $${DEPOSIT} deposit`}
        </button>
        <p className="fine" style={{ textAlign: "center" }}>Secure checkout by Stripe.</p>
      </form>
    </dialog>
  );
}
