import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/auth";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { sendQuoteConfirmationEmail } from "@/lib/email/quote-confirmation";

type RouteContext = { params: Promise<{ id: string }> };

/**
 * POST /api/admin/quotes/[id]/send-confirmation
 * Manually send (or resend) the confirmation email for a quote.
 * Body: { to?: string } — optional override email address.
 */
export async function POST(request: Request, context: RouteContext) {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  const { id } = await context.params;
  const body = await request.json().catch(() => ({}));
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = getSupabaseAdminClient() as any;

  const { data: quote } = await supabase.from("quotes").select("*").eq("id", id).single();
  if (!quote) return NextResponse.json({ error: "Quote not found" }, { status: 404 });

  // Allow override email for testing
  const sendTo = body.to || quote.customer_email;
  if (!sendTo) return NextResponse.json({ error: "No email address" }, { status: 400 });

  const quoteWithEmail = { ...quote, customer_email: sendTo };
  await sendQuoteConfirmationEmail(quoteWithEmail, {
    depositAmountCents: quote.deposit_paid_cents || quote.deposit_required_cents || quote.total_cents,
    paymentMethod: "card",
  });

  return NextResponse.json({ ok: true, sentTo: sendTo });
}
