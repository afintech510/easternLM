import { decryptRefreshToken } from "./crypto";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

const BASE = "https://merchantapi.googleapis.com";

async function getAccessToken(): Promise<string> {
  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;
  if (!clientId || !clientSecret) throw new Error("Google OAuth credentials not set");

  let refreshToken = process.env.GOOGLE_ADS_REFRESH_TOKEN;
  if (!refreshToken) {
    const supabase = getSupabaseAdminClient();
    const { data: account } = await (supabase as any)
      .from("mktg_google_accounts")
      .select("refresh_token_encrypted")
      .eq("brand_id", "eastern-lm")
      .single();
    if (!account?.refresh_token_encrypted) throw new Error("No refresh token");
    refreshToken = decryptRefreshToken(account.refresh_token_encrypted);
  }

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken!,
      grant_type: "refresh_token",
    }),
  });

  if (!res.ok) throw new Error(`Token refresh failed: ${await res.text()}`);
  const { access_token } = await res.json();
  return access_token;
}

async function merchantFetch(path: string, options: RequestInit = {}): Promise<any> {
  const token = await getAccessToken();
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...options.headers,
    },
  });
  const body = await res.json().catch(() => null);
  if (!res.ok) {
    const msg = body?.error?.message || `HTTP ${res.status}`;
    throw new Error(`Merchant API: ${msg}`);
  }
  return body;
}

export async function listMerchantProducts(merchantId: string): Promise<any[]> {
  const result = await merchantFetch(
    `/products/v1/accounts/${merchantId}/products?pageSize=250`
  );
  return result.products || [];
}
