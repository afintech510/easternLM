import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/auth";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { Resend } from "resend";
import { sendSms } from "@/lib/sms";

type RouteContext = { params: Promise<{ id: string }> };

const fmt = (c: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(c / 100);

function buildInvoiceEmailHtml(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  quote: Record<string, any>,
  invoiceUrl: string,
  balanceOwedCents: number,
): string {
  const lineItems = (quote.line_items as Array<{
    description: string;
    quantity: number;
    unit: string;
    total_cents: number;
  }>) ?? [];

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
    <p style="color:#6b7280;margin:0 0 4px;">Invoice ${quote.quote_number}</p>
    <h2 style="margin:0 0 16px;">${quote.title}</h2>
    <p>Hi ${quote.customer_name},</p>
    <p>Your project is complete. Below is the final invoice including all items delivered. Your deposit has been applied — the remaining balance is shown at the bottom.</p>
    <p style="text-align:center;margin:24px 0;">
      <a href="${invoiceUrl}" style="background:#d97706;color:#fff;padding:14px 28px;border-radius:6px;text-decoration:none;font-weight:600;display:inline-block;">
        View &amp; Pay Balance →
      </a>
    </p>
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
        <tr><td colspan="2" style="padding:8px 12px;text-align:right;color:#6b7280;">Tax</td><td style="padding:8px 12px;text-align:right;">${fmt(quote.tax_cents as number)}</td></tr>
        <tr style="font-weight:600;"><td colspan="2" style="padding:8px 12px;text-align:right;">Project Total</td><td style="padding:8px 12px;text-align:right;">${fmt(quote.total_cents as number)}</td></tr>
        <tr style="color:#059669;"><td colspan="2" style="padding:8px 12px;text-align:right;">Deposit Paid</td><td style="padding:8px 12px;text-align:right;">-${fmt(quote.deposit_paid_cents as number)}</td></tr>
        ${(quote.balance_paid_cents ?? 0) > 0 ? `<tr style="color:#059669;"><td colspan="2" style="padding:8px 12px;text-align:right;">Previously Paid</td><td style="padding:8px 12px;text-align:right;">-${fmt(quote.balance_paid_cents as number)}</td></tr>` : ""}
        <tr style="font-weight:700;font-size:18px;color:#d97706;"><td colspan="2" style="padding:12px;text-align:right;border-top:2px solid #d97706;">BALANCE OWED</td><td style="padding:12px;text-align:right;border-top:2px solid #d97706;">${fmt(balanceOwedCents)}</td></tr>
      </tfoot>
    </table>
    <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;">
    <p style="text-align:center;color:#6b7280;font-size:13px;">Questions? Call us at <a href="tel:6318746244" style="color:#1e3a5f;">(631) 874-6244</a></p>
  </div>
</div>
</body></html>`;
}

/**
 * POST /api/admin/quotes/[id]/send-invoice
 * Send the final invoice + pay-balance link to the customer via email and/or SMS.
 * Requires the quote to be finalized (finalized_at set) with a balance owed.
 */
export async function POST(request: Request, context: RouteContext) {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  const { id } = await context.params;
  const { via } = await request.json();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = getSupabaseAdminClient() as any;

  const { data: quote, error } = await supabase
    .from("quotes")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !quote) return NextResponse.json({ error: "Quote not found" }, { status: 404 });
  if (!quote.finalized_at) {
    return NextResponse.json({ error: "Quote must be finalized first" }, { status: 400 });
  }

  const balanceOwedCents = Math.max(
    0,
    (quote.total_cents ?? 0) - (quote.deposit_paid_cents ?? 0) - (quote.balance_paid_cents ?? 0),
  );
  if (balanceOwedCents <= 0) {
    return NextResponse.json({ error: "No balance owed on this invoice" }, { status: 400 });
  }

  const proto = request.headers.get("x-forwarded-proto") ?? "https";
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  const siteUrl = host && !host.includes("localhost")
    ? `${proto}://${host}`
    : process.env.NEXT_PUBLIC_SITE_URL ?? "https://easternlm.com";
  const invoiceUrl = `${siteUrl}/quote/${quote.public_token}`;

  const errors: string[] = [];
  const sent: string[] = [];

  if (via.includes("sms") && quote.customer_phone) {
    const smsBody = `Eastern LM — Final invoice ${quote.quote_number}\nProject total: ${fmt(quote.total_cents)} | Deposit applied: -${fmt(quote.deposit_paid_cents)}\nBalance owed: ${fmt(balanceOwedCents)}\nReview & pay: ${invoiceUrl}`;
    const result = await sendSms(quote.customer_phone, smsBody);
    if (result.error) errors.push(`SMS: ${result.error}`);
    else sent.push("sms");
  }

  if (via.includes("email") && quote.customer_email) {
    const apiKey = process.env.RESEND_API_KEY;
    const fromEmail = process.env.RESEND_QUOTES_FROM_EMAIL ?? "quotes@easternlm.com";
    const replyTo = process.env.RESEND_QUOTES_REPLY_TO ?? "quotes@easternlm.com";
    if (!apiKey) {
      errors.push("Email: RESEND_API_KEY not configured");
    } else {
      const resend = new Resend(apiKey);
      const result = await resend.emails.send({
        from: `Eastern LM <${fromEmail}>`,
        replyTo,
        to: quote.customer_email,
        subject: `Final Invoice — ${quote.title} (${quote.quote_number}) — Balance ${fmt(balanceOwedCents)}`,
        html: buildInvoiceEmailHtml(quote, invoiceUrl, balanceOwedCents),
      });
      if (result.error) errors.push(`Email: ${result.error.message}`);
      else sent.push("email");
    }
  }

  await supabase
    .from("quotes")
    .update({
      invoice_sent_at: new Date().toISOString(),
      invoice_sent_via: sent,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  return NextResponse.json({ ok: true, sent, errors });
}
