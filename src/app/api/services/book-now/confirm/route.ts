import { NextResponse } from "next/server";
import Stripe from "stripe";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { verifyConfirmationToken } from "@/lib/book-now/confirmation-token";
import { sendSms } from "@/lib/sms";

/**
 * POST /api/services/book-now/confirm
 * Customer submits signed waivers. Captures platform fee, releases remainder,
 * updates order status, notifies provider + customer.
 */
export async function POST(request: Request) {
  const body = await request.json();
  const { token, nonCompeteSignature, liabilitySignature } = body;

  if (!token || !nonCompeteSignature || !liabilitySignature) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  // Verify token
  const verified = verifyConfirmationToken(token);
  if (!verified) {
    return NextResponse.json({ error: "Invalid or expired confirmation link" }, { status: 400 });
  }

  const supabase = getSupabaseAdminClient();

  // Fetch order + provider + platform fee rate
  const { data: order, error } = await (supabase as any)
    .from("orders")
    .select("*, providers:provider_id(id, name, phone, email)")
    .eq("id", verified.orderId)
    .single();

  if (error || !order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  if (order.status !== "awaiting_confirmation" && order.status !== "pending") {
    return NextResponse.json({ error: `Order is already ${order.status}` }, { status: 400 });
  }

  // Check if already signed
  if (order.metadata?.waivers_signed_at) {
    return NextResponse.json({ error: "Waivers already signed" }, { status: 400 });
  }

  // Get platform fee rate from site_settings
  const { data: settings } = await (supabase as any)
    .from("site_settings")
    .select("book_now_platform_fee_rate")
    .limit(1)
    .single();

  // Sealcoating bookings carry a FIXED non-refundable fee (stamped at booking).
  // Everything else uses the configurable platform-fee rate (default 20%).
  const fixedBookingFeeCents =
    typeof order.metadata?.booking_fee_cents === "number"
      ? order.metadata.booking_fee_cents
      : null;
  const feeRate = settings?.book_now_platform_fee_rate ?? 0.20;
  const platformFeeCents =
    fixedBookingFeeCents ?? Math.round(order.grand_total_cents * feeRate);

  // Capture platform fee via Stripe (partial capture)
  const piId = order.stripe_checkout_session_id;
  if (!piId || !piId.startsWith("pi_")) {
    return NextResponse.json({ error: "No PaymentIntent on order" }, { status: 400 });
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

  try {
    await stripe.paymentIntents.capture(piId, {
      amount_to_capture: platformFeeCents,
    });
  } catch (err: any) {
    // If auth already expired or captured
    return NextResponse.json({ error: `Payment capture failed: ${err.message}` }, { status: 400 });
  }

  // Update order with signatures and status
  const now = new Date().toISOString();
  await (supabase as any)
    .from("orders")
    .update({
      status: "scheduled",
      platform_fee_cents: platformFeeCents,
      metadata: {
        ...(order.metadata || {}),
        authorizationStatus: "partial_captured",
        waivers_signed_at: now,
        non_compete_signature: nonCompeteSignature,
        liability_waiver_signature: liabilitySignature,
        platform_fee_cents: platformFeeCents,
        capturedAt: now,
      },
    })
    .eq("id", verified.orderId);

  // ── Notifications ────────────────────────────────────────
  const { Resend } = await import("resend");
  const resend = new Resend(process.env.RESEND_API_KEY);
  const fromEmail = `Eastern LM <${process.env.RESEND_FROM_EMAIL ?? "orders@easternlm.com"}>`;

  // Notify admin
  try {
    await resend.emails.send({
      from: fromEmail,
      to: ["adam@easternbuilding.supply", "ronnie@easternbuilding.supply"],
      subject: `✅ CONFIRMED: ${order.customer_name} signed waivers — $${(platformFeeCents / 100).toFixed(2)} captured`,
      html: `<div style="font-family:system-ui,sans-serif;">
        <h2>✅ Booking Confirmed & Signed</h2>
        <p><strong>Customer:</strong> ${order.customer_name} (${order.customer_phone})</p>
        <p><strong>Platform fee captured:</strong> $${(platformFeeCents / 100).toFixed(2)}</p>
        <p><strong>Remaining auth released by Stripe.</strong></p>
        <p><strong>Provider:</strong> ${order.providers?.name || "Not assigned"}</p>
        <p><a href="https://easternlm.com/admin/operations">View in Admin</a></p>
      </div>`,
    });
  } catch (err) { console.error("[book-now] Admin confirm email:", err); }

  // Customer confirmation email with provider info
  const provider = order.providers;
  if (order.customer_email) {
    try {
      await resend.emails.send({
        from: fromEmail,
        to: order.customer_email,
        subject: "Booking Confirmed — Your Crew is Scheduled!",
        html: `<div style="max-width:560px;margin:0 auto;font-family:system-ui,sans-serif;">
          <div style="background:#002e44;padding:20px;text-align:center;">
            <span style="color:#fff;font-size:20px;font-weight:700;">Eastern Landscape &amp; Mason Supply</span>
          </div>
          <div style="padding:24px;">
            <h2 style="color:#002e44;">You're All Set!</h2>
            <p>Hi ${order.customer_name},</p>
            <p>Your booking is confirmed and your crew is scheduled${order.delivery_date ? ` for <strong>${order.delivery_date}</strong>` : ""}.</p>
            ${provider ? `
            <div style="background:#f0f7f4;padding:16px;border-radius:8px;margin:16px 0;">
              <p style="margin:0 0 4px;font-weight:700;">Your Crew</p>
              <p style="margin:0;">${provider.name}</p>
              ${provider.phone ? `<p style="margin:0;">Phone: ${provider.phone}</p>` : ""}
            </div>` : ""}
            <p><strong>Platform fee charged:</strong> $${(platformFeeCents / 100).toFixed(2)}</p>
            <p>The remaining balance is paid directly to your crew — 50% before work begins, 50% upon completion.</p>
            <p style="margin-top:20px;color:#666;font-size:12px;">Questions? Call (631) 874-6244</p>
          </div>
          <div style="background:#f5f5f0;padding:16px;text-align:center;font-size:12px;color:#888;">Eastern Landscape &amp; Mason Supply &middot; 110 Frowein Road, Center Moriches, NY 11934</div>
        </div>`,
      });
    } catch (err) { console.error("[book-now] Customer confirm email:", err); }
  }

  // Provider notification (if assigned)
  if (provider?.phone) {
    try {
      await sendSms(
        provider.phone,
        `Eastern LM dispatch: ${order.customer_name} at ${order.delivery_address || "address TBD"}${order.delivery_date ? ` on ${order.delivery_date}` : ""}. Customer phone: ${order.customer_phone}. Call yard for details: (631) 874-6244`
      );
    } catch (err) { console.error("[book-now] Provider SMS:", err); }
  }
  if (provider?.email) {
    try {
      const items = (order.metadata?.items || []) as Array<{ serviceName: string; inputs: Record<string, string | number> }>;
      await resend.emails.send({
        from: fromEmail,
        to: provider.email,
        subject: `New Job: ${order.customer_name} — ${order.delivery_date || "Date TBD"}`,
        html: `<div style="font-family:system-ui,sans-serif;">
          <h2>New Job Dispatch</h2>
          <p><strong>Customer:</strong> ${order.customer_name}</p>
          <p><strong>Phone:</strong> ${order.customer_phone}</p>
          <p><strong>Address:</strong> ${order.delivery_address || "TBD"}</p>
          <p><strong>Date:</strong> ${order.delivery_date || "TBD"}</p>
          <h3>Scope of Work</h3>
          <ul>${items.map((i) => `<li>${i.serviceName} — ${Object.entries(i.inputs).map(([k, v]) => `${k}: ${v}`).join(", ")}</li>`).join("")}</ul>
          <p>Contact the yard at (631) 874-6244 for questions.</p>
        </div>`,
      });
    } catch (err) { console.error("[book-now] Provider email:", err); }
  }

  return NextResponse.json({ ok: true, status: "scheduled", platformFeeCents });
}
