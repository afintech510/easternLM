import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/auth";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

const TAX_RATE = 0.0875;

type LineItem = {
  description: string;
  quantity: number;
  unit: string;
  unit_price_cents: number;
  total_cents: number;
};

/**
 * POST /api/admin/quotes/[id]/finalize
 * Recompute totals from the current line_items and mark the quote as finalized.
 * After finalization the customer-facing page switches into invoice mode and
 * exposes a "Pay Balance" button.
 *
 * Allowed states: a deposit has been paid (deposit_paid_at set). This covers
 * both 'accepted' quotes and 'converted' ones — a deposit paid on the quote
 * page books a full order and flips the quote to 'converted', but the balance
 * is still collectible via the final-invoice flow.
 */
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = getSupabaseAdminClient() as any;

  const { data: quote, error } = await supabase
    .from("quotes")
    .select("id, status, deposit_paid_at, deposit_paid_cents, balance_paid_cents, line_items, tax_exempt, delivery_fee_cents")
    .eq("id", id)
    .single();

  if (error || !quote) {
    return NextResponse.json({ error: "Quote not found" }, { status: 404 });
  }

  if (["declined", "disabled", "scammer"].includes(quote.status)) {
    return NextResponse.json(
      { error: `Cannot finalize a '${quote.status}' quote.` },
      { status: 400 },
    );
  }
  if (!quote.deposit_paid_at) {
    return NextResponse.json(
      { error: "Cannot finalize before deposit is paid." },
      { status: 400 },
    );
  }

  // Recompute totals from current line_items so finalize captures any post-job additions.
  const items: LineItem[] = (quote.line_items as LineItem[]) ?? [];
  const subtotal = items.reduce((s, i) => s + (i.total_cents ?? 0), 0);
  const tax = quote.tax_exempt ? 0 : Math.round(subtotal * TAX_RATE);
  const total = subtotal + tax;

  const { error: updateError } = await supabase
    .from("quotes")
    .update({
      subtotal_cents: subtotal,
      tax_cents: tax,
      total_cents: total,
      finalized_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  const balanceOwedCents = Math.max(
    0,
    total - (quote.deposit_paid_cents ?? 0) - (quote.balance_paid_cents ?? 0),
  );

  return NextResponse.json({
    ok: true,
    subtotal_cents: subtotal,
    tax_cents: tax,
    total_cents: total,
    balance_owed_cents: balanceOwedCents,
  });
}
