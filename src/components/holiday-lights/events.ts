"use client";

/**
 * Tiny window-event bus so server-rendered sections can trigger client widgets
 * (the toast and the reserve dialog) without a shared React context.
 */

const TOAST_EVENT = "tinsel:toast";
const RESERVE_EVENT = "tinsel:reserve";

export function toast(message: string) {
  window.dispatchEvent(new CustomEvent<string>(TOAST_EVENT, { detail: message }));
}

export function onToast(fn: (message: string) => void) {
  const h = (e: Event) => fn((e as CustomEvent<string>).detail);
  window.addEventListener(TOAST_EVENT, h);
  return () => window.removeEventListener(TOAST_EVENT, h);
}

export function openReserve() {
  window.dispatchEvent(new Event(RESERVE_EVENT));
}

export function onOpenReserve(fn: () => void) {
  window.addEventListener(RESERVE_EVENT, fn);
  return () => window.removeEventListener(RESERVE_EVENT, fn);
}

const UTM_KEY = "tinsel_utm";
const UTM_FIELDS = ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content"] as const;

/** Persist landing-page UTMs for the session (first touch wins) and return them. */
export function captureUtm(): Record<string, string> {
  try {
    const stored = sessionStorage.getItem(UTM_KEY);
    if (stored) return JSON.parse(stored);
    const params = new URLSearchParams(window.location.search);
    const utm: Record<string, string> = {};
    for (const f of UTM_FIELDS) {
      const v = params.get(f);
      if (v) utm[f] = v.slice(0, 120);
    }
    if (document.referrer && !document.referrer.startsWith(window.location.origin)) {
      utm.referrer = document.referrer.slice(0, 300);
    }
    sessionStorage.setItem(UTM_KEY, JSON.stringify(utm));
    return utm;
  } catch {
    return {};
  }
}

export function getUtm(): Record<string, string> {
  try {
    return JSON.parse(sessionStorage.getItem(UTM_KEY) ?? "{}");
  } catch {
    return {};
  }
}
