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
