import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

// GET — legacy one-click unsubscribe (redirects to page)
export async function GET(request: NextRequest) {
  const customerId = request.nextUrl.searchParams.get("id");
  if (!customerId) {
    return NextResponse.redirect(new URL("/unsubscribe", request.url));
  }
  return NextResponse.redirect(new URL(`/unsubscribe?id=${customerId}`, request.url));
}

// POST — channel-specific unsubscribe
export async function POST(request: Request) {
  const body = await request.json();
  const { customerId, channel } = body as { customerId: string; channel: "email" | "sms" | "all" };

  if (!customerId) {
    return NextResponse.json({ error: "Missing customer ID" }, { status: 400 });
  }

  const supabase = getSupabaseAdminClient();

  // Update opt-in flags based on channel choice
  const update: Record<string, boolean> = {};
  if (channel === "email" || channel === "all") update.opted_in_email = false;
  if (channel === "sms" || channel === "all") update.opted_in_sms = false;

  await supabase.from("customers").update(update).eq("id", customerId);

  // Cancel pending follow-ups and campaign sends
  await supabase.from("follow_ups").update({ status: "cancelled" }).eq("customer_id", customerId).eq("status", "pending");
  await supabase.from("campaign_sends").update({ status: "opted_out" }).eq("customer_id", customerId).eq("status", "pending");

  return NextResponse.json({ ok: true });
}
