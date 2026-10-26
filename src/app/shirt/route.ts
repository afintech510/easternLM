import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { getClientIp, hashIp } from "@/lib/rate-limit";

/**
 * QR redirect printed on crew shirts: /shirt (optionally ?s=<id> per print run)
 * → homepage with shirt UTMs. Every scan is logged to qr_scans for a hard count.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const s = url.searchParams.get("s");
  const variant = s && /^[A-Za-z0-9_-]{1,40}$/.test(s) ? s : null;

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase = getSupabaseAdminClient() as any;
    await supabase.from("qr_scans").insert({
      source: "shirt",
      variant,
      ip_hash: hashIp(getClientIp(request)),
      user_agent: request.headers.get("user-agent")?.slice(0, 500) ?? null,
      referer: request.headers.get("referer")?.slice(0, 500) ?? null,
    });
  } catch {
    // Never block the redirect on logging
  }

  const params = new URLSearchParams({ utm_source: "shirt", utm_medium: "qr", utm_campaign: "crew_shirts" });
  if (variant) params.set("utm_content", variant);
  // Relative Location — the container's own origin is internal behind nginx
  return new NextResponse(null, {
    status: 307,
    headers: { Location: `/?${params.toString()}`, "Cache-Control": "no-store" },
  });
}
