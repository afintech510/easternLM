"use client";

import { useEffect, useState } from "react";

const KEY = "tt-theme";

/**
 * Runs inline as the first child of the .tinsel wrapper, before paint: applies a saved
 * light/dark choice and sets data-eff (the effective theme) so there's no flash.
 */
export const THEME_INIT_SCRIPT = `(function(){try{var w=document.currentScript.parentElement;var s=localStorage.getItem("${KEY}");if(s==="dark"||s==="light")w.setAttribute("data-theme",s);var t=w.getAttribute("data-theme");var d=t==="dark"||(t!=="light"&&window.matchMedia("(prefers-color-scheme: dark)").matches);w.setAttribute("data-eff",d?"dark":"light")}catch(e){}})();`;

function wrapper(): HTMLElement | null {
  return document.querySelector(".tinsel");
}

function effective(w: HTMLElement): "dark" | "light" {
  const t = w.getAttribute("data-theme");
  if (t === "dark" || t === "light") return t;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

/** Light / dark toggle: follows the device until the visitor picks one (remembered). */
export function ThemeToggle() {
  const [eff, setEff] = useState<"dark" | "light">("light");

  useEffect(() => {
    const w = wrapper();
    if (!w) return;
    const sync = () => {
      const e = effective(w);
      w.setAttribute("data-eff", e);
      setEff(e);
    };
    sync();
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  function toggle() {
    const w = wrapper();
    if (!w) return;
    const next = effective(w) === "dark" ? "light" : "dark";
    w.setAttribute("data-theme", next);
    w.setAttribute("data-eff", next);
    try {
      localStorage.setItem(KEY, next);
    } catch {
      /* private mode */
    }
    setEff(next);
  }

  return (
    <button
      type="button"
      className="tbtn"
      id="theme"
      aria-pressed={eff === "dark"}
      aria-label={eff === "dark" ? "Switch to light mode" : "Switch to dark mode"}
      onClick={toggle}
    >
      <svg className="moon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z" />
      </svg>
      <svg className="sun" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
        <circle cx="12" cy="12" r="4.2" />
        <path d="M12 2.5v2.2M12 19.3v2.2M2.5 12h2.2M19.3 12h2.2M5.3 5.3l1.6 1.6M17.1 17.1l1.6 1.6M5.3 18.7l1.6-1.6M17.1 6.9l1.6-1.6" />
      </svg>
    </button>
  );
}
