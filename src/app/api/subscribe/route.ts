import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  const body = await request.json();
  const { contact, source } = body as { contact: string; source?: string };

  if (!contact || contact.trim().length < 5) {
    return NextResponse.json({ error: "Please enter a phone number or email" }, { status: 400 });
  }

  const supabase = getSupabaseAdminClient();
  const cleaned = contact.trim();
  const isEmail = cleaned.includes("@");
  const isPhone = /^\d{10,}$/.test(cleaned.replace(/\D/g, ""));

  if (!isEmail && !isPhone) {
    return NextResponse.json({ error: "Please enter a valid phone number or email" }, { status: 400 });
  }

  const phone = isPhone ? cleaned.replace(/\D/g, "").slice(-10) : null;
  const email = isEmail ? cleaned.toLowerCase() : null;

  // Check if customer exists
  let customerId: string | null = null;

  if (phone) {
    const { data } = await supabase.from("customers").select("id").eq("phone", phone).maybeSingle();
    if (data) customerId = data.id;
  }
  if (!customerId && email) {
    const { data } = await supabase.from("customers").select("id").eq("email", email).maybeSingle();
    if (data) customerId = data.id;
  }

  if (customerId) {
    // Update existing customer
    const update: Record<string, unknown> = {};
    if (phone) update.opted_in_sms = true;
    if (email) update.opted_in_email = true;

    // Add newsletter-subscriber tag
    const { data: existing } = await supabase.from("customers").select("tags").eq("id", customerId).single();
    const tags = (existing?.tags as string[]) || [];
    if (!tags.includes("newsletter-subscriber")) {
      update.tags = [...tags, "newsletter-subscriber"];
    }

    await supabase.from("customers").update(update).eq("id", customerId);
  } else {
    // Create new customer
    const { data, error } = await supabase.from("customers").insert({
      phone,
      email,
      source: source || "newsletter",
      tags: ["newsletter-subscriber"],
      opted_in_sms: !!phone,
      opted_in_email: !!email,
      total_orders: 0,
      total_spent_cents: 0,
    }).select("id").single();

    if (error) {
      return NextResponse.json({ error: "Could not subscribe. Please try again." }, { status: 500 });
    }
    customerId = data.id;
  }

  return NextResponse.json({ ok: true, channel: isPhone ? "sms" : "email" });
}
