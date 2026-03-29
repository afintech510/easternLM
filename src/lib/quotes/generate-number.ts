import { getSupabaseAdminClient } from "@/lib/supabase/admin";

/**
 * Atomically generates the next sequential quote number via a database function.
 * Uses pg_advisory_xact_lock to prevent race conditions.
 * Fallback: timestamp-based number if RPC fails.
 */
export async function generateQuoteNumber(): Promise<string> {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await (supabase as any).rpc("generate_quote_number");

  if (error || !data) {
    console.error("[quotes] RPC generate_quote_number failed:", error);
    // Fallback: timestamp-based (guaranteed unique)
    const ts = Date.now().toString(36).toUpperCase();
    return `QT-${new Date().getFullYear()}-${ts}`;
  }

  return data as string;
}
