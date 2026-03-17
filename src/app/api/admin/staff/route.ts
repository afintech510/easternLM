import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { requireAdmin } from "@/lib/admin/auth";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

// GET — list all staff/admin/pos accounts
export async function GET() {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  const supabase = getSupabaseAdminClient() as any;
  const { data, error } = await supabase
    .from("accounts")
    .select("id, full_name, role, is_active, created_at")
    .in("role", ["admin", "staff", "pos"])
    .order("role")
    .order("full_name");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ staff: data ?? [] });
}

// POST — create a new PIN-based staff account
export async function POST(request: Request) {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  const { full_name, role, pin } = await request.json();

  if (!full_name?.trim()) {
    return NextResponse.json({ error: "Name is required." }, { status: 400 });
  }
  if (!["admin", "staff", "pos"].includes(role)) {
    return NextResponse.json({ error: "Invalid role." }, { status: 400 });
  }
  if (!pin || typeof pin !== "string" || pin.length < 4 || !/^\d+$/.test(pin)) {
    return NextResponse.json({ error: "PIN must be 4–6 digits." }, { status: 400 });
  }

  const pos_pin_hash = await bcrypt.hash(pin, 10);

  // PIN-only staff accounts don't have a Supabase auth user — we store a synthetic UUID
  const id = crypto.randomUUID();

  const supabase = getSupabaseAdminClient() as any;
  const { error } = await supabase.from("accounts").insert({
    id,
    full_name: full_name.trim(),
    role,
    pos_pin_hash,
    is_active: true,
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, id });
}
