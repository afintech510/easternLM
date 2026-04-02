import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { customer_id, order_id, amount_cents } = body;

    if (!customer_id || !amount_cents || amount_cents <= 0) {
      return NextResponse.json({ error: "customer_id and positive amount_cents required" }, { status: 400 });
    }

    const supabase = getSupabaseAdminClient();

    const { data: cust } = await supabase
      .from("customers")
      .select("credit_balance_cents")
      .eq("id", customer_id)
      .single();

    if (!cust) {
      return NextResponse.json({ error: "Customer not found" }, { status: 404 });
    }
    if (amount_cents > cust.credit_balance_cents) {
      return NextResponse.json(
        { error: "Insufficient credit", balance_cents: cust.credit_balance_cents },
        { status: 400 },
      );
    }

    const { data, error } = await supabase.rpc("post_credit", {
      p_customer_id: customer_id,
      p_amount_cents: -amount_cents,
      p_type: "redemption",
      p_note: `Applied to order`,
      p_created_by: "pos",
      p_order_id: order_id || null,
      p_stripe_payment_intent_id: undefined,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ remaining_balance_cents: data.balance_after_cents });
  } catch (err) {
    console.error("POST /api/pos/credit/redeem error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
