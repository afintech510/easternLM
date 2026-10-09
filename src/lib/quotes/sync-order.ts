// Keeps a converted quote's order in step with the quote after the order exists.
//
// A deposit paid on the quote page books the order up front (so dispatch sees
// it), but the job can grow afterwards — post-job items get added and the quote
// is finalized into a balance-due invoice. This rewrites the order's items and
// totals from the quote so reports reflect the billed job, and records how much
// has actually been collected in metadata.
//
// `payment` adds the card fee collected on a later payment (balance) on top of
// what the order already recorded. Keyed by Stripe id so the webhook and the
// client confirm call can't both add it.

export async function syncOrderFromQuote(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  quoteId: string,
  payment?: { stripePaymentId: string; ccSurchargeCents: number },
) {
  const { data: quote } = await supabase
    .from("quotes")
    .select("id, quote_number, line_items, subtotal_cents, delivery_fee_cents, tax_cents, total_cents, deposit_paid_cents, balance_paid_cents, converted_order_id")
    .eq("id", quoteId)
    .single();
  if (!quote?.converted_order_id) return;

  const { data: order } = await supabase
    .from("orders")
    .select("id, cc_surcharge_cents, metadata")
    .eq("id", quote.converted_order_id)
    .single();
  if (!order) return;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const items = ((quote.line_items as any[]) ?? []).map((item: any) => ({
    order_id: order.id,
    product_name: item.description,
    quantity: item.quantity,
    unit: item.unit ?? "job",
    unit_price_cents: item.unit_price_cents,
    line_subtotal_cents: item.total_cents,
    notes: item.notes ?? null,
  }));
  await supabase.from("order_items").delete().eq("order_id", order.id);
  if (items.length > 0) await supabase.from("order_items").insert(items);

  const appliedPayments: string[] = order.metadata?.applied_payment_ids ?? [];
  const isNewPayment = !!payment && !appliedPayments.includes(payment.stripePaymentId);
  const ccSurcharge = (order.cc_surcharge_cents ?? 0) + (isNewPayment ? payment.ccSurchargeCents : 0);
  const depositPaid = quote.deposit_paid_cents ?? 0;
  const balancePaid = quote.balance_paid_cents ?? 0;

  await supabase
    .from("orders")
    .update({
      materials_subtotal_cents: quote.subtotal_cents,
      delivery_total_cents: quote.delivery_fee_cents ?? 0,
      tax_cents: quote.tax_cents,
      cc_surcharge_cents: ccSurcharge,
      grand_total_cents: (quote.total_cents ?? 0) + ccSurcharge,
      metadata: {
        ...(order.metadata ?? {}),
        quote_id: quote.id,
        quote_number: quote.quote_number,
        deposit_paid_cents: depositPaid,
        balance_paid_cents: balancePaid,
        balance_due_cents: Math.max(0, (quote.total_cents ?? 0) - depositPaid - balancePaid),
        applied_payment_ids: isNewPayment ? [...appliedPayments, payment.stripePaymentId] : appliedPayments,
      },
      updated_at: new Date().toISOString(),
    })
    .eq("id", order.id);
}
