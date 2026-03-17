import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/auth";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { Resend } from "resend";

type RouteContext = { params: Promise<{ id: string }> };

function fmt(c: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(c / 100);
}

function buildStatementEmailHtml(
  stmt: Record<string, unknown>,
  customer: Record<string, unknown>,
  orders: Array<{ order_number?: string; placed_at: string; grand_total_cents: number; delivery_method: string }>,
  payUrl: string
): string {
  const rows = orders
    .map((o) => {
      const date = new Date(o.placed_at).toLocaleDateString("en-US", { month: "numeric", day: "numeric" });
      const method = o.delivery_method === "pickup" ? "pickup" : "delivery";
      return `<tr>
        <td style="padding:6px 12px;border-bottom:1px solid #e5e7eb;">${date}</td>
        <td style="padding:6px 12px;border-bottom:1px solid #e5e7eb;">#${o.order_number ?? "–"}</td>
        <td style="padding:6px 12px;border-bottom:1px solid #e5e7eb;text-transform:capitalize;">${method}</td>
        <td style="padding:6px 12px;border-bottom:1px solid #e5e7eb;text-align:right;">${fmt(o.grand_total_cents)}</td>
      </tr>`;
    })
    .join("");

  const accountName = (customer.charge_account_name || customer.first_name) as string;

  return `<!DOCTYPE html><html>
<head><meta charset="UTF-8"></head>
<body style="font-family:sans-serif;color:#1a1a1a;margin:0;padding:0;background:#f9fafb;">
<div style="max-width:600px;margin:32px auto;background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.1);">
  <div style="background:#1e3a5f;padding:24px 32px;">
    <h1 style="color:#fff;margin:0;font-size:20px;">Eastern Landscape &amp; Mason Supply</h1>
    <p style="color:#93c5fd;margin:4px 0 0;">110 Frowein Road, Center Moriches, NY • (631) 874-6244</p>
  </div>
  <div style="padding:32px;">
    <div style="display:flex;justify-content:space-between;flex-wrap:wrap;gap:16px;margin-bottom:24px;">
      <div>
        <p style="margin:0;font-size:12px;text-transform:uppercase;color:#6b7280;">Bill To</p>
        <p style="margin:4px 0;font-weight:600;">${accountName}</p>
        ${customer.billing_address ? `<p style="margin:0;color:#4b5563;font-size:14px;">${customer.billing_address}</p>` : ""}
      </div>
      <div style="text-align:right;">
        <p style="margin:0;font-size:12px;text-transform:uppercase;color:#6b7280;">Statement</p>
        <p style="margin:4px 0;font-weight:600;font-family:monospace;">${stmt.statement_number}</p>
        <p style="margin:0;font-size:14px;color:#4b5563;">Period: ${stmt.period_start} – ${stmt.period_end}</p>
        <p style="margin:0;font-size:14px;color:#4b5563;">Due: ${stmt.due_date}</p>
        <p style="margin:0;font-size:14px;color:#4b5563;">Terms: ${customer.payment_terms ?? "Net 30"}</p>
      </div>
    </div>

    ${(stmt.previous_balance_cents as number) > 0 ? `
    <div style="background:#fef9c3;border:1px solid #fde047;border-radius:6px;padding:12px;margin-bottom:16px;">
      <p style="margin:0;font-size:14px;">Previous Balance: <strong>${fmt(stmt.previous_balance_cents as number)}</strong></p>
    </div>` : ""}

    <table style="width:100%;border-collapse:collapse;margin:16px 0;">
      <thead>
        <tr style="background:#f9fafb;">
          <th style="padding:8px 12px;text-align:left;font-size:12px;text-transform:uppercase;color:#6b7280;">Date</th>
          <th style="padding:8px 12px;text-align:left;font-size:12px;text-transform:uppercase;color:#6b7280;">Order</th>
          <th style="padding:8px 12px;text-align:left;font-size:12px;text-transform:uppercase;color:#6b7280;">Type</th>
          <th style="padding:8px 12px;text-align:right;font-size:12px;text-transform:uppercase;color:#6b7280;">Amount</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
      <tfoot>
        <tr><td colspan="3" style="padding:8px 12px;text-align:right;color:#6b7280;">New Charges</td><td style="padding:8px 12px;text-align:right;">${fmt(stmt.charges_cents as number)}</td></tr>
        ${(stmt.payments_cents as number) > 0 ? `<tr><td colspan="3" style="padding:8px 12px;text-align:right;color:#6b7280;">Payments Received</td><td style="padding:8px 12px;text-align:right;color:#16a34a;">−${fmt(stmt.payments_cents as number)}</td></tr>` : ""}
        <tr style="font-weight:700;font-size:16px;background:#f9fafb;">
          <td colspan="3" style="padding:10px 12px;text-align:right;">BALANCE DUE</td>
          <td style="padding:10px 12px;text-align:right;">${fmt(stmt.balance_due_cents as number)}</td>
        </tr>
      </tfoot>
    </table>

    <p style="text-align:center;margin:24px 0;">
      <a href="${payUrl}" style="background:#f59e0b;color:#1a1a1a;padding:14px 28px;border-radius:6px;text-decoration:none;font-weight:600;display:inline-block;">
        Pay Online — ${fmt(stmt.balance_due_cents as number)} →
      </a>
    </p>

    <p style="font-size:13px;color:#6b7280;text-align:center;">
      Or mail check payable to Eastern Landscape &amp; Mason Supply<br>
      110 Frowein Road, Center Moriches, NY 11934
    </p>
    <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;">
    <p style="text-align:center;color:#6b7280;font-size:13px;">Questions? Call <a href="tel:6318746244" style="color:#1e3a5f;">(631) 874-6244</a></p>
  </div>
</div>
</body></html>`;
}

