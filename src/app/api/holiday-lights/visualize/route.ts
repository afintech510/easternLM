import { NextResponse } from "next/server";
import { getClientIp, hashIp } from "@/lib/rate-limit";
import { getDesignByToken, startVisualization, toPublicStatus } from "@/lib/holiday-lights/designs";
import { isVisualizerStyle } from "@/lib/holiday-lights/visualize";

export const runtime = "nodejs";

/** POST {token, style} → starts the Replicate prediction for an uploaded photo. */
export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { token?: unknown; style?: unknown } | null;
  if (!body || !isVisualizerStyle(body.style)) {
    return NextResponse.json({ error: "Pick a style." }, { status: 400 });
  }
  const design = await getDesignByToken(String(body.token ?? ""));
  if (!design) return NextResponse.json({ error: "Upload not found. Add your photo again." }, { status: 404 });

  const result = await startVisualization(design, body.style, hashIp(getClientIp(request)));
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json(toPublicStatus(result.design));
}
