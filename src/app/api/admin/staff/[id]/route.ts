import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { requireAdmin } from "@/lib/admin/auth";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

type RouteContext = { params: Promise<{ id: string }> };

// PATCH — update is_active or reset PIN
export async function PATCH(request: Request, context: RouteContext) {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  const { id } = await context.params;
  const body = await request.json();

  const updates: Record<string, unknown> = {};

  if (typeof body.is_active === "boolean") {
    updates.is_active = body.is_active;
  }

  if (body.reset_pin) {
    const pin = body.reset_pin as string;
    if (pin.length < 4 || !/^\d+$/.test(pin)) {
      return NextResponse.json({ error: "PIN must be 4–6 digits." }, { status: 400 });
    }
    updates.pos_pin_hash = await bcrypt.hash(pin, 10);
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "Nothing to update." }, { status: 400 });
  }

  const supabase = getSupabaseAdminClient() as any;
  const { error } = await supabase.from("accounts").update(updates).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

// DELETE — remove staff account
export async function DELETE(_request: Request, context: RouteContext) {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  const { id } = await context.params;
  const supabase = getSupabaseAdminClient() as any;
  const { error } = await supabase.from("accounts").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
