import { NextResponse } from "next/server";
import Stripe from "stripe";
import { z } from "zod";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { sendSms } from "@/lib/sms";
import { buildQuote, formatUsd } from "@/lib/book-now/pricing";
import { TIMELINE_CONFIG, type TimelineOption } from "@/lib/book-now/types";
import type { InstantBookService } from "@/lib/book-now/types";

const CC_SURCHARGE_RATE = 0.035;

const quoteItemSchema = z.object({
  serviceSlug: z.string(),
  serviceName: z.string(),
  inputs: z.record(z.string(), z.union([z.string(), z.number()])),
  subtotalCents: z.number().nonnegative(),
});

const quoteSchema = z.object({
  property: z.object({
    address: z.string().min(5),
    lotSize: z.enum(["under_quarter", "quarter_half", "half_one", "over_one"]),
  }),
  timeline: z.enum(["rush_48h", "this_week", "two_weeks", "flexible"]),
  items: z.array(quoteItemSchema).min(1),
  subtotalCents: z.number().nonnegative(),
  timelineMultiplier: z.number(),
  adjustedSubtotalCents: z.number().nonnegative(),
  totalCents: z.number().nonnegative(),
});

const bookingSchema = z.object({
  quote: quoteSchema,
  customer: z.object({
    name: z.string().min(2),
    email: z.string().email(),
    phone: z.string().min(7),
  }),
  preferredDate: z.string().optional(),
  notes: z.string().optional(),
  paymentMethodId: z.string().min(5),
  termsAccepted: z.literal(true),
});

