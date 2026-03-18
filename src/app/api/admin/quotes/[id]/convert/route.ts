import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/auth";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

type RouteContext = { params: Promise<{ id: string }> };

// POST — convert an accepted quote into an order
export async function POST(_request: Request, context: RouteContext) {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  const { id } = await context.params;
  const supabase = getSupabaseAdminClient() as any;

  // Fetch quote
  const { data: quote, error: qErr } = await supabase
    .from("quotes")
    .select("*")
    .eq("id", id)
    .single();

  if (qErr || !quote) return NextResponse.json({ error: "Quote not found" }, { status: 404 });
  if (quote.status !== "accepted") return NextResponse.json({ error: "Only accepted quotes can be converted" }, { status: 400 });
  if (quote.converted_order_id) return NextResponse.json({ error: "Already converted", orderId: quote.converted_order_id }, { status: 400 });

  // Determine if delivery items exist (heuristic: check line item descriptions for delivery keywords)
  const hasDelivery = (quote.line_items as any[]).some((i: any) =>
    /deliver|haul|transport|dump/i.test(i.description),
  );

  // Create order from quote
  const { data: order, error: oErr } = await supabase
    .from("orders")
    .insert({
      source: "quote",
      status: quote.deposit_paid_at ? "paid" : "pending",
      payment_method: quote.deposit_paid_at ? "card_online" : "pending",
      customer_name: quote.customer_name,
      customer_email: quote.customer_email ?? null,
      customer_phone: quote.customer_phone ?? null,
      delivery_method: hasDelivery ? "delivery" : "pickup",
      delivery_address: quote.customer_address ?? null,
      materials_subtotal_cents: quote.subtotal_cents,
      tax_cents: quote.tax_cents,
      grand_total_cents: quote.total_cents,
      delivery_total_cents: 0,
      cc_surcharge_cents: 0,
      metadata: {
        source_quote_id: quote.id,
        source_quote_number: quote.quote_number,
        deposit_paid_cents: quote.deposit_paid_cents ?? 0,
        balance_due_cents: quote.total_cents - (quote.deposit_paid_cents ?? 0),
      },
    })
    .select("id")
    .single();

  if (oErr || !order) return NextResponse.json({ error: oErr?.message ?? "Order creation failed" }, { status: 500 });

  // Create order items
  const items = (quote.line_items as any[]).map((item: any, idx: number) => ({
    order_id: order.id,
    product_name: item.description,
    quantity: item.quantity,
    unit: item.unit ?? "job",
    unit_price_cents: item.unit_price_cents,
    line_subtotal_cents: item.total_cents,
    notes: item.notes ?? null,
  }));

  if (items.length > 0) {
    await supabase.from("order_items").insert(items);
  }

  // Update quote status to converted
  await supabase
    .from("quotes")
    .update({
      status: "converted",
      converted_order_id: order.id,
    })
    .eq("id", id);

  return NextResponse.json({ ok: true, orderId: order.id });
}
