import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { cancelQuoteFollowUps } from "@/lib/quotes/follow-ups";

type RouteContext = { params: Promise<{ token: string }> };

export async function POST(request: Request, context: RouteContext) {
  const { token } = await context.params;
  const { signatureDataUrl } = await request.json();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = getSupabaseAdminClient() as any;

  const { data: quote, error } = await supabase
    .from("quotes")
    .select("id, status, customer_name, deposit_required_cents")
    .eq("public_token", token)
    .single();

  if (error || !quote) return NextResponse.json({ error: "Quote not found" }, { status: 404 });
  if (!["sent", "viewed"].includes(quote.status)) {
    return NextResponse.json({ error: "Quote cannot be accepted in current status" }, { status: 400 });
  }

  // Save signature image to Supabase Storage
  let signatureUrl: string | null = null;
  if (signatureDataUrl) {
    try {
      // Ensure bucket exists
      const { data: buckets } = await supabase.storage.listBuckets();
      const bucketExists = (buckets ?? []).some((b: { name: string }) => b.name === "quote-signatures");
      if (!bucketExists) {
        await supabase.storage.createBucket("quote-signatures", { public: false });
      }

      // Convert data URL to buffer
      const base64 = signatureDataUrl.replace(/^data:image\/png;base64,/, "");
      const buffer = Buffer.from(base64, "base64");
      const path = `${quote.id}/${Date.now()}.png`;

      const { error: uploadErr } = await supabase.storage
        .from("quote-signatures")
        .upload(path, buffer, { contentType: "image/png", upsert: true });

      if (!uploadErr) signatureUrl = path;
    } catch {
      // Non-fatal — proceed without signature URL
    }
  }

  const updates: Record<string, unknown> = {
    status: "accepted",
    accepted_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  if (signatureUrl) updates.customer_signature_url = signatureUrl;

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
    const msg = `✅ Quote accepted! ${quote.customer_name} accepted their quote. Deposit: ${fmt(quote.deposit_required_cents)}. Check /admin/quotes for details.`;
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
