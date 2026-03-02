import { NextResponse } from "next/server";
import { getSupabaseServerClientWithCookies } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = await getSupabaseServerClientWithCookies();

    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({
        step: "auth",
        ok: false,
        error: userError?.message ?? "No user in session",
        cookies: "present but no valid session",
      });
    }

    const { data: account, error: accountError } = await supabase
      .from("accounts")
      .select("role")
      .eq("id", user.id)
      .single();

    return NextResponse.json({
      step: "complete",
      ok: true,
      userId: user.id,
      email: user.email,
      account,
      accountError: accountError?.message ?? null,
    });
  } catch (err) {
    return NextResponse.json({
      step: "exception",
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    });
  }
}
