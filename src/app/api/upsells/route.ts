import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("upsells")
    .select("*")
    .eq("is_active", true)
    .order("sort_order");

  if (error) return NextResponse.json({ upsells: [] });
  return NextResponse.json({ upsells: data });
}
