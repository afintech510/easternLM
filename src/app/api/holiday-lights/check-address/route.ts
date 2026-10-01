import { NextResponse } from "next/server";
import { DAY_MS, getClientIp, hashIp, rateLimit, retryAfterHeaders } from "@/lib/rate-limit";
import { isInServiceArea } from "@/lib/holiday-lights/service-area";

export const runtime = "nodejs";

/** POST {address} → {inArea, town, lat, lng}. Used by the waitlist and later the designer/reserve flow. */
export async function POST(request: Request) {
  const limit = rateLimit(`hl-addr:ip:${hashIp(getClientIp(request))}`, 60, DAY_MS);
  if (!limit.ok) return NextResponse.json({ error: "Too many lookups today." }, { status: 429, headers: retryAfterHeaders(limit) });

  const body = (await request.json().catch(() => null)) as { address?: unknown } | null;
  const address = typeof body?.address === "string" ? body.address.trim() : "";
  if (address.length < 5 || address.length > 300) {
    return NextResponse.json({ error: "Enter your street address and town." }, { status: 400 });
  }

  const r = await isInServiceArea(address);
  return NextResponse.json({ inArea: r.inArea, town: r.town, lat: r.lat, lng: r.lng, formattedAddress: r.formattedAddress });
}
