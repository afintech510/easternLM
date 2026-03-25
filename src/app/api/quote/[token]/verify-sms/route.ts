import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { sendSms } from "@/lib/sms";

type RouteContext = { params: Promise<{ token: string }> };

/**
 * POST /api/quote/[token]/verify-sms
 * Sends a 6-digit code to the customer's phone for quote acceptance verification.
 * Body: { action: "send" } to send code, { action: "verify", code: "123456" } to verify.
 */
export async function POST(request: Request, context: RouteContext) {
  const { token } = await context.params;
  const { action, code } = await request.json();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = getSupabaseAdminClient() as any;

  const { data: quote } = await supabase
    .from("quotes")
    .select("id, customer_phone, customer_name")
    .eq("public_token", token)
    .single();

  if (!quote) return NextResponse.json({ error: "Quote not found" }, { status: 404 });
  if (!quote.customer_phone) return NextResponse.json({ error: "No phone number on quote" }, { status: 400 });

  if (action === "send") {
    // Generate 6-digit code
    const verifyCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 min

    // Store code on quote (temporary)
    await supabase.from("quotes").update({
      acceptance_metadata: {
        sms_code: verifyCode,
        sms_code_expires: expiresAt,
        sms_sent_at: new Date().toISOString(),
      },
    }).eq("id", quote.id);

    // Send SMS
    await sendSms(quote.customer_phone, `Your Eastern LM verification code is: ${verifyCode}\n\nThis code expires in 10 minutes.`);

    return NextResponse.json({ ok: true, sent: true });
  }

  if (action === "verify") {
    if (!code) return NextResponse.json({ error: "Code required" }, { status: 400 });

    // Read stored code
    const { data: fresh } = await supabase
      .from("quotes")
      .select("acceptance_metadata")
      .eq("id", quote.id)
      .single();

    const meta = fresh?.acceptance_metadata ?? {};
    if (!meta.sms_code) return NextResponse.json({ error: "No code sent. Request a new one." }, { status: 400 });
    if (new Date(meta.sms_code_expires) < new Date()) {
      return NextResponse.json({ error: "Code expired. Request a new one." }, { status: 400 });
    }
    if (meta.sms_code !== code) {
      return NextResponse.json({ error: "Invalid code" }, { status: 400 });
    }

    // Clear code, mark as verified
    await supabase.from("quotes").update({
      acceptance_metadata: {
        ...meta,
        sms_code: null,
        sms_code_expires: null,
        sms_verified: true,
        sms_verified_at: new Date().toISOString(),
      },
    }).eq("id", quote.id);

    return NextResponse.json({ ok: true, verified: true });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
