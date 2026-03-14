import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

/**
 * Keep-alive endpoint to prevent Supabase free tier auto-pause.
 * Should be called via cron every 5 minutes.
 *
 * If the Supabase project is paused, attempts to restore it via the
 * Management API before returning an error.
 */
export async function GET() {
  const supabase = getSupabaseAdminClient();

  try {
    const { error } = await supabase.from("site_settings").select("id").limit(1);

    if (error) {
      // Possibly paused — attempt restore
      const restored = await attemptRestore();
      return NextResponse.json(
        { ok: false, detail: error.message, restoreAttempted: restored },
        { status: 503 },
      );
    }

    return NextResponse.json({ ok: true, ts: new Date().toISOString() });
  } catch (err) {
    const restored = await attemptRestore();
    return NextResponse.json(
      {
        ok: false,
        detail: err instanceof Error ? err.message : "Connection failed",
        restoreAttempted: restored,
      },
      { status: 503 },
    );
  }
}

async function attemptRestore(): Promise<boolean> {
  const projectRef = process.env.SUPABASE_PROJECT_REF;
  const accessToken = process.env.SUPABASE_ACCESS_TOKEN;

  if (!projectRef || !accessToken) return false;

  try {
    const res = await fetch(
      `https://api.supabase.com/v1/projects/${projectRef}/restore`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      },
    );
    return res.ok || res.status === 200;
  } catch {
    return false;
  }
}
