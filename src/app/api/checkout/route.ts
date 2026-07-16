import Stripe from "stripe";
import { NextResponse } from "next/server";
import { z } from "zod";
import { sendSms } from "@/lib/sms";
import { hashAddress } from "@/lib/address-utils";
import { getDeliveryRuntimeConfig } from "@/lib/data/delivery-config";
import {
  calculateDeliveryFeesWithCache,
  applyCodAdjustment,
  type CartItem,
  type DeliveryFeeCacheAdapter,
  type CustomerType,
} from "@/lib/delivery";
import { fetchGoogleDistanceMatrix } from "@/lib/google-maps";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import type { Database, Json } from "@/types/database";

/**
 * Sends confirmation emails and admin SMS for a COD order.
 * Mirrors the notifications in /api/checkout/confirm but tailored for "unpaid, due on delivery".
 */
async function sendCodNotifications(params: {
  orderId: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  grandTotalCents: number;
  codDiscountCents: number;
  deliveryMethod: string;
  deliveryAddress: string | null;
  deliveryDate?: string;
  deliveryTimeWindow?: string;
  smsOptIn?: boolean;
  cartItems: Array<{ name: string; quantity: number; unitPriceCents: number }>;
}) {
  const fmt = (c: number) => `$${(c / 100).toFixed(2)}`;
  const formatDeliveryDate = (value?: string) => {
    if (!value) return "";
    const d = new Date(`${value}T12:00:00`);
    if (Number.isNaN(d.getTime())) return value;
    return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
  };
  const { Resend } = await import("resend");
  const resend = new Resend(process.env.RESEND_API_KEY);

  const itemRows = params.cartItems
    .map(
      (i) =>
        `<tr><td style="padding:6px 0;border-bottom:1px solid #eee;">${i.quantity} × ${i.name}</td><td style="padding:6px 0;border-bottom:1px solid #eee;text-align:right;">${fmt(i.quantity * i.unitPriceCents)}</td></tr>`,
    )
    .join("");

  const fulfillmentLine =
    params.deliveryMethod === "delivery" && params.deliveryAddress
      ? `<p><strong>Delivery to:</strong> ${params.deliveryAddress}</p>`
      : `<p><strong>Pickup at:</strong> 110 Frowein Road, Center Moriches, NY 11934</p>`;

  const dateLine = params.deliveryDate
    ? `<p><strong>Scheduled:</strong> ${params.deliveryDate}${params.deliveryTimeWindow ? ` (${params.deliveryTimeWindow})` : ""}</p>`
    : "";

  // Customer confirmation
  if (params.customerEmail) {
    try {
      await resend.emails.send({
        from: `Eastern LM <${process.env.RESEND_FROM_EMAIL ?? "orders@easternlm.com"}>`,
        to: params.customerEmail,
        subject: `Order Confirmed (Cash on Delivery) — Eastern Landscape & Mason Supply`,
        html: `<div style="max-width:560px;margin:0 auto;font-family:system-ui,sans-serif;">
          <div style="background:#002e44;padding:20px;text-align:center;"><span style="color:#fff;font-size:20px;font-weight:700;">Eastern Landscape &amp; Mason Supply</span></div>
          <div style="padding:24px;">
            <h2 style="color:#002e44;">Order Confirmed</h2>
            <p>Hi ${params.customerName},</p>
            <p>Your order is confirmed. Payment will be collected on delivery.</p>
            <table style="width:100%;border-collapse:collapse;">${itemRows}</table>
            <div style="margin:16px 0;padding:12px;background:#fffbea;border:1px solid #fde68a;border-radius:8px;">
              <p style="margin:0;"><strong>Amount Due on Delivery:</strong> <span style="font-size:18px;color:#002e44;">${fmt(params.grandTotalCents)}</span></p>
              ${params.codDiscountCents > 0 ? `<p style="margin:6px 0 0;color:#16a34a;font-size:13px;">You saved ${fmt(params.codDiscountCents)} with Cash on Delivery (3% discount).</p>` : ""}
            </div>
            ${fulfillmentLine}
            ${dateLine}
            <p style="margin-top:16px;">Please have cash or check ready for the driver. Our crew will contact you to confirm delivery scheduling.</p>
            <p style="margin-top:20px;color:#666;font-size:12px;">Questions? Call (631) 874-6244</p>
          </div>
          <div style="background:#f5f5f0;padding:16px;text-align:center;font-size:12px;color:#888;">Eastern Landscape &amp; Mason Supply · 110 Frowein Road, Center Moriches, NY 11934</div>
        </div>`,
      });
    } catch (err) {
      console.error("[COD] Customer email error:", err);
    }
  }

  // Admin email
  try {
    await resend.emails.send({
      from: `Eastern LM Orders <${process.env.RESEND_FROM_EMAIL ?? "orders@easternlm.com"}>`,
      to: ["adam@easternbuilding.supply", "ronnie@easternbuilding.supply"],
      subject: `🟡 COD Order: ${params.customerName} — ${fmt(params.grandTotalCents)}`,
      html: `<div style="font-family:system-ui,sans-serif;">
        <h2>New COD Order (Payment Due on Delivery)</h2>
        <p><strong>Customer:</strong> ${params.customerName}</p>
        <p><strong>Phone:</strong> ${params.customerPhone || "—"}</p>
        <p><strong>Email:</strong> ${params.customerEmail || "—"}</p>
        <p><strong>Amount Due on Delivery:</strong> <span style="font-size:18px;color:#002e44;">${fmt(params.grandTotalCents)}</span></p>
        <p><strong>Method:</strong> ${params.deliveryMethod}</p>
        ${params.deliveryAddress ? `<p><strong>Delivery Address:</strong> ${params.deliveryAddress}</p>` : ""}
        ${dateLine}
        <p style="margin-top:16px;background:#fef3c7;padding:10px;border-radius:6px;"><strong>⚠️ COLLECT ${fmt(params.grandTotalCents)} CASH OR CHECK AT DELIVERY</strong></p>
        <p><a href="https://easternlm.com/admin/operations">View in Admin</a></p>
      </div>`,
    });
  } catch (err) {
    console.error("[COD] Admin email error:", err);
  }

  // SMS to office line
  try {
    const msg = `🟡 COD Order: ${params.customerName} — ${fmt(params.grandTotalCents)} due on delivery. ${params.deliveryMethod === "delivery" ? `To ${params.deliveryAddress}` : "Pickup"}`;
    await sendSms("+16318746244", msg).catch(() => {});
  } catch {}

  // Customer confirmation SMS (only if they opted in and gave a phone)
  if (params.smsOptIn && params.customerPhone) {
    try {
      const itemsList =
        params.cartItems.map((i) => `${i.quantity} × ${i.name}`).join(", ") || "your order";
      const custLines = [
        `Eastern LM — Order confirmed! Thank you, ${params.customerName}.`,
        itemsList,
        `Total due on delivery: ${fmt(params.grandTotalCents)}`,
      ];
      if (params.deliveryMethod === "delivery") {
        const prettyDate = formatDeliveryDate(params.deliveryDate);
        custLines.push(
          `Delivery${prettyDate ? ` ${prettyDate}` : ""} (${params.deliveryTimeWindow ?? "flexible"}) to ${params.deliveryAddress}`,
        );
        custLines.push("Please have cash or check ready for the driver.");
      } else {
        custLines.push("Pickup at 110 Frowein Rd, Center Moriches");
      }
      custLines.push("Questions? (631) 874-6244");
      custLines.push("Reply STOP to opt out.");
      await sendSms(params.customerPhone, custLines.join("\n")).catch(() => {});
    } catch {}
  }
}

const checkoutItemSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  quantity: z.number().positive(),
  unitPriceCents: z.number().int().nonnegative(),
  deliveryType: z.enum(["bulk", "non-bulk"]),
  materialClass: z.enum(["mulch", "default"]),
  fulfillmentMethod: z.enum(["pickup", "delivery"]).optional(),
}).passthrough();

const requestSchema = z.object({
  cartItems: z.array(checkoutItemSchema).min(1),
  deliveryMethod: z.enum(["pickup", "delivery"]),
  deliveryAddress: z
    .object({
      fullAddress: z.string().min(8),
      zip: z.string().default(""),
    })
    .nullable()
    .optional(),
  combineLoads: z.boolean().default(false),
  promoCode: z.string().optional(),
  accessConstraints: z.record(z.string(), z.unknown()).optional(),
  deliveryDate: z.string().optional(),
  deliveryTimeWindow: z.string().optional(),
  clientGrandTotalCents: z.number().int().nonnegative(),
  customer: z.object({
    fullName: z.string().min(2),
    email: z.string().email(),
    phone: z.string().min(7),
    optInSms: z.boolean().optional(),
    optInEmail: z.boolean().optional(),
  }),
  createAccount: z.boolean().optional(),
  deliverySequence: z.array(z.object({
    deliveryNumber: z.number(),
    productId: z.string(),
    productName: z.string(),
    quantity: z.number(),
    feeCents: z.number(),
  })).optional(),
  mode: z.enum(["redirect", "embedded"]).optional().default("embedded"),
  paymentMethod: z.enum(["card", "cod"]).optional().default("card"),
});

