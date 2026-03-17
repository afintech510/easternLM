import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { signYardSession, yardSessionCookieOptions } from "@/lib/yard-session";

export async function POST(request: Request) {
  const { pin } = await request.json();

  if (!pin || typeof pin !== "string" || pin.length < 4 || pin.length > 6 || !/^\d+$/.test(pin)) {
    return NextResponse.json({ error: "Invalid PIN format." }, { status: 400 });
  }

  const supabase = getSupabaseAdminClient() as any;

  // Fetch all active accounts with a PIN hash (keep it to a small set)
  const { data: accounts, error } = await supabase
    .from("accounts")
    .select("id, full_name, role, pos_pin_hash, is_active")
    .not("pos_pin_hash", "is", null)
    .in("role", ["admin", "staff", "pos"])
    .eq("is_active", true);

  if (error) {
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }

  if (!accounts || accounts.length === 0) {
    return NextResponse.json({ error: "Incorrect PIN." }, { status: 401 });
  }

  // Find the matching account (bcrypt compare is O(n) but accounts are few)
  let matched: { id: string; full_name: string; role: string } | null = null;
  for (const account of accounts) {
    const isMatch = await bcrypt.compare(pin, account.pos_pin_hash);
    if (isMatch) {
      matched = account;
      break;
    }
  }

  if (!matched) {
    return NextResponse.json({ error: "Incorrect PIN." }, { status: 401 });
  }

  // Sign a yard session cookie
  const token = await signYardSession({
    id: matched.id,
    role: matched.role,
    name: matched.full_name ?? "Staff",
  });

  const { name, ...cookieOpts } = yardSessionCookieOptions();
  const response = NextResponse.json({ ok: true });
  response.cookies.set(name, token, cookieOpts);
  return response;
}
