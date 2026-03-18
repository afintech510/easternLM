import { NextResponse } from "next/server";
import { requirePOS } from "@/lib/admin/auth";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

// POST — upload a license photo for fraud prevention
export async function POST(request: Request) {
  const auth = await requirePOS();
  if (auth instanceof NextResponse) return auth;

  const fd = await request.formData();
  const file = fd.get("file") as File;
  const orderId = fd.get("order_id") as string;

  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  const supabase = getSupabaseAdminClient() as any;

  // Ensure bucket exists
  const { data: buckets } = await supabase.storage.listBuckets();
  const bucketExists = (buckets ?? []).some((b: { name: string }) => b.name === "license-photos");
  if (!bucketExists) {
    await supabase.storage.createBucket("license-photos", { public: false });
  }

  const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

  const buffer = Buffer.from(await file.arrayBuffer());
  const { error: uploadError } = await supabase.storage
    .from("license-photos")
    .upload(path, buffer, { contentType: file.type || "image/jpeg" });

  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 });
  }

  // If orderId provided, attach to order
  if (orderId) {
    await supabase
      .from("orders")
      .update({ license_photo_url: path })
      .eq("id", orderId);
  }

  return NextResponse.json({ ok: true, path });
}
