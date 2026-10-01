import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { randomUUID } from "crypto";
import Stripe from "stripe";
import { z } from "zod";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { createServiceLead } from "@/lib/leads/engine";
import { HOLIDAY_LIGHTS, SMS_CONSENT_TEXT, getSiteOrigin, isEarlyBirdActive } from "@/config/holiday-lights";
import { DAY_MS, getClientIp, hashIp, rateLimit, retryAfterHeaders } from "@/lib/rate-limit";
import { newToken } from "@/lib/holiday-lights/designs";
import { listInstallWeeks } from "@/lib/holiday-lights/bookings";
import { isInServiceArea } from "@/lib/holiday-lights/service-area";
import { normalizeBuild, priceBuild, summarizeBuild } from "@/lib/holiday-lights/pricing";

export const runtime = "nodejs";

const schema = z.object({
  build: z.unknown().nullable().optional(),
  weekId: z.string().uuid("Choose an install week."),
  contact: z.object({
    name: z.string().trim().min(1, "Enter your first name.").max(80),
    phone: z
      .string()
      .transform((v) => v.replace(/\D/g, "").replace(/^1(?=\d{10})/, ""))
      .refine((v) => v.length === 10, "Enter a 10-digit mobile number."),
    email: z.string().trim().email("Check your email address.").max(200).optional().or(z.literal("")),
    address: z.string().trim().min(5, "Enter your street address.").max(200),
    zip: z.string().trim().regex(/^\d{5}$/, "Enter a 5-digit ZIP."),
  }),
  consent: z.literal(true, { message: "Check the box so we can text you about your booking." }),
  utm: z.record(z.string(), z.string().max(300)).optional(),
  website: z.string().optional(),
});

/**
 * POST → Build & Book (build set) or Quick Reserve (build null).
 * Server recalculates the price, holds the week, creates the lead + booking row and
 * a $199 Stripe Checkout that saves the card for the install-day balance.
 * The Stripe webhook (metadata.type = holiday_lights_deposit) confirms the seat.
 */
