import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { z } from "zod";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { createServiceLead, logLeadActivity } from "@/lib/leads/engine";
import { HOLIDAY_LIGHTS, SMS_CONSENT_TEXT } from "@/config/holiday-lights";
import { DAY_MS, getClientIp, hashIp, rateLimit, retryAfterHeaders } from "@/lib/rate-limit";
import {
  deliverResultOnce,
  getDesignByToken,
  toPublicStatus,
  updateDesign,
} from "@/lib/holiday-lights/designs";
import { STYLE_LABELS, summarizeExtras } from "@/lib/holiday-lights/visualize";

export const runtime = "nodejs";

const schema = z.object({
  name: z.string().trim().min(1, "Enter your first name.").max(60),
  phone: z
    .string()
    .transform((v) => v.replace(/\D/g, "").replace(/^1(?=\d{10})/, ""))
    .refine((v) => v.length === 10, "Enter a 10-digit mobile number."),
  email: z.string().trim().email().max(200).optional().or(z.literal("")),
  consent: z.literal(true, { message: "Check the box so we can text your design." }),
});

/** A lead for the same phone in the last 7 days is reused (no duplicate staff email). */
const DEDUPE_MS = 7 * DAY_MS;
const MAX_UNLOCKS_PER_PHONE_PER_DAY = 3;

/** POST {name, phone, consent, email?} → creates/links the lead and reveals the full image. */
export async function POST(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const parsed = schema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Check your details." }, { status: 400 });
  }
  const { name, phone, consent } = parsed.data;
  const email = parsed.data.email || undefined;

  const design = await getDesignByToken(token);
  if (!design) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (design.unlocked_at) return NextResponse.json(toPublicStatus(design));

  const ip = getClientIp(request);
  const limit = rateLimit(`unlock:ip:${hashIp(ip)}`, 10, DAY_MS);
  if (!limit.ok) return NextResponse.json({ error: "Too many tries today." }, { status: 429, headers: retryAfterHeaders(limit) });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = getSupabaseAdminClient() as any;

  // Guardrail: 3 unlocked previews per phone per rolling 24h.
  const { count: phoneCount } = await supabase
    .from("holiday_light_designs")
    .select("id", { count: "exact", head: true })
    .eq("phone", phone)
    .gte("unlocked_at", new Date(Date.now() - DAY_MS).toISOString());
  if ((phoneCount ?? 0) >= MAX_UNLOCKS_PER_PHONE_PER_DAY) {
    return NextResponse.json(
      { error: "You've made 3 previews today. Call or text us and we'll design the rest with you." },
      { status: 429 },
    );
  }
  const gclid = design.gclid ?? (await cookies()).get("elm_gclid")?.value ?? null;
  const styleLabel = design.visualizer_style ? (STYLE_LABELS[design.visualizer_style] ?? design.visualizer_style) : null;
  const extrasText = summarizeExtras(design.build?.extras as Parameters<typeof summarizeExtras>[0]);

  // Lead: reuse a recent holiday-lights lead for this phone, otherwise create one.
  let leadId: string | null = null;
  let customerId: string | null = null;
  let isNewLead = false;
  try {
    const { data: existing } = await supabase
      .from("service_leads")
      .select("id, customer_id")
      .eq("phone", phone)
      .eq("service_type", "christmas-lights")
      .gte("created_at", new Date(Date.now() - DEDUPE_MS).toISOString())
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existing) {
      leadId = existing.id;
      customerId = existing.customer_id;
      await logLeadActivity(existing.id, "note", `Used the AI visualizer again (${styleLabel ?? "style"})`, { design_token: token });
    } else {
      const lead = await createServiceLead({
        name,
        phone,
        email,
        service_type: "christmas-lights",
        source: "holiday_lights_visualizer",
        source_detail: design.visualizer_style ?? undefined,
        description: `${HOLIDAY_LIGHTS.brand} AI visualizer${styleLabel ? ` — ${styleLabel}` : ""}${extrasText ? `; ${extrasText}` : ""}`,
        metadata: { holiday_design_token: token, utm: design.utm ?? {}, gclid },
      });
      leadId = lead.id;
      customerId = lead.customer_id ?? null;
      isNewLead = true;
    }
  } catch (err) {
    // Never block the reveal on CRM problems; staff still get the design row.
    console.error("[holiday-lights] lead create failed:", err);
  }

  await supabase
    .from("sms_consent_log")
    .insert({
      phone,
      email: email ?? null,
      name,
      consent_given: consent,
      consent_source: "holiday_lights_visualizer",
      consent_text: SMS_CONSENT_TEXT,
      ip_address: ip === "unknown" ? null : ip,
      user_agent: request.headers.get("user-agent"),
    })
    .then(
      () => undefined,
      () => undefined,
    );

  let updated = await updateDesign(design.id, {
    name,
    phone,
    email: email ?? null,
    sms_consent: consent,
    unlocked_at: new Date().toISOString(),
    lead_id: leadId,
    customer_id: customerId,
    gclid,
    notify_staff: isNewLead,
  });
  updated = await deliverResultOnce(updated);

  return NextResponse.json(toPublicStatus(updated));
}
