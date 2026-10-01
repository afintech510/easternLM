import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { randomUUID } from "crypto";
import sharp from "sharp";
import { optimizeImage } from "@/lib/image-processing";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { DAY_MS, getClientIp, hashIp, rateLimit, retryAfterHeaders } from "@/lib/rate-limit";
import { VISUALIZER_PAUSED_MESSAGE, ensureBucket, isVisualizerEnabled, newToken, uploadObject } from "@/lib/holiday-lights/designs";
import { checkHousePhoto } from "@/lib/holiday-lights/photo-guard";

export const runtime = "nodejs";

const MAX_BYTES = 10 * 1024 * 1024;
const ACCEPTED = ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"];
/** Shortest edge we accept — anything smaller is a thumbnail, not a usable house photo. */
const MIN_EDGE = 400;

function parseUtm(raw: FormDataEntryValue | null): Record<string, string> {
  if (typeof raw !== "string" || !raw) return {};
  try {
    const obj = JSON.parse(raw);
    const out: Record<string, string> = {};
    for (const [k, v] of Object.entries(obj ?? {})) {
      if (/^(utm_[a-z]+|referrer)$/.test(k) && typeof v === "string") out[k] = v.slice(0, 300);
    }
    return out;
  } catch {
    return {};
  }
}

/** POST multipart {photo, utm?} → stores the photo and creates a visualizer design. */
export async function POST(request: Request) {
  if (!isVisualizerEnabled()) return NextResponse.json({ error: VISUALIZER_PAUSED_MESSAGE }, { status: 503 });
  const ipHash = hashIp(getClientIp(request));
  const limit = rateLimit(`upload:ip:${ipHash}`, 10, DAY_MS);
  if (!limit.ok) {
    return NextResponse.json({ error: "Too many uploads today. Try again tomorrow." }, { status: 429, headers: retryAfterHeaders(limit) });
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: "Send the photo as multipart form data." }, { status: 400 });
  }
  // Honeypot: real users never see or fill the "website" field.
  if (typeof form.get("website") === "string" && String(form.get("website")).trim() !== "") {
    return NextResponse.json({ error: "Upload failed. Try again." }, { status: 400 });
  }
  const file = form.get("photo");
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: "Add a photo of the front of your house." }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "That photo is over 10 MB. Try a smaller one." }, { status: 413 });
  }
  if (file.type && !ACCEPTED.includes(file.type.toLowerCase())) {
    return NextResponse.json({ error: "Use a JPEG, PNG, WebP or HEIC photo." }, { status: 415 });
  }

  let optimized: Buffer;
  let width: number | null = null;
  let height: number | null = null;
  try {
    const result = await optimizeImage(Buffer.from(await file.arrayBuffer()), file.name || "house.jpg");
    optimized = result.optimized;
    const meta = await sharp(optimized).metadata();
    width = meta.width ?? null;
    height = meta.height ?? null;
  } catch (err) {
    console.warn("[holiday-lights] could not read upload:", err);
    return NextResponse.json({ error: "We couldn't read that photo. Try a JPEG or a screenshot of it." }, { status: 415 });
  }

  if (!width || !height || Math.min(width, height) < MIN_EDGE) {
    return NextResponse.json({ error: "That photo is too small. Use a full-size photo of the front of your house." }, { status: 422 });
  }

  // Guardrail: only spend on real house photos (Claude Haiku vision, fails open).
  const check = await checkHousePhoto(optimized);
  if (!check.ok) {
    console.info("[holiday-lights] photo rejected:", check.verdict.reason);
    return NextResponse.json({ error: check.message, code: "photo_rejected" }, { status: 422 });
  }

  const id = randomUUID();
  const token = newToken();
  const imagePath = `${id}/original.webp`;

  try {
    await ensureBucket();
    await uploadObject(imagePath, optimized, "image/webp");
  } catch (err) {
    console.error("[holiday-lights] upload failed:", err);
    return NextResponse.json({ error: "Upload failed. Try again." }, { status: 500 });
  }

  const gclid = (await cookies()).get("elm_gclid")?.value ?? null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (getSupabaseAdminClient() as any).from("holiday_light_designs").insert({
    id,
    token,
    kind: "visualizer",
    image_path: imagePath,
    image_width: width,
    image_height: height,
    photo_check: check.checked ? { ...check.verdict, model: "photo-guard" } : null,
    visualizer_status: "uploaded",
    utm: parseUtm(form.get("utm")),
    gclid,
    ip_hash: ipHash,
  });
  if (error) {
    console.error("[holiday-lights] insert failed:", error);
    return NextResponse.json({ error: "Upload failed. Try again." }, { status: 500 });
  }

  return NextResponse.json({ token, width, height });
}
