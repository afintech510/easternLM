import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { cancelQuoteFollowUps } from "@/lib/quotes/follow-ups";

type RouteContext = { params: Promise<{ token: string }> };

export async function POST(request: Request, context: RouteContext) {
  const { token } = await context.params;
  const { reason } = await request.json();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = getSupabaseAdminClient() as any;

  const { data: quote, error } = await supabase
    .from("quotes")
    .select("id, status, customer_name")
    .eq("public_token", token)
    .single();

  if (error || !quote) return NextResponse.json({ error: "Quote not found" }, { status: 404 });
  if (!["sent", "viewed"].includes(quote.status)) {
    return NextResponse.json({ error: "Quote cannot be declined in current status" }, { status: 400 });
  }

  await supabase.from("quotes").update({
    status: "declined",
    declined_at: new Date().toISOString(),
    decline_reason: reason ?? null,
    updated_at: new Date().toISOString(),
  }).eq("public_token", token);

  // Cancel all pending follow-ups
  if (quote.id) cancelQuoteFollowUps(quote.id).catch(() => {});

  // Notify staff
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_PHONE_NUMBER;
  const staffPhone = process.env.STAFF_NOTIFICATION_PHONE;

  if (sid && authToken && from && staffPhone) {
    const msg = `❌ Quote declined. ${quote.customer_name} declined their quote${reason ? `: "${reason}"` : ""}. Check /admin/quotes.`;
    await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`${sid}:${authToken}`).toString("base64")}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({ To: staffPhone, From: from, Body: msg }),
    }).catch(() => {});
  }

  return NextResponse.json({ ok: true });
}
