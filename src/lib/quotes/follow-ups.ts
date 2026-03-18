import { getSupabaseAdminClient } from "@/lib/supabase/admin";

/**
 * Schedule follow-up sequence when a quote is sent.
 * Creates follow_ups rows for each quote template, respecting send windows.
 */
export async function scheduleQuoteFollowUps(quote: {
  id: string;
  public_token: string;
  customer_name: string;
  customer_phone: string | null;
  customer_email: string | null;
  customer_id: string | null;
  title: string;
  total_cents: number;
  valid_until: string | null;
}, siteUrl: string) {
  const supabase = getSupabaseAdminClient() as any;

  // Get active quote follow-up templates
  const { data: templates } = await supabase
    .from("follow_up_templates")
    .select("*")
    .in("trigger_event", ["quote_sent", "quote_viewed"])
    .eq("is_active", true)
    .order("delay_minutes");

  if (!templates?.length) return;

  const fmt = (c: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(c / 100);
  const firstName = quote.customer_name.split(/\s+/)[0] ?? quote.customer_name;
  const quoteUrl = `${siteUrl}/quote/${quote.public_token}`;

  for (const template of templates) {
    // Calculate scheduled time
    const scheduledAt = new Date(Date.now() + template.delay_minutes * 60 * 1000);

    // Adjust to send window (9 AM - 8 PM ET)
    const etOffset = -5; // EST (simplified — doesn't handle DST)
    const etHour = (scheduledAt.getUTCHours() + etOffset + 24) % 24;
    if (etHour < 9) {
      scheduledAt.setUTCHours(scheduledAt.getUTCHours() + (9 - etHour));
    } else if (etHour >= 20) {
      scheduledAt.setUTCDate(scheduledAt.getUTCDate() + 1);
      scheduledAt.setUTCHours(14); // 9 AM ET = 14 UTC
    }

    await supabase.from("follow_ups").insert({
      order_id: null,
      customer_id: quote.customer_id,
      phone: quote.customer_phone,
      email: quote.customer_email,
      customer_name: quote.customer_name,
      template_slug: template.slug,
      channel: template.channel,
      scheduled_at: scheduledAt.toISOString(),
      status: "pending",
      metadata: {
        quote_id: quote.id,
        quote_token: quote.public_token,
        quote_title: quote.title,
        quote_total: fmt(quote.total_cents),
        quote_url: quoteUrl,
        valid_until: quote.valid_until,
        first_name: firstName,
      },
    });
  }
}

/**
 * Cancel pending follow-ups for a quote (on accept/decline).
 */
export async function cancelQuoteFollowUps(quoteId: string) {
  const supabase = getSupabaseAdminClient() as any;
  await supabase
    .from("follow_ups")
    .update({ status: "cancelled" })
    .eq("status", "pending")
    .contains("metadata", { quote_id: quoteId });
}

/**
 * Cancel "not viewed" follow-ups (when quote is first viewed).
 */
export async function cancelNotViewedFollowUps(quoteId: string) {
  const supabase = getSupabaseAdminClient() as any;
  await supabase
    .from("follow_ups")
    .update({ status: "cancelled" })
    .eq("status", "pending")
    .eq("template_slug", "quote-not-viewed-2hr")
    .contains("metadata", { quote_id: quoteId });
}
