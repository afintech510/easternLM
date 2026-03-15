import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/auth";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { previewAudience } from "@/lib/marketing/audience";

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  const body = await request.json();
  const supabase = getSupabaseAdminClient();
  const result = await previewAudience(supabase, body.filter || {});
  return NextResponse.json(result);
}
