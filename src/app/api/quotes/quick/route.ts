import { NextResponse } from "next/server";
import { requirePOS } from "@/lib/admin/auth";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { scheduleQuoteFollowUps } from "@/lib/quotes/follow-ups";

const TAX_RATE = 0.0875;

async function generateQuoteNumber(supabase: any): Promise<string> {
  const year = new Date().getFullYear();
  const { count } = await supabase
    .from("quotes")
    .select("id", { count: "exact", head: true })
    .gte("created_at", `${year}-01-01T00:00:00Z`);
  const seq = ((count ?? 0) + 1).toString().padStart(4, "0");
  return `QT-${year}-${seq}`;
}

async function sendQuoteSms(phone: string, quoteNumber: string, totalCents: number, quoteUrl: string) {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_PHONE_NUMBER;
  if (!sid || !token || !from) return;

  const clean = phone.replace(/\D/g, "");
  const to = clean.startsWith("1") ? `+${clean}` : `+1${clean}`;
  const fmt = (c: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(c / 100);

  await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${sid}:${token}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      To: to,
      From: from,
      Body: `Eastern LM sent you a quote for ${fmt(totalCents)}.\nReview & accept: ${quoteUrl}\n\nReply STOP to opt out.`,
    }),
  }).catch(() => {});
}

async function sendQuoteEmail(email: string, customerName: string, quoteNumber: string, totalCents: number, quoteUrl: string) {
  const apiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.RESEND_FROM_EMAIL ?? "orders@easternlm.com";
  if (!apiKey) return;

  const { Resend } = await import("resend");
  const resend = new Resend(apiKey);
  const fmt = (c: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(c / 100);

  await resend.emails.send({
    from: fromEmail,
    to: email,
    subject: `Your Quote from Eastern LM — ${quoteNumber}`,
    html: `<div style="font-family:sans-serif;max-width:500px;margin:0 auto;">
      <h2 style="color:#1a3a5c;">Quote ${quoteNumber}</h2>
      <p>Hi${customerName ? ` ${customerName}` : ""},</p>
      <p>Here's your quote for <strong>${fmt(totalCents)}</strong>.</p>
      <a href="${quoteUrl}" style="display:inline-block;background:#c8952e;color:white;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:bold;">Review & Accept Quote</a>
      <p style="margin-top:20px;color:#888;font-size:12px;">Eastern Landscape & Mason Supply — (631) 874-6244</p>
    </div>`,
  }).catch(() => {});
}

/**
 * POST /api/quotes/quick — Fast quote creation from cart items (no AI).
 * Also handles optional immediate send via SMS/email.
 * Auth: requirePOS (admin, staff, or pos role)
 */
export async function POST(request: Request) {
  const auth = await requirePOS();
  if (auth instanceof NextResponse) return auth;

  const body = await request.json();
  const {
    items,
    customer,
    deliveryFeeCents,
    depositCents,
    note,
    validDays,
    sendVia, // ['sms'] | ['email'] | ['sms', 'email'] | undefined
  } = body;

  if (!items?.length && !body.aiPrompt) {
    return NextResponse.json({ error: "Items or AI prompt required" }, { status: 400 });
  }

  const supabase = getSupabaseAdminClient() as any;

  // Build line items from cart
  const lineItems = (items ?? []).map((item: any) => ({
    description: item.name ?? item.description ?? "Item",
    quantity: item.quantity ?? 1,
    unit: item.unit ?? "each",
    unit_price_cents: item.unitPriceCents ?? item.unit_price_cents ?? 0,
    total_cents: (item.quantity ?? 1) * (item.unitPriceCents ?? item.unit_price_cents ?? 0),
  }));

  // Add delivery as line item if provided
  if (deliveryFeeCents && deliveryFeeCents > 0) {
    lineItems.push({
      description: "Delivery",
      quantity: 1,
      unit: "trip",
      unit_price_cents: deliveryFeeCents,
      total_cents: deliveryFeeCents,
    });
  }

  const subtotalCents = lineItems.reduce((s: number, i: any) => s + i.total_cents, 0);
  const taxCents = Math.round(subtotalCents * TAX_RATE);
  const totalCents = subtotalCents + taxCents;

  const validUntilDate = new Date();
  validUntilDate.setDate(validUntilDate.getDate() + (validDays ?? 30));
  const validUntil = validUntilDate.toISOString().split("T")[0];

  const quoteNumber = await generateQuoteNumber(supabase);

  const firstItemName = lineItems[0]?.description ?? "Materials";
  const title = note || `Material Quote — ${firstItemName}`;

  const { data: quote, error } = await supabase
    .from("quotes")
    .insert({
      quote_number: quoteNumber,
      customer_name: customer?.name ?? "Customer",
      customer_phone: customer?.phone ?? null,
      customer_email: customer?.email ?? null,
      customer_address: customer?.address ?? null,
      customer_id: customer?.id ?? null,
      title,
      description: note ?? null,
      line_items: lineItems,
      subtotal_cents: subtotalCents,
      tax_cents: taxCents,
      total_cents: totalCents,
      deposit_required_cents: depositCents ?? 0,
      valid_until: validUntil,
      terms: "Prices subject to availability. Delivery fee based on distance from our yard.",
      ai_generated: false,
      created_by: auth.userId,
      status: "draft",
    })
    .select("id, quote_number, public_token, total_cents")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Derive site URL from request headers
  const proto = request.headers.get("x-forwarded-proto") ?? "https";
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  const siteUrl = host && !host.includes("localhost")
    ? `${proto}://${host}`
    : process.env.NEXT_PUBLIC_SITE_URL ?? "https://staging.easternlm.com";
  const quoteUrl = `${siteUrl}/quote/${quote.public_token}`;

  const sent: string[] = [];

  // Send if requested
  if (sendVia?.includes("sms") && customer?.phone) {
    await sendQuoteSms(customer.phone, quoteNumber, totalCents, quoteUrl);
    sent.push("sms");
  }
  if (sendVia?.includes("email") && customer?.email) {
    await sendQuoteEmail(customer.email, customer.name, quoteNumber, totalCents, quoteUrl);
    sent.push("email");
  }

  // Update status if sent
  if (sent.length > 0) {
    await supabase.from("quotes").update({
      status: "sent",
      sent_at: new Date().toISOString(),
      sent_via: sent,
    }).eq("id", quote.id);
  }

  // Schedule follow-up sequence if quote was sent
  if (sent.length > 0) {
    try {
      await scheduleQuoteFollowUps({
        id: quote.id,
        public_token: quote.public_token,
        customer_name: customer?.name ?? "Customer",
        customer_phone: customer?.phone ?? null,
        customer_email: customer?.email ?? null,
        customer_id: customer?.id ?? null,
        title,
        total_cents: totalCents,
        valid_until: validUntil,
      }, siteUrl);
    } catch (err) {
      console.error("Follow-up scheduling failed:", err);
    }
  }

  return NextResponse.json({
    ok: true,
    quote: {
      id: quote.id,
      quoteNumber: quote.quote_number,
      publicToken: quote.public_token,
      totalCents,
      quoteUrl,
    },
    sent,
  });
}