export async function POST(request: Request, context: RouteContext) {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  const { id } = await context.params;
  const { via } = await request.json();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = getSupabaseAdminClient() as any;

  const { data: stmt, error } = await supabase
    .from("statements")
    .select("*, customers(first_name, last_name, charge_account_name, billing_email, billing_address, payment_terms, phone)")
    .eq("id", id)
    .single();

  if (error || !stmt) return NextResponse.json({ error: "Statement not found" }, { status: 404 });

  let orders: Array<{ order_number?: string; placed_at: string; grand_total_cents: number; delivery_method: string }> = [];
  if (stmt.order_ids?.length > 0) {
    const { data: orderData } = await supabase
      .from("orders")
      .select("order_number, placed_at, grand_total_cents, delivery_method")
      .in("id", stmt.order_ids)
      .order("placed_at");
    orders = orderData ?? [];
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.easternlm.com";
  const payUrl = `${siteUrl}/pay/${stmt.public_token}`;
  const customer = stmt.customers ?? {};
  const sent: string[] = [];
  const errors: string[] = [];

  // Email
  if (via.includes("email")) {
    const toEmail = customer.billing_email || customer.email;
    const apiKey = process.env.RESEND_API_KEY;
    const fromEmail = process.env.RESEND_FROM_EMAIL ?? "orders@easternlm.com";
    if (!apiKey) {
      errors.push("Email: RESEND_API_KEY not configured");
    } else if (!toEmail) {
      errors.push("Email: no email on file");
    } else {
      const resend = new Resend(apiKey);
      const result = await resend.emails.send({
        from: fromEmail,
        to: toEmail,
        subject: `Statement ${stmt.statement_number} — Eastern LM — Due ${stmt.due_date}`,
        html: buildStatementEmailHtml(stmt, customer, orders, payUrl),
      });
      if (result.error) errors.push(`Email: ${result.error.message}`);
      else sent.push("email");
    }
  }

  // SMS
  if (via.includes("sms") && customer.phone) {
    const sid = process.env.TWILIO_ACCOUNT_SID;
    const token = process.env.TWILIO_AUTH_TOKEN;
    const from = process.env.TWILIO_PHONE_NUMBER;
    if (sid && token && from) {
      const fmtFn = (c: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(c / 100);
      const msg = `Eastern LM: Your statement ${stmt.statement_number} is ready. Balance due: ${fmtFn(stmt.balance_due_cents)} by ${stmt.due_date}. Pay online: ${payUrl}`;
      const clean = customer.phone.replace(/\D/g, "");
      const to = clean.startsWith("1") ? `+${clean}` : `+1${clean}`;
      const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
        method: "POST",
        headers: {
          Authorization: `Basic ${Buffer.from(`${sid}:${token}`).toString("base64")}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({ To: to, From: from, Body: msg }),
      });
      const data = await res.json();
      if (data.sid) sent.push("sms");
      else errors.push(`SMS: ${data.message ?? "Twilio error"}`);
    }
  }

  // Update statement status
  await supabase.from("statements").update({
    status: "sent",
    sent_at: new Date().toISOString(),
    sent_via: sent,
    updated_at: new Date().toISOString(),
  }).eq("id", id);

  return NextResponse.json({ ok: true, sent, errors });
}
