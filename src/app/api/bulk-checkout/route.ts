import { NextResponse } from "next/server";

/**
 * POST /api/bulk-checkout
 *
 * Checkout endpoint for the /app bulk ordering experience.
 * Phase 03 will implement:
 *
 * 1. Validate items + recalculate prices server-side (Spec Section 3)
 * 2. Call existing calculateDeliveryFeesWithCache() from src/lib/delivery.ts (Spec Section 5)
 * 3. Create Stripe Checkout Session with payment_method_types: ["card", "klarna", "afterpay_clearpay"]
 * 4. No CC surcharge on /app orders (business absorbs fee)
 * 5. Store order with order_source = 'bulk_app' (Spec Section 9)
 * 6. Pass setup_future_usage: 'off_session' for upsell payment method (Spec Section 6)
 */
export async function POST() {
  return NextResponse.json(
    { message: "Not implemented yet — Phase 03" },
    { status: 501 }
  );
}
