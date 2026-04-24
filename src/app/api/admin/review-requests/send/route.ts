import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/auth";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { sendSms } from "@/lib/sms";

const MARKETING_FROM = process.env.RINGCENTRAL_SMS_MARKETING_FROM || "+16313668524";
const TRANSACTIONAL_FROM = "+16318746244";

function isWithinSendWindow(): boolean {
  const now = new Date();
  const etStr = now.toLocaleString("en-US", { timeZone: "America/New_York", hour: "numeric", hour12: false });
  const hour = parseInt(etStr, 10);
  return hour >= 9 && hour < 19;
}

/**
 * POST /api/admin/review-requests/send
 * Send review request, reminder, or marketing message to one or more orders.
 */
export async function POST(request: Request) {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  const body = await request.json();
  const {
    order_ids,
    channel,
    message_type,
    custom_message,
  }: {
    order_ids: string[];
    channel: "sms" | "email";
    message_type: "review_request" | "review_reminder" | "marketing";
    custom_message?: string;
  } = body;

  if (!order_ids?.length) {
    return NextResponse.json({ error: "order_ids required" }, { status: 400 });
  }
  if (!["sms", "email"].includes(channel)) {
    return NextResponse.json({ error: "Invalid channel" }, { status: 400 });
  }
  if (message_type === "marketing" && !custom_message) {
    return NextResponse.json({ error: "custom_message required for marketing" }, { status: 400 });
  }

  if (!isWithinSendWindow()) {
    return NextResponse.json(
      { error: "SMS can only be sent between 9 AM and 7 PM Eastern" },
      { status: 400 }
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = getSupabaseAdminClient() as any;

  // Fetch orders
  const { data: orders } = await supabase
    .from("orders")
    .select("id, customer_name, customer_phone, customer_email, customer_id, sms_opt_in")
    .in("id", order_ids);

  if (!orders?.length) {
    return NextResponse.json({ error: "No orders found" }, { status: 404 });
  }

  // Get review URLs
  const { data: settings } = await supabase
    .from("site_settings")
    .select("google_review_url, yelp_review_url")
    .eq("id", 1)
    .single();

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://easternlm.com";
  const hasYelp = !!settings?.yelp_review_url;

  let sent = 0;
  let skipped = 0;
  const errors: string[] = [];
  const skippedReasons: string[] = [];

  for (const order of orders) {
    const name = order.customer_name || "Customer";
    const phone = order.customer_phone?.replace(/\D/g, "") || null;
    const email = order.customer_email || null;

    // Channel-specific contact check
    if (channel === "sms" && !phone) {
      skipped++;
      skippedReasons.push(`${name}: no phone`);
      continue;
    }
    if (channel === "email" && !email) {
      skipped++;
      skippedReasons.push(`${name}: no email`);
      continue;
    }

    // Opt-out check for SMS
    if (channel === "sms" && order.sms_opt_in === false) {
      skipped++;
      skippedReasons.push(`${name}: opted out`);
      continue;
    }

    // 60-day cooldown for review requests
    if (message_type === "review_request" && phone) {
      const cooldownDate = new Date(Date.now() - 60 * 86400000).toISOString();
      const { count } = await supabase
        .from("follow_ups")
        .select("id", { count: "exact", head: true })
        .eq("order_id", order.id)
        .in("template_slug", [
          "review-request-sms",
          "review-request-email",
          "manual-review-sms",
          "manual-review-email",
        ])
        .in("status", ["sent", "delivered"])
        .gte("sent_at", cooldownDate);

      if ((count ?? 0) > 0) {
        skipped++;
        skippedReasons.push(`${name}: review sent within 60 days`);
        continue;
      }
    }

    // Build template slug for tracking
    const templateSlug = `manual-${message_type === "review_request" ? "review" : message_type === "review_reminder" ? "reminder" : "marketing"}-${channel}`;

    // Create follow-up record first to get ID for tracking link
    const { data: followUp, error: insertErr } = await supabase
      .from("follow_ups")
      .insert({
        order_id: order.id,
        customer_id: order.customer_id,
        phone: channel === "sms" ? phone : null,
        email: channel === "email" ? email : null,
        customer_name: name,
        template_slug: templateSlug,
        channel,
        scheduled_at: new Date().toISOString(),
        status: "pending",
        metadata: {},
      })
      .select("id")
      .single();

    if (insertErr) {
      errors.push(`${name}: ${insertErr.message}`);
      continue;
    }

    const googleTrackingUrl = `${siteUrl}/api/review/redirect?id=${followUp.id}`;
    const yelpTrackingUrl = `${siteUrl}/api/review/redirect?id=${followUp.id}&platform=yelp`;

    if (channel === "sms") {
      let messageBody: string;
      if (custom_message) {
        messageBody = custom_message
          .replace(/\{name\}/g, name)
          .replace(/\{review_link\}/g, googleTrackingUrl)
          .replace(/\{yelp_link\}/g, yelpTrackingUrl);
      } else if (message_type === "review_request") {
        messageBody = `Hi ${name}! Thanks for choosing Eastern Landscape & Mason Supply. We'd love to hear about your experience!\n\nGoogle: ${googleTrackingUrl}${hasYelp ? `\nYelp: ${yelpTrackingUrl}` : ""}\n\nReply STOP to opt out`;
      } else if (message_type === "review_reminder") {
        messageBody = `Hi ${name}, just a friendly reminder — if you enjoyed your recent delivery from Eastern LM, we'd really appreciate a quick review!\n\nGoogle: ${googleTrackingUrl}${hasYelp ? `\nYelp: ${yelpTrackingUrl}` : ""}\n\nReply STOP to opt out`;
      } else {
        messageBody = custom_message || "";
      }

      if (!messageBody.toLowerCase().includes("stop")) {
        messageBody += " - Reply STOP to opt out";
      }

      const fromNumber = message_type === "marketing" ? MARKETING_FROM : TRANSACTIONAL_FROM;
      const result = await sendSms(phone!, messageBody, fromNumber);

      if (result.ok) {
        await supabase
          .from("follow_ups")
          .update({ status: "sent", sent_at: new Date().toISOString(), sms_sid: result.messageId })
          .eq("id", followUp.id);
        sent++;
      } else {
        await supabase
          .from("follow_ups")
          .update({ status: "failed", error_message: result.error })
          .eq("id", followUp.id);
        errors.push(`${name}: ${result.error}`);
      }
    } else if (channel === "email") {
      const apiKey = process.env.RESEND_API_KEY;
      const from = process.env.RESEND_FROM_EMAIL;
      if (!apiKey || !from) {
        await supabase
          .from("follow_ups")
          .update({ status: "failed", error_message: "Resend not configured" })
          .eq("id", followUp.id);
        errors.push(`${name}: Resend not configured`);
        continue;
      }

      let subject: string;
      let html: string;
      const unsubUrl = `${siteUrl}/api/unsubscribe?id=${order.customer_id || ""}`;

      if (message_type === "review_request") {
        subject = "How was your delivery?";
        html = buildReviewEmailHtml(name, googleTrackingUrl, unsubUrl, false, hasYelp ? yelpTrackingUrl : undefined);
      } else if (message_type === "review_reminder") {
        subject = "Quick reminder — share your experience";
        html = buildReviewEmailHtml(name, googleTrackingUrl, unsubUrl, true, hasYelp ? yelpTrackingUrl : undefined);
      } else {
        subject = "News from Eastern LM";
        html = `<div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:24px;"><p>${custom_message}</p><p style="color:#999;font-size:11px;margin-top:24px;"><a href="${unsubUrl}" style="color:#999;">Unsubscribe</a></p></div>`;
      }

      try {
        const { Resend } = await import("resend");
        const resend = new Resend(apiKey);
        const { data, error: emailErr } = await resend.emails.send({ from, to: email!, subject, html });
        if (emailErr) {
          await supabase
            .from("follow_ups")
            .update({ status: "failed", error_message: emailErr.message })
            .eq("id", followUp.id);
          errors.push(`${name}: ${emailErr.message}`);
        } else {
          await supabase
            .from("follow_ups")
            .update({ status: "sent", sent_at: new Date().toISOString(), email_id: data?.id })
            .eq("id", followUp.id);
          sent++;
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Email failed";
        await supabase
          .from("follow_ups")
          .update({ status: "failed", error_message: msg })
          .eq("id", followUp.id);
        errors.push(`${name}: ${msg}`);
      }
    }
  }

  return NextResponse.json({ sent, skipped, errors, skippedReasons });
}

function buildReviewEmailHtml(name: string, googleUrl: string, unsubUrl: string, isReminder = false, yelpUrl?: string): string {
  const heading = isReminder ? "Quick reminder!" : "Thanks for your order!";
  const intro = isReminder
    ? `Just a friendly follow-up — if you enjoyed your recent delivery from Eastern LM, we'd really appreciate a quick review.`
    : `We hope your recent delivery arrived just right. Our family business has been proudly serving Suffolk County, and we'd love to hear how we did.`;

  const yelpButton = yelpUrl
    ? `<a href="${yelpUrl}" style="display:inline-block;background:#d32323;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:600;margin:16px 0 16px 12px;">Review on Yelp</a>`
    : "";

  return `<div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:24px;">
  <h2 style="color:#1a3a5c;">${heading}</h2>
  <p>Hi ${name},</p>
  <p>${intro}</p>
  <p>Would you take 30 seconds to leave us a review?</p>
  <div>
    <a href="${googleUrl}" style="display:inline-block;background:#1a3a5c;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:600;margin:16px 0;">Review on Google</a>
    ${yelpButton}
  </div>
  <p style="color:#666;font-size:13px;margin-top:24px;">Eastern Landscape &amp; Mason Supply<br>110 Frowein Road, Center Moriches, NY 11934<br>(631) 874-6244</p>
  <p style="color:#999;font-size:11px;"><a href="${unsubUrl}" style="color:#999;">Unsubscribe</a></p>
</div>`;
}
