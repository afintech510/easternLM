import { NextResponse } from "next/server";
import { getSupabaseServerClientWithCookies } from "@/lib/supabase/server";

type AdminAuth = { userId: string };

/**
 * Verifies the current request is from an authenticated admin user.
 * Use at the top of every admin API route:
 *
 *   const auth = await requireAdmin();
 *   if (auth instanceof NextResponse) return auth;
 *   // auth.userId is available
 */
export async function requireAdmin(): Promise<AdminAuth | NextResponse> {
  const supabase = await getSupabaseServerClientWithCookies();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { data: account } = await supabase
    .from("accounts")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!account || account.role !== "admin") {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  return { userId: user.id };
}
