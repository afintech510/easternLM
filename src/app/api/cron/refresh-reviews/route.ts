import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

const PLACE_ID = "ChIJN0YgVW5Z6IkRh5ZqxoDCTNU";

export async function GET(request: NextRequest) {
  const key = request.nextUrl.searchParams.get("key");
  if (key !== process.env.CRON_SECRET_KEY) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "GOOGLE_MAPS_API_KEY not set" }, { status: 500 });
  }

  const url = `https://maps.googleapis.com/maps/api/place/details/json?${new URLSearchParams({
    place_id: PLACE_ID,
    fields: "reviews,rating,user_ratings_total",
    key: apiKey,
  })}`;

  const res = await fetch(url);
  const data = await res.json();

  if (data.status !== "OK" || !data.result) {
    return NextResponse.json({ error: "Google Places API error", details: data.status }, { status: 502 });
  }

  const supabase = getSupabaseAdminClient();
  const { error } = await supabase.from("google_reviews_cache").upsert({
    id: 1,
    place_id: PLACE_ID,
    overall_rating: data.result.rating,
    total_reviews: data.result.user_ratings_total,
    reviews: data.result.reviews || [],
    fetched_at: new Date().toISOString(),
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    rating: data.result.rating,
    total: data.result.user_ratings_total,
    reviewCount: data.result.reviews?.length || 0,
  });
}
