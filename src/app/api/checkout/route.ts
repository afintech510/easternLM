import Stripe from "stripe";
import { NextResponse } from "next/server";
import { z } from "zod";
import { hashAddress } from "@/lib/address-utils";
import { getDeliveryRuntimeConfig } from "@/lib/data/delivery-config";
import {
  calculateDeliveryFeesWithCache,
  type CartItem,
  type DeliveryFeeCacheAdapter,
  type CustomerType,
} from "@/lib/delivery";
import { fetchGoogleDistanceMatrix } from "@/lib/google-maps";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import type { Database, Json } from "@/types/database";

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
});

function resolveCustomerType(promoCode?: string): CustomerType {
  const normalized = promoCode?.trim().toUpperCase() ?? "";
  return normalized === "PRO" || normalized === "PRO5" || normalized === "PROMEMBER" ? "pro" : "standard";
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
    const supabaseAdmin = getSupabaseAdminClient();
    const customerType = resolveCustomerType(payload.promoCode);
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
    const calculation = await calculateDeliveryFeesWithCache({
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

    const diff = Math.abs(calculation.grandTotalCents - payload.clientGrandTotalCents);
    if (diff > 100) {
      return NextResponse.json(
        {
          error: "Client and server totals do not match.",
          expectedGrandTotalCents: calculation.grandTotalCents,
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
      if (load.feeCents <= 0) {
        return;
      }

      lineItems.push({
        quantity: 1,
        price_data: {
          currency: "usd",
          unit_amount: load.feeCents,
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
      lineItems.push({
        quantity: 1,
        price_data: {
          currency: "usd",
          unit_amount: calculation.ccSurchargeCents,
          product_data: {
            name: "Credit Card Processing Fee (3%)",
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

    const orderMetadata = {
      customerName: payload.customer.fullName,
      customerPhone: payload.customer.phone,
      deliveryMethod: payload.deliveryMethod,
      deliveryAddress: resolvedDeliveryAddress?.fullAddress ?? "",
      deliveryZip: resolvedDeliveryAddress?.zip ?? "",
      combineLoads: String(payload.combineLoads),
      promoCode: payload.promoCode ?? "",
      accessConstraints: JSON.stringify(payload.accessConstraints ?? {}),
      deliveryDate: payload.deliveryDate ?? "",
      createAccount: String(Boolean(payload.createAccount)),
      serverGrandTotalCents: String(calculation.grandTotalCents),
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
    };

    // Embedded mode: create PaymentIntent (customer stays on our domain)
    // Redirect mode: create Checkout Session (redirects to Stripe)
    const useEmbedded = payload.mode === "embedded";

    let session: Stripe.Checkout.Session | null = null;
    let paymentIntent: Stripe.PaymentIntent | null = null;

    if (useEmbedded) {
      paymentIntent = await stripe.paymentIntents.create({
        amount: calculation.grandTotalCents,
        currency: "usd",
        automatic_payment_methods: { enabled: true },
        receipt_email: payload.customer.email,
        metadata: orderMetadata,
      });
    } else {
      session = await stripe.checkout.sessions.create({
        mode: "payment",
        line_items: lineItems,
        success_url: `${origin}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${origin}/checkout?canceled=1`,
        customer_email: payload.customer.email,
        metadata: orderMetadata,
      });
    }

    try {
      const deliverySchedule = calculation.loads.map((load) => ({
        day: load.day,
        truckName: load.truckName,
        materialClass: load.materialClass,
        quantity: load.quantity,
        feeCents: load.feeCents,
      }));

      const insertedOrder = await supabaseAdmin
        .from("orders")
        .insert({
          stripe_checkout_session_id: session?.id ?? paymentIntent?.id ?? null,
          customer_name: payload.customer.fullName,
          customer_email: payload.customer.email,
          customer_phone: payload.customer.phone,
          status: "pending",
          delivery_method: payload.deliveryMethod,
          delivery_address: resolvedDeliveryAddress?.fullAddress ?? null,
          delivery_zip: resolvedDeliveryAddress?.zip ?? null,
          combine_loads: payload.combineLoads,
          materials_subtotal_cents: calculation.discountedSubtotalCents,
          delivery_total_cents: calculation.deliveryFeeCents,
          tax_cents: calculation.taxCents,
          cc_surcharge_cents: calculation.ccSurchargeCents,
          grand_total_cents: calculation.grandTotalCents,
          distance_meters: cachedDistanceMeters,
          duration_seconds: cachedDurationSeconds,
          first_load_fee_cents: calculation.firstLoadFeeCents,
          additional_load_fee_cents: calculation.additionalLoadFeeCents,
          total_loads: calculation.totalLoads,
          total_delivery_days: calculation.totalDeliveryDays,
          access_constraints: (payload.accessConstraints ?? {}) as Json,
          delivery_schedule: deliverySchedule as Json,
          metadata: {
            promoCode: payload.promoCode ?? "",
            createAccount: Boolean(payload.createAccount),
            deliveryDate: payload.deliveryDate ?? "",
            clientGrandTotalCents: payload.clientGrandTotalCents,
            source: "api_checkout",
          },
        })
        .select("id")
        .single();

      if (!insertedOrder.error && insertedOrder.data) {
        const orderId = insertedOrder.data.id;
        const orderItemRows: Database["public"]["Tables"]["order_items"]["Insert"][] = payload.cartItems.map(
          (item, index) => ({
          order_id: orderId,
          product_id: item.id,
          product_name: item.name,
          product_slug: null,
          quantity: item.quantity,
          unit: "unit",
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

        await supabaseAdmin.from("order_items").insert(orderItemRows);
      }
    } catch {
      // Do not block checkout on order pre-save; webhook fallback will persist.
    }

    if (useEmbedded && paymentIntent) {
      return NextResponse.json({
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
        serverGrandTotalCents: calculation.grandTotalCents,
      });
    }

    return NextResponse.json({
      sessionId: session?.id,
      sessionUrl: session?.url,
      serverGrandTotalCents: calculation.grandTotalCents,
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
