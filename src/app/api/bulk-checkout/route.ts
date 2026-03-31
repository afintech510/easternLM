import Stripe from "stripe";
import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { calcPriceCents, calcTotalCents, validatePriceMatch } from "@/lib/bulk-pricing";

const TAX_RATE = 0.0875;

/**
 * POST /api/bulk-checkout
 * Creates a Stripe Checkout Session for the bulk ordering app.
 * Recalculates ALL prices server-side. Never trusts client totals.
 * No CC surcharge on /app orders.
 * Spec §7, §3.4, §9
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { items, paymentMethod, clientTotalCents } = body;

    if (!items?.length) {
      return NextResponse.json({ error: "No items in order" }, { status: 400 });
    }

    const supabase = getSupabaseAdminClient() as any;
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

    // 1. Fetch product data from DB and recalculate prices server-side
    const slugs = items.map((i: any) => i.slug);
    const { data: products } = await supabase
      .from("products")
      .select("slug, name, ceiling_price_cents, floor_price_cents, floor_qty, premium_upgrade, crushed_upgrade")
      .in("slug", slugs)
      .eq("is_bulk_app_enabled", true);

    if (!products || products.length !== slugs.length) {
      return NextResponse.json({ error: "One or more products not found" }, { status: 400 });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const productMap = new Map<string, any>(products.map((p: any) => [p.slug, p]));
    let serverMaterialsCents = 0;
    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [];

    for (const item of items) {
      const product = productMap.get(item.slug);
      if (!product) continue;

      // Recalculate unit price server-side
      let unitPriceCents = calcPriceCents(
        item.qty,
        product.ceiling_price_cents,
        product.floor_price_cents,
        product.floor_qty
      );

      // Add premium delta if enabled
      if (item.options?.premium && product.premium_upgrade) {
        unitPriceCents += product.premium_upgrade.priceDeltaCents;
      }
      // Add crushed delta if enabled
      if (item.options?.crushed && product.crushed_upgrade) {
        unitPriceCents += product.crushed_upgrade.priceDeltaCents;
      }

      const lineTotal = calcTotalCents(item.qty, unitPriceCents);
      serverMaterialsCents += lineTotal;

      // Stripe line item (qty in smallest unit — we use fractional yards as description)
      lineItems.push({
        price_data: {
          currency: "usd",
          product_data: {
            name: product.name,
            description: `${item.qty} cu yds × ${(unitPriceCents / 100).toFixed(2)} per cu. yard`,
          },
          unit_amount: lineTotal,
        },
        quantity: 1,
      });
    }

    // 2. Calculate tax (8.75% on materials — delivery is Phase 04)
    const deliveryCents = 0; // Phase 04 will wire real delivery fees
    const taxCents = Math.round((serverMaterialsCents + deliveryCents) * TAX_RATE);
    const serverTotalCents = serverMaterialsCents + deliveryCents + taxCents;

    // 3. Validate client total matches server (0.5% tolerance)
    if (clientTotalCents && !validatePriceMatch(clientTotalCents, serverTotalCents)) {
      return NextResponse.json({
        error: "Price mismatch — please refresh and try again",
        serverTotal: serverTotalCents,
        clientTotal: clientTotalCents,
      }, { status: 409 });
    }

    // Add tax line item
    if (taxCents > 0) {
      lineItems.push({
        price_data: {
          currency: "usd",
          product_data: { name: "Sales Tax (8.75%)" },
          unit_amount: taxCents,
        },
        quantity: 1,
      });
    }

    // 4. Determine payment method types
    const paymentMethodTypes: Stripe.Checkout.SessionCreateParams.PaymentMethodType[] =
      paymentMethod === "klarna" ? ["klarna"]
      : paymentMethod === "afterpay" ? ["afterpay_clearpay"]
      : ["card"];

    // 5. Build URLs
    const proto = request.headers.get("x-forwarded-proto") ?? "https";
    const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? "easternlm.com";
    const origin = `${proto}://${host}`;

    // 6. Create Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: paymentMethodTypes,
      line_items: lineItems,
      success_url: `${origin}/app/confirmation?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/app/order?canceled=1`,
      payment_intent_data:
        paymentMethod === "card"
          ? { setup_future_usage: "off_session" }
          : undefined,
      metadata: {
        order_source: "bulk_app",
        items: JSON.stringify(items.map((i: any) => ({ slug: i.slug, qty: i.qty }))),
      },
    });

    // 7. Save order to Supabase
    const customerName = body.customerName ?? "Bulk App Customer";
    const { data: order } = await supabase.from("orders").insert({
      stripe_checkout_session_id: session.id,
      customer_name: customerName,
      customer_email: body.customerEmail ?? "pending@easternlm.com",
      customer_phone: body.phone ?? null,
      delivery_method: body.deliveryMethod ?? "delivery",
      materials_subtotal_cents: serverMaterialsCents,
      delivery_total_cents: deliveryCents,
      tax_cents: taxCents,
      cc_surcharge_cents: 0, // No surcharge on /app
      grand_total_cents: serverTotalCents,
      status: "pending",
      order_source: "bulk_app",
      metadata: { items, paymentMethod },
    }).select("id").single();

    return NextResponse.json({
      sessionId: session.id,
      sessionUrl: session.url,
      orderId: order?.id,
      serverTotal: serverTotalCents,
    });
  } catch (err) {
    console.error("[bulk-checkout]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Checkout failed" },
      { status: 500 }
    );
  }
}
