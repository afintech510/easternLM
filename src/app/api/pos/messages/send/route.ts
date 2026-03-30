import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { sendSms } from "@/lib/sms";
import { phoneDigits } from "@/lib/ringcentral/auth";

/**
 * POST /api/pos/messages/send
 * Send an SMS and store it in sms_messages.
 */
export async function POST(request: Request) {
  const { to, body, from } = await request.json();

  if (!to || !body?.trim()) {
    return NextResponse.json(
      { error: "to and body required" },
      { status: 400 }
    );
  }

  const fromNumber = from ?? "+16318746244";
  const result = await sendSms(to, body, fromNumber);

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }

  // Store in database
  const supabase = getSupabaseAdminClient() as any;
  const digits = phoneDigits(to);
  let customerId = null;
  let customerName = null;

  if (digits.length >= 10) {
    const { data: customer } = await supabase
      .from("customers")
      .select("id, first_name, last_name")
      .ilike("phone", `%${digits}%`)
      .limit(1)
      .maybeSingle();
    if (customer) {
      customerId = customer.id;
      customerName = [customer.first_name, customer.last_name]
        .filter(Boolean)
        .join(" ");
    }
  }

  await supabase.from("sms_messages").insert({
    rc_message_id: result.messageId ?? null,
    direction: "outbound",
    from_number: fromNumber,
    to_number: to.replace(/\D/g, "").length === 10 ? `+1${to.replace(/\D/g, "")}` : to,
    body,
    status: "sent",
    customer_id: customerId,
    customer_name: customerName,
    business_number: fromNumber,
    staff_sender: "POS",
  });

  return NextResponse.json({ ok: true, messageId: result.messageId });
}
