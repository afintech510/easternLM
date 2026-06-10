import { createDeliveryAssignments } from "@/lib/dispatch/auto-assign";

// Shared logic to materialize an accepted quote into an order (+ items, dispatch, project).
// Used by the admin "Convert to Order" route and the admin manual card-charge route.
//
// `payment` lets the caller override how the resulting order records payment:
//   - convert (no payment captured here): omit → falls back to the deposit_paid_at heuristic
//   - manual card charge (full amount captured): pass status "paid", method, surcharge, paid amount

interface ConvertOptions {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  quote: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any;
  createdBy: string | null;
  payment?: {
    // payment_method must be one of the orders_payment_method_check values
    // (card_online, card_terminal, cash, check, account, cod, split, paylink,
    //  pending, store_credit, ...). Keyed-in card charges use "card_online".
    status?: string;
    paymentMethod?: string;
    ccSurchargeCents?: number;
    depositPaidCentsOverride?: number;
    stripePaymentIntentId?: string;
  };
}

export async function convertQuoteToOrder({ quote, supabase, createdBy, payment }: ConvertOptions): Promise<{ orderId: string }> {
  // Determine if delivery items exist (heuristic: check line item descriptions for delivery keywords)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const hasDelivery = (quote.line_items as any[]).some((i: any) =>
    /deliver|haul|transport|dump/i.test(i.description),
  );

  const orderStatus = payment?.status ?? (quote.deposit_paid_at ? "paid" : "pending");
  const orderPaymentMethod = payment?.paymentMethod ?? (quote.deposit_paid_at ? "card_online" : "pending");
  const depositPaidCents = payment?.depositPaidCentsOverride ?? quote.deposit_paid_cents ?? 0;
  const surchargeCents = payment?.ccSurchargeCents ?? 0;
  // When a payment was captured here, grand total includes the surcharge and we
  // record the full breakdown (mirrors the customer-facing confirm-card order).
  const grandTotalCents = quote.total_cents + (payment ? surchargeCents : 0);

  // Create order from quote
  const { data: order, error: oErr } = await supabase
    .from("orders")
    .insert({
      source: "quote",
      status: orderStatus,
      payment_method: orderPaymentMethod,
      stripe_checkout_session_id: payment?.stripePaymentIntentId ?? null,
      quote_id: quote.id,
      customer_name: quote.customer_name,
      customer_email: quote.customer_email ?? null,
      customer_phone: quote.customer_phone ?? null,
      delivery_method: hasDelivery ? "delivery" : "pickup",
      delivery_address: quote.delivery_address ?? quote.customer_address ?? null,
      delivery_date: quote.delivery_date ?? null,
      delivery_time_window: quote.delivery_time_window ?? null,
      delivery_notes: quote.delivery_notes ?? null,
      materials_subtotal_cents: quote.subtotal_cents,
      tax_cents: quote.tax_cents,
      grand_total_cents: grandTotalCents,
      delivery_total_cents: payment ? (quote.delivery_fee_cents ?? 0) : 0,
      cc_surcharge_cents: surchargeCents,
      metadata: {
        source_quote_id: quote.id,
        source_quote_number: quote.quote_number,
        deposit_paid_cents: depositPaidCents,
        balance_due_cents: quote.total_cents - depositPaidCents,
      },
    })
    .select("id")
    .single();

  if (oErr || !order) throw new Error(oErr?.message ?? "Order creation failed");

  // Create order items
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const items = (quote.line_items as any[]).map((item: any) => ({
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
    .eq("id", quote.id);

  // Auto-create delivery assignments if order has delivery items
  if (hasDelivery) {
    try {
      await createDeliveryAssignments({
        id: order.id,
        delivery_method: hasDelivery ? "delivery" : "pickup",
        delivery_address: quote.customer_address ?? null,
        delivery_zip: null,
        delivery_schedule: [],
        distance_meters: null,
        duration_seconds: null,
        access_constraints: {},
        metadata: {},
        total_loads: 1,
        total_delivery_days: 1,
      });
    } catch (err) { console.error("Auto-dispatch for quote conversion failed:", err); }
  }

  // Auto-create a project from the quote + order
  await supabase.from("projects").insert({
    title: quote.title,
    description: quote.description ?? null,
    status: "active",
    customer_name: quote.customer_name,
    customer_phone: quote.customer_phone ?? null,
    customer_email: quote.customer_email ?? null,
    address: quote.customer_address ?? null,
    quote_id: quote.id,
    order_id: order.id,
    created_by: createdBy,
  });

  return { orderId: order.id };
}
