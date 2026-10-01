"use client";

import { useState, type FormEvent } from "react";
import { trackGenerateLead } from "@/lib/bulk-analytics";
import { getUtm, toast } from "./events";

/** "Outside our area? Join the waitlist." → lead with source holiday_lights_waitlist. */
export function WaitlistForm() {
  const [contact, setContact] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    const v = contact.trim();
    const digits = v.replace(/\D/g, "");
    if (!v.includes("@") && digits.length < 10) {
      toast("Enter a mobile number or email.");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/holiday-lights/lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind: "waitlist", contact: v, utm: getUtm() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Couldn't add you. Try again.");
      trackGenerateLead("holiday_waitlist");
      toast("You're on the waitlist. We'll tell you if we expand to your area.");
      setContact("");
    } catch (err) {
      toast(err instanceof Error ? err.message : "Couldn't add you. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="wait" id="wait" onSubmit={submit}>
      <div>
        <p style={{ margin: "0 0 8px" }}>
          <b>Outside our area? Join the waitlist.</b>
        </p>
        <label className="vh" htmlFor="wait-in">
          Mobile number or email
        </label>
        <input
          className="input"
          id="wait-in"
          autoComplete="email"
          placeholder="Mobile number or email"
          required
          style={{ background: "var(--surface)", color: "var(--ink)" }}
          value={contact}
          onChange={(e) => setContact(e.target.value)}
        />
      </div>
      <button className="btn btn-out" type="submit" style={{ alignSelf: "end" }} disabled={busy}>
        Join the waitlist
      </button>
    </form>
  );
}
