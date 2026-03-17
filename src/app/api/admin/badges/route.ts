import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/auth";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  const supabase = getSupabaseAdminClient() as any;

  const [ordersRes, followUpsRes, invoicesRes] = await Promise.all([
    // New/pending orders
    supabase
      .from("orders")
      .select("id", { count: "exact", head: true })
      .in("status", ["pending", "new", "confirmed"]),

    // Pending follow-ups (due today or overdue)
    supabase
      .from("follow_ups")
      .select("id", { count: "exact", head: true })
      .lte("scheduled_for", new Date().toISOString())
      .eq("status", "pending"),

    // Supplier invoices not yet confirmed
    supabase
      .from("supplier_invoices")
      .select("id", { count: "exact", head: true })
      .in("ocr_status", ["extracted", "pending"]),
  ]);

  return NextResponse.json({
    orders: ordersRes.count ?? 0,
    followUps: followUpsRes.count ?? 0,
    invoices: invoicesRes.count ?? 0,
  });
}
