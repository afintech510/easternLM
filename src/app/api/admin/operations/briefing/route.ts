import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/auth";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { generateDailyBriefing, generateEodSummary } from "@/lib/operations/briefing";

export async function GET(request: Request) {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  const url = new URL(request.url);
  const date = url.searchParams.get("date") || new Date().toISOString().split("T")[0];
  const type = url.searchParams.get("type") || "morning";

  const supabase = getSupabaseAdminClient();

  if (type === "eod") {
    const summary = await generateEodSummary(supabase, date);
    return NextResponse.json({ summary });
  }

  const briefing = await generateDailyBriefing(supabase, date);
  return NextResponse.json({ briefing });
}
