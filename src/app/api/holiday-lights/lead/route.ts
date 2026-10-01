import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { z } from "zod";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { createServiceLead } from "@/lib/leads/engine";
import { sendSms } from "@/lib/sms";
import { HOLIDAY_LIGHTS, SMS_CONSENT_TEXT } from "@/config/holiday-lights";
import { DAY_MS, getClientIp, hashIp, rateLimit, retryAfterHeaders } from "@/lib/rate-limit";
import { emailStaff, escapeHtml, formatPhone } from "@/lib/holiday-lights/notify";

export const runtime = "nodejs";

const utmSchema = z.record(z.string(), z.string().max(300)).optional();

const waitlistSchema = z.object({
  kind: z.literal("waitlist"),
  contact: z.string().trim().min(3).max(200),
  utm: utmSchema,
});

const reserveSchema = z.object({
  kind: z.literal("reserve"),
  name: z.string().trim().min(1, "Enter your first name.").max(60),
  phone: z
    .string()
    .transform((v) => v.replace(/\D/g, "").replace(/^1(?=\d{10})/, ""))
    .refine((v) => v.length === 10, "Enter a 10-digit mobile number."),
  week: z.string().refine((w) => (HOLIDAY_LIGHTS.installWeeks as readonly string[]).includes(w), "Choose a week."),
  consent: z.literal(true, { message: "Check the box so we can text you the deposit link." }),
  utm: utmSchema,
});

const bodySchema = z.discriminatedUnion("kind", [waitlistSchema, reserveSchema]);

/**
 * Slice-1 lead capture for the landing page:
 *  - kind:'waitlist' → outside-the-area waitlist (phone or email)
 *  - kind:'reserve'  → "Reserve my install week" until Quick Reserve checkout ships.
 *    Redirects to HOLIDAY_DEPOSIT_URL (a $199 Stripe Payment Link) when set,
 *    otherwise texts the customer that we'll send the deposit link.
 */
export async function POST(request: Request) {
  const ip = getClientIp(request);
  const limit = rateLimit(`hl-lead:ip:${hashIp(ip)}`, 10, DAY_MS);
  if (!limit.ok) return NextResponse.json({ error: "Too many tries today." }, { status: 429, headers: retryAfterHeaders(limit) });

  const parsed = bodySchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Check your details." }, { status: 400 });
  }
  const body = parsed.data;
  const gclid = (await cookies()).get("elm_gclid")?.value ?? null;
  const metadata = { utm: body.utm ?? {}, gclid };

  if (body.kind === "waitlist") {
    const digits = body.contact.replace(/\D/g, "").replace(/^1(?=\d{10})/, "");
    const isEmail = body.contact.includes("@");
    if (!isEmail && digits.length !== 10) {
      return NextResponse.json({ error: "Enter a mobile number or email." }, { status: 400 });
    }
    try {
      await createServiceLead({
        name: "Holiday lights waitlist",
        phone: isEmail ? "" : digits,
        email: isEmail ? body.contact.toLowerCase() : undefined,
        service_type: "christmas-lights",
        source: "holiday_lights_waitlist",
        description: `${HOLIDAY_LIGHTS.brand} waitlist (outside service area)`,
        priority: "low",
        metadata,
      });
    } catch (err) {
      console.error("[holiday-lights] waitlist lead failed:", err);
      return NextResponse.json({ error: "Couldn't add you. Try again." }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  }

  // Reserve request
  const depositUrl = process.env.HOLIDAY_DEPOSIT_URL?.trim() || null;
  let leadId: string | null = null;
  try {
    const lead = await createServiceLead({
      name: body.name,
      phone: body.phone,
      service_type: "christmas-lights",
      source: "holiday_lights_reserve",
      source_detail: body.week,
      description: `${HOLIDAY_LIGHTS.brand}: reserve install week ${body.week} ($${HOLIDAY_LIGHTS.pricing.depositCents / 100} deposit)`,
      priority: "high",
      timeline: "asap",
      metadata: { ...metadata, install_week: body.week },
    });
    leadId = lead.id;
  } catch (err) {
    console.error("[holiday-lights] reserve lead failed:", err);
    return NextResponse.json({ error: "Couldn't save your request. Call us instead." }, { status: 500 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (getSupabaseAdminClient() as any)
    .from("sms_consent_log")
    .insert({
      phone: body.phone,
      name: body.name,
      consent_given: true,
      consent_source: "holiday_lights_reserve",
      consent_text: SMS_CONSENT_TEXT,
      ip_address: ip === "unknown" ? null : ip,
      user_agent: request.headers.get("user-agent"),
    })
    .then(
      () => undefined,
      () => undefined,
    );

  emailStaff(
    `🎄 Holiday Lights reserve request — ${body.name} (${formatPhone(body.phone)}), ${body.week}`,
    `<div style="font-family:system-ui,sans-serif;max-width:520px;">
      <h2 style="color:#b3122b;margin:0 0 12px;">🎄 Reserve-my-week request</h2>
      <p><b>${escapeHtml(body.name)}</b> · <a href="tel:+1${body.phone}">${formatPhone(body.phone)}</a><br/>Week: <b>${escapeHtml(body.week)}</b></p>
      <p>${depositUrl ? "They were sent to the $199 deposit payment link." : "<b>Text them the $199 deposit link.</b> (HOLIDAY_DEPOSIT_URL isn't set.)"}</p>
    </div>`,
  ).catch((e) => console.warn("[holiday-lights] staff email failed:", e));

  if (depositUrl) {
    const url = new URL(depositUrl);
    if (leadId) url.searchParams.set("client_reference_id", leadId);
    return NextResponse.json({ ok: true, depositUrl: url.toString() });
  }

  await sendSms(
    body.phone,
    `${HOLIDAY_LIGHTS.shortBrand}: Thanks ${body.name}! We got your request for the week of ${body.week}. We'll text you the $${HOLIDAY_LIGHTS.pricing.depositCents / 100} deposit link shortly to lock it in. Reply STOP to opt out.`,
  ).catch(() => undefined);
  return NextResponse.json({ ok: true, depositUrl: null });
}
