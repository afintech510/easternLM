import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

/**
 * Twilio incoming SMS webhook.
 * Handles STOP/HELP keywords and logs incoming messages.
 * Configure in Twilio Console → Phone Number → Messaging → Webhook URL:
 *   https://easternlm.com/api/webhooks/twilio  (POST)
 */
export async function POST(request: Request) {
  const formData = await request.formData();
  const from = (formData.get("From") as string) || "";
  const body = (formData.get("Body") as string) || "";
  const messageSid = (formData.get("MessageSid") as string) || "";

  // Normalize phone: strip +1 prefix
  const phone = from.replace(/^\+1/, "").replace(/\D/g, "");
  const text = body.trim().toUpperCase();

  const supabase = getSupabaseAdminClient();

  // Handle STOP/opt-out (Twilio Advanced Opt-Out handles carrier-level,
  // but we also update our database)
  if (["STOP", "STOPALL", "UNSUBSCRIBE", "CANCEL", "END", "QUIT"].includes(text)) {
    // Update customer record
    await supabase
      .from("customers")
      .update({ opted_in_sms: false })
      .eq("phone", phone);

    // Cancel pending follow-ups and campaign sends
    await supabase
      .from("follow_ups")
      .update({ status: "opted_out" })
      .eq("phone", phone)
      .eq("status", "pending");

    await supabase
      .from("campaign_sends")
      .update({ status: "opted_out" })
      .eq("phone", phone)
      .eq("status", "pending");

    // Log the opt-out
    await supabase.from("sms_consent_log").insert({
      phone,
      consent_given: false,
      consent_source: "sms_reply",
      consent_text: `STOP received via SMS (SID: ${messageSid})`,
    });

    // Twilio sends the opt-out confirmation automatically when
    // Advanced Opt-Out is enabled. Return empty TwiML.
    return new NextResponse(
      '<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
      { headers: { "Content-Type": "text/xml" } },
    );
  }

  // Handle HELP
  if (["HELP", "INFO"].includes(text)) {
    return new NextResponse(
      `<?xml version="1.0" encoding="UTF-8"?><Response><Message>Eastern Landscape &amp; Mason Supply. For help, call (631) 874-6244 or email sales@easternlm.com. Reply STOP to opt out.</Message></Response>`,
      { headers: { "Content-Type": "text/xml" } },
    );
  }

  // Handle START/opt-in
  if (["START", "YES", "UNSTOP"].includes(text)) {
    await supabase
      .from("customers")
      .update({ opted_in_sms: true })
      .eq("phone", phone);

    await supabase.from("sms_consent_log").insert({
      phone,
      consent_given: true,
      consent_source: "sms_reply",
      consent_text: `START received via SMS (SID: ${messageSid})`,
    });

    return new NextResponse(
      `<?xml version="1.0" encoding="UTF-8"?><Response><Message>You have been re-subscribed to Eastern LM text messages. Reply STOP to opt out at any time.</Message></Response>`,
      { headers: { "Content-Type": "text/xml" } },
    );
  }

  // Any other message — log it for the admin to see
  // Future: show in admin dashboard as incoming messages
  console.log(`[twilio] Incoming SMS from ${phone}: ${body}`);

  // Don't auto-reply to random messages to avoid loops
  return new NextResponse(
    '<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
    { headers: { "Content-Type": "text/xml" } },
  );
}
