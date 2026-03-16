import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/auth";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export async function PATCH(request: Request) {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  const { updates } = await request.json();
  if (!Array.isArray(updates) || updates.length === 0) {
    return NextResponse.json(
      { error: "No updates provided" },
      { status: 400 },
    );
  }

  const supabase = getSupabaseAdminClient();
  let success = 0;
  let failed = 0;

  for (const update of updates) {
    const { id, ...fields } = update;
    if (!id) {
      failed++;
      continue;
    }

    // Only allow specific fields to be updated
    const allowedFields = [
      "name",
      "price_per_unit_cents",
      "visible_web",
      "visible_pos",
      "is_active",
      "category_id",
    ];
    const safeFields: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(fields)) {
      if (allowedFields.includes(key)) {
        safeFields[key] = value;
      }
    }

    if (Object.keys(safeFields).length === 0) {
      failed++;
      continue;
    }

    const { error } = await supabase
      .from("products")
      .update(safeFields)
      .eq("id", id);
    if (error) failed++;
    else success++;
  }

  return NextResponse.json({ success, failed });
}
