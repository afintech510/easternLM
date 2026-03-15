export const dynamic = "force-dynamic";

import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { CacheList } from "@/components/admin/cache/cache-list";

function tryGetAdmin() {
  try {
    return getSupabaseAdminClient();
  } catch {
    return null;
  }
}

export default async function AdminCachePage() {
  const supabase = tryGetAdmin();
  let entries: Array<Record<string, unknown>> = [];

  if (supabase) {
    const { data } = await supabase
      .from("delivery_fee_cache")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);
    entries = (data as Array<Record<string, unknown>>) ?? [];
  }

  return (
    <div className="space-y-6">
      <h1 className="[font-family:var(--font-display)] text-3xl text-primary">Delivery Fee Cache</h1>
      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      <CacheList initialEntries={entries as any} />
    </div>
  );
}
