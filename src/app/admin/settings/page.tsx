export const dynamic = "force-dynamic";

import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { SettingsTabs } from "@/components/admin/settings/settings-tabs";

function tryGetAdmin() {
  try {
    return getSupabaseAdminClient();
  } catch {
    return null;
  }
}

export default async function AdminSettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab } = await searchParams;
  const supabase = tryGetAdmin();

  const [settingsRes, trucksRes, cacheRes, staffRes] = await Promise.all([
    supabase?.from("site_settings").select("*").eq("id", 1).single(),
    supabase?.from("truck_types").select("*").order("sort_order"),
    supabase
      ?.from("delivery_fee_cache")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200),
    (supabase as any)
      ?.from("accounts")
      .select("id, full_name, role, is_active, created_at")
      .in("role", ["admin", "staff", "pos"])
      .order("role")
      .order("full_name"),
  ]);

  return (
    <SettingsTabs
      initialTab={tab ?? "general"}
      initialSettings={(settingsRes?.data as any) ?? null}
      initialTrucks={(trucksRes?.data as any[]) ?? []}
      initialCacheEntries={(cacheRes?.data as any[]) ?? []}
      initialStaff={(staffRes?.data as any[]) ?? []}
    />
  );
}
