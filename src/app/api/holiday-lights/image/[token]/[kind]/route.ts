import { NextResponse } from "next/server";
import { getDesignByToken, signedUrl } from "@/lib/holiday-lights/designs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Stable image URL for a design (used in the UI, SMS share page OG tags, staff
 * email and lead photo_urls). 302s to a short-lived signed URL in the private
 * bucket. The full result is only served once the customer has unlocked it.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ token: string; kind: string }> }) {
  const { token, kind } = await params;
  const design = await getDesignByToken(token);
  if (!design) return new NextResponse("Not found", { status: 404 });

  let path: string | null = null;
  if (kind === "original") path = design.image_path;
  else if (kind === "blur") path = design.visualizer_blur_path;
  else if (kind === "result") path = design.unlocked_at ? design.visualizer_image_path : design.visualizer_blur_path;
  if (!path) return new NextResponse("Not found", { status: 404 });

  const url = await signedUrl(path, 3600);
  return NextResponse.redirect(url, { status: 302, headers: { "Cache-Control": "private, max-age=300" } });
}
