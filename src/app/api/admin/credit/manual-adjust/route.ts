import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { customer_id, amount_cents, type, note, created_by } = body;

    if (!customer_id || amount_cents === undefined || amount_cents === 0) {
      return NextResponse.json({ error: "customer_id and non-zero amount_cents required" }, { status: 400 });
    }
    if (!["return_credit", "manual_adjustment"].includes(type)) {
      return NextResponse.json({ error: "type must be return_credit or manual_adjustment" }, { status: 400 });
    }
    if (!note || note.trim().length < 5) {
      return NextResponse.json({ error: "Note required (min 5 characters)" }, { status: 400 });
    }
    if (type === "return_credit" && amount_cents <= 0) {
      return NextResponse.json({ error: "Return credit must be a positive amount" }, { status: 400 });
    }

    const supabase = getSupabaseAdminClient();
    const { data, error } = await supabase.rpc("post_credit", {
      p_customer_id: customer_id,
      p_amount_cents: amount_cents,
      p_type: type,
      p_note: note.trim(),
      p_created_by: created_by || "admin",
      p_order_id: null,
      p_stripe_payment_intent_id: null,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({
      ledger_id: data.id,
      new_balance_cents: data.balance_after_cents,
    });
  } catch (err) {
    console.error("POST /api/admin/credit/manual-adjust error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
