import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/auth";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  const fd = await request.formData();
  const file = fd.get("file") as File;
  if (!file) return NextResponse.json({ error: "No file" }, { status: 400 });

  const supabase = getSupabaseAdminClient() as any;

  // Ensure bucket
  const { data: buckets } = await supabase.storage.listBuckets();
  if (!(buckets ?? []).some((b: { name: string }) => b.name === "quote-photos")) {
    await supabase.storage.createBucket("quote-photos", { public: true });
  }

  const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

  const buffer = Buffer.from(await file.arrayBuffer());
  const { error } = await supabase.storage
    .from("quote-photos")
    .upload(path, buffer, { contentType: file.type || "image/jpeg" });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const { data: urlData } = supabase.storage.from("quote-photos").getPublicUrl(path);
  return NextResponse.json({ ok: true, url: urlData.publicUrl });
}
