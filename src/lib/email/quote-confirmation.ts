/**
 * Sends a thorough confirmation email to the customer after deposit/payment on a quote.
 */
export async function sendQuoteConfirmationEmail(quote: {
  quote_number: string;
  customer_name: string;
  customer_email: string | null;
  customer_phone: string | null;
  customer_address: string | null;
  title: string;
  description: string | null;
  line_items: { description: string; quantity: number; unit: string; unit_price_cents: number; total_cents: number }[];
  subtotal_cents: number;
  tax_cents: number;
  total_cents: number;
  deposit_required_cents: number;
  deposit_paid_cents: number;
  delivery_address: string | null;
  delivery_fee_cents: number;
  delivery_date: string | null;
  delivery_time_window: string | null;
  delivery_notes: string | null;
  estimated_timeline: string | null;
  terms: string | null;
  public_token: string;
}, opts?: { depositAmountCents?: number; paymentMethod?: string }) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey || !quote.customer_email) return;

  const { Resend } = await import("resend");
  const resend = new Resend(apiKey);
  const fromEmail = process.env.RESEND_FROM_EMAIL ?? "orders@easternlm.com";

  const fmt = (c: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(c / 100);
  const depositPaid = opts?.depositAmountCents ?? quote.deposit_paid_cents ?? 0;
  const balanceDue = quote.total_cents - (quote.deposit_required_cents > 0 ? quote.deposit_required_cents : 0);
  const isService = quote.deposit_required_cents > 0;

  const timeWindowMap: Record<string, string> = {
    early: "Early Morning (7:30 AM – 9:00 AM)",
    morning: "Morning (8:00 AM – 12:00 PM)",
    afternoon: "Afternoon (12:00 PM – 5:00 PM)",
    flexible: "Flexible (7:30 AM – 5:00 PM)",
  };

  const itemRows = quote.line_items
    .map(i => `
      <tr>
        <td style="padding:10px 0;border-bottom:1px solid #f0eeea;font-size:14px;color:#27272a;">${i.description}</td>
        <td style="padding:10px 0;border-bottom:1px solid #f0eeea;font-size:14px;color:#71717a;text-align:center;white-space:nowrap;">${i.quantity} ${i.unit}</td>
        <td style="padding:10px 0;border-bottom:1px solid #f0eeea;font-size:14px;color:#27272a;text-align:right;white-space:nowrap;font-weight:600;">${fmt(i.total_cents)}</td>
      </tr>`)
    .join("");

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://staging.easternlm.com";
  const quoteUrl = `${siteUrl}/quote/${quote.public_token}`;

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f4f2ec;font-family:system-ui,-apple-system,sans-serif;">
  <div style="max-width:600px;margin:0 auto;background:#ffffff;">

    <!-- Header -->
    <div style="background:#002e44;padding:28px 32px;text-align:center;">
      <img src="${siteUrl}/logo-white.png" alt="Eastern LM" width="160" height="42" style="height:42px;width:auto;" />
      <p style="color:rgba(255,255,255,0.5);font-size:11px;margin:4px 0 0;letter-spacing:2px;text-transform:uppercase;">Landscape & Mason Supply</p>
    </div>

    <!-- Confirmation Banner -->
    <div style="background:#f0fdf4;border-bottom:2px solid #bbf7d0;padding:24px 32px;text-align:center;">
      <p style="font-size:28px;margin:0 0 4px;">&#10003;</p>
      <h1 style="margin:0;font-size:22px;font-weight:700;color:#166534;">
        ${isService ? "Deposit Received!" : "Payment Confirmed!"}
      </h1>
      <p style="margin:8px 0 0;font-size:14px;color:#15803d;">
        Thank you, ${quote.customer_name.split(" ")[0]}. ${isService ? "Your project is now scheduled." : "We're preparing your order."}
      </p>
    </div>

    <!-- Quote Details -->
    <div style="padding:32px;">

      <!-- Quote Number & Date -->
      <table style="width:100%;margin-bottom:24px;">
        <tr>
          <td style="font-size:13px;color:#71717a;">Quote Number</td>
          <td style="font-size:13px;color:#71717a;text-align:right;">Date</td>
        </tr>
        <tr>
          <td style="font-size:16px;font-weight:700;color:#27272a;">${quote.quote_number}</td>
          <td style="font-size:16px;font-weight:700;color:#27272a;text-align:right;">${new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</td>
        </tr>
      </table>

      <!-- Project Title -->
      <div style="background:#f9f6f2;border-radius:10px;padding:16px 20px;margin-bottom:24px;">
        <p style="margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:1px;color:#a1a1aa;font-weight:700;">Project</p>
        <p style="margin:0;font-size:15px;font-weight:600;color:#27272a;">${quote.title}</p>
        ${quote.description ? `<p style="margin:8px 0 0;font-size:13px;color:#71717a;line-height:1.5;">${quote.description.replace(/\n/g, "<br/>")}</p>` : ""}
      </div>

      <!-- Customer Info -->
      <div style="margin-bottom:24px;">
        <p style="margin:0 0 8px;font-size:11px;text-transform:uppercase;letter-spacing:1px;color:#a1a1aa;font-weight:700;">Customer</p>
        <table style="font-size:14px;color:#27272a;">
          <tr><td style="padding:2px 16px 2px 0;color:#71717a;">Name</td><td style="font-weight:600;">${quote.customer_name}</td></tr>
          ${quote.customer_phone ? `<tr><td style="padding:2px 16px 2px 0;color:#71717a;">Phone</td><td>${quote.customer_phone}</td></tr>` : ""}
          ${quote.customer_email ? `<tr><td style="padding:2px 16px 2px 0;color:#71717a;">Email</td><td>${quote.customer_email}</td></tr>` : ""}
          ${quote.customer_address ? `<tr><td style="padding:2px 16px 2px 0;color:#71717a;">Address</td><td>${quote.customer_address}</td></tr>` : ""}
        </table>
      </div>

      <!-- Line Items -->
      <p style="margin:0 0 8px;font-size:11px;text-transform:uppercase;letter-spacing:1px;color:#a1a1aa;font-weight:700;">Items</p>
      <table style="width:100%;border-collapse:collapse;margin-bottom:16px;">
        <tr>
          <th style="text-align:left;font-size:11px;color:#a1a1aa;padding:0 0 8px;font-weight:600;">Description</th>
          <th style="text-align:center;font-size:11px;color:#a1a1aa;padding:0 0 8px;font-weight:600;">Qty</th>
          <th style="text-align:right;font-size:11px;color:#a1a1aa;padding:0 0 8px;font-weight:600;">Amount</th>
        </tr>
        ${itemRows}
      </table>

      <!-- Totals -->
      <table style="width:100%;margin-bottom:24px;">
        <tr><td style="padding:4px 0;font-size:14px;color:#71717a;">Materials</td><td style="text-align:right;font-size:14px;color:#27272a;">${fmt(quote.subtotal_cents)}</td></tr>
        ${quote.delivery_fee_cents > 0 ? `<tr><td style="padding:4px 0;font-size:14px;color:#71717a;">Delivery</td><td style="text-align:right;font-size:14px;color:#27272a;">${fmt(quote.delivery_fee_cents)}</td></tr>` : ""}
        <tr><td style="padding:4px 0;font-size:14px;color:#71717a;">Tax (8.75%)</td><td style="text-align:right;font-size:14px;color:#27272a;">${fmt(quote.tax_cents)}</td></tr>
        <tr><td colspan="2" style="padding:4px 0;"><hr style="border:none;border-top:2px solid #e4e4e7;margin:4px 0;" /></td></tr>
        <tr><td style="padding:4px 0;font-size:16px;font-weight:700;color:#27272a;">Total</td><td style="text-align:right;font-size:16px;font-weight:700;color:#27272a;">${fmt(quote.total_cents)}</td></tr>
        ${isService ? `
          <tr><td style="padding:4px 0;font-size:14px;font-weight:600;color:#166534;">Deposit Paid</td><td style="text-align:right;font-size:14px;font-weight:600;color:#166534;">${fmt(depositPaid)}</td></tr>
          <tr><td style="padding:4px 0;font-size:14px;color:#71717a;">Balance Due on Completion</td><td style="text-align:right;font-size:14px;color:#27272a;">${fmt(balanceDue)}</td></tr>
        ` : `
          <tr><td style="padding:4px 0;font-size:14px;font-weight:600;color:#166534;">Paid</td><td style="text-align:right;font-size:14px;font-weight:600;color:#166534;">${fmt(depositPaid || quote.total_cents)}</td></tr>
        `}
      </table>

      <!-- Delivery Details -->
      ${quote.delivery_address ? `
        <div style="background:#f9f6f2;border-radius:10px;padding:16px 20px;margin-bottom:24px;">
          <p style="margin:0 0 8px;font-size:11px;text-transform:uppercase;letter-spacing:1px;color:#a1a1aa;font-weight:700;">Delivery Details</p>
          <table style="font-size:14px;color:#27272a;">
            <tr><td style="padding:2px 16px 2px 0;color:#71717a;">Address</td><td style="font-weight:600;">${quote.delivery_address}</td></tr>
            ${quote.delivery_date ? `<tr><td style="padding:2px 16px 2px 0;color:#71717a;">Date</td><td>${new Date(quote.delivery_date + "T12:00:00").toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}</td></tr>` : ""}
            ${quote.delivery_time_window ? `<tr><td style="padding:2px 16px 2px 0;color:#71717a;">Time</td><td>${timeWindowMap[quote.delivery_time_window] ?? quote.delivery_time_window}</td></tr>` : ""}
            ${quote.delivery_notes ? `<tr><td style="padding:2px 16px 2px 0;color:#71717a;">Notes</td><td>${quote.delivery_notes}</td></tr>` : ""}
          </table>
        </div>
      ` : `
        <div style="background:#f9f6f2;border-radius:10px;padding:16px 20px;margin-bottom:24px;">
          <p style="margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:1px;color:#a1a1aa;font-weight:700;">Pickup</p>
          <p style="margin:0;font-size:14px;font-weight:600;color:#27272a;">110 Frowein Road, Center Moriches, NY 11934</p>
          <p style="margin:4px 0 0;font-size:13px;color:#71717a;">Mon–Sat 7:00 AM – 4:00 PM</p>
        </div>
      `}

      ${quote.estimated_timeline ? `
        <div style="background:#eff6ff;border-radius:10px;padding:14px 20px;margin-bottom:24px;">
          <p style="margin:0;font-size:13px;color:#1e40af;"><strong>Estimated Timeline:</strong> ${quote.estimated_timeline}</p>
        </div>
      ` : ""}

      <!-- View Quote Link -->
      <div style="text-align:center;margin:28px 0;">
        <a href="${quoteUrl}" style="display:inline-block;background:#d58300;color:#ffffff;padding:14px 36px;border-radius:10px;text-decoration:none;font-weight:700;font-size:15px;">
          View Your Quote
        </a>
      </div>

      ${quote.terms ? `
        <div style="border-top:1px solid #e4e4e7;padding-top:16px;margin-top:8px;">
          <p style="margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:1px;color:#a1a1aa;font-weight:700;">Terms</p>
          <p style="margin:0;font-size:12px;color:#a1a1aa;line-height:1.5;">${quote.terms}</p>
        </div>
      ` : ""}
    </div>

    <!-- Footer -->
    <div style="background:#f9f6f2;padding:24px 32px;text-align:center;border-top:1px solid #e4e4e7;">
      <p style="margin:0;font-size:14px;font-weight:600;color:#27272a;">Eastern Landscape &amp; Mason Supply</p>
      <p style="margin:4px 0 0;font-size:13px;color:#71717a;">110 Frowein Road · Center Moriches, NY 11934</p>
      <p style="margin:4px 0 0;font-size:13px;color:#71717a;">(631) 874-6244 · easternlm.com</p>
      <p style="margin:12px 0 0;font-size:12px;color:#a1a1aa;">Questions about your order? Call or text us anytime.</p>
    </div>
  </div>
</body>
</html>`;

  await resend.emails.send({
    from: `Eastern LM <${fromEmail}>`,
    replyTo: "quotes@easternlm.com",
    to: quote.customer_email,
    subject: `${isService ? "Deposit Confirmed" : "Payment Confirmed"} — ${quote.quote_number} | Eastern LM`,
    html,
  });
}
