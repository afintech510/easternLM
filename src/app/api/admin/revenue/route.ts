import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export async function GET(request: NextRequest) {
  const period = request.nextUrl.searchParams.get("period") ?? "daily";
  const supabase = getSupabaseAdminClient();

  let dateFrom: string;
  let dateTrunc: string;

  switch (period) {
    case "weekly":
      dateFrom = new Date(Date.now() - 12 * 7 * 24 * 60 * 60 * 1000).toISOString();
      dateTrunc = "week";
      break;
    case "monthly":
      dateFrom = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString();
      dateTrunc = "month";
      break;
    default:
      dateFrom = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      dateTrunc = "day";
      break;
  }

  const { data, error } = await supabase.rpc("get_revenue_by_period", {
    p_date_from: dateFrom,
    p_date_trunc: dateTrunc,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const timeSeriesMap = new Map<string, any>();
  const summaryByMethod: Record<string, { total_cents: number; count: number }> = {};
  let summaryTotal = 0;
  let summaryCount = 0;

  for (const row of data ?? []) {
    const dateKey = row.period_date;
    const method = row.payment_method ?? "unknown";

    if (!timeSeriesMap.has(dateKey)) {
      timeSeriesMap.set(dateKey, { date: dateKey, total_cents: 0, order_count: 0, by_method: {} });
    }

    const entry = timeSeriesMap.get(dateKey);
    entry.total_cents += Number(row.total_cents);
    entry.order_count += Number(row.order_count);
    entry.by_method[method] = { total_cents: Number(row.total_cents), count: Number(row.order_count) };

    if (!summaryByMethod[method]) summaryByMethod[method] = { total_cents: 0, count: 0 };
    summaryByMethod[method].total_cents += Number(row.total_cents);
    summaryByMethod[method].count += Number(row.order_count);
    summaryTotal += Number(row.total_cents);
    summaryCount += Number(row.order_count);
  }

  // Pending orders count
  const { count: pendingCount } = await supabase
    .from("orders")
    .select("id", { count: "exact", head: true })
    .in("status", ["pending", "new", "confirmed"]);

  return NextResponse.json({
    period,
    data: Array.from(timeSeriesMap.values()).sort((a, b) => a.date.localeCompare(b.date)),
    summary: {
      total_cents: summaryTotal,
      order_count: summaryCount,
      by_method: summaryByMethod,
      pending_count: pendingCount ?? 0,
    },
  });
}