async function resolveCustomerType(promoCode?: string): Promise<CustomerType> {
  const normalized = promoCode?.trim().toUpperCase() ?? "";
  if (!normalized) return "standard";

  // Check database for valid promo code
  try {
    const supabase = getSupabaseAdminClient() as any;
    const { data: promo } = await supabase
      .from("promo_codes")
      .select("code, is_active, valid_from, valid_until, max_uses, used_count")
      .eq("code", normalized)
      .eq("is_active", true)
      .single();

    if (!promo) return "standard";

    const now = new Date();
    if (promo.valid_from && new Date(promo.valid_from) > now) return "standard";
    if (promo.valid_until && new Date(promo.valid_until) < now) return "standard";
    if (promo.max_uses && promo.used_count >= promo.max_uses) return "standard";

    // Increment used_count
    await supabase
      .from("promo_codes")
      .update({ used_count: (promo.used_count ?? 0) + 1, updated_at: now.toISOString() })
      .eq("code", normalized);

    return "pro";
  } catch {
    // Fallback: allow known legacy codes
    return (normalized === "PRO" || normalized === "PRO5" || normalized === "PROMEMBER") ? "pro" : "standard";
  }
}

function buildDiscountedLineTotals(baseLineTotals: number[], totalDiscountCents: number) {
  if (totalDiscountCents <= 0) {
    return baseLineTotals;
  }

  const subtotal = baseLineTotals.reduce((sum, value) => sum + value, 0);
  if (subtotal <= 0) {
    return baseLineTotals;
  }

  const allocations = baseLineTotals.map((lineTotal) => Math.floor((lineTotal / subtotal) * totalDiscountCents));
  let allocated = allocations.reduce((sum, value) => sum + value, 0);
  let remainder = totalDiscountCents - allocated;

  for (let i = 0; i < allocations.length && remainder > 0; i += 1) {
    allocations[i] += 1;
    allocated += 1;
    remainder -= 1;
  }

  return baseLineTotals.map((lineTotal, index) => Math.max(0, lineTotal - allocations[index]!));
}

function cartItemLineTotal(item: CartItem) {
  return Math.round(item.quantity * item.unitPriceCents);
}

function resolveBaseOrigin(request: Request) {
  const candidates = [request.headers.get("origin"), process.env.NEXT_PUBLIC_SITE_URL, "http://localhost:3000"];

  for (const raw of candidates) {
    if (!raw) {
      continue;
    }

    const value = raw.trim();
    if (!value) {
      continue;
    }

    try {
      const parsed = new URL(value);
      return parsed.origin;
    } catch {
      const withScheme = value.startsWith("localhost") || value.startsWith("127.0.0.1")
        ? `http://${value}`
        : `https://${value}`;

      try {
        const parsed = new URL(withScheme);
        return parsed.origin;
      } catch {
        // keep trying
      }
    }
  }

  return "http://localhost:3000";
}

