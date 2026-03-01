import { createClient } from "@supabase/supabase-js";
import { getPublicSupabaseEnv } from "@/lib/env";
import type { Database } from "@/types/database";

export function getSupabaseServerClient() {
  const { NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY } = getPublicSupabaseEnv();
  return createClient<Database>(NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    auth: { persistSession: false },
  });
}
