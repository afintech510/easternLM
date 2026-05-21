import { NextResponse } from "next/server";
import Stripe from "stripe";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { sendSms } from "@/lib/sms";

/**
 * POST /api/checkout/confirm
 * Called by the client after successful embedded Stripe payment.
 * Marks the order as paid, sends confirmation emails, creates delivery assignments.
 */
export async function POST(request: Request) {
  const { paymentIntentId } = await request.json();
  if (!paymentIntentId) {
    return NextResponse.json({ error: "paymentIntentId required" }, { status: 400 });
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

  // Verify the PaymentIntent reached a terminal-auth state.
  // - succeeded: normal flow (auto-capture). Continue and mark paid.
  // - requires_capture: manual-capture flow (>20mi delivery). Auth succeeded
  //   but funds aren't captured yet — admin must accept the order. Stamp the
  //   order with authorizationStatus and return early without running the
  //   normal fulfillment side effects.
  const pi = await stripe.paymentIntents.retrieve(paymentIntentId);
  if (pi.status !== "succeeded" && pi.status !== "requires_capture") {
    return NextResponse.json({ error: `Payment not completed (status: ${pi.status})` }, { status: 400 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = getSupabaseAdminClient() as any;

  // Find the order by stripe_checkout_session_id (we stored PI id there)
  const { data: order } = await supabase
    .from("orders")
    .select("*")
    .eq("stripe_checkout_session_id", paymentIntentId)
    .maybeSingle();

  if (!order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  // Manual-capture auth path — stamp metadata and stop. The admin will capture
  // or release later via the /admin/orders/[id]/capture endpoints.
  if (pi.status === "requires_capture") {
    await supabase
      .from("orders")
      .update({
        payment_method: "card_online",
        metadata: { ...(order.metadata || {}), authorizationStatus: "authorized" },
      })
      .eq("id", order.id);
    return NextResponse.json({ ok: true, orderId: order.id, requiresReview: true });
  }

  if (order.status === "paid") {
    // Already processed (idempotent)
    return NextResponse.json({ ok: true, orderId: order.id, alreadyPaid: true });
  }

  // Mark order as paid
  await supabase
    .from("orders")
    .update({ status: "paid", payment_method: "card_online" })
    .eq("id", order.id);

  // Customer linking — find or create customer
  try {
    const phone = order.customer_phone?.replace(/\D/g, "").slice(-10);
    let customerId: string | null = null;

    if (phone) {
      const { data: existing } = await supabase
        .from("customers")
        .select("id")
        .ilike("phone", `%${phone}%`)
        .limit(1)
        .maybeSingle();
      customerId = existing?.id ?? null;
    }

    if (!customerId && order.customer_email) {
      const { data: existing } = await supabase
        .from("customers")
        .select("id")
        .eq("email", order.customer_email.toLowerCase())
        .limit(1)
        .maybeSingle();
      customerId = existing?.id ?? null;
    }

    if (!customerId) {
      const names = (order.customer_name || "").trim().split(/\s+/);
      const { data: created } = await supabase.from("customers").insert({
        first_name: names[0] || "",
        last_name: names.slice(1).join(" ") || "",
        phone: phone || null,
        email: order.customer_email || null,
        address: order.delivery_address || null,
        source: "web_order",
      }).select("id").single();
      customerId = created?.id ?? null;
    }

    if (customerId) {
      await supabase.from("orders").update({ customer_id: customerId }).eq("id", order.id);
    }
  } catch (err) {
    console.error("[confirm] Customer linking error:", err);
  }

  // Create delivery assignments
  if (order.delivery_method === "delivery") {
    try {
      const { createDeliveryAssignments } = await import("@/lib/dispatch/auto-assign");
      await createDeliveryAssignments(order);
    } catch (err) {
      console.error("[confirm] Delivery assignment error:", err);
    }
  }

  // Send confirmation email to customer
  try {
    const { Resend } = await import("resend");
    const resend = new Resend(process.env.RESEND_API_KEY);
    const fmt = (c: number) => `$${(c / 100).toFixed(2)}`;

    // Get order items
    const { data: orderItems } = await supabase
      .from("order_items")
      .select("product_name, quantity, unit, unit_price_cents, line_subtotal_cents")
      .eq("order_id", order.id);

    const itemRows = (orderItems ?? [])
      .filter((i: any) => !i.product_name?.startsWith("Delivery Load") && !i.product_name?.startsWith("Sales Tax") && !i.product_name?.startsWith("Credit Card"))
      .map((i: any) => `<tr><td style="padding:6px 0;border-bottom:1px solid #eee;">${i.quantity} × ${i.product_name}</td><td style="padding:6px 0;border-bottom:1px solid #eee;text-align:right;">${fmt(i.line_subtotal_cents)}</td></tr>`)
      .join("");

    if (order.customer_email) {
      await resend.emails.send({
        from: `Eastern LM <${process.env.RESEND_FROM_EMAIL ?? "orders@easternlm.com"}>`,
        to: order.customer_email,
        subject: `Order Confirmed — Eastern Landscape & Mason Supply`,
        html: `<div style="max-width:560px;margin:0 auto;font-family:system-ui,sans-serif;">
          <div style="background:#002e44;padding:20px;text-align:center;"><span style="color:#fff;font-size:20px;font-weight:700;">Eastern Landscape & Mason Supply</span></div>
          <div style="padding:24px;">
            <h2 style="color:#002e44;">Order Confirmed!</h2>
            <p>Hi ${order.customer_name},</p>
            <p>Thank you for your order. Here's your summary:</p>
            <table style="width:100%;border-collapse:collapse;">${itemRows}</table>
            <table style="width:100%;margin:16px 0;">
              <tr><td style="padding:4px 0;"><strong>Total:</strong></td><td style="text-align:right;"><strong>${fmt(order.grand_total_cents)}</strong></td></tr>
            </table>
            ${order.delivery_method === "delivery" && order.delivery_address ? `<p><strong>Delivery to:</strong> ${order.delivery_address}</p>` : `<p><strong>Pickup at:</strong> 110 Frowein Road, Center Moriches, NY 11934</p>`}
            <p>We'll be in touch about ${order.delivery_method === "delivery" ? "scheduling your delivery" : "pickup availability"}.</p>
            <p style="margin-top:20px;color:#666;font-size:12px;">Questions? Call (631) 874-6244</p>
          </div>
          <div style="background:#f5f5f0;padding:16px;text-align:center;font-size:12px;color:#888;">Eastern Landscape & Mason Supply · 110 Frowein Road, Center Moriches, NY 11934</div>
        </div>`,
      });
      console.log(`[confirm] Customer email sent to ${order.customer_email}`);
    }
  } catch (err) {
    console.error("[confirm] Customer email error:", err);
  }

  // Send notification to office
  try {
    const { Resend } = await import("resend");
    const resend = new Resend(process.env.RESEND_API_KEY);
    const fmt = (c: number) => `$${(c / 100).toFixed(2)}`;

    await resend.emails.send({
      from: `Eastern LM Orders <${process.env.RESEND_FROM_EMAIL ?? "orders@easternlm.com"}>`,
      to: ["adam@easternbuilding.supply", "ronnie@easternbuilding.supply"],
      subject: `New Order: ${order.customer_name} — ${fmt(order.grand_total_cents)}`,
      html: `<div style="font-family:system-ui,sans-serif;">
        <h2>New Order Received</h2>
        <p><strong>Customer:</strong> ${order.customer_name}</p>
        <p><strong>Phone:</strong> ${order.customer_phone || "—"}</p>
        <p><strong>Email:</strong> ${order.customer_email || "—"}</p>
        <p><strong>Total:</strong> ${fmt(order.grand_total_cents)}</p>
        <p><strong>Method:</strong> ${order.delivery_method}</p>
        ${order.delivery_address ? `<p><strong>Delivery:</strong> ${order.delivery_address}</p>` : ""}
        <p><a href="https://easternlm.com/admin/operations">View in Admin</a></p>
      </div>`,
    });
    console.log("[confirm] Office notification sent");
  } catch (err) {
    console.error("[confirm] Office email error:", err);
  }

  // SMS notification to office phone
  try {
    const f = (c: number) => `$${(c / 100).toFixed(2)}`;
    await sendSms("+16318746244", `New order: ${order.customer_name} — ${f(order.grand_total_cents)} — ${order.delivery_method === "delivery" ? `Delivery to ${order.delivery_address}` : "Pickup"}`).catch(() => {});
  } catch {}

  return NextResponse.json({ ok: true, orderId: order.id });
}
