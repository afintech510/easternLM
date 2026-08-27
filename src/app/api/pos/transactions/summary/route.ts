import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

// Milliseconds that the given IANA timezone is ahead of UTC at `date`.
// Negative for US Eastern (e.g. -4h during EDT, -5h during EST).
function tzOffsetMs(date: Date, timeZone: string): number {
  const utc = new Date(date.toLocaleString("en-US", { timeZone: "UTC" }));
  const tz = new Date(date.toLocaleString("en-US", { timeZone }));
  return tz.getTime() - utc.getTime();
}

const YARD_TZ = "America/New_York";

type SummaryRow = {
  placed_at: string;
  grand_total_cents: number | null;
  refunds: { amount_cents?: number }[] | null;
};

// Net = order total minus any refund credits recorded on that order.
function netCents(row: SummaryRow): number {
  const gross = row.grand_total_cents ?? 0;
  const refunded = (row.refunds ?? []).reduce((s, r) => s + (r?.amount_cents ?? 0), 0);
  return gross - refunded;
}

export async function GET() {
  const now = new Date();
  const offset = tzOffsetMs(now, YARD_TZ);

  // Shift `now` so getUTC* fields read the yard's wall-clock (ET) calendar.
  const etWall = new Date(now.getTime() + offset);
  const y = etWall.getUTCFullYear();
  const mo = etWall.getUTCMonth();
  const d = etWall.getUTCDate();
  const dow = etWall.getUTCDay(); // 0 = Sunday, in ET

  // Convert an ET wall-clock midnight back to the real UTC instant.
  const todayStart = new Date(Date.UTC(y, mo, d, 0, 0, 0) - offset);
  const weekStart = new Date(Date.UTC(y, mo, d - dow, 0, 0, 0) - offset); // most recent Sunday 00:00 ET

  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("orders")
    .select("placed_at, grand_total_cents, refunds, status")
    .gte("placed_at", weekStart.toISOString())
    .neq("status", "cancelled");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const todayStartMs = todayStart.getTime();
  let todayCents = 0;
  let weekCents = 0;
  for (const row of (data ?? []) as SummaryRow[]) {
    const net = netCents(row);
    weekCents += net;
    if (new Date(row.placed_at).getTime() >= todayStartMs) todayCents += net;
  }

  return NextResponse.json({ todayCents, weekCents });
}
