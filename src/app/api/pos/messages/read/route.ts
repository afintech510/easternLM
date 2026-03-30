import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

/**
 * POST /api/pos/messages/read
 * Marks all inbound messages from a phone as read.
 */
export async function POST(request: Request) {
  const { phone } = await request.json();
  if (!phone) return NextResponse.json({ error: "phone required" }, { status: 400 });

  const supabase = getSupabaseAdminClient() as any;
  await supabase
    .from("sms_messages")
    .update({ read_at: new Date().toISOString(), read_by: "POS" })
    .eq("from_number", phone)
    .eq("direction", "inbound")
    .is("read_at", null);

  return NextResponse.json({ ok: true });
}
