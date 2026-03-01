import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin/auth";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

const feeTestSchema = z.object({
  address: z.string().min(5, "Enter a valid address"),
});

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = feeTestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Enter a valid address" }, { status: 400 });
  }

  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "Google Maps API key not configured" },
      { status: 503 },
    );
  }

  // Get site settings for origin address and pricing config
  const supabase = getSupabaseAdminClient();
  const { data: settings } = await supabase
    .from("site_settings")
    .select("*")
    .eq("id", 1)
    .single();

  if (!settings) {
    return NextResponse.json({ error: "Site settings not found" }, { status: 500 });
  }

  // Call Google Maps Distance Matrix API
  const origin = encodeURIComponent(settings.origin_address);
  const destination = encodeURIComponent(parsed.data.address);
  const mapsUrl = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${origin}&destinations=${destination}&key=${apiKey}&units=imperial`;

  const mapsRes = await fetch(mapsUrl);
  const mapsData = await mapsRes.json();

  if (
    mapsData.status !== "OK" ||
    !mapsData.rows?.[0]?.elements?.[0] ||
    mapsData.rows[0].elements[0].status !== "OK"
  ) {
    return NextResponse.json(
      { error: "Could not calculate distance for this address" },
      { status: 400 },
    );
  }

  const element = mapsData.rows[0].elements[0];
  const distanceMeters = element.distance.value as number;
  const durationSeconds = element.duration.value as number;
  const oneWayMiles = distanceMeters / 1609.34;

  // Calculate delivery fee using the same formula as the main delivery engine
  const roundTripMiles = oneWayMiles * 2;
  const roundTripMinutes = (durationSeconds * 2) / 60;

  const fuelCost = (roundTripMiles / settings.miles_per_gallon) * settings.fuel_price_per_gallon;
  const laborCost = (roundTripMinutes / 60) * settings.hourly_labor_rate;
  const rawCost = (fuelCost + laborCost) * settings.profit_multiplier;

  const roundTo = settings.round_to_nearest;
  const minFee = settings.minimum_delivery_fee_cents / 100;
  const firstLoadFee = Math.max(Math.ceil(rawCost / roundTo) * roundTo, minFee);
  const additionalLoadFee = Math.round(firstLoadFee * (1 - settings.additional_load_discount));

  const isLocal = oneWayMiles <= settings.local_radius_miles;
  const isOutOfRange = oneWayMiles > settings.max_service_radius_miles;

  return NextResponse.json({
    address: parsed.data.address,
    oneWayMiles: Math.round(oneWayMiles * 10) / 10,
    roundTripMiles: Math.round(roundTripMiles * 10) / 10,
    durationMinutes: Math.round(durationSeconds / 60),
    fuelCost: Math.round(fuelCost * 100) / 100,
    laborCost: Math.round(laborCost * 100) / 100,
    rawCost: Math.round(rawCost * 100) / 100,
    firstLoadFee,
    additionalLoadFee,
    isLocal,
    isOutOfRange,
  });
}
