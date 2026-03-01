import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getPublicSupabaseEnv } from "@/lib/env";
import type { Database } from "@/types/database";

type BrowserClientCache = {
  client?: SupabaseClient<Database>;
};

export function getSupabaseBrowserClient() {
  const globalCache = globalThis as typeof globalThis & BrowserClientCache;

  if (globalCache.client) {
    return globalCache.client;
  }

  const { NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY } = getPublicSupabaseEnv();
  const client = createClient<Database>(NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY);

  globalCache.client = client;
  return client;
}
