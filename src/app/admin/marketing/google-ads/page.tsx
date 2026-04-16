import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { GoogleAdsAccountPanel } from "./account-panel";

export default async function GoogleAdsPage() {
  const supabase = getSupabaseAdminClient();
  const { data: account } = await (supabase as any)
    .from("mktg_google_accounts")
    .select("*")
    .eq("brand_id", "eastern-lm")
    .single();

  const isConnected = account && account.refresh_token_encrypted && !account.revoked_at;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Google Ads</h1>
        <p className="text-sm text-muted-foreground">
          Connect your Google Ads and Merchant Center accounts
        </p>
      </div>

      <GoogleAdsAccountPanel
        isConnected={!!isConnected}
        email={account?.connected_by_email || undefined}
        connectedAt={account?.connected_at || undefined}
        publishMode={account?.publish_mode || "suggest"}
        budgetCap={account?.monthly_budget_cap_cents || 200000}
        brandId="eastern-lm"
      />
    </div>
  );
}
