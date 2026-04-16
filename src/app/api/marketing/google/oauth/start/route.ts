import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/auth";
import { createHmac, randomBytes } from "crypto";

const SCOPES = [
  "https://www.googleapis.com/auth/adwords",
  "https://www.googleapis.com/auth/content",
  "openid",
  "email",
].join(" ");

const REDIRECT_URI =
  (process.env.NEXT_PUBLIC_SITE_URL || "https://easternlm.com") +
  "/api/marketing/google/oauth/callback";

function signState(payload: Record<string, string>): string {
  const key = process.env.MKTG_ENCRYPTION_KEY;
  if (!key) throw new Error("MKTG_ENCRYPTION_KEY not set");
  const data = JSON.stringify(payload);
  const sig = createHmac("sha256", key).update(data).digest("hex");
  const encoded = Buffer.from(data).toString("base64url");
  return `${encoded}.${sig}`;
}

export async function GET(request: NextRequest) {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
  if (!clientId) {
    return NextResponse.json({ error: "GOOGLE_OAUTH_CLIENT_ID not configured" }, { status: 500 });
  }

  const brandId = request.nextUrl.searchParams.get("brand_id") || "eastern-lm";
  const nonce = randomBytes(16).toString("hex");

  const state = signState({
    brand_id: brandId,
    nonce,
    ts: Date.now().toString(),
  });

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: REDIRECT_URI,
    response_type: "code",
    scope: SCOPES,
    access_type: "offline",
    prompt: "consent",
    include_granted_scopes: "true",
    state,
  });

  return NextResponse.redirect(
    `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`
  );
}
