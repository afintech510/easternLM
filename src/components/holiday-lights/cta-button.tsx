"use client";

import type { ReactNode } from "react";
import { HOLIDAY_LIGHTS, getDesignUrl } from "@/config/holiday-lights";
import { trackEvent } from "@/lib/bulk-analytics";
import { openReserve } from "./events";

export type CtaAction = "visualize" | "design" | "reserve" | "call" | "text";

function scrollToId(id: string) {
  const el = document.getElementById(id);
  if (!el) return false;
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  el.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
  return true;
}

export function runCta(act: CtaAction) {
  trackEvent("lights_cta_click", { action: act });
  switch (act) {
    case "visualize":
      if (scrollToId("visualizer")) {
        setTimeout(() => document.getElementById("photo")?.focus({ preventScroll: true }), 550);
      } else {
        window.location.href = `${HOLIDAY_LIGHTS.path}#visualizer`;
      }
      break;
    case "design":
      window.location.href = getDesignUrl();
      break;
    case "reserve":
      openReserve();
      break;
    case "call":
      window.location.href = `tel:${HOLIDAY_LIGHTS.phoneTel}`;
      break;
    case "text":
      window.location.href = `sms:${HOLIDAY_LIGHTS.phoneSms}`;
      break;
  }
}

/** The artifact's `data-act` buttons. */
export function CtaButton({
  act,
  className,
  children,
  ...rest
}: {
  act: CtaAction;
  className?: string;
  children: ReactNode;
  "aria-label"?: string;
}) {
  return (
    <button type="button" className={className} data-act={act} onClick={() => runCta(act)} {...rest}>
      {children}
    </button>
  );
}
