import { NextResponse } from "next/server";
import { getClientIp, hashIp } from "@/lib/rate-limit";
import { getDesignByToken, startVisualization, toPublicStatus } from "@/lib/holiday-lights/designs";
import { isVisualizerStyle } from "@/lib/holiday-lights/visualize";

export const runtime = "nodejs";

/** POST {style} → try another style on the same photo (within the per-design limit). */
export async function POST(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const body = (await request.json().catch(() => null)) as { style?: unknown } | null;
  if (!body || !isVisualizerStyle(body.style)) return NextResponse.json({ error: "Pick a style." }, { status: 400 });

  const design = await getDesignByToken(token);
  if (!design) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (design.visualizer_status === "generating" || design.visualizer_status === "finalizing") {
    return NextResponse.json({ error: "Still working on your last preview." }, { status: 409 });
  }

  const result = await startVisualization(design, body.style, hashIp(getClientIp(request)));
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json(toPublicStatus(result.design));
}
