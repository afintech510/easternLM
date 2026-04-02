import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { action, reason, disabled_by } = body;

    if (!["disable", "flag_scammer"].includes(action)) {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    const supabase = getSupabaseAdminClient();

    // Fetch the quote first
    const { data: quote, error: fetchErr } = await supabase
      .from("quotes")
      .select("id, status, customer_id")
      .eq("id", id)
      .single();

    if (fetchErr || !quote) {
      return NextResponse.json({ error: "Quote not found" }, { status: 404 });
    }

    // Idempotent: already disabled/scammer is a no-op
    const newStatus = action === "flag_scammer" ? "scammer" : "disabled";
    if (quote.status === newStatus) {
      return NextResponse.json({ success: true, quote_id: id, new_status: newStatus, customer_flagged: false });
    }

    // Update quote
    const { error: updateErr } = await supabase
      .from("quotes")
      .update({
        status: newStatus,
        disabled_at: new Date().toISOString(),
        disabled_by: disabled_by || "staff",
        disable_reason: reason || null,
      })
      .eq("id", id);

    if (updateErr) {
      return NextResponse.json({ error: updateErr.message }, { status: 500 });
    }

    // Flag customer if scammer action and customer exists
    let customerFlagged = false;
    if (action === "flag_scammer" && quote.customer_id) {
      const { error: custErr } = await supabase
        .from("customers")
        .update({
          is_scammer: true,
          scammer_note: reason || "Flagged via quote disable",
        })
        .eq("id", quote.customer_id);

      if (!custErr) customerFlagged = true;
    }

    return NextResponse.json({
      success: true,
      quote_id: id,
      new_status: newStatus,
      customer_flagged: customerFlagged,
    });
  } catch (err) {
    console.error("POST /api/pos/quotes/[id]/disable error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
