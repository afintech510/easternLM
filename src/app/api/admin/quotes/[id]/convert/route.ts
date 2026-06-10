import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/auth";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { convertQuoteToOrder } from "@/lib/quotes/convert";

type RouteContext = { params: Promise<{ id: string }> };

// POST — convert an accepted quote into an order
export async function POST(_request: Request, context: RouteContext) {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  const { id } = await context.params;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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

  try {
    const { orderId } = await convertQuoteToOrder({ quote, supabase, createdBy: auth.userId });
    return NextResponse.json({ ok: true, orderId });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Conversion failed" }, { status: 500 });
  }
}
