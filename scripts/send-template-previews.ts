import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);
const from = `Eastern LM <${process.env.RESEND_FROM_EMAIL ?? "noreply@easternlm.com"}>`;
const to = "alark51@gmail.com";

async function main() {
  // 1. Order Confirmation
  await resend.emails.send({
    from, to,
    subject: "[TEMPLATE PREVIEW 1/6] Order Confirmation",
    html: `
<div style="font-family:Arial,sans-serif;line-height:1.45;color:#111827;max-width:560px;margin:0 auto;padding:24px;">
  <div style="text-align:center;margin-bottom:20px;">
    <h1 style="color:#1a3a5c;margin:0;">Eastern Landscape &amp; Mason Supply</h1>
    <p style="color:#666;margin:4px 0 0;">Order Confirmation</p>
  </div>
  <h2 style="margin:0 0 12px;">Order Confirmed!</h2>
  <p style="margin:0 0 6px;">Order ID: <strong>ORD-20260315-001</strong></p>
  <p style="margin:0 0 6px;">Customer: <strong>John Smith</strong></p>
  <p style="margin:0 0 12px;">Delivery Method: <strong>Delivery</strong></p>

  <h3 style="margin:16px 0 8px;">Items</h3>
  <table style="width:100%;border-collapse:collapse;font-size:14px;">
    <thead>
      <tr>
        <th style="text-align:left;padding:6px 8px;border-bottom:2px solid #d1d5db;">Product</th>
        <th style="text-align:left;padding:6px 8px;border-bottom:2px solid #d1d5db;">Qty</th>
        <th style="text-align:left;padding:6px 8px;border-bottom:2px solid #d1d5db;">Line Total</th>
      </tr>
    </thead>
    <tbody>
      <tr><td style="padding:6px 8px;border-bottom:1px solid #e5e7eb;">Black Mulch</td><td style="padding:6px 8px;border-bottom:1px solid #e5e7eb;">5 yd</td><td style="padding:6px 8px;border-bottom:1px solid #e5e7eb;">$190.00</td></tr>
      <tr><td style="padding:6px 8px;border-bottom:1px solid #e5e7eb;">Screened Organic Topsoil</td><td style="padding:6px 8px;border-bottom:1px solid #e5e7eb;">3 yd</td><td style="padding:6px 8px;border-bottom:1px solid #e5e7eb;">$72.00</td></tr>
    </tbody>
  </table>

  <h3 style="margin:16px 0 8px;">Fees</h3>
  <ul style="padding-left:18px;margin:0 0 12px;">
    <li>Materials: $262.00</li>
    <li>Delivery (1st load): $65.00</li>
    <li>Delivery (addl load): $50.00</li>
    <li>Tax (8.75%): $33.00</li>
    <li>CC Processing Fee (3%): $12.30</li>
    <li><strong>Total: $422.30</strong></li>
  </ul>

  <h3 style="margin:16px 0 8px;">Delivery Schedule</h3>
  <ul style="padding-left:18px;margin:0 0 12px;">
    <li>Load 1: 5yd Black Mulch (Small Dump)</li>
    <li>Load 2: 3yd Screened Organic Topsoil (Small Dump)</li>
  </ul>

  <p style="margin:0 0 4px;">Delivery Address: 15 Oak Street, Shirley, NY 11967</p>
  <p style="margin:16px 0 0;color:#666;font-size:13px;">Eastern Landscape &amp; Mason Supply<br>110 Frowein Road, Center Moriches, NY 11934<br>(631) 874-6244</p>
</div>`,
  });
  console.log("1/6 Order Confirmation sent");

  // 2. Service Lead Notification
  await resend.emails.send({
    from, to,
    subject: "[TEMPLATE PREVIEW 2/6] New Service Lead — Gravel Driveway",
    html: `
<div style="font-family:system-ui,sans-serif;max-width:500px;margin:0 auto;padding:24px;">
  <h2 style="color:#1a3a5c;margin:0 0 16px;">New Gravel Driveway Lead</h2>
  <table style="width:100%;border-collapse:collapse;">
    <tr><td style="padding:8px 16px;color:#666;">Name</td><td style="padding:8px 16px;font-weight:600;">Mike Johnson</td></tr>
    <tr><td style="padding:8px 16px;color:#666;">Phone</td><td style="padding:8px 16px;font-weight:600;"><a href="tel:+16315551234">(631) 555-1234</a></td></tr>
    <tr><td style="padding:8px 16px;color:#666;">Town</td><td style="padding:8px 16px;">Manorville</td></tr>
    <tr><td style="padding:8px 16px;color:#666;">Service</td><td style="padding:8px 16px;">Gravel Driveway &mdash; New Installation</td></tr>
    <tr><td style="padding:8px 16px;color:#666;">Timeline</td><td style="padding:8px 16px;">Within 2 weeks</td></tr>
    <tr><td style="padding:8px 16px;color:#666;">Description</td><td style="padding:8px 16px;">Need a new gravel driveway, about 80 feet long. Currently dirt/mud. Want RCA base with bluestone on top.</td></tr>
  </table>
  <div style="margin-top:16px;padding:12px;background:#ecfdf5;border-radius:8px;border-left:4px solid #10b981;">
    <strong style="color:#059669;">Returning Customer</strong><br>
    <span style="font-size:13px;">12 previous orders, $4,230 lifetime spend<br>Last order: Feb 2026 &mdash; 10yd Black Mulch</span>
  </div>
</div>`,
  });
  console.log("2/6 Lead Notification sent");

  // 3. Contact Form
  await resend.emails.send({
    from, to,
    subject: "[TEMPLATE PREVIEW 3/6] Contact Form Submission",
    html: `
<div style="font-family:system-ui,sans-serif;max-width:500px;margin:0 auto;padding:24px;">
  <h2 style="color:#1a3a5c;">New Contact Form Submission</h2>
  <table style="border-collapse:collapse;font-family:sans-serif;">
    <tr><td style="padding:6px 12px;font-weight:bold;">Name</td><td style="padding:6px 12px;">Sarah Williams</td></tr>
    <tr><td style="padding:6px 12px;font-weight:bold;">Email</td><td style="padding:6px 12px;"><a href="mailto:sarah@example.com">sarah@example.com</a></td></tr>
    <tr><td style="padding:6px 12px;font-weight:bold;">Phone</td><td style="padding:6px 12px;"><a href="tel:6315559876">(631) 555-9876</a></td></tr>
    <tr><td style="padding:6px 12px;font-weight:bold;">Project</td><td style="padding:6px 12px;">Patio Installation</td></tr>
  </table>
  <h3 style="margin-top:16px;">Message</h3>
  <p style="white-space:pre-wrap;background:#f5f5f5;padding:12px;border-radius:6px;">Hi, I am looking for a quote on a bluestone patio, approximately 12x15 feet. We are in East Moriches. Can someone come take a look? Thanks!</p>
</div>`,
  });
  console.log("3/6 Contact Form sent");

  // 4. Review Request Email
  await resend.emails.send({
    from, to,
    subject: "[TEMPLATE PREVIEW 4/6] How was your delivery, John?",
    html: `
<div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:24px;">
  <h2 style="color:#1a3a5c;">Thanks for your order!</h2>
  <p>Hi John,</p>
  <p>We hope your <strong>5yd Black Mulch + 3yd Topsoil</strong> arrived just right. Our family has been serving Suffolk County for over 30 years, and we'd love to hear how we did.</p>
  <p>Would you take 30 seconds to leave us a Google review?</p>
  <a href="https://g.page/r/CYeWasaAwkzVEBM/review" style="display:inline-block;background:#1a3a5c;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:600;margin:16px 0;">Leave a Review</a>
  <p style="color:#666;font-size:13px;margin-top:24px;">Eastern Landscape &amp; Mason Supply<br>110 Frowein Road, Center Moriches, NY 11934<br>(631) 874-6244</p>
  <p style="color:#999;font-size:11px;"><a href="https://easternlm.com/unsubscribe" style="color:#999;">Unsubscribe</a></p>
</div>`,
  });
  console.log("4/6 Review Request sent");

  // 5. SMS Templates (as email preview)
  await resend.emails.send({
    from, to,
    subject: "[TEMPLATE PREVIEW 5/6] SMS Templates — Review + Delivery Updates",
    html: `
<div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:24px;">
  <h2 style="color:#1a3a5c;">SMS Templates</h2>

  <h3>1. Review Request (2 hours after delivery)</h3>
  <div style="background:#f0f4f8;padding:16px;border-radius:8px;border:1px solid #d1d5db;margin-bottom:20px;font-size:14px;">
    Hi John! Thanks for your order from Eastern LM. We hope you're happy with your 5yd Black Mulch. Would you mind leaving us a quick Google review? It really helps our family business. https://g.page/r/CYeWasaAwkzVEBM/review - The Eastern LM Team
  </div>

  <h3>2. Review Reminder (7 days later)</h3>
  <div style="background:#f0f4f8;padding:16px;border-radius:8px;border:1px solid #d1d5db;margin-bottom:20px;font-size:14px;">
    Hi John, just a friendly reminder from Eastern LM. If you have a moment, a Google review would mean a lot to us: https://g.page/r/CYeWasaAwkzVEBM/review Thanks! Reply STOP to opt out.
  </div>

  <h3>3. Delivery On The Way (transactional)</h3>
  <div style="background:#f0f4f8;padding:16px;border-radius:8px;border:1px solid #d1d5db;margin-bottom:20px;font-size:14px;">
    Your Eastern LM delivery is on the way! ETA ~19 minutes. 5yd Black Mulch to 15 Oak St, Shirley. Questions? Call (631) 874-6244
  </div>

  <h3>4. Delivery Complete (transactional)</h3>
  <div style="background:#f0f4f8;padding:16px;border-radius:8px;border:1px solid #d1d5db;font-size:14px;">
    Your 5yd Black Mulch has been delivered to 15 Oak St, Shirley. Thank you for choosing Eastern LM! (631) 874-6244
  </div>
</div>`,
  });
  console.log("5/6 SMS Templates sent");

  // 6. Marketing Campaign Example
  await resend.emails.send({
    from, to,
    subject: "[TEMPLATE PREVIEW 6/6] Marketing Campaign — Spring Mulch Season",
    html: `
<div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:24px;">
  <div style="background:#1a3a5c;color:#fff;padding:24px;border-radius:8px 8px 0 0;text-align:center;">
    <h1 style="margin:0;font-size:24px;">Spring Mulch Season Is Here!</h1>
    <p style="margin:8px 0 0;opacity:0.9;">Eastern Landscape &amp; Mason Supply</p>
  </div>
  <div style="background:#fff;padding:24px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 8px 8px;">
    <p>Hi John,</p>
    <p>Spring is here and it's time to refresh those garden beds! We have fresh mulch in stock and ready for <strong>same-day delivery</strong>.</p>
    <div style="background:#fef3c7;padding:16px;border-radius:6px;margin:16px 0;">
      <strong>This Week's Prices:</strong><br>
      Dark Natural Mulch &mdash; <strong>$20/yd</strong><br>
      Black Mulch &mdash; <strong>$38/yd</strong><br>
      Chocolate Mulch &mdash; <strong>$38/yd</strong><br>
      Red Mulch &mdash; <strong>$35/yd</strong>
    </div>
    <p>Not sure how much you need? Use our <a href="https://easternlm.com/calculator/mulch" style="color:#1a3a5c;font-weight:600;">Mulch Calculator</a> to find out in seconds.</p>
    <a href="https://easternlm.com/shop?category=mulch" style="display:inline-block;background:#d4a853;color:#1a3a5c;padding:14px 28px;border-radius:6px;text-decoration:none;font-weight:700;margin:16px 0;">Shop Mulch Now</a>
    <p>Or call us: <a href="tel:+16318746244" style="color:#1a3a5c;font-weight:600;">(631) 874-6244</a></p>
    <p style="color:#666;font-size:13px;margin-top:24px;">
      Eastern Landscape &amp; Mason Supply<br>
      110 Frowein Road, Center Moriches, NY 11934<br>
      (631) 874-6244<br><br>
      <a href="https://easternlm.com/unsubscribe" style="color:#999;font-size:11px;">Unsubscribe</a>
    </p>
  </div>
</div>`,
  });
  console.log("6/6 Marketing Campaign sent");
  console.log("\nAll 6 template previews sent to alark51@gmail.com!");
}

main().catch(console.error);
