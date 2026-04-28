import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { Resend } from "resend";

const YARD_ADDRESS = "110 Frowein Road, Center Moriches, NY 11934";

function formatUsd(cents: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);
}

function escapeHtml(str: string) {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" });
}

function formatPaymentMethod(m: string) {
  const map: Record<string, string> = {
    cash: "Cash", card_terminal: "Card (Terminal)", card_online: "Card (Online)",
    cod: "Cash on Delivery", account: "Charge Account", check: "Check",
    store_credit: "Store Credit", split: "Split Payment", paylink: "Pay Link",
  };
  if (m.startsWith("split_store_credit_")) return "Split (Store Credit)";
  return map[m] || m;
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = await request.json();
  const emailOverride = body.email as string | undefined;

  const apiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.RESEND_FROM_EMAIL || "orders@easternlm.com";
  if (!apiKey) {
    return NextResponse.json({ error: "Email not configured" }, { status: 500 });
  }

  const supabase = getSupabaseAdminClient();

  const { data: order, error: orderErr } = await (supabase as any)
    .from("orders")
    .select("*")
    .eq("id", id)
    .single();

  if (orderErr || !order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  const { data: items } = await (supabase as any)
    .from("order_items")
    .select("*")
    .eq("order_id", id)
    .order("created_at", { ascending: true });

  const toEmail = emailOverride || order.customer_email;
  if (!toEmail) {
    return NextResponse.json({ error: "No email address" }, { status: 400 });
  }

  if (emailOverride && emailOverride !== order.customer_email) {
    await (supabase as any)
      .from("orders")
      .update({ customer_email: emailOverride })
      .eq("id", id);
  }

  const materialItems = (items || []).filter(
    (i: any) => !i.product_name?.startsWith("Delivery Load") &&
      !i.product_name?.startsWith("Sales Tax") &&
      !i.product_name?.startsWith("Credit Card"),
  );

  const orderNumber = order.order_number || `#${order.id.slice(0, 8).toUpperCase()}`;
  const orderDate = formatDate(order.placed_at || order.created_at);

  const itemRows = materialItems
    .map((item: any) => {
      const unit = item.delivery_type === "bulk" ? "cu. yd" : item.unit || "ea";
      return `<tr>
        <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;">${escapeHtml(item.product_name)}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;text-align:center;">${item.quantity} ${escapeHtml(unit)}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;text-align:right;">${formatUsd(item.unit_price_cents)}/${unit}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;text-align:right;">${formatUsd(item.line_subtotal_cents)}</td>
      </tr>`;
    })
    .join("");

  const discountLine = (order.discount_amount_cents ?? 0) > 0
    ? `<tr><td style="padding:4px 12px;text-align:right;" colspan="3">Discount${order.discount_reason ? ` (${escapeHtml(order.discount_reason)})` : ""}</td><td style="padding:4px 12px;text-align:right;color:#16a34a;">-${formatUsd(order.discount_amount_cents)}</td></tr>`
    : "";
  const deliveryDisplayCents = (order.delivery_total_cents ?? 0) + (order.online_order_fee_cents ?? 0);
  const deliveryLine = deliveryDisplayCents > 0
    ? `<tr><td style="padding:4px 12px;text-align:right;" colspan="3">Delivery</td><td style="padding:4px 12px;text-align:right;">${formatUsd(deliveryDisplayCents)}</td></tr>`
    : "";
  const taxLine = order.tax_exempt
    ? `<tr><td style="padding:4px 12px;text-align:right;" colspan="3">Tax</td><td style="padding:4px 12px;text-align:right;">EXEMPT</td></tr>`
    : `<tr><td style="padding:4px 12px;text-align:right;" colspan="3">Tax (8.75%)</td><td style="padding:4px 12px;text-align:right;">${formatUsd(order.tax_cents ?? 0)}</td></tr>`;
  const ccLine = (order.cc_surcharge_cents ?? 0) > 0
    ? `<tr><td style="padding:4px 12px;text-align:right;" colspan="3">CC Fee (3.5%)</td><td style="padding:4px 12px;text-align:right;">${formatUsd(order.cc_surcharge_cents)}</td></tr>`
    : "";
  const storeCreditLine = (order.store_credit_applied_cents ?? 0) > 0
    ? `<tr><td style="padding:4px 12px;text-align:right;" colspan="3">Store Credit Applied</td><td style="padding:4px 12px;text-align:right;color:#16a34a;">-${formatUsd(order.store_credit_applied_cents)}</td></tr>`
    : "";

  const deliverySection = order.delivery_method === "delivery" && order.delivery_address
    ? `<div style="margin:20px 0;padding:16px;background:#f9fafb;border-radius:8px;border:1px solid #e5e7eb;">
        <h3 style="margin:0 0 8px;font-size:15px;color:#374151;">Delivery Details</h3>
        <p style="margin:0 0 4px;font-size:14px;"><strong>${escapeHtml(order.delivery_address.replace(/,?\s*(USA|US|United States)\s*$/i, ""))}</strong></p>
        ${order.delivery_date ? `<p style="margin:0 0 4px;font-size:14px;">Date: ${formatDate(order.delivery_date)}</p>` : ""}
        ${order.delivery_time_window ? `<p style="margin:0 0 4px;font-size:14px;">Time: ${order.delivery_time_window}</p>` : ""}
        ${order.delivery_notes ? `<p style="margin:0;font-size:14px;">Notes: ${escapeHtml(order.delivery_notes)}</p>` : ""}
      </div>`
    : `<div style="margin:20px 0;padding:16px;background:#f9fafb;border-radius:8px;border:1px solid #e5e7eb;">
        <h3 style="margin:0 0 4px;font-size:15px;color:#374151;">Pickup</h3>
        <p style="margin:0;font-size:14px;">${YARD_ADDRESS}</p>
      </div>`;

  const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"/></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:Arial,Helvetica,sans-serif;">
<div style="max-width:600px;margin:0 auto;padding:20px;">
  <div style="background:#1a2332;padding:24px;border-radius:12px 12px 0 0;text-align:center;">
    <h1 style="margin:0;color:#fff;font-size:20px;letter-spacing:1px;">EASTERN LANDSCAPE<br/>&amp; MASON SUPPLY</h1>
    <p style="margin:6px 0 0;color:#94a3b8;font-size:13px;">${YARD_ADDRESS}<br/>(631) 874-6244</p>
  </div>

  <div style="background:#fff;padding:24px;border:1px solid #e5e7eb;border-top:none;">
    <div style="display:flex;justify-content:space-between;margin-bottom:16px;">
      <div>
        <p style="margin:0 0 4px;font-size:13px;color:#6b7280;">Order</p>
        <p style="margin:0;font-size:16px;font-weight:bold;color:#111827;">${orderNumber}</p>
      </div>
      <div style="text-align:right;">
        <p style="margin:0 0 4px;font-size:13px;color:#6b7280;">Date</p>
        <p style="margin:0;font-size:14px;color:#111827;">${orderDate}</p>
      </div>
    </div>

    <div style="margin-bottom:16px;padding:12px;background:#f0fdf4;border-radius:8px;border:1px solid #bbf7d0;">
      <p style="margin:0;font-size:14px;color:#166534;font-weight:bold;">
        ${order.payment_method === "cod" ? "Cash on Delivery" : "Payment Received"} &mdash; ${formatPaymentMethod(order.payment_method)}
      </p>
    </div>

    <table style="width:100%;border-collapse:collapse;font-size:14px;margin-bottom:4px;">
      <thead>
        <tr style="background:#f9fafb;">
          <th style="text-align:left;padding:8px 12px;border-bottom:2px solid #d1d5db;">Item</th>
          <th style="text-align:center;padding:8px 12px;border-bottom:2px solid #d1d5db;">Qty</th>
          <th style="text-align:right;padding:8px 12px;border-bottom:2px solid #d1d5db;">Price</th>
          <th style="text-align:right;padding:8px 12px;border-bottom:2px solid #d1d5db;">Total</th>
        </tr>
      </thead>
      <tbody>
        ${itemRows}
      </tbody>
    </table>

    <table style="width:100%;border-collapse:collapse;font-size:14px;border-top:2px solid #d1d5db;">
      <tr><td style="padding:6px 12px;text-align:right;" colspan="3">Materials</td><td style="padding:6px 12px;text-align:right;">${formatUsd(order.materials_subtotal_cents ?? 0)}</td></tr>
      ${discountLine}
      ${deliveryLine}
      ${taxLine}
      ${ccLine}
      ${storeCreditLine}
      <tr style="border-top:2px solid #111827;">
        <td style="padding:10px 12px;text-align:right;font-size:16px;font-weight:bold;" colspan="3">Total</td>
        <td style="padding:10px 12px;text-align:right;font-size:16px;font-weight:bold;">${formatUsd(order.grand_total_cents)}</td>
      </tr>
    </table>

    ${deliverySection}
  </div>

  <div style="background:#f9fafb;padding:16px 24px;border-radius:0 0 12px 12px;border:1px solid #e5e7eb;border-top:none;text-align:center;">
    <p style="margin:0 0 4px;font-size:13px;color:#6b7280;">Thank you for your business!</p>
    <p style="margin:0;font-size:13px;color:#6b7280;">easternlm.com &bull; (631) 874-6244</p>
  </div>
</div>
</body></html>`;

  try {
    const resend = new Resend(apiKey);
    await resend.emails.send({
      from: `Eastern LM <${fromEmail}>`,
      to: toEmail,
      subject: `Receipt for Order ${orderNumber} — Eastern LM`,
      html,
    });
    return NextResponse.json({ sent: true });
  } catch (err) {
    console.error("[email-receipt] Failed:", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "Failed to send email" }, { status: 500 });
  }
}
