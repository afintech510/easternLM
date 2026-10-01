import type { DistanceMatrixResult } from "@/lib/delivery";

type DistanceMatrixApiResponse = {
  status: string;
  error_message?: string;
  rows?: Array<{
    elements?: Array<{
      status: string;
      distance?: { value: number };
      duration?: { value: number };
    }>;
  }>;
};

export async function fetchGoogleDistanceMatrix(input: {
  originAddress: string;
  destinationAddress: string;
  apiKey: string;
}): Promise<DistanceMatrixResult> {
  const params = new URLSearchParams({
    origins: input.originAddress,
    destinations: input.destinationAddress,
    units: "imperial",
    key: input.apiKey,
  });

  const response = await fetch(`https://maps.googleapis.com/maps/api/distancematrix/json?${params.toString()}`, {
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error("Google Maps API request failed.");
  }

  const body = (await response.json()) as DistanceMatrixApiResponse;
  if (body.status !== "OK") {
    const detail = body.error_message ? `${body.status}: ${body.error_message}` : body.status;
    throw new Error(detail);
  }

  const element = body.rows?.[0]?.elements?.[0];
  if (!element || element.status !== "OK") {
    throw new Error(`Address could not be resolved for delivery (${element?.status ?? "UNKNOWN"}).`);
  }

  return {
    distanceMeters: element.distance?.value ?? 0,
    durationSeconds: element.duration?.value ?? 0,
  };
}

export type GeocodeResult = {
  formattedAddress: string;
  lat: number;
  lng: number;
  /** administrative_area_level_3 — the NY town (e.g. "Brookhaven"). */
  town: string | null;
  locality: string | null;
  county: string | null;
  state: string | null;
  zip: string | null;
};

type GeocodeApiResponse = {
  status: string;
  error_message?: string;
  results?: Array<{
    formatted_address: string;
    geometry: { location: { lat: number; lng: number } };
    address_components: Array<{ long_name: string; short_name: string; types: string[] }>;
  }>;
};

/** Google Geocoding API. Returns null when the address can't be resolved. */
export async function geocodeAddress(address: string, apiKey: string): Promise<GeocodeResult | null> {
  const params = new URLSearchParams({ address, components: "country:US", key: apiKey });
  const response = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?${params.toString()}`, {
    cache: "no-store",
  });
  if (!response.ok) throw new Error("Google Geocoding API request failed.");

  const body = (await response.json()) as GeocodeApiResponse;
  if (body.status === "ZERO_RESULTS") return null;
  if (body.status !== "OK") {
    throw new Error(body.error_message ? `${body.status}: ${body.error_message}` : body.status);
  }

  const top = body.results?.[0];
  if (!top) return null;
  const find = (type: string, short = false) => {
    const c = top.address_components.find((a) => a.types.includes(type));
    return c ? (short ? c.short_name : c.long_name) : null;
  };

  return {
    formattedAddress: top.formatted_address,
    lat: top.geometry.location.lat,
    lng: top.geometry.location.lng,
    town: find("administrative_area_level_3"),
    locality: find("locality"),
    county: find("administrative_area_level_2"),
    state: find("administrative_area_level_1", true),
    zip: find("postal_code"),
  };
}
