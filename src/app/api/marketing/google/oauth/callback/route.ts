import { NextRequest, NextResponse } from "next/server";
import { createHmac } from "crypto";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { encryptRefreshToken } from "@/lib/marketing/crypto";

const REDIRECT_URI =
  (process.env.NEXT_PUBLIC_SITE_URL || "https://easternlm.com") +
  "/api/marketing/google/oauth/callback";

const ADMIN_ACCOUNTS_URL =
  (process.env.NEXT_PUBLIC_SITE_URL || "https://easternlm.com") +
  "/admin/marketing/google-ads";

function verifyState(stateParam: string): Record<string, string> | null {
  const key = process.env.MKTG_ENCRYPTION_KEY;
  if (!key) return null;
  const [encoded, sig] = stateParam.split(".");
  if (!encoded || !sig) return null;
  const data = Buffer.from(encoded, "base64url").toString("utf8");
  const expected = createHmac("sha256", key).update(data).digest("hex");
  if (sig !== expected) return null;
  try {
    const parsed = JSON.parse(data);
    // Reject states older than 10 minutes
    if (Date.now() - Number(parsed.ts) > 10 * 60 * 1000) return null;
    return parsed;
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const stateParam = request.nextUrl.searchParams.get("state");
  const error = request.nextUrl.searchParams.get("error");

  if (error) {
    return NextResponse.redirect(`${ADMIN_ACCOUNTS_URL}?error=${error}`);
  }

  if (!code || !stateParam) {
    return NextResponse.redirect(`${ADMIN_ACCOUNTS_URL}?error=missing_params`);
  }

  const stateData = verifyState(stateParam);
  if (!stateData) {
    return NextResponse.redirect(`${ADMIN_ACCOUNTS_URL}?error=invalid_state`);
  }

  const brandId = stateData.brand_id || "eastern-lm";

  // Exchange code for tokens
  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_OAUTH_CLIENT_ID!,
      client_secret: process.env.GOOGLE_OAUTH_CLIENT_SECRET!,
      redirect_uri: REDIRECT_URI,
      grant_type: "authorization_code",
    }),
  });

  if (!tokenRes.ok) {
    console.error("[OAuth callback] Token exchange failed:", await tokenRes.text());
    return NextResponse.redirect(`${ADMIN_ACCOUNTS_URL}?error=token_exchange_failed`);
  }

  const tokens = await tokenRes.json();
  const { access_token, refresh_token, id_token } = tokens;

  if (!refresh_token) {
    console.error("[OAuth callback] No refresh_token returned — user may need to revoke and reconnect");
    return NextResponse.redirect(`${ADMIN_ACCOUNTS_URL}?error=no_refresh_token`);
  }

  // Extract email from id_token (JWT decode, no verification needed — we trust Google's token endpoint)
  let email = "";
  if (id_token) {
    try {
      const payload = JSON.parse(Buffer.from(id_token.split(".")[1], "base64url").toString());
      email = payload.email || "";
    } catch {
      // Non-fatal
    }
  }

  // Encrypt refresh token
  const encryptedToken = encryptRefreshToken(refresh_token);

  // Upsert into mktg_google_accounts
  const supabase = getSupabaseAdminClient();

  const { error: upsertError } = await (supabase as any)
    .from("mktg_google_accounts")
    .update({
      refresh_token_encrypted: encryptedToken,
      connected_by_email: email,
      connected_at: new Date().toISOString(),
      revoked_at: null,
    })
    .eq("brand_id", brandId);

  if (upsertError) {
    console.error("[OAuth callback] DB upsert failed:", upsertError.message);
    return NextResponse.redirect(`${ADMIN_ACCOUNTS_URL}?error=db_error`);
  }

  // Write audit log
  await (supabase as any).from("mktg_agent_actions").insert({
    brand_id: brandId,
    agent_name: "oauth",
    action: "connect",
    payload: { email, scopes: tokens.scope },
    status: "success",
    triggered_by: email,
  });

  return NextResponse.redirect(`${ADMIN_ACCOUNTS_URL}?success=1`);
}
