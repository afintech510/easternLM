import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  const body = await request.json();
  const { first_name, last_name, phone, email, address } = body as {
    first_name: string;
    last_name?: string;
    phone: string;
    email?: string | null;
    address?: string | null;
  };

  if (!first_name || !phone) {
    return NextResponse.json({ error: "Name and phone required" }, { status: 400 });
  }

  const normalizedPhone = phone.replace(/\D/g, "");
  const supabase = getSupabaseAdminClient();

  // Check if customer already exists by phone
  const { data: existing } = await supabase
    .from("customers")
    .select("id")
    .eq("phone", normalizedPhone)
    .maybeSingle();

  if (existing) {
    return NextResponse.json({ id: existing.id, existed: true });
  }

  const { data, error } = await supabase
    .from("customers")
    .insert({
      first_name,
      last_name: last_name || null,
      phone: normalizedPhone,
      email: email || null,
      address: address || null,
      source: "pos",
    })
    .select("id")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ id: data.id, existed: false });
}
