import { NextResponse } from "next/server";
import { requirePOS } from "@/lib/admin/auth";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import Stripe from "stripe";
import { sendSms } from "@/lib/sms";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2025-03-31.basil" as any });

// POST — create a Stripe payment link for a POS order and send via text/email
export async function POST(request: Request) {
  const auth = await requirePOS();
  if (auth instanceof NextResponse) return auth;

  const {
    orderId,
    amountCents,
    customerName,
    customerEmail,
    customerPhone,
    sendEmail,
    sendSms: shouldSendSms,
    description,
  } = await request.json();

  if (!amountCents || amountCents < 100) {
    return NextResponse.json({ error: "Amount must be at least $1.00" }, { status: 400 });
  }

  // Create Stripe Checkout Session for invoice payment
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://staging.easternlm.com";
  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    line_items: [
      {
        price_data: {
          currency: "usd",
          product_data: {
            name: description || `Invoice Payment — Eastern LM`,
          },
          unit_amount: amountCents,
        },
        quantity: 1,
      },
    ],
    metadata: {
      type: "pos_paylink",
      orderId: orderId || "",
      staffId: auth.userId,
    },
    success_url: `${baseUrl}/pay/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${baseUrl}/pay/cancelled`,
  });

  const payUrl = session.url!;

  // Send via email
  if (sendEmail && customerEmail) {
    try {
      const { Resend } = await import("resend");
      const resend = new Resend(process.env.RESEND_API_KEY);
      await resend.emails.send({
        from: process.env.RESEND_FROM_EMAIL || "orders@easternlm.com",
        to: customerEmail,
        subject: `Payment Request — Eastern Landscape & Mason Supply`,
        html: `
          <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto;">
            <h2 style="color: #1a3a5c;">Payment Request</h2>
            <p>Hi${customerName ? ` ${customerName}` : ""},</p>
            <p>${description || "You have a payment due with Eastern Landscape & Mason Supply."}</p>
            <p style="font-size: 24px; font-weight: bold; color: #c8952e;">$${(amountCents / 100).toFixed(2)}</p>
            <a href="${payUrl}" style="display: inline-block; background: #c8952e; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 16px;">
              Pay Now
            </a>
            <p style="margin-top: 20px; color: #888; font-size: 12px;">Eastern Landscape & Mason Supply — (631) 874-6244</p>
          </div>
        `,
      });
    } catch (err) {
      console.error("Paylink email failed:", err);
    }
  }

  // Send via SMS
  if (shouldSendSms && customerPhone) {
    try {
      await sendSms(customerPhone, `Eastern LM payment request: $${(amountCents / 100).toFixed(2)}${description ? ` — ${description}` : ""}\n\nPay here: ${payUrl}\n\nReply STOP to opt out.`).catch(() => {});
    } catch (err) {
      console.error("Paylink SMS failed:", err);
    }
  }

  // Update order with payment link if orderId provided
  if (orderId) {
    const supabase = getSupabaseAdminClient() as any;
    await supabase
      .from("orders")
      .update({ metadata: { paylink_url: payUrl, paylink_sent_at: new Date().toISOString() } })
      .eq("id", orderId);
  }

  return NextResponse.json({ ok: true, payUrl });
}
