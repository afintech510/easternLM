import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

function inSeason(s: { season_start_month: number | null; season_end_month: number | null }): boolean {
  if (!s.season_start_month || !s.season_end_month) return true;
  const month = new Date().getMonth() + 1;
  // Handle wrap-around (e.g., Oct-Mar = 10-3)
  if (s.season_start_month <= s.season_end_month) {
    return month >= s.season_start_month && month <= s.season_end_month;
  }
  return month >= s.season_start_month || month <= s.season_end_month;
}

export async function GET() {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await (supabase as any)
    .from("instant_book_services")
    .select("*")
    .eq("is_active", true)
    .order("sort_order");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const services = (data || []).filter(inSeason);
  return NextResponse.json({ services });
}
