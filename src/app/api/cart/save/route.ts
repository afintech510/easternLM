import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

// POST — save current cart and return a shareable link
export async function POST(request: Request) {
  const body = await request.json();
  const { items, deliveryMethod, deliveryAddress, customerName, customerEmail, customerPhone } = body;

  if (!items?.length) {
    return NextResponse.json({ error: "Cart is empty" }, { status: 400 });
  }

  const supabase = getSupabaseAdminClient() as any;

  const { data, error } = await supabase
    .from("saved_carts")
    .insert({
      items,
      delivery_method: deliveryMethod ?? "delivery",
      delivery_address: deliveryAddress ?? null,
      customer_name: customerName ?? null,
      customer_email: customerEmail ?? null,
      customer_phone: customerPhone ?? null,
      source: "web",
    })
    .select("token")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://staging.easternlm.com";
  const link = `${baseUrl}/cart?restore=${data.token}`;

  // Send via email if provided
  if (customerEmail) {
    try {
      const { Resend } = await import("resend");
      const resend = new Resend(process.env.RESEND_API_KEY);
      await resend.emails.send({
        from: process.env.RESEND_FROM_EMAIL || "orders@easternlm.com",
        to: customerEmail,
        subject: "Your Saved Cart — Eastern Landscape & Mason Supply",
        html: `
          <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto;">
            <h2 style="color: #1a3a5c;">Your Cart is Saved!</h2>
            <p>Hi${customerName ? ` ${customerName}` : ""},</p>
            <p>You saved ${items.length} item${items.length > 1 ? "s" : ""} in your cart. Click below to pick up where you left off:</p>
            <a href="${link}" style="display: inline-block; background: #c8952e; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold;">
              View My Cart
            </a>
            <p style="margin-top: 20px; color: #888; font-size: 12px;">This link expires in 30 days.</p>
            <p style="color: #888; font-size: 12px;">Eastern Landscape & Mason Supply — (631) 874-6244</p>
          </div>
        `,
      });
    } catch {
      // Non-critical — cart is still saved
    }
  }

  // Send via SMS if phone provided
  if (customerPhone) {
    try {
      const sid = process.env.TWILIO_ACCOUNT_SID;
      const authToken = process.env.TWILIO_AUTH_TOKEN;
      const from = process.env.TWILIO_PHONE_NUMBER;
      if (sid && authToken && from) {
        const cleanPhone = customerPhone.replace(/\D/g, "");
        const toPhone = cleanPhone.startsWith("1") ? `+${cleanPhone}` : `+1${cleanPhone}`;
        await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
          method: "POST",
          headers: {
            Authorization: `Basic ${Buffer.from(`${sid}:${authToken}`).toString("base64")}`,
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: new URLSearchParams({
            To: toPhone,
            From: from,
            Body: `Your cart at Eastern LM is saved! ${items.length} item${items.length > 1 ? "s" : ""} waiting for you:\n${link}\n\nReply STOP to opt out.`,
          }),
        });
      }
    } catch {
      // Non-critical
    }
  }

  return NextResponse.json({ ok: true, token: data.token, link });
}
