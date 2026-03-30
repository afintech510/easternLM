import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

/**
 * GET /api/pos/messages/conversations?number=all&search=
 * Returns conversation list grouped by customer phone.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const numberFilter = url.searchParams.get("number") ?? "all";
  const search = url.searchParams.get("search") ?? "";

  const supabase = getSupabaseAdminClient() as any;

  const { data, error } = await supabase.rpc("get_sms_conversations", {
    p_business_number: numberFilter === "all" ? null : numberFilter,
    p_search: search || null,
    p_limit: 50,
  });

  if (error) {
    console.error("[Messages] Conversation query error:", error);
    return NextResponse.json([]);
  }

  return NextResponse.json(data ?? []);
}