function serializeDeliveryScheduleMetadata(
  loads: Array<{
    day: number;
    truckName: string;
    materialClass: string;
    quantity: number;
    feeCents: number;
  }>,
) {
  return loads
    .map((load) =>
      [
        load.day,
        encodeURIComponent(load.truckName),
        encodeURIComponent(load.materialClass),
        Number(load.quantity.toFixed(2)),
        load.feeCents,
      ].join("|"),
    )
    .join(";");
}

export async function POST(request: Request) {
  try {
    // Capture GCLID from cookie (set by middleware on ?gclid= landing)
    const { cookies } = await import("next/headers");
    const cookieStore = await cookies();
    const gclidValue = cookieStore.get("elm_gclid")?.value || null;

    const rawBody = await request.json();
    const parsed = requestSchema.safeParse(rawBody);
    if (!parsed.success) {
      console.error("[checkout] Zod validation errors:", JSON.stringify(parsed.error.issues, null, 2));
      console.error("[checkout] Raw body keys:", Object.keys(rawBody));
      if (rawBody.cartItems?.[0]) console.error("[checkout] First cart item keys:", Object.keys(rawBody.cartItems[0]));
      if (rawBody.customer) console.error("[checkout] Customer keys:", Object.keys(rawBody.customer));
      return NextResponse.json({ error: "Invalid checkout payload.", details: parsed.error.issues }, { status: 400 });
    }

    const payload = parsed.data;
    if (payload.deliveryMethod === "delivery" && !payload.deliveryAddress) {
      return NextResponse.json(
        { error: "Delivery address is required for delivery checkout." },
        { status: 400 },
      );
    }
    const resolvedDeliveryAddress = payload.deliveryMethod === "delivery" ? payload.deliveryAddress : null;

    const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeSecretKey) {
      return NextResponse.json({ error: "Missing STRIPE_SECRET_KEY." }, { status: 500 });
    }

    const runtimeConfig = await getDeliveryRuntimeConfig();
    const onlineOrderFeeCents: number = payload.deliveryMethod === "delivery" ? (runtimeConfig.onlineOrderFeeCents ?? 0) : 0;
    const supabaseAdmin = getSupabaseAdminClient();
    const customerType = await resolveCustomerType(payload.promoCode);
    const addressHash =
      payload.deliveryMethod === "delivery" && resolvedDeliveryAddress
        ? hashAddress(resolvedDeliveryAddress.fullAddress)
        : undefined;

    const cache: DeliveryFeeCacheAdapter = {
      getByAddressHash: async (inputHash) => {
        const result = await supabaseAdmin
          .from("delivery_fee_cache")
          .select(
            "address_hash, distance_meters, duration_seconds, first_load_fee_cents, additional_load_fee_cents, expires_at",
          )
          .eq("address_hash", inputHash)
          .maybeSingle();

        if (result.error || !result.data) {
          return null;
        }

        return {
          addressHash: result.data.address_hash,
          distanceMeters: result.data.distance_meters,
          durationSeconds: result.data.duration_seconds,
          firstLoadFeeCents: result.data.first_load_fee_cents,
          additionalLoadFeeCents: result.data.additional_load_fee_cents,
          expiresAt: result.data.expires_at,
        };
      },
      set: async (entry) => {
        if (payload.deliveryMethod !== "delivery" || !resolvedDeliveryAddress) {
          return;
        }

        const oneWayMiles = entry.distanceMeters / 1609.344;
        await supabaseAdmin.from("delivery_fee_cache").upsert(
          {
            address_hash: entry.addressHash,
            address: resolvedDeliveryAddress.fullAddress,
            distance_meters: entry.distanceMeters,
            duration_seconds: entry.durationSeconds,
            one_way_miles: Number(oneWayMiles.toFixed(2)),
            first_load_fee_cents: entry.firstLoadFeeCents,
            additional_load_fee_cents: entry.additionalLoadFeeCents,
            is_local: oneWayMiles <= runtimeConfig.pricingConfig.localRadiusMiles,
            is_out_of_range: oneWayMiles > runtimeConfig.pricingConfig.maxServiceRadiusMiles,
            expires_at: entry.expiresAt,
          },
          { onConflict: "address_hash" },
        );
      },
    };

    const mapsKey = process.env.GOOGLE_MAPS_API_KEY;
    const isCod = payload.paymentMethod === "cod";
    const baseCalc = await calculateDeliveryFeesWithCache({
      cartItems: payload.cartItems,
      pricingConfig: runtimeConfig.pricingConfig,
      truckTypes: runtimeConfig.truckTypes,
      combineLoads: payload.combineLoads,
      deliveryMethod: payload.deliveryMethod,
      customerType,
      addressHash,
      cache,
      fetchDistance:
        payload.deliveryMethod === "delivery" && resolvedDeliveryAddress
          ? async () => {
              if (!mapsKey) {
                throw new Error("Missing GOOGLE_MAPS_API_KEY.");
              }

              return fetchGoogleDistanceMatrix({
                originAddress: runtimeConfig.originAddress,
                destinationAddress: resolvedDeliveryAddress.fullAddress,
                apiKey: mapsKey,
              });
            }
          : undefined,
    });

    // Apply COD adjustment if payment method is cash on delivery
    const calculation = isCod ? applyCodAdjustment(baseCalc) : baseCalc;

    if (calculation.error) {
      return NextResponse.json({ error: calculation.error }, { status: 400 });
    }

    if (calculation.checkoutBlocked) {
      return NextResponse.json(
        {
          error: "Checkout blocked due to delivery constraints.",
          details: {
            outsideServiceArea: calculation.outsideServiceArea,
            belowMinimum: calculation.belowMinimum,
          },
        },
        { status: 400 },
      );
    }

    const serverGrandTotal = calculation.grandTotalCents + onlineOrderFeeCents;
    const diff = Math.abs(serverGrandTotal - payload.clientGrandTotalCents);
    if (diff > 100) {
      return NextResponse.json(
        {
          error: "Client and server totals do not match.",
          expectedGrandTotalCents: serverGrandTotal,
          clientGrandTotalCents: payload.clientGrandTotalCents,
        },
        { status: 409 },
      );
    }

    const baseLineTotals = payload.cartItems.map((item) => cartItemLineTotal(item));
    const discountedLineTotals = buildDiscountedLineTotals(baseLineTotals, calculation.proDiscountCents);
    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [];

    payload.cartItems.forEach((item, index) => {
      const lineTotal = discountedLineTotals[index] ?? 0;
      if (lineTotal <= 0) {
        return;
      }

      lineItems.push({
        quantity: 1,
        price_data: {
          currency: "usd",
          unit_amount: lineTotal,
          product_data: {
            name: item.name,
            description: `${item.quantity} units (${item.deliveryType})`,
          },
        },
      });
    });

    calculation.loads.forEach((load, index) => {
      const loadAmount = load.feeCents + (index === 0 ? onlineOrderFeeCents : 0);
      if (loadAmount <= 0) {
        return;
      }

      lineItems.push({
        quantity: 1,
        price_data: {
          currency: "usd",
          unit_amount: loadAmount,
          product_data: {
            name: `Delivery Load ${index + 1} - ${load.truckName}`,
            description: `Day ${load.day} • ${load.materialClass} • Qty ${load.quantity}`,
          },
        },
      });
    });

    if (calculation.taxCents > 0) {
      lineItems.push({
        quantity: 1,
        price_data: {
          currency: "usd",
          unit_amount: calculation.taxCents,
          product_data: {
            name: `Sales Tax (${(runtimeConfig.pricingConfig.taxRate * 100).toFixed(2)}%)`,
          },
        },
      });
    }

    if (calculation.ccSurchargeCents > 0) {
      const ccRatePct = (runtimeConfig.pricingConfig.ccSurchargeRate * 100)
        .toFixed(2)
        .replace(/\.?0+$/, "");
      lineItems.push({
        quantity: 1,
        price_data: {
          currency: "usd",
          unit_amount: calculation.ccSurchargeCents,
          product_data: {
            name: `Service Fee (${ccRatePct}%)`,
          },
        },
      });
    }

    if (lineItems.length === 0) {
      return NextResponse.json({ error: "No billable line items found." }, { status: 400 });
    }

    const stripe = new Stripe(stripeSecretKey);
    const origin = resolveBaseOrigin(request);
    let cachedDistanceMeters: number | null = null;
    let cachedDurationSeconds: number | null = null;

    if (addressHash) {
      const distanceRow = await supabaseAdmin
        .from("delivery_fee_cache")
        .select("distance_meters, duration_seconds")
        .eq("address_hash", addressHash)
        .maybeSingle();

      if (!distanceRow.error && distanceRow.data) {
        cachedDistanceMeters = distanceRow.data.distance_meters;
        cachedDurationSeconds = distanceRow.data.duration_seconds;
      }
    }

    const deliveryScheduleMetadata = serializeDeliveryScheduleMetadata(
      calculation.loads.map((load) => ({
        day: load.day,
        truckName: load.truckName,
        materialClass: load.materialClass,
        quantity: load.quantity,
        feeCents: load.feeCents,
      })),
    );
    const fallbackDistanceMeters =
      payload.deliveryMethod === "delivery" ? Math.round(calculation.oneWayMiles * 1609.344) : null;

    // Deliveries beyond 20 miles: authorize the card only, capture after admin review.
    // Stripe doesn't refund processing fees on refunds, so if we can't fulfill we
    // want to cancel the auth (no fee) instead of charging then refunding (~3% loss).
    const MANUAL_CAPTURE_DISTANCE_MILES = 20;
    const requiresManualCapture =
      !isCod &&
      payload.deliveryMethod === "delivery" &&
      calculation.oneWayMiles > MANUAL_CAPTURE_DISTANCE_MILES;

    const orderMetadata: Record<string, string> = {
      customerName: payload.customer.fullName,
      customerPhone: payload.customer.phone,
      deliveryMethod: payload.deliveryMethod,
      deliveryAddress: resolvedDeliveryAddress?.fullAddress ?? "",
      deliveryZip: resolvedDeliveryAddress?.zip ?? "",
      combineLoads: String(payload.combineLoads),
      promoCode: payload.promoCode ?? "",
      accessConstraints: JSON.stringify(payload.accessConstraints ?? {}),
      deliveryDate: payload.deliveryDate ?? "",
      deliveryTimeWindow: payload.deliveryTimeWindow ?? "flexible",
      createAccount: String(Boolean(payload.createAccount)),
      serverGrandTotalCents: String(serverGrandTotal),
      materialsSubtotalCents: String(calculation.discountedSubtotalCents),
      deliveryTotalCents: String(calculation.deliveryFeeCents),
      taxCents: String(calculation.taxCents),
      ccSurchargeCents: String(calculation.ccSurchargeCents),
      firstLoadFeeCents: String(calculation.firstLoadFeeCents),
      additionalLoadFeeCents: String(calculation.additionalLoadFeeCents),
      totalLoads: String(calculation.totalLoads),
      totalDeliveryDays: String(calculation.totalDeliveryDays),
      distanceMeters: String(cachedDistanceMeters ?? fallbackDistanceMeters ?? ""),
      durationSeconds: String(cachedDurationSeconds ?? ""),
      deliverySchedule: deliveryScheduleMetadata,
      optInSms: String(payload.customer.optInSms ?? false),
      optInEmail: String(payload.customer.optInEmail ?? false),
      cartItems: JSON.stringify(
        payload.cartItems.map((item, index) => ({
          id: item.id,
          name: item.name,
          qty: item.quantity,
          upc: item.unitPriceCents,
          dt: item.deliveryType,
          mc: item.materialClass,
          lst: discountedLineTotals[index] ?? 0,
        }))
      ).slice(0, 500),
    };

    // Embedded mode: create PaymentIntent (customer stays on our domain)
    // Redirect mode: create Checkout Session (redirects to Stripe)
    // COD mode: skip Stripe entirely — order created directly as pending
    const useEmbedded = payload.mode === "embedded";

    if (requiresManualCapture) {
      orderMetadata.requiresReview = "true";
      orderMetadata.captureMethod = "manual";
    }

    let session: Stripe.Checkout.Session | null = null;
    let paymentIntent: Stripe.PaymentIntent | null = null;

    if (!isCod) {
      if (useEmbedded) {
        paymentIntent = await stripe.paymentIntents.create({
          amount: serverGrandTotal,
          currency: "usd",
          automatic_payment_methods: { enabled: true },
          receipt_email: payload.customer.email,
          metadata: orderMetadata,
          ...(requiresManualCapture ? { capture_method: "manual" } : {}),
        });
      } else {
        session = await stripe.checkout.sessions.create({
          mode: "payment",
          line_items: lineItems,
          success_url: `${origin}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
          cancel_url: `${origin}/checkout?canceled=1`,
          customer_email: payload.customer.email,
          metadata: orderMetadata,
          ...(requiresManualCapture
            ? { payment_intent_data: { capture_method: "manual" } }
            : {}),
        });
      }
    }

    let createdOrderId: string | null = null;
    try {
      const deliverySchedule = calculation.loads.map((load) => ({
        day: load.day,
        truckName: load.truckName,
        materialClass: load.materialClass,
        quantity: load.quantity,
        feeCents: load.feeCents,
      }));

      // Clean up stale pending orders for the same customer to prevent duplicates.
      // If the customer retries checkout, we cancel old pending orders and their PIs.
      // Skip review-held orders (auth-only >20mi orders awaiting admin decision).
      const customerPhone = payload.customer.phone?.replace(/\D/g, "").slice(-10);
      if (customerPhone) {
        const { data: stalePending } = await supabaseAdmin
          .from("orders")
          .select("id, stripe_checkout_session_id, metadata")
          .eq("status", "pending")
          .ilike("customer_phone", `%${customerPhone}%`)
          .gte("created_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

        // Filter out review-held orders — admin needs to manually accept/release these
        type StalePending = { id: string; stripe_checkout_session_id: string | null; metadata: Record<string, unknown> | null };
        const stalePendingFiltered: StalePending[] = ((stalePending as StalePending[]) || []).filter(
          (o) => (o.metadata as Record<string, unknown> | null)?.requires_review !== true,
        );

        if (stalePendingFiltered.length > 0) {
          // Cancel old PaymentIntents in Stripe (ignore errors — they may already be expired)
          for (const stale of stalePendingFiltered) {
            if (stale.stripe_checkout_session_id?.startsWith("pi_")) {
              try {
                await stripe.paymentIntents.cancel(stale.stripe_checkout_session_id);
              } catch {
                // PI may already be canceled/expired — that's fine
              }
            }
          }
          // Delete stale orders and their items
          const staleIds = stalePendingFiltered.map((s: { id: string }) => s.id);
          await supabaseAdmin.from("order_items").delete().in("order_id", staleIds);
          await supabaseAdmin.from("orders").delete().in("id", staleIds);
        }
      }

      const insertedOrder = await supabaseAdmin
        .from("orders")
        .insert({
          stripe_checkout_session_id: session?.id ?? paymentIntent?.id ?? null,
          customer_name: payload.customer.fullName,
          customer_email: payload.customer.email,
          customer_phone: payload.customer.phone,
          status: "pending",
          payment_method: isCod ? "cod" : null,
          delivery_method: payload.deliveryMethod,
          delivery_address: resolvedDeliveryAddress?.fullAddress ?? null,
          delivery_zip: resolvedDeliveryAddress?.zip ?? null,
          combine_loads: payload.combineLoads,
          materials_subtotal_cents: calculation.discountedSubtotalCents,
          delivery_total_cents: calculation.deliveryFeeCents,
          tax_cents: calculation.taxCents,
          cc_surcharge_cents: calculation.ccSurchargeCents,
          online_order_fee_cents: onlineOrderFeeCents,
          grand_total_cents: serverGrandTotal,
          distance_meters: cachedDistanceMeters,
          duration_seconds: cachedDurationSeconds,
          first_load_fee_cents: calculation.firstLoadFeeCents,
          additional_load_fee_cents: calculation.additionalLoadFeeCents,
          total_loads: calculation.totalLoads,
          total_delivery_days: calculation.totalDeliveryDays,
          access_constraints: (payload.accessConstraints ?? {}) as Json,
          delivery_schedule: deliverySchedule as Json,
          delivery_date: payload.deliveryDate || null,
          delivery_time_window: payload.deliveryTimeWindow || null,
          sms_opt_in: payload.customer.optInSms ?? true,
          source: "web",
          gclid: gclidValue,
          ...(requiresManualCapture ? { capture_method: "manual" } : {}),
          metadata: {
            promoCode: payload.promoCode ?? "",
            createAccount: Boolean(payload.createAccount),
            deliveryDate: payload.deliveryDate ?? "",
            clientGrandTotalCents: payload.clientGrandTotalCents,
            source: "api_checkout",
            paymentMethod: payload.paymentMethod,
            codDiscountCents: calculation.codDiscountCents || 0,
            ...(requiresManualCapture
              ? { requires_review: true, capture_method: "manual" }
              : {}),
          },
        })
        .select("id")
        .single();

      if (!insertedOrder.error && insertedOrder.data) {
        const orderId = insertedOrder.data.id;
        createdOrderId = orderId;
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        const orderItemRows: Database["public"]["Tables"]["order_items"]["Insert"][] = payload.cartItems.map(
          (item, index) => ({
          order_id: orderId,
          product_id: uuidRegex.test(item.id) ? item.id : null,
          product_name: item.name,
          product_slug: null,
          quantity: item.quantity,
          unit: item.deliveryType === "bulk" ? "cu. yard" : "ea",
          unit_price_cents: item.unitPriceCents,
          line_subtotal_cents: discountedLineTotals[index] ?? 0,
          delivery_type: item.deliveryType,
          material_class: item.materialClass,
          }),
        );

        calculation.loads.forEach((load, index) => {
          orderItemRows.push({
            order_id: orderId,
            product_id: null,
            product_name: `Delivery Load ${index + 1} - ${load.truckName}`,
            product_slug: null,
            quantity: 1,
            unit: "load",
            unit_price_cents: load.feeCents,
            line_subtotal_cents: load.feeCents,
            delivery_type: null,
            material_class: null,
          });
        });

        const itemInsert = await supabaseAdmin.from("order_items").insert(orderItemRows);
        if (itemInsert.error) {
          console.error("[checkout] order_items insert failed:", itemInsert.error.message, { orderId });
        }
      }
    } catch (err) {
      console.error("[checkout] order pre-save failed:", err instanceof Error ? err.message : err);
    }

    // COD response: no Stripe — fire notifications + return success
    if (isCod) {
      if (!createdOrderId) {
        return NextResponse.json(
          { error: "Failed to create COD order. Please try again." },
          { status: 500 },
        );
      }

      // Fire-and-forget notifications (don't block response on email/SMS)
      try {
        await sendCodNotifications({
          orderId: createdOrderId,
          customerName: payload.customer.fullName,
          customerEmail: payload.customer.email,
          customerPhone: payload.customer.phone,
          grandTotalCents: serverGrandTotal,
          codDiscountCents: calculation.codDiscountCents,
          deliveryMethod: payload.deliveryMethod,
          deliveryAddress: resolvedDeliveryAddress?.fullAddress ?? null,
          deliveryDate: payload.deliveryDate,
          deliveryTimeWindow: payload.deliveryTimeWindow,
          smsOptIn: payload.customer.optInSms ?? true,
          cartItems: payload.cartItems,
        });
      } catch (err) {
        console.error("[checkout COD] Notification error (non-fatal):", err);
      }

      return NextResponse.json({
        ok: true,
        codConfirmed: true,
        orderId: createdOrderId,
        serverGrandTotalCents: serverGrandTotal,
      });
    }

    if (useEmbedded && paymentIntent) {
      return NextResponse.json({
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
        serverGrandTotalCents: serverGrandTotal,
      });
    }

    return NextResponse.json({
      sessionId: session?.id,
      sessionUrl: session?.url,
      serverGrandTotalCents: serverGrandTotal,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Checkout server error.";
    return NextResponse.json(
      {
        error: "Checkout server error.",
        detail: process.env.NODE_ENV === "production" ? undefined : message,
      },
      { status: 500 },
    );
  }
}
