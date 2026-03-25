import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  const formData = await request.formData();
  const file = formData.get("file") as File | null;
  const orderId = formData.get("orderId") as string;

  if (!file || !orderId) {
    return NextResponse.json({ error: "File and orderId required" }, { status: 400 });
  }

  const supabase = getSupabaseAdminClient() as any;

  // Ensure bucket exists
  const { data: buckets } = await supabase.storage.listBuckets();
  if (!(buckets ?? []).some((b: { name: string }) => b.name === "delivery-photos")) {
    await supabase.storage.createBucket("delivery-photos", { public: true });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const ext = file.name.split(".").pop() ?? "jpg";
  const path = `${orderId}/${Date.now()}.${ext}`;

  const { error } = await supabase.storage
    .from("delivery-photos")
    .upload(path, buffer, { contentType: file.type, upsert: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const { data: urlData } = supabase.storage.from("delivery-photos").getPublicUrl(path);

  return NextResponse.json({ url: urlData.publicUrl });
}
