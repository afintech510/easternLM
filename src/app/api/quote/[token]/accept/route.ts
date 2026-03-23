import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { cancelQuoteFollowUps } from "@/lib/quotes/follow-ups";

type RouteContext = { params: Promise<{ token: string }> };

export async function POST(request: Request, context: RouteContext) {
  const { token } = await context.params;
  const body = await request.json();
  const { typedName, ip, location, smsVerified } = body;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = getSupabaseAdminClient() as any;

  const { data: quote, error } = await supabase
    .from("quotes")
    .select("id, status, customer_name, customer_phone, deposit_required_cents")
    .eq("public_token", token)
    .single();

  if (error || !quote) return NextResponse.json({ error: "Quote not found" }, { status: 404 });
  if (["accepted", "converted", "declined", "expired"].includes(quote.status)) {
    return NextResponse.json({ error: "Quote cannot be accepted in current status" }, { status: 400 });
  }

  const updates: Record<string, unknown> = {
    status: "accepted",
    accepted_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    acceptance_metadata: {
      typed_name: typedName ?? null,
      ip: ip ?? null,
      location: location ?? null,
      sms_verified: smsVerified ?? false,
      accepted_at: new Date().toISOString(),
      user_agent: request.headers.get("user-agent") ?? null,
    },
  };

  await supabase.from("quotes").update(updates).eq("public_token", token);

  // Cancel all pending follow-ups for this quote
  if (quote.id) cancelQuoteFollowUps(quote.id).catch(() => {});

  // Notify staff via SMS if configured
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_PHONE_NUMBER;
  const staffPhone = process.env.STAFF_NOTIFICATION_PHONE;

  if (sid && authToken && from && staffPhone) {
    const fmt = (c: number) =>
      new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(c / 100);
    const msg = `Quote accepted! ${quote.customer_name} accepted their quote. Deposit: ${fmt(quote.deposit_required_cents)}. Check /admin/quotes for details.`;
    await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`${sid}:${authToken}`).toString("base64")}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({ To: staffPhone, From: from, Body: msg }),
    }).catch(() => {});
  }

  return NextResponse.json({ ok: true, needsDeposit: quote.deposit_required_cents > 0 });
}
