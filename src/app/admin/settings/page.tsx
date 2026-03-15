export const dynamic = "force-dynamic";

import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { SettingsForm } from "@/components/admin/settings/settings-form";
import { FeeTest } from "@/components/admin/settings/fee-test";

function tryGetAdmin() {
  try {
    return getSupabaseAdminClient();
  } catch {
    return null;
  }
}

export default async function AdminSettingsPage() {
  const supabase = tryGetAdmin();
  let settings = null;

  if (supabase) {
    const { data } = await supabase.from("site_settings").select("*").eq("id", 1).single();
    settings = data;
  }

  return (
    <div className="space-y-6">
      <h1 className="[font-family:var(--font-display)] text-3xl text-primary">Settings</h1>
      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        <div>
          {settings ? (
            /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
            <SettingsForm initialSettings={settings as any} />
          ) : (
            <p className="text-muted-foreground">Could not load settings.</p>
          )}
        </div>
        <FeeTest />
      </div>
    </div>
  );
}
