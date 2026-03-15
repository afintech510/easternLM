import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

// GET: compute today's totals
export async function GET() {
  const supabase = getSupabaseAdminClient();
  const today = new Date().toISOString().split("T")[0];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: orders } = await supabase
    .from("orders")
    .select("grand_total_cents, payment_method, delivery_method, status")
    .in("source", ["pos", "phone"])
    .gte("created_at", `${today}T00:00:00`)
    .lt("created_at", `${today}T23:59:59`) as any;

  const all = (orders || []) as Array<{ grand_total_cents: number; payment_method: string; delivery_method: string; status: string }>;
  const paid = all.filter((o) => o.status === "paid" || o.status === "partially_refunded");
  const refunded = all.filter((o) => o.status === "refunded");

  const cardOrders = paid.filter((o) => o.payment_method === "card_terminal");
  const cashOrders = paid.filter((o) => o.payment_method === "cash");

  return NextResponse.json({
    date: today,
    totalSalesCents: paid.reduce((s, o) => s + o.grand_total_cents, 0),
    totalTransactions: paid.length,
    cardTotalCents: cardOrders.reduce((s, o) => s + o.grand_total_cents, 0),
    cardCount: cardOrders.length,
    cashTotalCents: cashOrders.reduce((s, o) => s + o.grand_total_cents, 0),
    cashCount: cashOrders.length,
    deliveryCount: paid.filter((o) => o.delivery_method === "delivery").length,
    pickupCount: paid.filter((o) => o.delivery_method === "pickup").length,
    refundCount: refunded.length,
    refundTotalCents: refunded.reduce((s, o) => s + o.grand_total_cents, 0),
  });
}

// POST: save the daily report
export async function POST(request: Request) {
  const body = await request.json();
  const supabase = getSupabaseAdminClient();

  const countedCents = Math.round(parseFloat(body.countedCash || "0") * 100);
  const variance = countedCents - (body.expectedCashCents || 0);

  const { error } = await supabase.from("pos_daily_reports").upsert({
    report_date: body.date,
    total_sales_cents: body.totalSalesCents,
    total_transactions: body.totalTransactions,
    card_total_cents: body.cardTotalCents,
    card_count: body.cardCount,
    cash_total_cents: body.cashTotalCents,
    cash_count: body.cashCount,
    expected_cash_cents: body.cashTotalCents,
    counted_cash_cents: countedCents,
    variance_cents: variance,
    delivery_count: body.deliveryCount,
    pickup_count: body.pickupCount,
    refund_total_cents: body.refundTotalCents,
    refund_count: body.refundCount,
    closed_by: body.staffId || null,
    closed_at: new Date().toISOString(),
    notes: body.notes || null,
  }, { onConflict: "report_date" });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
