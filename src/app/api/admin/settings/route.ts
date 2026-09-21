import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/auth";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { siteSettingsSchema } from "@/lib/admin/schemas";

export async function GET() {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("site_settings")
    .select("*")
    .eq("id", 1)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function PATCH(request: Request) {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = siteSettingsSchema.partial().safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("site_settings")
    .update({ ...parsed.data, updated_at: new Date().toISOString() })
    .eq("id", 1)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Quoted fees are cached per address for 24h. Without this purge, a pricing
  // change silently keeps serving the old fee to every address already quoted.
  if (PRICING_FIELDS.some((field) => field in parsed.data)) {
    try {
      await supabase.from("delivery_fee_cache").delete().neq("address_hash", "");
    } catch {
      // Cache table unavailable — entries expire on their own within 24h
    }
  }

  return NextResponse.json(data);
}

/** site_settings columns that change a quoted delivery fee. */
const PRICING_FIELDS = [
  "miles_per_gallon",
  "fuel_price_per_gallon",
  "hourly_labor_rate",
  "dump_time_buffer_minutes",
  "profit_multiplier",
  "round_to_nearest",
  "minimum_delivery_fee_cents",
  "additional_load_discount",
  "local_radius_miles",
  "max_service_radius_miles",
  "origin_address",
] as const;
