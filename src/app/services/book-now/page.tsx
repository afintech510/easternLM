import type { Metadata } from "next";
import { BookNowClient } from "@/components/book-now/book-now-client";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import type { InstantBookService } from "@/lib/book-now/types";

export const metadata: Metadata = {
  title: "Book a Landscape Crew | Eastern Landscape & Mason Supply",
  description:
    "Book a local landscape crew online in 60 seconds. Mulching, cleanups, pathways, walls, power washing, and more. Suffolk County. Reserve with card — no charge until we confirm.",
};

export const dynamic = "force-dynamic";

function inSeason(s: { season_start_month: number | null; season_end_month: number | null }): boolean {
  if (!s.season_start_month || !s.season_end_month) return true;
  const month = new Date().getMonth() + 1;
  if (s.season_start_month <= s.season_end_month) {
    return month >= s.season_start_month && month <= s.season_end_month;
  }
  return month >= s.season_start_month || month <= s.season_end_month;
}

export default async function BookNowPage() {
  const supabase = getSupabaseAdminClient();
  const { data } = await (supabase as any)
    .from("instant_book_services")
    .select("*")
    .eq("is_active", true)
    .order("sort_order");

  const services: InstantBookService[] = (data || []).filter(inSeason);

  return <BookNowClient initialServices={services} />;
}
