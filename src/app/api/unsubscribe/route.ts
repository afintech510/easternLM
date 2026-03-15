import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export async function GET(request: NextRequest) {
  const customerId = request.nextUrl.searchParams.get("id");
  if (!customerId) {
    return new NextResponse("<html><body><h1>Invalid link</h1></body></html>", { headers: { "Content-Type": "text/html" } });
  }

  const supabase = getSupabaseAdminClient();

  // Set opt-out flags
  await supabase.from("customers").update({ opted_in_email: false }).eq("id", customerId);

  // Cancel pending follow-ups
  await supabase.from("follow_ups").update({ status: "cancelled" }).eq("customer_id", customerId).eq("status", "pending");

  return new NextResponse(
    `<html><body style="font-family:sans-serif;max-width:400px;margin:80px auto;text-align:center;">
      <h1>Unsubscribed</h1>
      <p>You won't receive any more emails from us.</p>
      <p style="color:#666;font-size:14px;">Eastern Landscape & Mason Supply<br>(631) 874-6244</p>
    </body></html>`,
    { headers: { "Content-Type": "text/html" } },
  );
}
