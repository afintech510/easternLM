import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/auth";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { generateConfirmationToken } from "@/lib/book-now/confirmation-token";
import { sendSms } from "@/lib/sms";

/**
 * POST /api/admin/book-now/[id]/send-confirmation
 * Generates a signed confirmation token, saves it on the order,
 * and sends the link to the customer via email + SMS.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  const { id: orderId } = await params;
  const body = await request.json().catch(() => ({}));
  const confirmedDate = body.confirmedDate || null;
  const providerId = body.providerId || null;

  const supabase = getSupabaseAdminClient();

  // Fetch order
  const { data: order, error } = await (supabase as any)
    .from("orders")
    .select("id, customer_name, customer_email, customer_phone, status, source, metadata, stripe_checkout_session_id")
    .eq("id", orderId)
    .single();

  if (error || !order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  if (order.source !== "book_now") {
    return NextResponse.json({ error: "Not a book-now order" }, { status: 400 });
  }

  // Generate token (valid 7 days)
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const token = generateConfirmationToken(orderId, expiresAt);

  // Update order with token + optional provider + confirmed date
  const updates: Record<string, unknown> = {
    confirmation_token: token,
    confirmation_token_expires_at: expiresAt.toISOString(),
    status: "awaiting_confirmation",
  };
  if (providerId) updates.provider_id = providerId;
  if (confirmedDate) {
    updates.delivery_date = confirmedDate;
    updates.metadata = {
      ...((order.metadata as Record<string, unknown>) || {}),
      confirmedDate,
    };
  }

  const { error: updateError } = await (supabase as any)
    .from("orders")
    .update(updates)
    .eq("id", orderId);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://easternlm.com";
  const confirmUrl = `${baseUrl}/services/book-now/confirm/${token}`;

  // Send email
  if (order.customer_email) {
    try {
      const { Resend } = await import("resend");
      const resend = new Resend(process.env.RESEND_API_KEY);
      await resend.emails.send({
        from: `Eastern LM <${process.env.RESEND_FROM_EMAIL ?? "orders@easternlm.com"}>`,
        to: order.customer_email,
        subject: "Confirm Your Booking — Eastern Landscape & Mason Supply",
        html: `<div style="max-width:560px;margin:0 auto;font-family:system-ui,sans-serif;">
          <div style="background:#002e44;padding:20px;text-align:center;">
            <span style="color:#fff;font-size:20px;font-weight:700;">Eastern Landscape &amp; Mason Supply</span>
          </div>
          <div style="padding:24px;">
            <h2 style="color:#002e44;">Your Crew is Ready</h2>
            <p>Hi ${order.customer_name},</p>
            <p>Great news — we've confirmed your booking${confirmedDate ? ` for <strong>${confirmedDate}</strong>` : ""}. Please review and sign the agreement to lock in your crew.</p>
            <div style="text-align:center;margin:24px 0;">
              <a href="${confirmUrl}" style="background:#d4a017;color:#002e44;padding:14px 32px;border-radius:8px;font-weight:700;text-decoration:none;display:inline-block;">Review &amp; Confirm</a>
            </div>
            <p style="color:#666;font-size:13px;">This link expires in 7 days. If you have questions, call us at (631) 874-6244.</p>
          </div>
          <div style="background:#f5f5f0;padding:16px;text-align:center;font-size:12px;color:#888;">Eastern Landscape &amp; Mason Supply &middot; 110 Frowein Road, Center Moriches, NY 11934</div>
        </div>`,
      });
    } catch (err) {
      console.error("[book-now] Confirmation email error:", err);
    }
  }

  // Send SMS
  if (order.customer_phone) {
    try {
      await sendSms(
        order.customer_phone,
        `Eastern LM: Your crew is confirmed${confirmedDate ? ` for ${confirmedDate}` : ""}! Please review & sign: ${confirmUrl}`
      );
    } catch (err) {
      console.error("[book-now] Confirmation SMS error:", err);
    }
  }

  return NextResponse.json({ ok: true, confirmUrl, token });
}
