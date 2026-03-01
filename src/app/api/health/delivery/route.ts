import { NextResponse } from "next/server";

export async function GET() {
  const checks: Record<string, { ok: boolean; detail?: string }> = {};

  // Check Google Maps API key
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  checks.googleMapsApiKey = apiKey
    ? { ok: true, detail: `Set (${apiKey.slice(0, 6)}...)` }
    : { ok: false, detail: "GOOGLE_MAPS_API_KEY is not set" };

  // Check Supabase service role key
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  checks.supabaseServiceRole = serviceKey
    ? { ok: true, detail: `Set (${serviceKey.slice(0, 6)}...)` }
    : { ok: false, detail: "SUPABASE_SERVICE_ROLE_KEY is not set — cache will be skipped" };

  // Check delivery_fee_cache table
  if (serviceKey && process.env.NEXT_PUBLIC_SUPABASE_URL) {
    try {
      const { getSupabaseAdminClient } = await import("@/lib/supabase/admin");
      const supabase = getSupabaseAdminClient();
      const { error } = await supabase
        .from("delivery_fee_cache")
        .select("address_hash")
        .limit(1);

      checks.deliveryFeeCache = error
        ? { ok: false, detail: `Table query failed: ${error.message}` }
        : { ok: true, detail: "Table accessible" };
    } catch (err) {
      checks.deliveryFeeCache = {
        ok: false,
        detail: err instanceof Error ? err.message : "Failed to connect",
      };
    }
  } else {
    checks.deliveryFeeCache = { ok: false, detail: "Skipped — missing Supabase credentials" };
  }

  // Test Google Maps API connectivity (lightweight geocode-style check)
  if (apiKey) {
    try {
      const params = new URLSearchParams({
        origins: "110 Frowein Rd, Center Moriches, NY 11934",
        destinations: "Shirley, NY",
        key: apiKey,
      });
      const res = await fetch(
        `https://maps.googleapis.com/maps/api/distancematrix/json?${params}`,
      );
      const data = (await res.json()) as { status?: string };
      checks.googleMapsApi =
        data.status === "OK"
          ? { ok: true, detail: "API responding" }
          : { ok: false, detail: `API status: ${data.status}` };
    } catch (err) {
      checks.googleMapsApi = {
        ok: false,
        detail: err instanceof Error ? err.message : "API unreachable",
      };
    }
  } else {
    checks.googleMapsApi = { ok: false, detail: "Skipped — no API key" };
  }

  const allOk = Object.values(checks).every((c) => c.ok);
  return NextResponse.json({ ok: allOk, checks }, { status: allOk ? 200 : 503 });
}
