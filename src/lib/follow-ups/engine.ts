/**
 * Follow-up engine — scheduling, processing, and sending review requests.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { sendSms } from "@/lib/sms";

// ─── Template rendering ──────────────────────────────────────────

export function renderTemplate(
  template: string,
  variables: Record<string, string>,
): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => variables[key] || "");
}

// ─── Schedule follow-ups for a delivered order ────────────────────

export async function scheduleFollowUps(
  supabase: SupabaseClient,
  order: {
    id: string;
    customer_name?: string | null;
    customer_email?: string | null;
    customer_phone?: string | null;
    delivery_address?: string | null;
  },
): Promise<{ scheduled: number; skipped: number }> {
  // Check global toggle
  const { data: settings } = await supabase
    .from("site_settings")
    .select("follow_up_enabled, google_review_url, follow_up_timezone")
    .eq("id", 1)
    .single();

  if (!settings?.follow_up_enabled) return { scheduled: 0, skipped: 0 };

  // Get active templates for order_delivered
  const { data: templates } = await supabase
    .from("follow_up_templates")
    .select("*")
    .eq("is_active", true)
    .eq("trigger_event", "order_delivered")
    .order("sort_order");

  if (!templates || templates.length === 0) return { scheduled: 0, skipped: 0 };

  // Find customer
  const phone = order.customer_phone?.replace(/\D/g, "") || null;
  const email = order.customer_email || null;

  if (!phone && !email) return { scheduled: 0, skipped: 0 };

  // Skip internal numbers
  const EXCLUDED_PHONES = new Set(["6318746244", "6313958283"]);
  if (phone && EXCLUDED_PHONES.has(phone)) return { scheduled: 0, skipped: 0 };

  // Find or skip customer
  let customerId: string | null = null;
  if (phone) {
    const { data: cust } = await supabase.from("customers").select("id, opted_in_sms, opted_in_email").eq("phone", phone).maybeSingle();
    if (cust) customerId = cust.id;
  }

  let scheduled = 0;
  let skipped = 0;
  const tz = settings.follow_up_timezone || "America/New_York";

  for (const template of templates) {
    // Skip SMS if no phone, skip email if no email
    if (template.channel === "sms" && !phone) { skipped++; continue; }
    if (template.channel === "email" && !email) { skipped++; continue; }

    // Check cooldown
    if (customerId) {
      const cooldownDate = new Date();
      cooldownDate.setDate(cooldownDate.getDate() - template.cooldown_days);
      const { count } = await supabase
        .from("follow_ups")
        .select("id", { count: "exact", head: true })
        .eq("customer_id", customerId)
        .eq("template_slug", template.slug)
        .in("status", ["sent", "delivered"])
        .gte("sent_at", cooldownDate.toISOString());
      if ((count ?? 0) >= template.max_sends_per_customer) { skipped++; continue; }
    }

    // Calculate scheduled time
    let scheduledAt = new Date(Date.now() + template.delay_minutes * 60 * 1000);

    // Respect send window (9 AM - 8 PM ET)
    const etHour = getHourInTimezone(scheduledAt, tz);
    if (etHour < template.send_window_start) {
      // Push to start of window today
      scheduledAt = setHourInTimezone(scheduledAt, template.send_window_start, tz);
    } else if (etHour >= template.send_window_end) {
      // Push to start of window next day
      scheduledAt.setDate(scheduledAt.getDate() + 1);
      scheduledAt = setHourInTimezone(scheduledAt, template.send_window_start, tz);
    }

    await supabase.from("follow_ups").insert({
      order_id: order.id,
      customer_id: customerId,
      phone: template.channel === "sms" ? phone : null,
      email: template.channel === "email" ? email : null,
      customer_name: order.customer_name || "Customer",
      template_slug: template.slug,
      channel: template.channel,
      scheduled_at: scheduledAt.toISOString(),
      status: "pending",
      metadata: { google_review_url: settings.google_review_url || "" },
    });

    scheduled++;
  }

  return { scheduled, skipped };
}

// ─── Process pending follow-ups ───────────────────────────────────

export async function processFollowUps(
  supabase: SupabaseClient,
): Promise<{ sent: number; failed: number; skipped: number }> {
  // Check global toggle
  const { data: settings } = await supabase
    .from("site_settings")
    .select("follow_up_enabled, google_review_url")
    .eq("id", 1)
    .single();

  if (!settings?.follow_up_enabled) return { sent: 0, failed: 0, skipped: 0 };

  // Get pending follow-ups that are due
  const { data: pending } = await supabase
    .from("follow_ups")
    .select("*, follow_up_templates:template_slug(sms_body, email_subject, email_body_html)")
    .eq("status", "pending")
    .lte("scheduled_at", new Date().toISOString())
    .order("scheduled_at")
    .limit(20); // Process in batches

  if (!pending || pending.length === 0) return { sent: 0, failed: 0, skipped: 0 };

  let sent = 0, failed = 0, skipped = 0;

  for (const followUp of pending) {
    try {
      // Build variables
      const reviewUrl = `${process.env.NEXT_PUBLIC_SITE_URL || "https://easternlm.com"}/api/review/redirect?id=${followUp.id}`;
      const unsubUrl = `${process.env.NEXT_PUBLIC_SITE_URL || "https://easternlm.com"}/api/unsubscribe?id=${followUp.customer_id}`;

      const variables: Record<string, string> = {
        customer_name: followUp.customer_name || "Customer",
        product_summary: (followUp.metadata as Record<string, string>)?.product_summary || "your materials",
        review_url: reviewUrl,
        unsubscribe_url: unsubUrl,
      };

      if (followUp.channel === "sms" && followUp.phone) {
        const template = (followUp as Record<string, unknown>).follow_up_templates as Record<string, string> | null;
        const body = renderTemplate(template?.sms_body || "", variables);
        const result = await sendSmsViaApi(followUp.phone, body);

        if ("error" in result) {
          await supabase.from("follow_ups").update({ status: "failed", error_message: result.error }).eq("id", followUp.id);
          failed++;
        } else {
          await supabase.from("follow_ups").update({ status: "sent", sent_at: new Date().toISOString(), sms_sid: result.sid }).eq("id", followUp.id);
          sent++;
        }
      } else if (followUp.channel === "email" && followUp.email) {
        const template = (followUp as Record<string, unknown>).follow_up_templates as Record<string, string> | null;
        const subject = renderTemplate(template?.email_subject || "", variables);
        const html = renderTemplate(template?.email_body_html || "", variables);
        const result = await sendEmailViaResend(followUp.email, subject, html);

        if ("error" in result) {
          await supabase.from("follow_ups").update({ status: "failed", error_message: result.error }).eq("id", followUp.id);
          failed++;
        } else {
          await supabase.from("follow_ups").update({ status: "sent", sent_at: new Date().toISOString(), email_id: result.id }).eq("id", followUp.id);
          sent++;
        }
      } else {
        skipped++;
      }
    } catch (err) {
      await supabase.from("follow_ups").update({ status: "failed", error_message: err instanceof Error ? err.message : "Unknown error" }).eq("id", followUp.id);
      failed++;
    }
  }

  return { sent, failed, skipped };
}

// sendSmsViaApi delegates to the unified sendSms (RingCentral primary, Twilio fallback)
async function sendSmsViaApi(
  to: string,
  body: string,
): Promise<{ sid: string } | { error: string }> {
  const result = await sendSms(to, body);
  if (result.ok) return { sid: result.messageId ?? "sent" };
  return { error: result.error ?? "SMS failed" };
}

// ─── Email via Resend ─────────────────────────────────────────────

async function sendEmailViaResend(
  to: string,
  subject: string,
  html: string,
): Promise<{ id: string } | { error: string }> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;
  if (!apiKey || !from) return { error: "Resend not configured" };

  try {
    const { Resend } = await import("resend");
    const resend = new Resend(apiKey);
    const { data, error } = await resend.emails.send({ from, to, subject, html });
    if (error) return { error: error.message };
    return { id: data?.id || "sent" };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Email failed" };
  }
}

// ─── Timezone helpers ─────────────────────────────────────────────

function getHourInTimezone(date: Date, tz: string): number {
  try {
    const str = date.toLocaleString("en-US", { timeZone: tz, hour: "numeric", hour12: false });
    return parseInt(str, 10);
  } catch {
    return date.getUTCHours() - 5; // Fallback to ET
  }
}

function setHourInTimezone(date: Date, hour: number, tz: string): Date {
  const result = new Date(date);
  const currentHour = getHourInTimezone(result, tz);
  const diff = hour - currentHour;
  result.setHours(result.getHours() + diff);
  result.setMinutes(0, 0, 0);
  return result;
}
