import type Stripe from "stripe";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { sendSms } from "@/lib/sms";
import { logLeadActivity } from "@/lib/leads/engine";
import { HOLIDAY_LIGHTS, getSiteOrigin } from "@/config/holiday-lights";
import { summarizeBuild, type BuildInput, type PriceBreakdown } from "./pricing";
import { emailStaff, escapeHtml, formatPhone } from "./notify";

/** Install-week capacity + $199 deposit bookings (Build & Book / Quick Reserve). */

/** An unpaid checkout holds its spot this long (Stripe sessions expire after 31 min). */
export const HOLD_MINUTES = 35;

export type InstallWeek = { id: string; label: string; weekStart: string; capacity: number; remaining: number };

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function db(): any {
  return getSupabaseAdminClient();
}

export function remainingSpots(capacity: number, reserved: number, holds: number): number {
  return Math.max(0, capacity - reserved - holds);
}

export async function listInstallWeeks(): Promise<InstallWeek[]> {
  const [{ data: weeks, error }, { data: holds }] = await Promise.all([
    db().from("holiday_install_weeks").select("id, label, week_start, capacity, reserved").eq("active", true).order("week_start"),
    db()
      .from("holiday_light_designs")
      .select("install_week_id")
      .eq("booking_status", "pending_deposit")
      .gte("created_at", new Date(Date.now() - HOLD_MINUTES * 60_000).toISOString()),
  ]);
  if (error) throw new Error(error.message);
  const holdCount = new Map<string, number>();
  for (const h of (holds ?? []) as { install_week_id: string | null }[]) {
    if (h.install_week_id) holdCount.set(h.install_week_id, (holdCount.get(h.install_week_id) ?? 0) + 1);
  }
  return ((weeks ?? []) as { id: string; label: string; week_start: string; capacity: number; reserved: number }[]).map((w) => ({
    id: w.id,
    label: w.label,
    weekStart: w.week_start,
    capacity: w.capacity,
    remaining: remainingSpots(w.capacity, w.reserved, holdCount.get(w.id) ?? 0),
  }));
}

/** Total open spots across the season (for the "N of 75 left" banner). */
export async function seasonSpotsLeft(): Promise<number | null> {
  try {
    const weeks = await listInstallWeeks();
    return weeks.reduce((s, w) => s + w.remaining, 0);
  } catch {
    return null;
  }
}

type BookingRow = {
  id: string;
  token: string;
  kind: string;
  name: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  zip: string | null;
  build: BuildInput | null;
  price_breakdown: PriceBreakdown | null;
  estimate_cents: number | null;
  install_week_id: string | null;
  booking_status: string | null;
  lead_id: string | null;
  sms_consent: boolean;
};

