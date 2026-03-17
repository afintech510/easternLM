import Stripe from "stripe";
import { NextResponse } from "next/server";
import { sendOrderConfirmationEmail } from "@/lib/email/order-email";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import type { Database } from "@/types/database";
import type { Json } from "@/types/database";

type OrderRow = Database["public"]["Tables"]["orders"]["Row"];
type DeliveryScheduleEntry = {
  day: number;
  truckName: string;
  materialClass: string;
  quantity: number;
  feeCents: number;
};

function isPaidStatus(status: string) {
  return status === "paid" || status === "processing" || status === "scheduled" || status === "delivered";
}

function normalizeDeliveryMethod(value?: string | null) {
  return value === "pickup" ? "pickup" : "delivery";
}

function toInteger(value?: string | null) {
  if (!value) {
    return null;
  }

  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseAccessConstraints(value?: string | null): Json {
  if (!value) {
    return {};
  }

  try {
    const parsed = JSON.parse(value);
    return typeof parsed === "object" && parsed ? (parsed as Json) : {};
  } catch {
    return {};
  }
}

function parseDeliverySchedule(value?: string | null): DeliveryScheduleEntry[] {
  if (!value) {
    return [];
  }

  return value
    .split(";")
    .map((raw) => raw.trim())
    .filter(Boolean)
    .map((entry) => {
      const [rawDay, rawTruckName, rawMaterialClass, rawQuantity, rawFeeCents] = entry.split("|");
      const day = Number.parseInt(rawDay ?? "", 10);
      const quantity = Number.parseFloat(rawQuantity ?? "");
      const feeCents = Number.parseInt(rawFeeCents ?? "", 10);

      if (!Number.isFinite(day) || !Number.isFinite(quantity) || !Number.isFinite(feeCents)) {
        return null;
      }

      return {
        day,
        truckName: decodeURIComponent(rawTruckName ?? "Truck"),
        materialClass: decodeURIComponent(rawMaterialClass ?? "default"),
        quantity,
        feeCents,
      };
    })
    .filter((entry): entry is DeliveryScheduleEntry => entry !== null)
    .sort((a, b) => a.day - b.day);
}

function parseDeliveryLoadNumber(name: string) {
  const match = name.match(/Delivery Load\s+(\d+)/i);
  if (!match) {
    return null;
  }

  const parsed = Number.parseInt(match[1] ?? "", 10);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeStripeReference(
  value: string | Stripe.PaymentIntent | Stripe.Customer | Stripe.DeletedCustomer | null | undefined,
) {
  if (typeof value === "string") {
    return value;
  }

  if (value && typeof value === "object" && "id" in value) {
    const candidate = value.id;
    return typeof candidate === "string" ? candidate : "";
  }

  return "";
}

function deriveDeliveryScheduleFromLineItems(lineItems: Stripe.LineItem[]) {
  const entries = lineItems
    .filter((line) => (line.description ?? "").startsWith("Delivery Load"))
    .map((line) => {
      const loadNumber = parseDeliveryLoadNumber(line.description ?? "") ?? 0;
      return {
        day: loadNumber > 0 ? loadNumber : 1,
        truckName: line.description ?? "Delivery Load",
        materialClass: "default",
        quantity: 1,
        feeCents: line.amount_total ?? 0,
      };
    })
    .sort((a, b) => a.day - b.day);

  if (entries.length > 0) {
    return entries;
  }

  return [] as DeliveryScheduleEntry[];
}

function computeTotalsFromStripeLineItems(lineItems: Stripe.LineItem[]) {
  let materialsSubtotalCents = 0;
  let deliveryTotalCents = 0;
  let taxCents = 0;
  let ccSurchargeCents = 0;

  lineItems.forEach((line) => {
    const name = line.description ?? "";
    const amount = line.amount_total ?? 0;

    if (name.startsWith("Delivery Load")) {
      deliveryTotalCents += amount;
      return;
    }

    if (name.startsWith("Sales Tax")) {
      taxCents += amount;
      return;
    }

    if (name.startsWith("Credit Card Processing Fee")) {
      ccSurchargeCents += amount;
      return;
    }

    materialsSubtotalCents += amount;
  });

  const grandTotalCents = materialsSubtotalCents + deliveryTotalCents + taxCents + ccSurchargeCents;
  return {
    materialsSubtotalCents,
    deliveryTotalCents,
    taxCents,
    ccSurchargeCents,
    grandTotalCents,
  };
}

function buildOrderItemsFromLineItems(input: {
  orderId: string;
  lineItems: Stripe.LineItem[];
  deliverySchedule: DeliveryScheduleEntry[];
}) {
  const { orderId, lineItems, deliverySchedule } = input;

  return lineItems.map((line) => {
    const quantity = line.quantity ?? 1;
    const lineTotal = line.amount_total ?? 0;
    const unitPrice = quantity > 0 ? Math.round(lineTotal / quantity) : lineTotal;
    const name = line.description ?? "Line Item";
    const loadNumber = parseDeliveryLoadNumber(name);
    const scheduleEntry = typeof loadNumber === "number" ? deliverySchedule.find((entry) => entry.day === loadNumber) : null;

    return {
      order_id: orderId,
      product_id: null,
      product_name: name,
      product_slug: null,
      quantity,
      unit: typeof loadNumber === "number" ? "load" : "unit",
      unit_price_cents: unitPrice,
      line_subtotal_cents: lineTotal,
      delivery_type: null,
      material_class: null,
      load_number: loadNumber,
      delivery_day: loadNumber,
      notes: scheduleEntry
        ? `Material: ${scheduleEntry.materialClass}; Qty: ${Number(scheduleEntry.quantity.toFixed(2))}`
        : null,
    };
  });
}

async function ensureOrderItemsForOrder(input: {
  orderId: string;
  lineItems: Stripe.LineItem[];
  deliverySchedule: DeliveryScheduleEntry[];
}) {
  const supabaseAdmin = getSupabaseAdminClient();

  const existingItems = await supabaseAdmin
    .from("order_items")
    .select("id")
    .eq("order_id", input.orderId)
    .limit(1);

  if (!existingItems.error && (existingItems.data?.length ?? 0) > 0) {
    return;
  }

  const orderItemRows = buildOrderItemsFromLineItems({
    orderId: input.orderId,
    lineItems: input.lineItems,
    deliverySchedule: input.deliverySchedule,
  });

  if (orderItemRows.length === 0) {
    return;
  }

  const insertedItems = await supabaseAdmin.from("order_items").insert(orderItemRows);
  if (insertedItems.error) {
    throw new Error(insertedItems.error.message);
  }
}

async function ensureOrderFromSession(input: {
  session: Stripe.Checkout.Session;
  lineItems: Stripe.LineItem[];
}) {
  const supabaseAdmin = getSupabaseAdminClient();
  const sessionId = input.session.id;

  const existing = await supabaseAdmin
    .from("orders")
    .select("*")
    .eq("stripe_checkout_session_id", sessionId)
    .maybeSingle();

  const metadata = input.session.metadata ?? {};
  const parsedDeliverySchedule = parseDeliverySchedule(metadata.deliverySchedule);
  const derivedDeliverySchedule = deriveDeliveryScheduleFromLineItems(input.lineItems);
  const deliverySchedule = parsedDeliverySchedule.length > 0 ? parsedDeliverySchedule : derivedDeliverySchedule;

  if (!existing.error && existing.data) {
    await ensureOrderItemsForOrder({
      orderId: existing.data.id,
      lineItems: input.lineItems,
      deliverySchedule,
    });

    return existing.data;
  }

  const totalsFromLines = computeTotalsFromStripeLineItems(input.lineItems);
  const deliveryMethod = normalizeDeliveryMethod(metadata.deliveryMethod);
  const customerEmail = input.session.customer_details?.email ?? input.session.customer_email ?? "unknown@example.com";
  const customerName = metadata.customerName ?? input.session.customer_details?.name ?? "Customer";
  const customerPhone = metadata.customerPhone ?? input.session.customer_details?.phone ?? null;
  const totalLoads = toInteger(metadata.totalLoads) ?? deliverySchedule.length;
  const totalDeliveryDays = toInteger(metadata.totalDeliveryDays) ?? deliverySchedule.length;

  const insertedOrder = await supabaseAdmin
    .from("orders")
    .insert({
      stripe_checkout_session_id: sessionId,
      customer_name: customerName,
      customer_email: customerEmail,
      customer_phone: customerPhone,
      status: "paid",
      delivery_method: deliveryMethod,
      delivery_address: metadata.deliveryAddress || null,
      delivery_zip: metadata.deliveryZip || null,
      combine_loads: metadata.combineLoads === "true",
      materials_subtotal_cents: toInteger(metadata.materialsSubtotalCents) ?? totalsFromLines.materialsSubtotalCents,
      delivery_total_cents: toInteger(metadata.deliveryTotalCents) ?? totalsFromLines.deliveryTotalCents,
      tax_cents: toInteger(metadata.taxCents) ?? totalsFromLines.taxCents,
      cc_surcharge_cents: toInteger(metadata.ccSurchargeCents) ?? totalsFromLines.ccSurchargeCents,
      grand_total_cents: toInteger(metadata.serverGrandTotalCents) ?? totalsFromLines.grandTotalCents,
      distance_meters: toInteger(metadata.distanceMeters),
      duration_seconds: toInteger(metadata.durationSeconds),
      first_load_fee_cents: toInteger(metadata.firstLoadFeeCents),
      additional_load_fee_cents: toInteger(metadata.additionalLoadFeeCents),
      total_loads: Math.max(totalLoads, 0),
      total_delivery_days: Math.max(totalDeliveryDays, 0),
      access_constraints: parseAccessConstraints(metadata.accessConstraints),
      delivery_schedule: deliverySchedule as Json,
      metadata: {
        stripePaymentIntent: normalizeStripeReference(input.session.payment_intent),
        stripeCustomerId: normalizeStripeReference(input.session.customer),
        promoCode: metadata.promoCode ?? "",
        deliveryDate: metadata.deliveryDate ?? "",
        source: "stripe_webhook_fallback",
      },
    })
    .select("*")
    .single();

  if (insertedOrder.error || !insertedOrder.data) {
    if (insertedOrder.error?.code === "23505") {
      const concurrentOrder = await supabaseAdmin
        .from("orders")
        .select("*")
        .eq("stripe_checkout_session_id", sessionId)
        .maybeSingle();

      if (!concurrentOrder.error && concurrentOrder.data) {
        await ensureOrderItemsForOrder({
          orderId: concurrentOrder.data.id,
          lineItems: input.lineItems,
          deliverySchedule,
        });
        return concurrentOrder.data;
      }
    }

    throw new Error(insertedOrder.error?.message ?? "Failed to create order from webhook.");
  }

  await ensureOrderItemsForOrder({
    orderId: insertedOrder.data.id,
    lineItems: input.lineItems,
    deliverySchedule,
  });

  return insertedOrder.data;
}

async function handleQuoteDepositCompleted(session: Stripe.Checkout.Session) {
  const { quoteId, quoteToken } = session.metadata ?? {};
  if (!quoteId) return;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = getSupabaseAdminClient() as any;
  const paymentIntentId =
    typeof session.payment_intent === "string"
      ? session.payment_intent
      : (session.payment_intent as { id?: string } | null)?.id ?? null;

  await supabase.from("quotes").update({
    deposit_paid_cents: session.amount_total ?? 0,
    deposit_stripe_payment_id: paymentIntentId,
    deposit_paid_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }).eq("id", quoteId);

  // Notify staff
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_PHONE_NUMBER;
  const staffPhone = process.env.STAFF_NOTIFICATION_PHONE;

  if (sid && authToken && from && staffPhone && session.amount_total) {
    const fmt = (c: number) =>
      new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(c / 100);
    const msg = `💰 Deposit received! ${fmt(session.amount_total)} deposit paid for quote ${session.metadata?.quoteNumber ?? quoteId}. Check /admin/quotes.`;
    await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`${sid}:${authToken}`).toString("base64")}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({ To: staffPhone, From: from, Body: msg }),
    }).catch(() => {});
  }

  void quoteToken; // used in URL, not needed here
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session, stripe: Stripe) {
  // Route quote deposit payments separately
  if (session.metadata?.type === "quote_deposit") {
    await handleQuoteDepositCompleted(session);
    return;
  }

  const supabaseAdmin = getSupabaseAdminClient();
  const lineItemsResult = await stripe.checkout.sessions.listLineItems(session.id, { limit: 100 });
  const lineItems = lineItemsResult.data;

  const ensuredOrder = await ensureOrderFromSession({
    session,
    lineItems,
  });

  let order = ensuredOrder as OrderRow;
  const orderMetadata = (order.metadata ?? {}) as Record<string, unknown>;
  const alreadyEmailed = typeof orderMetadata.emailSentAt === "string" && orderMetadata.emailSentAt.length > 0;

  if (!isPaidStatus(order.status)) {
    const updated = await supabaseAdmin
      .from("orders")
      .update({
        status: "paid",
        metadata: {
          ...orderMetadata,
          stripePaymentIntent: normalizeStripeReference(session.payment_intent),
          stripeCustomerId: normalizeStripeReference(session.customer),
        },
      })
      .eq("id", order.id)
      .select("*")
      .single();

    if (!updated.error && updated.data) {
      order = updated.data;
    }
  }

  if (!alreadyEmailed) {
    const itemsResult = await supabaseAdmin.from("order_items").select("*").eq("order_id", order.id);
    if (!itemsResult.error) {
      await sendOrderConfirmationEmail({
        order,
        items: itemsResult.data,
      });

      const nextMetadata = {
        ...((order.metadata ?? {}) as Record<string, unknown>),
        emailSentAt: new Date().toISOString(),
      };

      await supabaseAdmin.from("orders").update({ metadata: nextMetadata }).eq("id", order.id);
    }
  }
}

export async function POST(request: Request) {
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!stripeSecretKey || !webhookSecret) {
    return NextResponse.json(
      { error: "Missing STRIPE_SECRET_KEY or STRIPE_WEBHOOK_SECRET." },
      { status: 500 },
    );
  }

  const stripe = new Stripe(stripeSecretKey);
  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing stripe-signature header." }, { status: 400 });
  }

  const rawBody = await request.text();
  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (error) {
    return NextResponse.json(
      {
        error: "Invalid webhook signature.",
        detail: error instanceof Error ? error.message : undefined,
      },
      { status: 400 },
    );
  }

  try {
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      await handleCheckoutCompleted(session, stripe);
    } else if (event.type === "checkout.session.expired") {
      const session = event.data.object as Stripe.Checkout.Session;
      const supabaseAdmin = getSupabaseAdminClient();
      await supabaseAdmin
        .from("orders")
        .update({ status: "expired" })
        .eq("stripe_checkout_session_id", session.id)
        .eq("status", "pending");
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Webhook processing failed.",
        detail: error instanceof Error ? error.message : undefined,
      },
      { status: 500 },
    );
  }
}
