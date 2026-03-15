import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { generateDailyBriefing, formatBriefingText } from "@/lib/operations/briefing";

export async function GET(request: NextRequest) {
  const key = request.nextUrl.searchParams.get("key");
  if (key !== process.env.CRON_SECRET_KEY) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = getSupabaseAdminClient();
  const today = new Date().toISOString().split("T")[0];
  const briefing = await generateDailyBriefing(supabase, today);
  const text = formatBriefingText(briefing);

  // Send email briefing
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;
  if (apiKey && from) {
    try {
      const { Resend } = await import("resend");
      const resend = new Resend(apiKey);
      await resend.emails.send({
        from,
        to: "adam@easternbuilding.supply",
        subject: `Morning Briefing — ${briefing.deliveries.total} deliveries, ${briefing.materials.length} materials`,
        text,
      });
    } catch { /* Email is best-effort */ }
  }

  return NextResponse.json({ ok: true, briefing });
}