export async function POST(request: Request) {
  const ip = getClientIp(request);
  const limit = rateLimit(`hl-book:ip:${hashIp(ip)}`, 10, DAY_MS);
  if (!limit.ok) return NextResponse.json({ error: "Too many tries today. Call us to book." }, { status: 429, headers: retryAfterHeaders(limit) });

  const parsed = schema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Check your details.", code: "validation" }, { status: 400 });
  }
  const body = parsed.data;
  if (body.website && body.website.trim() !== "") {
    return NextResponse.json({ error: "Booking failed. Call us to book.", code: "validation" }, { status: 400 });
  }
  const { contact } = body;
  const email = contact.email || undefined;

  // Service area (geocode first, ZIP fallback). Only block when we're confident.
  const fullAddress = `${contact.address}, NY ${contact.zip}`;
  const area = await isInServiceArea(fullAddress);
  if (!area.inArea && area.method !== "none") {
    return NextResponse.json(
      {
        error: `Sorry, we install in the Towns of ${HOLIDAY_LIGHTS.towns.join(", ").replace(/, ([^,]*)$/, " and $1")}. Join the waitlist and we'll tell you if we expand.`,
        code: "out_of_area",
      },
      { status: 422 },
    );
  }

  // Capacity (paid seats + live checkout holds).
  const weeks = await listInstallWeeks();
  const week = weeks.find((w) => w.id === body.weekId);
  if (!week) return NextResponse.json({ error: "Choose an install week.", code: "validation" }, { status: 400 });
  if (week.remaining <= 0) {
    return NextResponse.json({ error: `${week.label} just filled up. Pick another week.`, code: "week_full" }, { status: 409 });
  }

  const earlyBird = isEarlyBirdActive();
  const build = body.build ? normalizeBuild(body.build) : null;
  const price = build ? priceBuild(build, { earlyBird }) : null;
  const summary = build ? summarizeBuild(build) : "Quick reserve (design + price with our team)";
  const gclid = (await cookies()).get("elm_gclid")?.value ?? null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = getSupabaseAdminClient() as any;

  // Lead (deposit pending until the webhook confirms it).
  let leadId: string | null = null;
  let customerId: string | null = null;
  try {
    const lead = await createServiceLead({
      name: contact.name,
      phone: contact.phone,
      email,
      address: contact.address,
      town: area.town ?? undefined,
      zip: contact.zip,
      service_type: "christmas-lights",
      source: "holiday_lights_booking",
      source_detail: week.label,
      priority: "high",
      timeline: "asap",
      estimated_value_cents: price?.preTaxCents,
      description: `${HOLIDAY_LIGHTS.brand} booking, week ${week.label}: ${summary}${price ? ` — est. $${(price.totalCents / 100).toFixed(2)} incl. tax` : ""}. $199 deposit pending.`,
      metadata: { utm: body.utm ?? {}, gclid, install_week: week.label, build, price },
    });
    leadId = lead.id;
    customerId = lead.customer_id ?? null;
  } catch (err) {
    console.error("[holiday-lights] booking lead failed:", err);
  }

  await supabase
    .from("sms_consent_log")
    .insert({
      phone: contact.phone,
      email: email ?? null,
      name: contact.name,
      consent_given: true,
      consent_source: "holiday_lights_booking",
      consent_text: SMS_CONSENT_TEXT,
      ip_address: ip === "unknown" ? null : ip,
      user_agent: request.headers.get("user-agent"),
    })
    .then(() => undefined, () => undefined);

  const id = randomUUID();
  const token = newToken();
  const { error: insertError } = await supabase.from("holiday_light_designs").insert({
    id,
    token,
    kind: build ? "build" : "quick_reserve",
    name: contact.name,
    phone: contact.phone,
    email: email ?? null,
    sms_consent: true,
    address: contact.address,
    zip: contact.zip,
    town: area.town,
    lat: area.lat,
    lng: area.lng,
    service_area: { inArea: area.inArea, method: area.method, town: area.town },
    build,
    price_breakdown: price,
    estimate_cents: price?.totalCents ?? null,
    early_bird_applied: earlyBird,
    install_week_id: week.id,
    booking_status: "pending_deposit",
    deposit_cents: HOLIDAY_LIGHTS.pricing.depositCents,
    lead_id: leadId,
    customer_id: customerId,
    utm: body.utm ?? {},
    gclid,
    ip_hash: hashIp(ip),
  });
  if (insertError) {
    console.error("[holiday-lights] booking insert failed:", insertError);
    return NextResponse.json({ error: "Couldn't save your booking. Call us to book." }, { status: 500 });
  }

  const origin = getSiteOrigin();
  try {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "usd",
            unit_amount: HOLIDAY_LIGHTS.pricing.depositCents,
            product_data: {
              name: `${HOLIDAY_LIGHTS.brand} — install deposit`,
              description: `Install week ${week.label}. Credited to your job. ${summary}`.slice(0, 480),
            },
          },
        },
      ],
      customer_creation: "always",
      ...(email ? { customer_email: email } : {}),
      payment_intent_data: {
        setup_future_usage: "off_session",
        description: `${HOLIDAY_LIGHTS.brand} deposit — ${contact.name} — ${week.label}`,
        metadata: { type: "holiday_lights_deposit", design_id: id },
      },
      metadata: { type: "holiday_lights_deposit", design_id: id, week_id: week.id, lead_id: leadId ?? "" },
      client_reference_id: id,
      success_url: `${origin}${HOLIDAY_LIGHTS.path}/booked?t=${token}`,
      cancel_url: `${origin}${HOLIDAY_LIGHTS.path}/book?canceled=1`,
      expires_at: Math.floor(Date.now() / 1000) + 31 * 60,
    });
    await supabase.from("holiday_light_designs").update({ stripe_checkout_session_id: session.id }).eq("id", id);
    return NextResponse.json({ url: session.url, token });
  } catch (err) {
    console.error("[holiday-lights] checkout create failed:", err);
    await supabase.from("holiday_light_designs").update({ booking_status: "canceled" }).eq("id", id);
    return NextResponse.json({ error: "Payment page didn't open. Try again or call us." }, { status: 502 });
  }
}
