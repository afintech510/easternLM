import { NextResponse } from "next/server";
import { lookupCatalogPrices, type CatalogPrice } from "@/lib/catalog-prices";

/** GET /api/catalog/prices?keys=slug-or-id,slug-or-id → current web prices. */
export async function GET(request: Request) {
  const keys = (new URL(request.url).searchParams.get("keys") ?? "")
    .split(",")
    .map((k) => k.trim())
    .filter(Boolean)
    .slice(0, 100);

  try {
    const prices = await lookupCatalogPrices(keys);
    const body: Record<string, CatalogPrice> = Object.fromEntries(prices);
    return NextResponse.json({ prices: body }, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    console.error("[catalog/prices]", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "Unable to load prices." }, { status: 500 });
  }
}
