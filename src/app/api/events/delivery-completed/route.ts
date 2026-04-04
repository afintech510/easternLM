import { NextRequest, NextResponse } from "next/server";

const WEBHOOK_SECRET = process.env.DELIVERY_WEBHOOK_SECRET ?? "";
const MARKETING_API_URL = process.env.MARKETING_API_URL ?? "http://localhost:3200";

/**
 * Delivery-completed webhook bridge.
 * Forwards delivery events to the marketing engine for review solicitation.
 */
export async function POST(request: NextRequest) {
  // Validate webhook secret
  if (WEBHOOK_SECRET) {
    const secret = request.headers.get("x-webhook-secret");
    if (secret !== WEBHOOK_SECRET) {
      return NextResponse.json({ error: "Invalid webhook secret" }, { status: 401 });
    }
  }

  try {
    const body = await request.json();
    const { order_id, customer_phone, customer_name, brand_id } = body as {
      order_id?: string;
      customer_phone?: string;
      customer_name?: string;
      brand_id?: string;
    };

    if (!order_id || !customer_phone) {
      return NextResponse.json(
        { error: "order_id and customer_phone required" },
        { status: 400 }
      );
    }

    // Forward to marketing engine orchestrator
    const res = await fetch(`${MARKETING_API_URL}/api/events/delivery-completed`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Webhook-Secret": WEBHOOK_SECRET,
      },
      body: JSON.stringify({ order_id, customer_phone, customer_name, brand_id }),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => "Unknown error");
      console.error("[Delivery Webhook] Marketing engine error:", errText);
      return NextResponse.json({ error: "Marketing engine error" }, { status: 502 });
    }

    const result = await res.json();
    return NextResponse.json(result);
  } catch (err) {
    console.error("[Delivery Webhook] Error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