export async function POST(request: Request) {
  const raw = await request.json();
  const parsed = bookingSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid booking payload", details: parsed.error.issues }, { status: 400 });
  }
  const payload = parsed.data;

  const supabase = getSupabaseAdminClient();

  // ── Server-side quote validation ─────────────────────────
  // Re-fetch services from DB and recompute total. Reject if client mismatches by >$1.
  const slugs = payload.quote.items.map((i) => i.serviceSlug);
  const { data: services, error: servicesError } = await (supabase as any)
    .from("instant_book_services")
    .select("*")
    .in("slug", slugs)
    .eq("is_active", true);

  if (servicesError || !services || services.length !== slugs.length) {
    return NextResponse.json({ error: "Some services are no longer available. Please refresh and try again." }, { status: 400 });
  }

  const servicesBySlug = new Map<string, InstantBookService>();
  for (const s of services as InstantBookService[]) servicesBySlug.set(s.slug, s);

  const selections = payload.quote.items.map((item) => {
    const service = servicesBySlug.get(item.serviceSlug);
    if (!service) throw new Error(`Service not found: ${item.serviceSlug}`);
    return { service, inputs: item.inputs };
  });

  const recomputed = buildQuote({
    address: payload.quote.property.address,
    lotSize: payload.quote.property.lotSize,
    timeline: payload.quote.timeline as TimelineOption,
    selections,
  });

  if (Math.abs(recomputed.totalCents - payload.quote.totalCents) > 100) {
    return NextResponse.json(
      { error: "Quote total mismatch. Please refresh and try again.", serverTotal: recomputed.totalCents },
      { status: 400 },
    );
  }

  // ── Compute final amount (services + CC surcharge) ───────
  const servicesCents = recomputed.totalCents;
  const ccSurchargeCents = Math.round(servicesCents * CC_SURCHARGE_RATE);
  const grandTotalCents = servicesCents + ccSurchargeCents;

  // Sealcoating uses a FIXED non-refundable booking fee (vs the default 20%
  // platform rate). Stamped here so confirm/route.ts captures exactly this.
  const SEALCOAT_BOOKING_FEE_CENTS = 19900;
  const fixedBookingFeeCents = payload.quote.items.some(
    (i) => i.serviceSlug === "driveway-sealcoating",
  )
    ? SEALCOAT_BOOKING_FEE_CENTS
    : null;

  // ── Create Stripe PaymentIntent with MANUAL capture ──────
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
  let paymentIntent: Stripe.PaymentIntent;
  try {
    paymentIntent = await stripe.paymentIntents.create({
      amount: grandTotalCents,
      currency: "usd",
      payment_method: payload.paymentMethodId,
      capture_method: "manual",
      confirmation_method: "automatic",
      confirm: true,
      return_url: (process.env.NEXT_PUBLIC_SITE_URL || "https://easternlm.com") + "/services/book-now/success",
      receipt_email: payload.customer.email,
      description: `Book-a-Crew — ${payload.quote.items.map((i) => i.serviceName).join(", ")}`,
      metadata: {
        source: "book_now",
        customerName: payload.customer.name,
        customerPhone: payload.customer.phone,
        address: payload.quote.property.address,
        lotSize: payload.quote.property.lotSize,
        timeline: payload.quote.timeline,
        timelineMultiplier: String(payload.quote.timelineMultiplier),
        preferredDate: payload.preferredDate || "",
        servicesCount: String(payload.quote.items.length),
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Payment authorization failed" }, { status: 400 });
  }

  if (paymentIntent.status !== "requires_capture") {
    return NextResponse.json(
      { error: `Authorization did not complete (status: ${paymentIntent.status})` },
      { status: 400 },
    );
  }

  // ── Persist order ────────────────────────────────────────
  const { data: order, error: orderError } = await (supabase as any)
    .from("orders")
    .insert({
      stripe_checkout_session_id: paymentIntent.id,
      customer_name: payload.customer.name,
      customer_email: payload.customer.email,
      customer_phone: payload.customer.phone,
      status: "pending",
      order_type: "book_now_service",
      capture_method: "manual",
      payment_method: "card_online",
      delivery_method: "delivery",
      delivery_address: payload.quote.property.address,
      materials_subtotal_cents: servicesCents,
      delivery_total_cents: 0,
      tax_cents: 0,
      cc_surcharge_cents: ccSurchargeCents,
      grand_total_cents: grandTotalCents,
      total_loads: 0,
      total_delivery_days: 0,
      delivery_date: payload.preferredDate || null,
      access_constraints: {},
      source: "book_now",
      metadata: {
        source: "book_now",
        authorizationStatus: "authorized",
        lotSize: payload.quote.property.lotSize,
        timeline: payload.quote.timeline,
        timelineMultiplier: payload.quote.timelineMultiplier,
        items: payload.quote.items,
        customerNotes: payload.notes || "",
        termsAcceptedAt: new Date().toISOString(),
        ...(fixedBookingFeeCents ? { booking_fee_cents: fixedBookingFeeCents } : {}),
      },
    })
    .select("id")
    .single();

  if (orderError || !order) {
    try { await stripe.paymentIntents.cancel(paymentIntent.id); } catch {}
    return NextResponse.json({ error: "Failed to save booking. Authorization released. Please try again." }, { status: 500 });
  }

  // Order items for admin view
  const itemRows = payload.quote.items.map((item) => ({
    order_id: order.id,
    product_id: null,
    product_name: `${item.serviceName}${Object.keys(item.inputs).length ? ` (${formatInputs(item.inputs)})` : ""}`,
    product_slug: item.serviceSlug,
    quantity: 1,
    unit: "service",
    unit_price_cents: item.subtotalCents,
    line_subtotal_cents: item.subtotalCents,
    delivery_type: null,
    material_class: null,
  }));
  await (supabase as any).from("order_items").insert(itemRows);

  // Notifications (async, non-blocking)
  sendBookingNotifications({
    orderId: order.id,
    customer: payload.customer,
    quote: payload.quote,
    grandTotalCents,
    preferredDate: payload.preferredDate,
    notes: payload.notes,
  }).catch((err) => console.error("[book-now] Notification error:", err));

  return NextResponse.json({
    ok: true,
    orderId: order.id,
    paymentIntentId: paymentIntent.id,
    serverGrandTotalCents: grandTotalCents,
  });
}

function formatInputs(inputs: Record<string, string | number>): string {
  return Object.entries(inputs).map(([k, v]) => `${k}: ${v}`).join(", ");
}

async function sendBookingNotifications(params: {
  orderId: string;
  customer: { name: string; email: string; phone: string };
  quote: z.infer<typeof quoteSchema>;
  grandTotalCents: number;
  preferredDate?: string;
  notes?: string;
}) {
  const { Resend } = await import("resend");
  const resend = new Resend(process.env.RESEND_API_KEY);
  const tl = TIMELINE_CONFIG[params.quote.timeline as TimelineOption];

  const itemRows = params.quote.items
    .map((i) => `<tr><td style="padding:6px 0;border-bottom:1px solid #eee;">${i.serviceName}</td><td style="padding:6px 0;border-bottom:1px solid #eee;text-align:right;">${formatUsd(i.subtotalCents)}</td></tr>`)
    .join("");

  // Customer confirmation
  if (params.customer.email) {
    try {
      await resend.emails.send({
        from: `Eastern LM <${process.env.RESEND_FROM_EMAIL ?? "orders@easternlm.com"}>`,
        to: params.customer.email,
        subject: `Booking Received — Eastern Landscape & Mason Supply`,
        html: `<div style="max-width:560px;margin:0 auto;font-family:system-ui,sans-serif;">
          <div style="background:#002e44;padding:20px;text-align:center;"><span style="color:#fff;font-size:20px;font-weight:700;">Eastern Landscape &amp; Mason Supply</span></div>
          <div style="padding:24px;">
            <h2 style="color:#002e44;">Booking Received</h2>
            <p>Hi ${params.customer.name},</p>
            <p>We've got your booking. <strong>Your card is held, not charged.</strong> We'll confirm your crew and date within 24 hours — reply to this email or call us anytime.</p>
            <table style="width:100%;border-collapse:collapse;">${itemRows}</table>
            <table style="width:100%;margin:16px 0;">
              <tr><td style="padding:4px 0;"><strong>Total:</strong></td><td style="text-align:right;"><strong>${formatUsd(params.grandTotalCents)}</strong></td></tr>
              <tr><td style="padding:4px 0;font-size:12px;color:#666;">Timeline</td><td style="text-align:right;font-size:12px;color:#666;">${tl.label} · ${tl.days}</td></tr>
            </table>
            <p><strong>Address:</strong> ${params.quote.property.address}</p>
            ${params.preferredDate ? `<p><strong>Preferred date:</strong> ${params.preferredDate}</p>` : ""}
            ${params.notes ? `<p><strong>Your notes:</strong> ${params.notes}</p>` : ""}
            <p style="margin-top:20px;color:#666;font-size:12px;">Questions? Call (631) 874-6244</p>
          </div>
          <div style="background:#f5f5f0;padding:16px;text-align:center;font-size:12px;color:#888;">Eastern Landscape &amp; Mason Supply · 110 Frowein Road, Center Moriches, NY 11934</div>
        </div>`,
      });
    } catch (err) { console.error("[book-now] Customer email:", err); }
  }

  // Admin notification
  try {
    await resend.emails.send({
      from: `Eastern LM Orders <${process.env.RESEND_FROM_EMAIL ?? "orders@easternlm.com"}>`,
      to: ["adam@easternbuilding.supply", "ronnie@easternbuilding.supply"],
      subject: `🔵 NEW BOOKING: ${params.customer.name} — ${formatUsd(params.grandTotalCents)} (${tl.label})`,
      html: `<div style="font-family:system-ui,sans-serif;">
        <h2>🔵 New Book-a-Crew booking</h2>
        <p><strong>Customer:</strong> ${params.customer.name}</p>
        <p><strong>Phone:</strong> ${params.customer.phone}</p>
        <p><strong>Email:</strong> ${params.customer.email}</p>
        <p><strong>Address:</strong> ${params.quote.property.address}</p>
        <p><strong>Lot size:</strong> ${params.quote.property.lotSize}</p>
        <p><strong>Timeline:</strong> ${tl.label} · ${tl.days} · ×${params.quote.timelineMultiplier}</p>
        ${params.preferredDate ? `<p><strong>Preferred date:</strong> ${params.preferredDate}</p>` : ""}
        <p><strong>Authorized total:</strong> ${formatUsd(params.grandTotalCents)}</p>
        <h3>Services</h3>
        <ul>${params.quote.items.map((i) => `<li><strong>${i.serviceName}</strong> — ${formatUsd(i.subtotalCents)}<br><span style="font-size:12px;color:#666;">${Object.entries(i.inputs).map(([k, v]) => `${k}: ${v}`).join(" · ")}</span></li>`).join("")}</ul>
        ${params.notes ? `<p><strong>Customer notes:</strong> ${params.notes}</p>` : ""}
        <p style="background:#fef3c7;padding:10px;border-radius:6px;"><strong>⏱ Contact within 24 hours. Capture or cancel via Stripe dashboard.</strong></p>
        <p><a href="https://easternlm.com/admin/operations">View in Admin</a></p>
      </div>`,
    });
  } catch (err) { console.error("[book-now] Admin email:", err); }

  try {
    const msg = `🔵 Booking: ${params.customer.name} ${formatUsd(params.grandTotalCents)} (${tl.label}). ${params.quote.items.map((i) => i.serviceName).join(", ")}. ${params.quote.property.address}`;
    await sendSms("+16318746244", msg).catch(() => {});
  } catch {}
}
