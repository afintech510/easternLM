import { NextResponse } from "next/server";
import Stripe from "stripe";
import { z } from "zod";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { sendSms } from "@/lib/sms";

const bookingSchema = z.object({
  items: z.array(z.object({
    serviceId: z.string(),
    serviceSlug: z.string(),
    serviceName: z.string(),
    packageName: z.string(),
    packageUnit: z.string(),
    quantity: z.number().positive(),
    priceCents: z.number().nonnegative(),
    lineTotalCents: z.number().nonnegative(),
  })).min(1),
  customer: z.object({
    name: z.string().min(2),
    email: z.string().email(),
    phone: z.string().min(7),
  }),
  address: z.string().min(5),
  preferredDate: z.string().optional(),
  notes: z.string().optional(),
  paymentMethodId: z.string().min(5),
  clientTotalCents: z.number().positive(),
});

const CC_SURCHARGE_RATE = 0.03;

export async function POST(request: Request) {
  const raw = await request.json();
  const parsed = bookingSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid booking payload", details: parsed.error.issues }, { status: 400 });
  }
  const payload = parsed.data;

  const subtotalCents = payload.items.reduce((s, i) => s + i.lineTotalCents, 0);
  // No tax on services (labor is not taxable in NY for residential property)
  const ccSurchargeCents = Math.round(subtotalCents * CC_SURCHARGE_RATE);
  const grandTotalCents = subtotalCents + ccSurchargeCents;

  // Client/server total validation (allow $1 drift for rounding)
  if (Math.abs(grandTotalCents - payload.clientTotalCents) > 100) {
    return NextResponse.json(
      { error: "Total mismatch. Please refresh and try again.", serverTotal: grandTotalCents },
      { status: 400 },
    );
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
  const supabase = getSupabaseAdminClient();

  // Create PaymentIntent with MANUAL capture (authorization hold, not charge)
  let paymentIntent: Stripe.PaymentIntent;
  try {
    paymentIntent = await stripe.paymentIntents.create({
      amount: grandTotalCents,
      currency: "usd",
      payment_method: payload.paymentMethodId,
      capture_method: "manual", // authorization hold only
      confirmation_method: "automatic",
      confirm: true,
      return_url: (process.env.NEXT_PUBLIC_SITE_URL || "https://easternlm.com") + "/services/book-now/success",
      receipt_email: payload.customer.email,
      description: `Instant-book services — ${payload.items.map((i) => i.serviceName).join(", ")}`,
      metadata: {
        source: "instant_book",
        customerName: payload.customer.name,
        customerPhone: payload.customer.phone,
        address: payload.address,
        preferredDate: payload.preferredDate || "",
        servicesCount: String(payload.items.length),
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Payment authorization failed" },
      { status: 400 },
    );
  }

  if (paymentIntent.status !== "requires_capture") {
    return NextResponse.json(
      { error: `Authorization did not complete (status: ${paymentIntent.status})` },
      { status: 400 },
    );
  }

  // Create order record
  const { data: order, error: orderError } = await (supabase as any)
    .from("orders")
    .insert({
      stripe_checkout_session_id: paymentIntent.id,
      customer_name: payload.customer.name,
      customer_email: payload.customer.email,
      customer_phone: payload.customer.phone,
      status: "pending",
      order_type: "instant_book_service",
      capture_method: "manual",
      payment_method: "card_online",
      delivery_method: "delivery", // crew goes to customer
      delivery_address: payload.address,
      materials_subtotal_cents: subtotalCents,
      delivery_total_cents: 0,
      tax_cents: 0,
      cc_surcharge_cents: ccSurchargeCents,
      grand_total_cents: grandTotalCents,
      total_loads: 0,
      total_delivery_days: 0,
      delivery_date: payload.preferredDate || null,
      access_constraints: {},
      source: "instant_book",
      metadata: {
        source: "instant_book",
        authorizationStatus: "authorized",
        services: payload.items,
        customerNotes: payload.notes || "",
      },
    })
    .select("id")
    .single();

  if (orderError || !order) {
    // Release the authorization — we couldn't persist the order
    try {
      await stripe.paymentIntents.cancel(paymentIntent.id);
    } catch {}
    return NextResponse.json({ error: "Failed to save booking. Authorization released. Please try again." }, { status: 500 });
  }

  // Insert order items so admin view renders them properly
  const itemRows = payload.items.map((item) => ({
    order_id: order.id,
    product_id: null,
    product_name: `${item.serviceName} — ${item.packageName}`,
    product_slug: item.serviceSlug,
    quantity: item.quantity,
    unit: item.packageUnit === "per_unit" ? "unit" : "package",
    unit_price_cents: item.priceCents,
    line_subtotal_cents: item.lineTotalCents,
    delivery_type: null,
    material_class: null,
  }));
  await (supabase as any).from("order_items").insert(itemRows);

  // Send notifications (fire and forget — don't block response)
  sendInstantBookNotifications({
    orderId: order.id,
    customerName: payload.customer.name,
    customerEmail: payload.customer.email,
    customerPhone: payload.customer.phone,
    grandTotalCents,
    address: payload.address,
    preferredDate: payload.preferredDate,
    items: payload.items,
    notes: payload.notes,
  }).catch((err) => console.error("[instant-book] Notification error:", err));

  return NextResponse.json({
    ok: true,
    orderId: order.id,
    paymentIntentId: paymentIntent.id,
    serverGrandTotalCents: grandTotalCents,
  });
}

async function sendInstantBookNotifications(params: {
  orderId: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  grandTotalCents: number;
  address: string;
  preferredDate?: string;
  items: Array<{ serviceName: string; packageName: string; quantity: number; lineTotalCents: number }>;
  notes?: string;
}) {
  const fmt = (c: number) => `$${(c / 100).toFixed(2)}`;
  const { Resend } = await import("resend");
  const resend = new Resend(process.env.RESEND_API_KEY);

  const itemRows = params.items
    .map((i) => `<tr><td style="padding:6px 0;border-bottom:1px solid #eee;">${i.serviceName} — ${i.packageName}${i.quantity > 1 ? ` × ${i.quantity}` : ""}</td><td style="padding:6px 0;border-bottom:1px solid #eee;text-align:right;">${fmt(i.lineTotalCents)}</td></tr>`)
    .join("");

  // Customer confirmation
  if (params.customerEmail) {
    try {
      await resend.emails.send({
        from: `Eastern LM <${process.env.RESEND_FROM_EMAIL ?? "orders@easternlm.com"}>`,
        to: params.customerEmail,
        subject: `Booking Received — Eastern Landscape & Mason Supply`,
        html: `<div style="max-width:560px;margin:0 auto;font-family:system-ui,sans-serif;">
          <div style="background:#002e44;padding:20px;text-align:center;"><span style="color:#fff;font-size:20px;font-weight:700;">Eastern Landscape &amp; Mason Supply</span></div>
          <div style="padding:24px;">
            <h2 style="color:#002e44;">Booking Received</h2>
            <p>Hi ${params.customerName},</p>
            <p>Thanks for booking with us. <strong>Your card has been authorized — not yet charged.</strong> We'll confirm scheduling with you within 24 hours, then charge the card once the crew is dispatched.</p>
            <table style="width:100%;border-collapse:collapse;">${itemRows}</table>
            <table style="width:100%;margin:16px 0;">
              <tr><td style="padding:4px 0;"><strong>Authorization Total:</strong></td><td style="text-align:right;"><strong>${fmt(params.grandTotalCents)}</strong></td></tr>
            </table>
            <p><strong>Address:</strong> ${params.address}</p>
            ${params.preferredDate ? `<p><strong>Preferred Date:</strong> ${params.preferredDate}</p>` : ""}
            ${params.notes ? `<p><strong>Notes:</strong> ${params.notes}</p>` : ""}
            <div style="margin-top:16px;padding:12px;background:#fffbea;border:1px solid #fde68a;border-radius:8px;font-size:13px;">
              <strong>How this works:</strong> Your card is authorized (not charged) for 7 days. We contact you within 24 hours to confirm the crew and scheduling. You can cancel anytime before we dispatch — no fees.
            </div>
            <p style="margin-top:20px;color:#666;font-size:12px;">Questions? Call (631) 874-6244</p>
          </div>
          <div style="background:#f5f5f0;padding:16px;text-align:center;font-size:12px;color:#888;">Eastern Landscape &amp; Mason Supply · 110 Frowein Road, Center Moriches, NY 11934</div>
        </div>`,
      });
    } catch (err) {
      console.error("[instant-book] Customer email failed:", err);
    }
  }

  // Admin email
  try {
    await resend.emails.send({
      from: `Eastern LM Orders <${process.env.RESEND_FROM_EMAIL ?? "orders@easternlm.com"}>`,
      to: ["adam@easternbuilding.supply", "ronnie@easternbuilding.supply"],
      subject: `🔵 NEW BOOKING (auth hold): ${params.customerName} — ${fmt(params.grandTotalCents)}`,
      html: `<div style="font-family:system-ui,sans-serif;">
        <h2>🔵 New Instant-Book Service (authorization hold)</h2>
        <p><strong>Customer:</strong> ${params.customerName}</p>
        <p><strong>Phone:</strong> ${params.customerPhone}</p>
        <p><strong>Email:</strong> ${params.customerEmail}</p>
        <p><strong>Address:</strong> ${params.address}</p>
        ${params.preferredDate ? `<p><strong>Preferred Date:</strong> ${params.preferredDate}</p>` : ""}
        <p><strong>Authorized Amount:</strong> ${fmt(params.grandTotalCents)}</p>
        <h3>Services</h3>
        <ul>${params.items.map((i) => `<li>${i.serviceName} — ${i.packageName} (${fmt(i.lineTotalCents)})</li>`).join("")}</ul>
        ${params.notes ? `<p><strong>Customer notes:</strong> ${params.notes}</p>` : ""}
        <p style="background:#fef3c7;padding:10px;border-radius:6px;"><strong>⏱ Contact customer within 24 hours. Capture payment in Stripe or cancel authorization (no fee).</strong></p>
        <p><a href="https://easternlm.com/admin/operations">View in Admin</a></p>
      </div>`,
    });
  } catch (err) {
    console.error("[instant-book] Admin email failed:", err);
  }

  try {
    const msg = `🔵 New booking: ${params.customerName} ${fmt(params.grandTotalCents)} auth hold. ${params.items.map((i) => i.serviceName).join(", ")}. ${params.address}`;
    await sendSms("+16318746244", msg).catch(() => {});
  } catch {}
}
