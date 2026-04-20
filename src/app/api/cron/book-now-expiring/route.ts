import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { sendSms } from "@/lib/sms";

/**
 * GET /api/cron/book-now-expiring
 * Runs every 6 hours. Finds book-now auth holds >6 days old still pending.
 * Sends admin warning SMS + email so they can capture or cancel before Stripe auto-releases.
 */
export async function GET(request: Request) {
  // Optional cron secret check
  const authHeader = request.headers.get("authorization");
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = getSupabaseAdminClient();

  // Auth holds older than 6 days, still pending/awaiting_confirmation
  const sixDaysAgo = new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString();
  const { data: expiring, error } = await (supabase as any)
    .from("orders")
    .select("id, customer_name, customer_phone, grand_total_cents, created_at, status")
    .eq("source", "book_now")
    .eq("capture_method", "manual")
    .in("status", ["pending", "awaiting_confirmation"])
    .lt("created_at", sixDaysAgo)
    .order("created_at", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!expiring || expiring.length === 0) {
    return NextResponse.json({ ok: true, expiring: 0 });
  }

  // Send admin alert
  const summary = expiring
    .map((o: any) => `• ${o.customer_name} — $${(o.grand_total_cents / 100).toFixed(2)} (${o.status})`)
    .join("\n");

  try {
    await sendSms(
      "+16318746244",
      `⚠️ ${expiring.length} Book-a-Crew auth(s) expiring soon (>6 days):\n${summary}\nCapture or cancel in admin before Stripe auto-releases.`
    );
  } catch (err) {
    console.error("[cron] Expiring auth SMS:", err);
  }

  // Also send email
  try {
    const { Resend } = await import("resend");
    const resend = new Resend(process.env.RESEND_API_KEY);
    await resend.emails.send({
      from: `Eastern LM <${process.env.RESEND_FROM_EMAIL ?? "orders@easternlm.com"}>`,
      to: ["adam@easternbuilding.supply"],
      subject: `⚠️ ${expiring.length} Book-a-Crew authorization(s) expiring soon`,
      html: `<div style="font-family:system-ui,sans-serif;">
        <h2>⚠️ Expiring Authorizations</h2>
        <p>The following Book-a-Crew holds are older than 6 days and will auto-release within 24 hours:</p>
        <ul>${expiring.map((o: any) => `<li><strong>${o.customer_name}</strong> — $${(o.grand_total_cents / 100).toFixed(2)} (status: ${o.status}) — booked ${new Date(o.created_at).toLocaleDateString()}</li>`).join("")}</ul>
        <p><a href="https://easternlm.com/admin/operations">Go to Admin</a> to capture or cancel.</p>
      </div>`,
    });
  } catch (err) {
    console.error("[cron] Expiring auth email:", err);
  }

  return NextResponse.json({ ok: true, expiring: expiring.length });
}
