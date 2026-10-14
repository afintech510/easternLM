"use client";

import { useEffect, useState } from "react";
import type { CatalogPrice } from "@/lib/catalog-prices";

export type LivePrices = Record<string, CatalogPrice>;

const cache: LivePrices = {};

export async function fetchLivePrices(keys: string[]): Promise<LivePrices> {
  const missing = [...new Set(keys)].filter((k) => k && !cache[k]);
  if (missing.length > 0) {
    const res = await fetch(`/api/catalog/prices?keys=${encodeURIComponent(missing.join(","))}`, { cache: "no-store" });
    if (res.ok) {
      const body = (await res.json()) as { prices?: LivePrices };
      Object.assign(cache, body.prices ?? {});
    }
  }
  return Object.fromEntries(keys.filter((k) => cache[k]).map((k) => [k, cache[k]!]));
}

/**
 * Current catalog web prices for the given product slugs/ids. Returns {} until
 * loaded — callers fall back to their hardcoded estimate in the meantime.
 */
export function useLivePrices(keys: string[]): LivePrices {
  const joined = keys.join(",");
  const [prices, setPrices] = useState<LivePrices>({});
  useEffect(() => {
    let cancelled = false;
    fetchLivePrices(joined.split(",")).then((p) => { if (!cancelled) setPrices(p); }).catch(() => undefined);
    return () => { cancelled = true; };
  }, [joined]);
  return prices;
}

/** Live price in cents, or the fallback while loading / if the slug is unknown. */
export function livePrice(prices: LivePrices, key: string, fallbackCents: number): number {
  return prices[key]?.unitPriceCents ?? fallbackCents;
}
