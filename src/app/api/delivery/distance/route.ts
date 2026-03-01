import { NextResponse } from "next/server";
import { z } from "zod";
import { hashAddress } from "@/lib/address-utils";
import { calculateDeliveryFees } from "@/lib/delivery";
import { getDeliveryRuntimeConfig } from "@/lib/data/delivery-config";
import { fetchGoogleDistanceMatrix } from "@/lib/google-maps";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

const requestSchema = z.object({
  address: z.string().min(8),
});

export async function POST(request: Request) {
  const parsedBody = requestSchema.safeParse(await request.json());
  if (!parsedBody.success) {
    return NextResponse.json({ error: "Invalid address payload." }, { status: 400 });
  }

  const { address } = parsedBody.data;
  const addressHash = hashAddress(address);
  const nowIso = new Date().toISOString();

  const supabaseAdmin = getSupabaseAdminClient();
  const cachedResult = await supabaseAdmin
    .from("delivery_fee_cache")
    .select(
      "address_hash, distance_meters, duration_seconds, one_way_miles, first_load_fee_cents, additional_load_fee_cents, expires_at",
    )
    .eq("address_hash", addressHash)
    .gt("expires_at", nowIso)
    .maybeSingle();

  if (!cachedResult.error && cachedResult.data) {
    return NextResponse.json({
      fromCache: true,
      addressHash,
      distanceMeters: cachedResult.data.distance_meters,
      durationSeconds: cachedResult.data.duration_seconds,
      oneWayMiles: Number(cachedResult.data.one_way_miles),
      firstLoadFeeCents: cachedResult.data.first_load_fee_cents,
      additionalLoadFeeCents: cachedResult.data.additional_load_fee_cents,
      expiresAt: cachedResult.data.expires_at,
    });
  }

  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "GOOGLE_MAPS_API_KEY is missing. Unable to calculate delivery distance." },
      { status: 500 },
    );
  }

  const runtimeConfig = await getDeliveryRuntimeConfig();
  let distanceMeters = 0;
  let durationSeconds = 0;
  try {
    const distance = await fetchGoogleDistanceMatrix({
      originAddress: runtimeConfig.originAddress,
      destinationAddress: address,
      apiKey,
    });
    distanceMeters = distance.distanceMeters;
    durationSeconds = distance.durationSeconds;
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Address could not be resolved for delivery." },
      { status: 400 },
    );
  }

  const oneWayMiles = distanceMeters / 1609.344;

  const feeProbe = calculateDeliveryFees({
    cartItems: [
      {
        id: "fee-probe",
        name: "Fee Probe",
        quantity: 1,
        unitPriceCents: 0,
        deliveryType: "bulk",
        materialClass: "default",
      },
    ],
    distanceResult: { distanceMeters, durationSeconds },
    pricingConfig: runtimeConfig.pricingConfig,
    truckTypes: runtimeConfig.truckTypes,
    combineLoads: false,
    deliveryMethod: "delivery",
  });

  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

  await supabaseAdmin.from("delivery_fee_cache").upsert(
    {
      address_hash: addressHash,
      address,
      distance_meters: distanceMeters,
      duration_seconds: durationSeconds,
      one_way_miles: Number(oneWayMiles.toFixed(2)),
      first_load_fee_cents: feeProbe.firstLoadFeeCents,
      additional_load_fee_cents: feeProbe.additionalLoadFeeCents,
      is_local: oneWayMiles <= runtimeConfig.pricingConfig.localRadiusMiles,
      is_out_of_range: oneWayMiles > runtimeConfig.pricingConfig.maxServiceRadiusMiles,
      expires_at: expiresAt,
    },
    { onConflict: "address_hash" },
  );

  return NextResponse.json({
    fromCache: false,
    addressHash,
    distanceMeters,
    durationSeconds,
    oneWayMiles,
    firstLoadFeeCents: feeProbe.firstLoadFeeCents,
    additionalLoadFeeCents: feeProbe.additionalLoadFeeCents,
    expiresAt,
  });
}
