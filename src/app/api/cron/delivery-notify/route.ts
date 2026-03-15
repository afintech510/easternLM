import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

/**
 * Process pending customer delivery notifications.
 * Checks for delivery_assignments that changed status and sends SMS.
 * Called every 2 minutes by cron.
 */
export async function GET(request: NextRequest) {
  const key = request.nextUrl.searchParams.get("key");
  if (key !== process.env.CRON_SECRET_KEY) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = getSupabaseAdminClient();

  // Find recently departed deliveries (last 5 min) that haven't been notified
  const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
  const { data: departed } = await supabase
    .from("delivery_assignments")
    .select("id, order_id, destination_town, drive_minutes, material_summary, dispatch_notes")
    .eq("status", "departed")
    .gte("actual_departure", fiveMinAgo);

  // Find recently delivered (last 5 min)
  const { data: delivered } = await supabase
    .from("delivery_assignments")
    .select("id, order_id, material_summary")
    .eq("status", "delivered")
    .gte("actual_completion", fiveMinAgo);

  let sent = 0;

  // Send "on the way" SMS
  for (const d of departed || []) {
    const phone = await getOrderPhone(supabase, d.order_id);
    if (!phone) continue;
    const eta = d.drive_minutes ? `ETA ~${d.drive_minutes} min.` : "";
    await sendSms(phone, `Your delivery from Eastern LM is on the way! ${eta} Questions? (631) 874-6244`);
    sent++;
  }

  // Send "delivered" SMS
  for (const d of delivered || []) {
    const phone = await getOrderPhone(supabase, d.order_id);
    if (!phone) continue;
    await sendSms(phone, `Your ${d.material_summary} has been delivered. Thank you for choosing Eastern LM! easternlm.com`);
    sent++;
  }

  return NextResponse.json({ ok: true, sent });
}

async function getOrderPhone(supabase: ReturnType<typeof getSupabaseAdminClient>, orderId: string): Promise<string | null> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await supabase.from("orders").select("customer_phone").eq("id", orderId).single() as any;
  const phone = data?.customer_phone?.replace(/\D/g, "");
  if (!phone || phone.length !== 10) return null;
  // Exclude yard numbers
  if (phone === "6318746244" || phone === "6313958283") return null;
  return phone;
}

async function sendSms(to: string, body: string) {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_PHONE_NUMBER;
  if (!sid || !token || !from) return;

  try {
    await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`${sid}:${token}`).toString("base64")}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({ To: `+1${to}`, From: from, Body: body }),
    });
  } catch { /* best effort */ }
}
