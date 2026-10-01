"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { HOLIDAY_LIGHTS, SMS_CONSENT_TEXT, isEarlyBirdActive } from "@/config/holiday-lights";
import { trackEvent, trackGenerateLead } from "@/lib/bulk-analytics";
import { getUtm, onOpenReserve } from "./events";
import { PhoneInput, phoneDigits } from "./phone-input";

const DEPOSIT = HOLIDAY_LIGHTS.pricing.depositCents / 100;
const fieldStyle = { background: "var(--surface)", color: "var(--ink)" };

/**
 * "Reserve your install week" dialog. Slice 1: saves a lead, then either sends the
 * customer to the $199 Stripe Payment Link (HOLIDAY_DEPOSIT_URL) or tells them
 * we'll text the link.
 */
export function ReserveDialog() {
  const ref = useRef<HTMLDialogElement>(null);
  const [done, setDone] = useState(false);
  const [week, setWeek] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [consent, setConsent] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(
    () =>
      onOpenReserve(() => {
        setDone(false);
        setErr(null);
        trackEvent("lights_reserve_open");
        ref.current?.showModal();
      }),
    [],
  );

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!week) return setErr("Choose a week.");
    if (!name.trim()) return setErr("Enter your first name.");
    if (phoneDigits(phone).length !== 10) return setErr("Enter a 10-digit mobile number.");
    if (!consent) return setErr("Check the box so we can text you the deposit link.");
    setErr(null);
    setBusy(true);
    try {
      const res = await fetch("/api/holiday-lights/lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind: "reserve", week, name: name.trim(), phone, consent, utm: getUtm() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Something went wrong. Call us instead.");
      trackGenerateLead("holiday_reserve");
      trackEvent("begin_checkout", { currency: "USD", value: DEPOSIT, item_category: "holiday_lights_deposit" });
      if (data.depositUrl) {
        window.location.href = data.depositUrl;
        return;
      }
      setDone(true);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
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
      <div hidden={done}>
        <h2 id="res-h">Reserve your install week</h2>
        <p>A ${DEPOSIT} deposit holds your week and is credited to your total. Our team confirms the final price before install.</p>
        <form onSubmit={submit} noValidate>
          <label className="field">
            <span>Install week</span>
            <select className="input" required style={fieldStyle} value={week} onChange={(e) => setWeek(e.target.value)}>
              <option value="">Choose a week</option>
              {HOLIDAY_LIGHTS.installWeeks.map((w) => (
                <option key={w}>{w}</option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>First name</span>
            <input className="input" autoComplete="given-name" required style={fieldStyle} value={name} onChange={(e) => setName(e.target.value)} />
          </label>
          <label className="field">
            <span>Mobile number</span>
            <PhoneInput required style={fieldStyle} value={phone} onValueChange={setPhone} />
          </label>
          <label className="consent">
            <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
            <span>{SMS_CONSENT_TEXT}</span>
          </label>
          {err && <p className="err">{err}</p>}
          <button className="btn btn-gold btn-block" type="submit" disabled={busy}>
            {busy ? "One moment…" : `Pay $${DEPOSIT} deposit`}
          </button>
        </form>
      </div>
      <div hidden={!done}>
        <h2>You&apos;re on the list, {name.trim() || "neighbor"}!</h2>
        <p>
          We&apos;re holding <b>{week}</b> for you. We&apos;ll text the ${DEPOSIT} deposit link to {phone} shortly. Pay it to
          lock in your week{isEarlyBirdActive() ? " and the $100 early-bird discount" : ""}.
        </p>
        <button type="button" className="btn btn-out btn-block" onClick={() => ref.current?.close()}>
          Close
        </button>
      </div>
    </dialog>
  );
}
