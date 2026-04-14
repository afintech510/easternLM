import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/auth";
import { sendSms } from "@/lib/sms";

/**
 * POST /api/admin/accounts/send-application
 * Sends a credit account application link to a prospect via email/SMS.
 */
export async function POST(request: Request) {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  const { email, phone, company_name, contact_name, send_via } = await request.json() as {
    email?: string;
    phone?: string;
    company_name?: string;
    contact_name?: string;
    send_via: "email" | "sms" | "both";
  };

  if (!send_via || (send_via !== "email" && send_via !== "sms" && send_via !== "both")) {
    return NextResponse.json({ error: "send_via must be email, sms, or both" }, { status: 400 });
  }
  if ((send_via === "email" || send_via === "both") && !email) {
    return NextResponse.json({ error: "email required" }, { status: 400 });
  }
  if ((send_via === "sms" || send_via === "both") && !phone) {
    return NextResponse.json({ error: "phone required" }, { status: 400 });
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://easternlm.com";
  const applyUrl = `${siteUrl}/apply/credit-account`;
  const sent: string[] = [];

  // Send SMS
  if ((send_via === "sms" || send_via === "both") && phone) {
    const greeting = contact_name ? `Hi ${contact_name}` : "Hi";
    await sendSms(
      phone,
      `${greeting} — Eastern LM Contractor Charge Account application:\n${applyUrl}\n\nGet Net 30 terms on bulk materials. Reply STOP to opt out.`
    ).catch(() => {});
    sent.push("sms");
  }

  // Send email
  if ((send_via === "email" || send_via === "both") && email) {
    try {
      const { Resend } = await import("resend");
      const resend = new Resend(process.env.RESEND_API_KEY);
      await resend.emails.send({
        from: `Eastern LM <${process.env.RESEND_FROM_EMAIL ?? "orders@easternlm.com"}>`,
        to: email,
        subject: "Apply for a Contractor Charge Account — Eastern LM",
        html: `<div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:24px;">
          <div style="background:#1a3a5c;padding:16px 24px;border-radius:8px 8px 0 0;color:white;">
            <h2 style="margin:0;font-size:20px;">Contractor Charge Account</h2>
            <p style="margin:4px 0 0;color:#93c5fd;font-size:13px;">Eastern Landscape &amp; Mason Supply</p>
          </div>
          <div style="background:#fff;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 8px 8px;padding:24px;">
            <p>${contact_name ? `Hi ${contact_name},` : "Hello,"}</p>
            <p>${company_name ? `Thanks for your interest in setting up a charge account for <strong>${company_name}</strong>. ` : ""}Complete our short application below to get started with Net 30 terms on bulk materials.</p>
            <ul style="color:#4b5563;font-size:14px;line-height:1.8;">
              <li>Net 30 payment terms on approved orders</li>
              <li>Charge materials directly to your account at POS or online</li>
              <li>Monthly statements with easy online payment</li>
              <li>Tax exempt status supported with certificate on file</li>
            </ul>
            <div style="text-align:center;margin:28px 0;">
              <a href="${applyUrl}" style="display:inline-block;background:#d58300;color:white;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:bold;font-size:15px;">Start Application →</a>
            </div>
            <p style="color:#6b7280;font-size:13px;">Takes about 5 minutes. We&apos;ll review and contact you within 1-2 business days to activate your account.</p>
            <hr style="border:none;border-top:1px solid #e5e7eb;margin:20px 0;">
            <p style="color:#9ca3af;font-size:12px;text-align:center;">
              Questions? Call <a href="tel:6318746244" style="color:#1a3a5c;">(631) 874-6244</a><br/>
              110 Frowein Road, Center Moriches, NY 11934
            </p>
          </div>
        </div>`,
      });
      sent.push("email");
    } catch (err) {
      console.error("[send-application] Email error:", err);
    }
  }

  return NextResponse.json({ ok: true, sent, applyUrl });
}
