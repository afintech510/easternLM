"use client";

import { useEffect } from "react";
import { trackEvent } from "@/lib/bulk-analytics";

/** Fires lights_visualizer_view on the shareable result page. */
export function ResultTracker({ style }: { style: string | null }) {
  useEffect(() => {
    trackEvent("lights_visualizer_view", { style, surface: "share_page" });
  }, [style]);
  return null;
}
