import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/auth";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { optimizeImage, extractVideoThumbnail } from "@/lib/image-processing";

const IMAGE_EXTS = ["jpg", "jpeg", "png", "webp", "heic", "heif"];
const VIDEO_EXTS = ["mp4", "mov", "avi", "webm"];
const ALL_EXTS = [...IMAGE_EXTS, ...VIDEO_EXTS];
const MAX_SIZE = 50 * 1024 * 1024; // 50MB for video

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  const formData = await request.formData();
  const file = formData.get("file") as File | null;

  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  if (!ALL_EXTS.includes(ext)) {
    return NextResponse.json(
      { error: `Allowed: ${ALL_EXTS.join(", ")}` },
      { status: 400 },
    );
  }

  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: "File must be under 50MB" }, { status: 400 });
  }

  const supabase = getSupabaseAdminClient();
  const bucket = formData.get("bucket")?.toString() || "product-images";
  const rawBuffer = Buffer.from(await file.arrayBuffer());
  const isVideo = VIDEO_EXTS.includes(ext);

  if (isVideo) {
    // Store original video
    const videoName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`;
    const { error: videoErr } = await supabase.storage
      .from(bucket)
      .upload(`videos/${videoName}`, rawBuffer, { contentType: file.type, upsert: false });

    if (videoErr) {
      return NextResponse.json({ error: videoErr.message }, { status: 500 });
    }

    const { data: videoUrlData } = supabase.storage.from(bucket).getPublicUrl(`videos/${videoName}`);

    // Generate thumbnail
    const { thumbnail, filename: thumbName } = await extractVideoThumbnail(rawBuffer, file.name);
    const { error: thumbErr } = await supabase.storage
      .from(bucket)
      .upload(thumbName, thumbnail, { contentType: "image/webp", upsert: false });

    if (thumbErr) {
      return NextResponse.json({ error: thumbErr.message }, { status: 500 });
    }

    const { data: thumbUrlData } = supabase.storage.from(bucket).getPublicUrl(thumbName);

    return NextResponse.json({
      url: thumbUrlData.publicUrl,
      videoUrl: videoUrlData.publicUrl,
      type: "video",
    });
  }

  // Image path: optimize with Sharp
  const { optimized, filename, contentType, originalSize, optimizedSize } =
    await optimizeImage(rawBuffer, file.name);

  // Store optimized
  const { error: uploadError } = await supabase.storage
    .from(bucket)
    .upload(filename, optimized, { contentType, upsert: false });

  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 });
  }

  const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(filename);

  return NextResponse.json({
    url: urlData.publicUrl,
    type: "image",
    originalSize,
    optimizedSize,
    savings: `${Math.round((1 - optimizedSize / originalSize) * 100)}%`,
  });
}
