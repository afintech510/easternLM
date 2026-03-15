import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export async function GET(request: NextRequest) {
  const id = request.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.redirect(new URL("/", request.url));

  const supabase = getSupabaseAdminClient();

  // Mark as clicked
  await supabase.from("follow_ups").update({ link_clicked: true }).eq("id", id);

  // Get the review URL
  const { data: settings } = await supabase
    .from("site_settings")
    .select("google_review_url")
    .eq("id", 1)
    .single();

  const reviewUrl = settings?.google_review_url || "https://www.google.com/maps";
  return NextResponse.redirect(reviewUrl);
}
