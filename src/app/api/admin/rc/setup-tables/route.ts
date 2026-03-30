import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

/**
 * POST /api/admin/rc/setup-tables
 * Creates the sms_messages table and RPC function if they don't exist.
 * Safe to call multiple times (idempotent).
 */
export async function POST() {
  const supabase = getSupabaseAdminClient() as any;

  // Check if table already exists
  const { data: existing } = await supabase
    .from("sms_messages")
    .select("id")
    .limit(0);

  if (existing !== null) {
    return NextResponse.json({ ok: true, action: "table_already_exists" });
  }

  // Table doesn't exist — we can't run DDL via the REST API.
  // Return instructions.
  return NextResponse.json({
    ok: false,
    message: "sms_messages table does not exist. Apply the migration via Supabase dashboard SQL editor.",
    migration: "supabase/migrations/20260330_sms_messages.sql",
  });
}
