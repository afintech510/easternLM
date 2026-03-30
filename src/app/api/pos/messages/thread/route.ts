import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

/**
 * GET /api/pos/messages/thread?phone=+16315551234&limit=100
 * Returns all messages in a conversation with a specific phone number.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const phone = url.searchParams.get("phone") ?? "";
  const limit = Math.min(parseInt(url.searchParams.get("limit") ?? "100"), 200);

  if (!phone) return NextResponse.json([]);

  const supabase = getSupabaseAdminClient() as any;

  const { data } = await supabase
    .from("sms_messages")
    .select("*")
    .or(`from_number.eq.${phone},to_number.eq.${phone}`)
    .order("created_at", { ascending: true })
    .limit(limit);

  return NextResponse.json(data ?? []);
}
