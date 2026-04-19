import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export async function PATCH(req: NextRequest) {
  const body = await req.json();
  const { publishMode, monthlyBudgetCapCents } = body as {
    publishMode?: string;
    monthlyBudgetCapCents?: number;
  };

  const updates: Record<string, any> = {};
  if (publishMode && ["read_only", "suggest", "auto"].includes(publishMode)) {
    updates.publish_mode = publishMode;
  }
  if (monthlyBudgetCapCents !== undefined && monthlyBudgetCapCents >= 0) {
    updates.monthly_budget_cap_cents = Math.round(monthlyBudgetCapCents);
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
  }

  const supabase = getSupabaseAdminClient();
  const { error } = await (supabase as any)
    .from("mktg_google_accounts")
    .update(updates)
    .eq("brand_id", "eastern-lm");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ updated: updates });
}
