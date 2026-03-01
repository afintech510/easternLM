import { createClient } from "@supabase/supabase-js";
import { getServerSupabaseEnv } from "@/lib/env";
import type { Database } from "@/types/database";

export function getSupabaseAdminClient() {
  const { NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = getServerSupabaseEnv();

  return createClient<Database>(NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
