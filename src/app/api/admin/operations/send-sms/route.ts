import { NextResponse, type NextRequest } from "next/server";
import { requireAdmin } from "@/lib/admin/auth";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { sendSms } from "@/lib/sms";

export async function POST(request: NextRequest) {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  const body = await request.json();
  const { orderId, phone, message, template } = body;

  if (!phone || !message?.trim()) {
    return NextResponse.json({ error: "phone and message are required" }, { status: 400 });
  }

  const result = await sendSms(phone, message.trim());

  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.error || "SMS send failed" }, { status: 500 });
  }

  // Log the SMS as an order note
  if (orderId) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase = getSupabaseAdminClient() as any;
    const preview = message.trim().length > 80 ? message.trim().slice(0, 80) + "..." : message.trim();
    await supabase
      .from("order_notes")
      .insert({
        order_id: orderId,
        note: `SMS sent (${template || "custom"}): "${preview}"`,
        created_by: "Admin",
      })
      .catch(() => {});
  }

  return NextResponse.json({ ok: true, messageId: result.messageId });
}
