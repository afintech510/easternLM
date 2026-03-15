import { NextResponse } from "next/server";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function GET() {
  try {
    const readers = await stripe.terminal.readers.list({ limit: 10 });
    return NextResponse.json({
      readers: readers.data.map((r) => ({
        id: r.id,
        label: r.label,
        status: r.status,
        device_type: r.device_type,
        serial_number: r.serial_number,
        ip_address: r.ip_address,
      })),
    });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Failed to list readers" }, { status: 500 });
  }
}
