import { NextResponse } from "next/server";
import { z } from "zod";
import { hashAddress } from "@/lib/address-utils";
import { calculateDeliveryFees } from "@/lib/delivery";
import { getDeliveryRuntimeConfig } from "@/lib/data/delivery-config";
import { fetchGoogleDistanceMatrix } from "@/lib/google-maps";

const requestSchema = z.object({
  address: z.string().min(8),
});

function tryGetSupabaseAdmin() {
  try {
    /* eslint-disable @typescript-eslint/no-require-imports */
    const { getSupabaseAdminClient } = require("@/lib/supabase/admin") as {
      getSupabaseAdminClient: () => ReturnType<
        typeof import("@/lib/supabase/admin").getSupabaseAdminClient
      >;
    };
    /* eslint-enable @typescript-eslint/no-require-imports */
    return getSupabaseAdminClient();
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const parsedBody = requestSchema.safeParse(body);
  if (!parsedBody.success) {
    return NextResponse.json(
      { error: "Please enter a complete delivery address (street, city, state)." },
      { status: 400 },
    );
  }

  const { address } = parsedBody.data;
  const addressHash = hashAddress(address);
  const nowIso = new Date().toISOString();

  // Try cache lookup — skip gracefully if Supabase is unavailable or table missing
  const supabaseAdmin = tryGetSupabaseAdmin();
  if (supabaseAdmin) {
    try {
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
    } catch {
      // Cache unavailable — continue to live calculation
    }
  }

  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      {
        error:
          "Delivery calculator is temporarily unavailable. Please call (631) 874-6244 for a delivery quote.",
      },
      { status: 503 },
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
      {
        error:
          error instanceof Error
            ? error.message
            : "We could not resolve that address. Please check the address and try again.",
      },
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

  // Write to cache — ignore errors if table missing
  if (supabaseAdmin) {
    try {
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
    } catch {
      // Cache write failed — non-blocking
    }
  }

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
