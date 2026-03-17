import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/auth";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { Resend } from "resend";

type RouteContext = { params: Promise<{ id: string }> };

async function sendSms(phone: string, body: string) {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_PHONE_NUMBER;
  if (!sid || !token || !from) return { error: "Twilio not configured" };

  const clean = phone.replace(/\D/g, "");
  const to = clean.startsWith("1") ? `+${clean}` : `+1${clean}`;

  const res = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`,
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`${sid}:${token}`).toString("base64")}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({ To: to, From: from, Body: body }),
    },
  );
  const data = await res.json();
  return data.sid ? { sid: data.sid } : { error: data.message ?? "Twilio error" };
}

function buildQuoteEmailHtml(quote: Record<string, unknown>, quoteUrl: string): string {
  const lineItems = (quote.line_items as Array<{
    description: string;
    quantity: number;
    unit: string;
    unit_price_cents: number;
    total_cents: number;
  }>) ?? [];
  const fmt = (c: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(c / 100);

  const rows = lineItems
    .map(
      (item) => `
      <tr>
        <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;">${item.description}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;text-align:center;">${item.quantity} ${item.unit}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;text-align:right;">${fmt(item.total_cents)}</td>
      </tr>`,
    )
    .join("");

  return `<!DOCTYPE html><html>
<head><meta charset="UTF-8"></head>
<body style="font-family:sans-serif;color:#1a1a1a;margin:0;padding:0;background:#f9fafb;">
<div style="max-width:600px;margin:32px auto;background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.1);">
  <div style="background:#1e3a5f;padding:24px 32px;">
    <h1 style="color:#fff;margin:0;font-size:20px;">Eastern Landscape &amp; Mason Supply</h1>
    <p style="color:#93c5fd;margin:4px 0 0;">110 Frowein Road, Center Moriches, NY • (631) 874-6244</p>
  </div>
  <div style="padding:32px;">
    <p style="color:#6b7280;margin:0 0 4px;">Quote ${quote.quote_number}</p>
    <h2 style="margin:0 0 16px;">${quote.title}</h2>
    <p>Hi ${quote.customer_name},</p>
    <p>Please find your quote below. You can review, sign, and pay your deposit online:</p>
    <p style="text-align:center;margin:24px 0;">
      <a href="${quoteUrl}" style="background:#f59e0b;color:#1a1a1a;padding:14px 28px;border-radius:6px;text-decoration:none;font-weight:600;display:inline-block;">
        Review &amp; Accept Quote →
      </a>
    </p>
    ${quote.description ? `<p style="color:#4b5563;border-left:3px solid #e5e7eb;padding-left:12px;">${quote.description}</p>` : ""}
    <table style="width:100%;border-collapse:collapse;margin:24px 0;">
      <thead>
        <tr style="background:#f9fafb;">
          <th style="padding:8px 12px;text-align:left;font-size:12px;text-transform:uppercase;color:#6b7280;">Description</th>
          <th style="padding:8px 12px;text-align:center;font-size:12px;text-transform:uppercase;color:#6b7280;">Qty</th>
          <th style="padding:8px 12px;text-align:right;font-size:12px;text-transform:uppercase;color:#6b7280;">Amount</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
      <tfoot>
        <tr><td colspan="2" style="padding:8px 12px;text-align:right;color:#6b7280;">Subtotal</td><td style="padding:8px 12px;text-align:right;">${fmt(quote.subtotal_cents as number)}</td></tr>
        <tr><td colspan="2" style="padding:8px 12px;text-align:right;color:#6b7280;">Tax (8.75%)</td><td style="padding:8px 12px;text-align:right;">${fmt(quote.tax_cents as number)}</td></tr>
        <tr style="font-weight:700;font-size:16px;"><td colspan="2" style="padding:8px 12px;text-align:right;">TOTAL</td><td style="padding:8px 12px;text-align:right;">${fmt(quote.total_cents as number)}</td></tr>
        ${(quote.deposit_required_cents as number) > 0 ? `<tr style="color:#d97706;"><td colspan="2" style="padding:8px 12px;text-align:right;">Deposit Required</td><td style="padding:8px 12px;text-align:right;">${fmt(quote.deposit_required_cents as number)}</td></tr>` : ""}
      </tfoot>
    </table>
    ${quote.estimated_timeline ? `<p><strong>Timeline:</strong> ${quote.estimated_timeline}</p>` : ""}
    ${quote.valid_until ? `<p><strong>Valid Until:</strong> ${quote.valid_until}</p>` : ""}
    ${quote.terms ? `<p style="font-size:13px;color:#6b7280;">${quote.terms}</p>` : ""}
    <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;">
    <p style="text-align:center;color:#6b7280;font-size:13px;">Questions? Call us at <a href="tel:6318746244" style="color:#1e3a5f;">(631) 874-6244</a></p>
  </div>
</div>
</body></html>`;
}

export async function POST(request: Request, context: RouteContext) {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  const { id } = await context.params;
  const { via } = await request.json(); // ['sms', 'email'] or subset
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = getSupabaseAdminClient() as any;

  const { data: quote, error } = await supabase
    .from("quotes")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !quote) return NextResponse.json({ error: "Quote not found" }, { status: 404 });

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.easternlm.com";
  const quoteUrl = `${siteUrl}/quote/${quote.public_token}`;

  const errors: string[] = [];
  const sent: string[] = [];

  // SMS
  if (via.includes("sms") && quote.customer_phone) {
    const smsBody = `Eastern LM sent you a quote for ${quote.title}.\nTotal: ${new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(quote.total_cents / 100)} | Deposit: ${new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(quote.deposit_required_cents / 100)}\nReview & accept: ${quoteUrl}`;
    const result = await sendSms(quote.customer_phone, smsBody);
    if (result.error) errors.push(`SMS: ${result.error}`);
    else sent.push("sms");
  }

  // Email
  if (via.includes("email") && quote.customer_email) {
    const apiKey = process.env.RESEND_API_KEY;
    const fromEmail = process.env.RESEND_FROM_EMAIL ?? "orders@easternlm.com";
    if (!apiKey) {
      errors.push("Email: RESEND_API_KEY not configured");
    } else {
      const resend = new Resend(apiKey);
      const result = await resend.emails.send({
        from: fromEmail,
        to: quote.customer_email,
        subject: `Your Quote from Eastern LM — ${quote.title} (${quote.quote_number})`,
        html: buildQuoteEmailHtml(quote, quoteUrl),
      });
      if (result.error) errors.push(`Email: ${result.error.message}`);
      else sent.push("email");
    }
  }

  // Update quote status
  await supabase
    .from("quotes")
    .update({
      status: "sent",
      sent_at: new Date().toISOString(),
      sent_via: sent,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  return NextResponse.json({ ok: true, sent, errors });
}