const money = (c: number) => `$${(c / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/**
 * Stripe webhook branch for metadata.type === "holiday_lights_deposit".
 * Idempotent: a booking that's already reserved is left alone.
 */
export async function handleHolidayDepositCompleted(session: Stripe.Checkout.Session, stripe: Stripe): Promise<void> {
  const designId = session.metadata?.design_id ?? session.client_reference_id;
  if (!designId) return;
  if (session.payment_status && session.payment_status !== "paid") return;

  const { data: row } = await db().from("holiday_light_designs").select("*").eq("id", designId).maybeSingle();
  const booking = row as BookingRow | null;
  if (!booking || booking.booking_status === "reserved") return;

  const piId = typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id ?? null;
  let paymentMethodId: string | null = null;
  if (piId) {
    try {
      const pi = await stripe.paymentIntents.retrieve(piId);
      paymentMethodId = typeof pi.payment_method === "string" ? pi.payment_method : pi.payment_method?.id ?? null;
    } catch (err) {
      console.warn("[holiday-lights] could not read deposit payment intent:", err);
    }
  }

  // Claim the transition so concurrent deliveries only count the seat once.
  const { data: claimed } = await db()
    .from("holiday_light_designs")
    .update({
      booking_status: "reserved",
      reserved_at: new Date().toISOString(),
      stripe_checkout_session_id: session.id,
      stripe_customer_id: typeof session.customer === "string" ? session.customer : session.customer?.id ?? null,
      deposit_payment_intent_id: piId,
      stripe_payment_method_id: paymentMethodId,
      deposit_cents: session.amount_total ?? HOLIDAY_LIGHTS.pricing.depositCents,
    })
    .eq("id", booking.id)
    .neq("booking_status", "reserved")
    .select("id")
    .maybeSingle();
  if (!claimed) return;

  let weekLabel = "";
  if (booking.install_week_id) {
    await db().rpc("holiday_reserve_week", { p_week: booking.install_week_id });
    const { data: w } = await db().from("holiday_install_weeks").select("label").eq("id", booking.install_week_id).maybeSingle();
    weekLabel = w?.label ?? "";
  }

  if (booking.lead_id) {
    await db().from("service_leads").update({ status: "scheduled" }).eq("id", booking.lead_id).then(() => undefined, () => undefined);
    await logLeadActivity(booking.lead_id, "deposit_paid", `$199 deposit paid — install week ${weekLabel}`, {
      checkout_session: session.id,
    }).catch(() => undefined);
  }

  const first = (booking.name ?? "").split(" ")[0] || "there";
  if (booking.phone && booking.sms_consent) {
    await sendSms(
      booking.phone,
      `${HOLIDAY_LIGHTS.shortBrand}: You're booked, ${first}! 🎄 Install week: ${weekLabel}. Your $199 deposit is credited to your job. We'll verify your footage and text you the final price before install. Questions? ${HOLIDAY_LIGHTS.phoneDisplay}. Reply STOP to opt out.`,
    ).catch((e) => console.warn("[holiday-lights] booking SMS failed:", e));
  }

  const p = booking.price_breakdown;
  const lines = p
    ? p.lines.map((l) => `<tr><td style="padding:3px 8px;">${escapeHtml(l.label)}</td><td style="padding:3px 8px;color:#666;">${escapeHtml(l.detail)}</td><td style="padding:3px 8px;text-align:right;">${money(l.cents)}</td></tr>`).join("")
    : "";
  await emailStaff(
    `🎄 BOOKED: ${booking.name ?? "Holiday lights"} — ${weekLabel}${booking.estimate_cents ? ` — est. ${money(booking.estimate_cents)}` : ""}`,
    `<div style="font-family:system-ui,sans-serif;max-width:600px;">
      <h2 style="color:#b3122b;margin:0 0 10px;">🎄 Deposit paid — install week ${escapeHtml(weekLabel)}</h2>
      <p><b>${escapeHtml(booking.name ?? "")}</b> · <a href="tel:+1${booking.phone ?? ""}">${formatPhone(booking.phone ?? "")}</a>${booking.email ? ` · ${escapeHtml(booking.email)}` : ""}<br/>
      ${escapeHtml(booking.address ?? "")} ${escapeHtml(booking.zip ?? "")}</p>
      ${booking.build ? `<p>${escapeHtml(summarizeBuild(booking.build))}</p>` : "<p><b>Quick reserve</b> — no design yet. Call to design + price it.</p>"}
      ${p ? `<table style="border-collapse:collapse;font-size:14px;">${lines}
        ${p.minimumAdjustmentCents ? `<tr><td style="padding:3px 8px;">Minimum project adj.</td><td></td><td style="padding:3px 8px;text-align:right;">${money(p.minimumAdjustmentCents)}</td></tr>` : ""}
        ${p.earlyBirdCents ? `<tr><td style="padding:3px 8px;">Early bird</td><td></td><td style="padding:3px 8px;text-align:right;">−${money(p.earlyBirdCents)}</td></tr>` : ""}
        <tr><td style="padding:3px 8px;">Tax 8.75%</td><td></td><td style="padding:3px 8px;text-align:right;">${money(p.taxCents)}</td></tr>
        <tr><td style="padding:3px 8px;"><b>Estimated total</b></td><td></td><td style="padding:3px 8px;text-align:right;"><b>${money(p.totalCents)}</b></td></tr>
      </table>` : ""}
      <p style="color:#666;">Verify footage, then lock the price. Card saved in Stripe for the balance (customer ${escapeHtml(String(session.customer ?? ""))}).</p>
    </div>`,
  ).catch((e) => console.warn("[holiday-lights] booking email failed:", e));
}

export function bookedPageUrl(token: string) {
  return `${getSiteOrigin()}${HOLIDAY_LIGHTS.path}/booked?t=${encodeURIComponent(token)}`;
}
