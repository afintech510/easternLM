/**
 * Campaign engine — prepare, process, and track marketing campaigns.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { resolveAudience, type AudienceFilter } from "./audience";
import { sendSms } from "@/lib/sms";

// ─── Template rendering ──────────────────────────────────────────

export function renderCampaignTemplate(
  template: string,
  customer: { first_name: string | null; last_name: string | null; city: string | null; last_order_at: string | null },
  extra: Record<string, string> = {},
): string {
  const vars: Record<string, string> = {
    customer_name: [customer.first_name, customer.last_name].filter(Boolean).join(" ") || "Customer",
    first_name: customer.first_name || "there",
    town: customer.city || "your area",
    last_order_date: customer.last_order_at ? new Date(customer.last_order_at).toLocaleDateString("en-US") : "",
    shop_url: "https://easternlm.com/shop",
    phone: "(631) 874-6244",
    ...extra,
  };
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] || "");
}

// ─── Prepare campaign (create sends for all recipients) ──────────

export async function prepareCampaign(
  supabase: SupabaseClient,
  campaignId: string,
): Promise<{ recipientCount: number; smsSends: number; emailSends: number }> {
  const { data: campaign, error } = await supabase
    .from("campaigns")
    .select("*")
    .eq("id", campaignId)
    .single();

  if (error || !campaign) throw new Error("Campaign not found");

  const filter = campaign.audience_filter as AudienceFilter;
  const { customers } = await resolveAudience(supabase, filter, campaign.channel);

  // Check for existing sends (dedup)
  const { data: existing } = await supabase
    .from("campaign_sends")
    .select("customer_id")
    .eq("campaign_id", campaignId);
  const existingIds = new Set((existing || []).map((e) => e.customer_id));

  const sends: Array<{
    campaign_id: string;
    customer_id: string;
    channel: string;
    phone: string | null;
    email: string | null;
    status: string;
  }> = [];

  for (const cust of customers) {
    if (existingIds.has(cust.id)) continue;

    if ((campaign.channel === "sms" || campaign.channel === "both") && cust.phone && cust.opted_in_sms !== false) {
      sends.push({ campaign_id: campaignId, customer_id: cust.id, channel: "sms", phone: cust.phone, email: null, status: "pending" });
    }
    if ((campaign.channel === "email" || campaign.channel === "both") && cust.email && cust.opted_in_email !== false) {
      sends.push({ campaign_id: campaignId, customer_id: cust.id, channel: "email", phone: null, email: cust.email, status: "pending" });
    }
  }

  // Batch insert
  const BATCH = 100;
  for (let i = 0; i < sends.length; i += BATCH) {
    await supabase.from("campaign_sends").insert(sends.slice(i, i + BATCH));
  }

  const smsSends = sends.filter((s) => s.channel === "sms").length;
  const emailSends = sends.filter((s) => s.channel === "email").length;

  await supabase.from("campaigns").update({ total_recipients: sends.length }).eq("id", campaignId);

  return { recipientCount: sends.length, smsSends, emailSends };
}

// ─── Process a batch of sends ─────────────────────────────────────

export async function processCampaignBatch(
  supabase: SupabaseClient,
  campaignId: string,
  batchSize: number = 50,
): Promise<{ sent: number; failed: number; remaining: number }> {
  // Check marketing enabled + quiet hours
  const { data: settings } = await supabase
    .from("site_settings")
    .select("marketing_enabled, sms_quiet_hours_start, sms_quiet_hours_end, max_sms_per_day, max_emails_per_day")
    .eq("id", 1)
    .single();

  if (!settings?.marketing_enabled) return { sent: 0, failed: 0, remaining: -1 };

  // Check quiet hours for SMS
  const etHour = new Date().toLocaleString("en-US", { timeZone: "America/New_York", hour: "numeric", hour12: false });
  const hour = parseInt(etHour, 10);
  const inQuietHours = hour >= (settings.sms_quiet_hours_start || 21) || hour < (settings.sms_quiet_hours_end || 8);

  // Get pending sends
  const { data: pending } = await supabase
    .from("campaign_sends")
    .select("*")
    .eq("campaign_id", campaignId)
    .eq("status", "pending")
    .order("created_at")
    .limit(batchSize);

  if (!pending || pending.length === 0) {
    // Mark campaign as sent
    await supabase.from("campaigns").update({ status: "sent", completed_at: new Date().toISOString() }).eq("id", campaignId);
    return { sent: 0, failed: 0, remaining: 0 };
  }

  // Load campaign for template
  const { data: campaign } = await supabase.from("campaigns").select("*").eq("id", campaignId).single();
  if (!campaign) return { sent: 0, failed: 0, remaining: pending.length };

  let sent = 0, failed = 0;

  for (const send of pending) {
    // Skip SMS during quiet hours
    if (send.channel === "sms" && inQuietHours) continue;

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://easternlm.com";
    const trackingUrl = `${siteUrl}/api/r/${send.id}`;
    const unsubUrl = `${siteUrl}/api/unsubscribe?id=${send.customer_id}`;

    // Get customer data for template rendering
    const { data: cust } = await supabase
      .from("customers")
      .select("first_name, last_name, city, last_order_at")
      .eq("id", send.customer_id)
      .single();

    const rendered = cust
      ? renderCampaignTemplate(
          send.channel === "sms" ? (campaign.sms_body || "") : (campaign.email_body_html || ""),
          cust,
          { tracking_url: trackingUrl, unsubscribe_url: unsubUrl },
        )
      : "";

    try {
      if (send.channel === "sms" && send.phone) {
        const result = await sendSms(send.phone, rendered);
        if (!result.ok) {
          await supabase.from("campaign_sends").update({ status: "failed", error_message: result.error ?? "SMS failed" }).eq("id", send.id);
          failed++;
        } else {
          await supabase.from("campaign_sends").update({ status: "sent", sent_at: new Date().toISOString(), sms_sid: result.messageId ?? "" }).eq("id", send.id);
          sent++;
        }
      } else if (send.channel === "email" && send.email) {
        const subject = cust
          ? renderCampaignTemplate(campaign.email_subject || "", cust)
          : campaign.email_subject || "";
        const result = await sendEmail(send.email, subject, rendered);
        if ("error" in result) {
          await supabase.from("campaign_sends").update({ status: "failed", error_message: result.error }).eq("id", send.id);
          failed++;
        } else {
          await supabase.from("campaign_sends").update({ status: "sent", sent_at: new Date().toISOString(), email_id: result.id }).eq("id", send.id);
          sent++;
        }
      }

      // Rate limit: small delay between sends
      if (send.channel === "sms") await sleep(1100); // ~1/sec for Twilio
    } catch (err) {
      await supabase.from("campaign_sends").update({ status: "failed", error_message: err instanceof Error ? err.message : "Unknown" }).eq("id", send.id);
      failed++;
    }
  }

  // Update campaign totals
  const { count: totalSent } = await supabase.from("campaign_sends").select("id", { count: "exact", head: true }).eq("campaign_id", campaignId).eq("status", "sent");
  const { count: totalFailed } = await supabase.from("campaign_sends").select("id", { count: "exact", head: true }).eq("campaign_id", campaignId).eq("status", "failed");
  const { count: totalClicked } = await supabase.from("campaign_sends").select("id", { count: "exact", head: true }).eq("campaign_id", campaignId).eq("link_clicked", true);
  const { count: remaining } = await supabase.from("campaign_sends").select("id", { count: "exact", head: true }).eq("campaign_id", campaignId).eq("status", "pending");

  await supabase.from("campaigns").update({
    total_sent: totalSent || 0,
    total_failed: totalFailed || 0,
    total_clicked: totalClicked || 0,
  }).eq("id", campaignId);

  return { sent, failed, remaining: remaining || 0 };
}

// sendSms imported from @/lib/sms (RingCentral primary, Twilio fallback)

// ─── Email sender ─────────────────────────────────────────────────

async function sendEmail(to: string, subject: string, html: string): Promise<{ id: string } | { error: string }> {
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

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
