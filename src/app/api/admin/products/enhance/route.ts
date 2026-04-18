import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/auth";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { enhanceWithAI } from "@/lib/image-processing";

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  const { imageUrl } = await request.json();
  if (!imageUrl || typeof imageUrl !== "string") {
    return NextResponse.json({ error: "imageUrl required" }, { status: 400 });
  }

  try {
    const { enhancedUrl, predictionId } = await enhanceWithAI(imageUrl);

    // Download the enhanced image and store in Supabase
    const imgRes = await fetch(enhancedUrl);
    if (!imgRes.ok) throw new Error("Failed to download enhanced image");

    const buffer = Buffer.from(await imgRes.arrayBuffer());
    const contentType = imgRes.headers.get("content-type") || "image/webp";
    const ext = contentType.includes("webp") ? "webp" : "jpg";
    const filename = `${Date.now()}-enhanced-${predictionId}.${ext}`;

    const supabase = getSupabaseAdminClient();
    const { error: uploadError } = await supabase.storage
      .from("product-images")
      .upload(filename, buffer, { contentType, upsert: false });

    if (uploadError) {
      return NextResponse.json({ error: uploadError.message }, { status: 500 });
    }

    const { data: urlData } = supabase.storage.from("product-images").getPublicUrl(filename);

    return NextResponse.json({
      url: urlData.publicUrl,
      predictionId,
      originalUrl: imageUrl,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Enhancement failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
