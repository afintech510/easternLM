import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { cancelNotViewedFollowUps } from "@/lib/quotes/follow-ups";

type RouteContext = { params: Promise<{ token: string }> };

export async function GET(_req: Request, context: RouteContext) {
  const { token } = await context.params;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = getSupabaseAdminClient() as any;

  const { data, error } = await supabase
    .from("quotes")
    .select(
      "id, quote_number, public_token, customer_name, customer_phone, customer_email, customer_address, title, description, line_items, subtotal_cents, tax_cents, total_cents, deposit_required_cents, deposit_paid_cents, valid_until, estimated_timeline, terms, status, accepted_at, declined_at, customer_signature_url, deposit_paid_at, type, cc_surcharge_cents, delivery_address, delivery_fee_cents, delivery_loads, delivery_date, delivery_time_window, delivery_notes, access_constraints, route_info, photo_urls",
    )
    .eq("public_token", token)
    .single();

  if (error || !data) return NextResponse.json({ error: "Quote not found" }, { status: 404 });

  // Mark as viewed if first time
  if (data.status === "sent") {
    await supabase
      .from("quotes")
      .update({ status: "viewed", viewed_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq("public_token", token);
    data.status = "viewed";
    // Cancel "not viewed" follow-ups since they did view it
    cancelNotViewedFollowUps(data.id).catch(() => {});
  }

  return NextResponse.json({ quote: data });
}
