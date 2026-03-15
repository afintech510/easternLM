/** Fire-and-forget analytics for calculator/quote interactions */
export function trackCalcEvent(eventType: string, data: Record<string, unknown>, sourcePage?: string) {
  try {
    const sessionId = typeof window !== "undefined" ? (sessionStorage.getItem("elm_sid") || (() => { const id = crypto.randomUUID(); sessionStorage.setItem("elm_sid", id); return id; })()) : undefined;
    fetch("/api/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ eventType, data, sessionId, sourcePage: sourcePage || (typeof window !== "undefined" ? window.location.pathname : undefined) }),
    }).catch(() => {});
  } catch {}
}
