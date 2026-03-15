import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  try {
    const { eventType, data, sessionId, sourcePage } = await request.json();
    if (!eventType) return NextResponse.json({ ok: false }, { status: 400 });
    const supabase = getSupabaseAdminClient();
    await supabase.from("calculator_events").insert({ event_type: eventType, data: data || {}, session_id: sessionId || null, source_page: sourcePage || null });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
