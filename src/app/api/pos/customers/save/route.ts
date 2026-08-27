import { NextResponse } from "next/server";
import { requirePOS } from "@/lib/admin/auth";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { normalizePhone, extractCity } from "@/lib/customers/lifecycle";

export async function POST(request: Request) {
  const auth = await requirePOS();
  if (auth instanceof NextResponse) return auth;

  const { phone, first_name, last_name, email, address, city, zip, company_name, source } = await request.json();

  const normalized = normalizePhone(phone);
  if (!normalized) return NextResponse.json({ error: "Phone number required" }, { status: 400 });

  // Capture city for geo-targeting: use the explicit city field if provided,
  // otherwise try to parse it out of the address string ("St, City, NY zip").
  const resolvedCity = (city && String(city).trim()) || extractCity(address ?? null);

  const supabase = getSupabaseAdminClient() as any;

  // Upsert by phone — create if new, update if existing
  const { data: existing } = await supabase
    .from("customers")
    .select("id")
    .eq("phone", normalized)
    .maybeSingle();

  if (existing) {
    // Update existing customer
    const updates: Record<string, any> = { updated_at: new Date().toISOString() };
    if (first_name) updates.first_name = first_name;
    if (last_name) updates.last_name = last_name;
    if (email) updates.email = email.toLowerCase();
    if (address) updates.address = address;
    if (resolvedCity) updates.city = resolvedCity;
    if (zip) updates.zip = zip;
    if (company_name) updates.company_name = company_name;

    await supabase.from("customers").update(updates).eq("id", existing.id);

    const { data: customer } = await supabase
      .from("customers")
      .select("id, first_name, last_name, email, phone, address, total_orders")
      .eq("id", existing.id)
      .single();

    return NextResponse.json({ customer, created: false });
  }

  // Create new customer
  const { data: customer, error } = await supabase
    .from("customers")
    .insert({
      phone: normalized,
      first_name: first_name || null,
      last_name: last_name || null,
      email: email?.toLowerCase() || null,
      address: address || null,
      city: resolvedCity || null,
      zip: zip || null,
      company_name: company_name || null,
      source: source || "pos",
      tags: [],
      total_orders: 0,
      total_spent_cents: 0,
    })
    .select("id, first_name, last_name, email, phone, address, total_orders")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ customer, created: true });
}
