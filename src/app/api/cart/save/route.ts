import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { sendSms } from "@/lib/sms";

/**
 * POST /api/cart/save — Save cart state and send restore link via SMS/email.
 */
export async function POST(request: Request) {
  const body = await request.json();
  const { cartData, customer, sendVia } = body as {
    cartData: Record<string, unknown>;
    customer: { name?: string; phone?: string; email?: string };
    sendVia?: string[];
  };

  if (!cartData) {
    return NextResponse.json({ error: "cartData required" }, { status: 400 });
  }

  const supabase = getSupabaseAdminClient() as any;

  const { data: saved, error } = await supabase
    .from("saved_carts")
    .insert({
      customer_name: customer?.name || null,
      customer_phone: customer?.phone || null,
      customer_email: customer?.email || null,
      cart_data: cartData,
    })
    .select("id, token")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const proto = request.headers.get("x-forwarded-proto") ?? "https";
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  const siteUrl = host && !host.includes("localhost")
    ? `${proto}://${host}`
    : process.env.NEXT_PUBLIC_SITE_URL ?? "https://staging.easternlm.com";
  const restoreUrl = `${siteUrl}/cart?restore=${saved.token}`;

  const fmt = (c: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(c / 100);
  const totalCents = (cartData as any).grandTotalCents ?? 0;

  if (sendVia?.includes("sms") && customer?.phone) {
    await sendSms(
      customer.phone,
      `Eastern LM — Your cart is saved${totalCents ? ` (${fmt(totalCents)})` : ""}.\nResume your order: ${restoreUrl}\n\nReply STOP to opt out.`
    ).catch(() => {});
  }

  if (sendVia?.includes("email") && customer?.email) {
    try {
      const { Resend } = await import("resend");
      const resend = new Resend(process.env.RESEND_API_KEY);
      await resend.emails.send({
        from: `Eastern LM <${process.env.RESEND_FROM_EMAIL ?? "orders@easternlm.com"}>`,
        to: customer.email,
        subject: "Your saved cart from Eastern LM",
        html: `<div style="font-family:sans-serif;max-width:500px;margin:0 auto;">
          <h2 style="color:#1a3a5c;">Your Cart is Saved</h2>
          <p>Hi${customer.name ? ` ${customer.name}` : ""},</p>
          <p>Your cart${totalCents ? ` (${fmt(totalCents)})` : ""} is ready for you to complete.</p>
          <a href="${restoreUrl}" style="display:inline-block;background:#c8952e;color:white;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:bold;">Complete Your Order</a>
          <p style="margin-top:20px;color:#888;font-size:12px;">Eastern Landscape &amp; Mason Supply — (631) 874-6244</p>
        </div>`,
      });
    } catch {}
  }

  return NextResponse.json({ ok: true, token: saved.token, restoreUrl });
}
