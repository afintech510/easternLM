import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/auth";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { decryptRefreshToken } from "@/lib/marketing/crypto";

export async function POST(request: NextRequest) {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  const { brand_id = "eastern-lm" } = await request.json().catch(() => ({}));
  const supabase = getSupabaseAdminClient();

  // Get current account
  const { data: account } = await (supabase as any)
    .from("mktg_google_accounts")
    .select("refresh_token_encrypted")
    .eq("brand_id", brand_id)
    .is("revoked_at", null)
    .single();

  if (!account) {
    return NextResponse.json({ error: "No connected account found" }, { status: 404 });
  }

  // Try to revoke with Google (best-effort — even if this fails, we disconnect locally)
  if (account.refresh_token_encrypted) {
    try {
      const token = decryptRefreshToken(account.refresh_token_encrypted);
      await fetch(`https://oauth2.googleapis.com/revoke?token=${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
      });
    } catch (err) {
      console.error("[OAuth revoke] Google revocation failed (continuing with local disconnect):", err);
    }
  }

  // Soft-delete: set revoked_at (do NOT delete — preserves history)
  await (supabase as any)
    .from("mktg_google_accounts")
    .update({ revoked_at: new Date().toISOString() })
    .eq("brand_id", brand_id);

  // Write audit log
  await (supabase as any).from("mktg_agent_actions").insert({
    brand_id,
    agent_name: "oauth",
    action: "disconnect",
    payload: {},
    status: "success",
    triggered_by: auth.userId,
  });

  return NextResponse.json({ ok: true });
}
