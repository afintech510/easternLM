import { NextRequest, NextResponse } from "next/server";

type GooglePrediction = {
  place_id: string;
  description: string;
};

type GoogleAutocompleteResponse = {
  status: string;
  error_message?: string;
  predictions: GooglePrediction[];
};

export async function GET(request: NextRequest) {
  const input = request.nextUrl.searchParams.get("input") ?? "";
  const sessiontoken = request.nextUrl.searchParams.get("sessiontoken") ?? "";

  if (input.length < 3) {
    return NextResponse.json({ predictions: [] });
  }

  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ predictions: [] });
  }

  const params = new URLSearchParams({
    input,
    key: apiKey,
    types: "address",
    components: "country:us",
    // Bias toward Long Island / Suffolk County area
    location: "40.8,-72.9",
    radius: "80000",
    ...(sessiontoken ? { sessiontoken } : {}),
  });

  const res = await fetch(
    `https://maps.googleapis.com/maps/api/place/autocomplete/json?${params}`,
    { cache: "no-store" },
  );

  if (!res.ok) {
    return NextResponse.json({ predictions: [] });
  }

  const data = (await res.json()) as GoogleAutocompleteResponse;

  if (data.status !== "OK" && data.status !== "ZERO_RESULTS") {
    console.error(`[places] ${data.status}: ${data.error_message}`);
    return NextResponse.json({ predictions: [] });
  }

  return NextResponse.json({
    predictions: data.predictions.map((p) => ({
      placeId: p.place_id,
      description: p.description,
    })),
  });
}
