import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

const TAX_RATE = 0.0875;
const CC_RATE = 0.03;

function generateShortCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) code += chars.charAt(Math.floor(Math.random() * chars.length));
  return code;
}

function extractNames(fullName: string) {
  const parts = fullName.trim().split(/\s+/);
  return { first: parts[0] || "", last: parts.slice(1).join(" ") || "" };
}

function detectLeadType(items: any[]): "material" | "service" {
  return items.some((i: any) => {
    const n = (i.name ?? "").toLowerCase();
    return n.includes("install") || n.includes("spreading") || n.includes("grading") ||
      n.includes("excavat") || n.includes("labor") || n.includes("resurface") ||
      n.includes("edging") || n.includes("paver") || (i.categorySlug === "installation-services");
  }) ? "service" : "material";
}

function calculateValueTier(cents: number): "quick" | "standard" | "high" {
  if (cents < 20000) return "quick";
  if (cents < 100000) return "standard";
  return "high";
}

/**
 * POST /api/pos/save-quote
 * Unified endpoint for both HOLD (send=false) and QUOTE (send=true).
 * Creates: customer (upsert) + lead + quote. Optionally sends email/SMS.
 */
export async function POST(request: Request) {
  const body = await request.json();
  const {
    items, customer, delivery, notes, serviceInterest,
    send = false, sendVia = "email",
    accessConstraints,
  } = body;

  if (!items?.length) {
    return NextResponse.json({ error: "No items in cart" }, { status: 400 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = getSupabaseAdminClient() as any;

  // 1. Upsert customer by phone
  let customerId: string | null = customer?.id ?? null;
  if (!customerId && customer?.phone) {
    const digits = customer.phone.replace(/\D/g, "").slice(-10);
    const { data: existing } = await supabase
      .from("customers")
      .select("id")
      .ilike("phone", `%${digits}%`)
      .limit(1)
      .maybeSingle();

    if (existing) {
      customerId = existing.id;
      // Update with latest info
      await supabase.from("customers").update({
        email: customer.email || undefined,
        address: delivery?.address || undefined,
      }).eq("id", customerId);
    } else {
      const { first, last } = extractNames(customer.name || "Customer");
      const { data: created } = await supabase.from("customers").insert({
        first_name: first,
        last_name: last,
        phone: digits,
        email: customer.email || null,
        address: delivery?.address || null,
        source: "pos",
      }).select("id").single();
      customerId = created?.id ?? null;
    }
  }

  // 2. Build line items
  const lineItems = items.map((item: any) => ({
    description: item.name ?? "Item",
    quantity: item.quantity ?? 1,
    unit: item.unit ?? "each",
    unit_price_cents: item.unitPriceCents ?? item.price_cents ?? 0,
    total_cents: (item.quantity ?? 1) * (item.unitPriceCents ?? item.price_cents ?? 0),
  }));

  const deliveryFeeCents = delivery?.feeCents ?? 0;
  if (deliveryFeeCents > 0) {
    lineItems.push({
      description: `Delivery${delivery?.address ? ` to ${delivery.address.split(",")[0]}` : ""}`,
      quantity: 1, unit: "trip",
      unit_price_cents: deliveryFeeCents,
      total_cents: deliveryFeeCents,
    });
  }

  const subtotalCents = lineItems.reduce((s: number, i: any) => s + i.total_cents, 0);
  const taxCents = Math.round(subtotalCents * TAX_RATE);
  const cashTotal = subtotalCents + taxCents;
  const ccSurchargeCents = Math.round(cashTotal * CC_RATE);
  const cardTotal = cashTotal + ccSurchargeCents;

  // 3. Detect type + tier
  const leadType = detectLeadType(items);
  const valueTier = calculateValueTier(cashTotal);

  // 4. Generate quote number + short code
  const year = new Date().getFullYear();
  const { count } = await supabase
    .from("quotes").select("id", { count: "exact", head: true })
    .gte("created_at", `${year}-01-01T00:00:00Z`);
  const quoteNumber = `QT-${year}-${((count ?? 0) + 1).toString().padStart(4, "0")}`;

  let shortCode = generateShortCode();
  // Ensure uniqueness (very unlikely collision with <100 quotes)
  const { data: existing } = await supabase.from("quotes").select("id").eq("short_code", shortCode).maybeSingle();
  if (existing) shortCode = generateShortCode();

  const title = notes
    ? notes.slice(0, 60)
    : `${items[0]?.name ?? "Materials"}${items.length > 1 ? ` + ${items.length - 1} more` : ""}`;

  // 5. Create quote
  const validUntil = new Date();
  validUntil.setDate(validUntil.getDate() + 30);

  const { data: quote, error: qErr } = await supabase.from("quotes").insert({
    quote_number: quoteNumber,
    short_code: shortCode,
    customer_id: customerId,
    customer_name: customer?.name ?? "Customer",
    customer_phone: customer?.phone ?? null,
    customer_email: customer?.email ?? null,
    customer_address: delivery?.address ?? null,
    delivery_address: delivery?.address ?? null,
    delivery_fee_cents: deliveryFeeCents,
    title,
    type: leadType,
    line_items: lineItems,
    subtotal_cents: subtotalCents,
    tax_cents: taxCents,
    cc_surcharge_cents: ccSurchargeCents,
    total_cents: cashTotal,
    deposit_required_cents: leadType === "service" ? Math.round(cashTotal * 0.3) : 0,
    valid_until: validUntil.toISOString().split("T")[0],
    terms: "Prices subject to availability. Delivery schedule confirmed upon payment.",
    ai_generated: false,
    status: send ? "sent" : "draft",
    sent_at: send ? new Date().toISOString() : null,
    sent_via: send ? (sendVia === "both" ? ["email", "sms"] : [sendVia]) : null,
    source: "pos",
    internal_notes: notes ?? null,
    service_interest: serviceInterest !== "none" ? serviceInterest : null,
  }).select("id, quote_number, public_token, short_code, total_cents").single();

  if (qErr) return NextResponse.json({ error: qErr.message }, { status: 500 });

  // 6. Create lead
  const { data: lead } = await supabase.from("service_leads").insert({
    customer_id: customerId,
    name: customer?.name ?? "Customer",
    phone: customer?.phone ?? null,
    email: customer?.email ?? null,
    address: delivery?.address ?? null,
    service_type: serviceInterest !== "none" ? serviceInterest : (leadType === "service" ? "installation" : "material_order"),
    description: title,
    status: send ? "quoted" : "new",
    source: "phone",
    source_detail: send ? "POS quote sent" : "POS held order",
    lead_type: leadType,
    value_tier: valueTier,
    estimated_value_cents: cashTotal,
    quote_id: quote.id,
    notes: notes ?? null,
  }).select("id").single();

  if (lead) {
    await supabase.from("quotes").update({ lead_id: lead.id }).eq("id", quote.id);
  }

  // 7. Derive URLs
  const proto = request.headers.get("x-forwarded-proto") ?? "https";
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  const siteUrl = host && !host.includes("localhost")
    ? `${proto}://${host}` : process.env.NEXT_PUBLIC_SITE_URL ?? "https://staging.easternlm.com";
  const quoteUrl = `${siteUrl}/q/${shortCode}`;

  // 8. Send if requested
  const sent: string[] = [];
  if (send) {
    if ((sendVia === "email" || sendVia === "both") && customer?.email) {
      try {
        const { Resend } = await import("resend");
        const resend = new Resend(process.env.RESEND_API_KEY);
        const fmt = (c: number) => `$${(c / 100).toFixed(2)}`;

        const itemRows = lineItems.map((i: any) =>
          `<tr style="border-bottom:1px solid #e5e5e5;"><td style="padding:8px 0;">${i.quantity} ${i.unit} ${i.description}</td><td style="padding:8px 0;text-align:right;">${fmt(i.total_cents)}</td></tr>`
        ).join("");

        await resend.emails.send({
          from: `Eastern LM Quotes <${process.env.RESEND_QUOTES_FROM_EMAIL ?? "quotes@send.easternlm.com"}>`,
          replyTo: "quotes@easternlm.com",
          to: customer.email,
          subject: `Your Quote from Eastern LM — ${quoteNumber}`,
          html: `<div style="max-width:560px;margin:0 auto;font-family:system-ui,sans-serif;">
            <div style="background:#1a2e0a;padding:20px;text-align:center;"><span style="color:#fff;font-size:20px;font-weight:700;">Eastern Landscape & Mason Supply</span></div>
            <div style="padding:24px;">
              <h2 style="color:#1a2e0a;margin:0 0 4px;">Your Quote</h2>
              <p style="color:#666;margin:0 0 20px;">${quoteNumber} · ${new Date().toLocaleDateString()}</p>
              <table style="width:100%;border-collapse:collapse;">${itemRows}</table>
              <table style="width:100%;margin:16px 0;">
                <tr><td style="padding:4px 0;font-weight:bold;">Cash / COD Total:</td><td style="text-align:right;font-weight:bold;">${fmt(cashTotal)}</td></tr>
                <tr><td style="padding:4px 0;color:#666;">Card Total (incl. 3% fee):</td><td style="text-align:right;color:#666;">${fmt(cardTotal)}</td></tr>
              </table>
              ${delivery?.address ? `<p>📍 ${delivery.address}</p>` : ""}
              <a href="${quoteUrl}" style="display:block;background:#2d5016;color:#fff;text-align:center;padding:14px;border-radius:8px;text-decoration:none;font-weight:600;font-size:16px;margin:24px 0;">Review & Pay →</a>
              <p style="text-align:center;color:#666;font-size:13px;">Or call: (631) 874-6244</p>
            </div>
            <div style="background:#f5f5f0;padding:16px;text-align:center;font-size:12px;color:#888;">Eastern Landscape & Mason Supply<br>110 Frowein Road, Center Moriches, NY 11934</div>
          </div>`,
        });
        sent.push("email");
      } catch (err) {
        console.error("[save-quote] Email failed:", err);
      }
    }

    if ((sendVia === "sms" || sendVia === "both") && customer?.phone) {
      try {
        const sid = process.env.TWILIO_ACCOUNT_SID;
        const token = process.env.TWILIO_AUTH_TOKEN;
        const from = process.env.TWILIO_PHONE_NUMBER;
        if (sid && token && from) {
          const digits = customer.phone.replace(/\D/g, "");
          const to = digits.startsWith("1") ? `+${digits}` : `+1${digits}`;
          const fmt = (c: number) => `$${(c / 100).toFixed(2)}`;
          const itemSummary = items.slice(0, 3).map((i: any) => `${i.quantity} ${i.unit ?? "yd"} ${i.name}`).join(", ");

          await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
            method: "POST",
            headers: {
              Authorization: `Basic ${Buffer.from(`${sid}:${token}`).toString("base64")}`,
              "Content-Type": "application/x-www-form-urlencoded",
            },
            body: new URLSearchParams({
              To: to, From: from,
              Body: `Eastern LM — Quote for ${customer.name}:\n${itemSummary}\nTotal: ${fmt(cashTotal)} (cash) / ${fmt(cardTotal)} (card)\nReview & pay: ${quoteUrl}\n\nCall: (631) 874-6244`,
            }),
          });
          sent.push("sms");
        }
      } catch (err) {
        console.error("[save-quote] SMS failed:", err);
      }
    }

    // Update quote with sent info
    if (sent.length > 0) {
      await supabase.from("quotes").update({ sent_via: sent }).eq("id", quote.id);
    }

    // Schedule follow-ups (import dynamically to avoid circular deps)
    try {
      const { scheduleQuoteFollowUps } = await import("@/lib/quotes/follow-ups");
      await scheduleQuoteFollowUps({
        id: quote.id,
        public_token: quote.public_token,
        customer_name: customer?.name ?? "Customer",
        customer_phone: customer?.phone ?? null,
        customer_email: customer?.email ?? null,
        customer_id: customerId,
        title, total_cents: cashTotal,
        valid_until: validUntil.toISOString().split("T")[0],
      }, siteUrl);
    } catch (err) {
      console.error("[save-quote] Follow-up scheduling failed:", err);
    }
  }

  return NextResponse.json({
    ok: true,
    quote: { id: quote.id, quoteNumber: quote.quote_number, shortCode: quote.short_code, totalCents: cashTotal, quoteUrl },
    lead: lead ? { id: lead.id } : null,
    customerId,
    sent,
    mode: send ? "sent" : "held",
  });
}
