import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export async function GET(request: NextRequest) {
  const id = request.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.redirect(new URL("/", request.url));

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = getSupabaseAdminClient() as any;

  await supabase.from("follow_ups").update({ link_clicked: true }).eq("id", id);

  const platform = request.nextUrl.searchParams.get("platform");

  const { data: settings } = await supabase
    .from("site_settings")
    .select("google_review_url, yelp_review_url")
    .eq("id", 1)
    .single();

  const reviewUrl = platform === "yelp"
    ? (settings?.yelp_review_url || "https://www.yelp.com")
    : (settings?.google_review_url || "https://www.google.com/maps");
  return NextResponse.redirect(reviewUrl);
}
