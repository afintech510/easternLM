/**
 * Reminder digest engine — texts every open item to both Adam & Ronnie.
 * Driven by the VPS cron at 8:30 AM and 4:00 PM ET (weekdays).
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { sendSms } from "@/lib/sms";
import { getReminderUsers } from "@/lib/reminders/config";

export async function sendReminderDigest(
  supabase: SupabaseClient,
): Promise<{ sent: number; failed: number; open: number }> {
  const { data: openItems, error } = await supabase
    .from("reminders")
    .select("ref_num, body")
    .eq("status", "open")
    .order("ref_num");

  if (error) {
    console.error("[reminders] digest query failed:", error);
    return { sent: 0, failed: 0, open: 0 };
  }

  const items = openItems ?? [];

  // Empty queue → skip sending (no "you have 0 reminders" nag).
  if (items.length === 0) {
    console.log("[reminders] digest: no open items, skipping");
    return { sent: 0, failed: 0, open: 0 };
  }

  const lines = items.map((r) => `#${r.ref_num} ${r.body}`).join("\n");
  const body = `Open reminders (${items.length}):\n${lines}\n\nReply DONE <#> to clear.`;

  const recipients = Object.values(getReminderUsers());
  let sent = 0;
  let failed = 0;

  for (const user of recipients) {
    const result = await sendSms(user.phone, body);
    if (result.ok) {
      sent++;
    } else {
      failed++;
      console.error(`[reminders] digest to ${user.name} failed:`, result.error);
    }
  }

  console.log(`[reminders] digest: ${items.length} open, sent ${sent}, failed ${failed}`);
  return { sent, failed, open: items.length };
}
