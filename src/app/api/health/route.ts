import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  const checks: Record<string, { ok: boolean; detail: string }> = {};

  // 1. Supabase connectivity
  try {
    const supabase = getSupabaseAdminClient();
    const { error } = await supabase.from("site_settings").select("id").limit(1);
    checks.supabase = error
      ? { ok: false, detail: error.message }
      : { ok: true, detail: "Connected" };
  } catch (err) {
    checks.supabase = { ok: false, detail: err instanceof Error ? err.message : "Unreachable" };
  }

  // 2. Stripe reachability
  try {
    const stripeKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeKey) {
      checks.stripe = { ok: false, detail: "STRIPE_SECRET_KEY not set" };
    } else {
      const res = await fetch("https://api.stripe.com/v1/balance", {
        headers: { Authorization: `Bearer ${stripeKey}` },
      });
      checks.stripe = res.ok
        ? { ok: true, detail: "Reachable" }
        : { ok: false, detail: `HTTP ${res.status}` };
    }
  } catch (err) {
    checks.stripe = { ok: false, detail: err instanceof Error ? err.message : "Unreachable" };
  }

  // 3. Env vars check
  const requiredEnvs = [
    "NEXT_PUBLIC_SUPABASE_URL",
    "SUPABASE_SERVICE_ROLE_KEY",
    "STRIPE_SECRET_KEY",
    "GOOGLE_MAPS_API_KEY",
  ];
  const missingEnvs = requiredEnvs.filter((k) => !process.env[k]);
  checks.envVars = missingEnvs.length === 0
    ? { ok: true, detail: "All required vars set" }
    : { ok: false, detail: `Missing: ${missingEnvs.join(", ")}` };

  // 4. Optional services
  checks.resend = process.env.RESEND_API_KEY
    ? { ok: true, detail: "Configured" }
    : { ok: false, detail: "RESEND_API_KEY not set" };

  checks.stripeWebhook = process.env.STRIPE_WEBHOOK_SECRET
    ? { ok: true, detail: "Configured" }
    : { ok: false, detail: "STRIPE_WEBHOOK_SECRET not set" };

  const allOk = checks.supabase.ok && checks.stripe.ok && checks.envVars.ok;

  return NextResponse.json(
    { ok: allOk, checks, checkedAt: new Date().toISOString() },
    { status: allOk ? 200 : 503 },
  );
}
