import { NextResponse } from "next/server";
import {
  deliverResultOnce,
  getDesignByToken,
  refreshVisualization,
  toPublicStatus,
} from "@/lib/holiday-lights/designs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET → poll. Advances the Replicate prediction, finalizes once, and on the first
 * poll that sees ready + unlocked sends the result SMS (once) and staff email.
 * Returns the blurred image until unlocked, the full one after.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  let design = await getDesignByToken(token);
  if (!design) return NextResponse.json({ error: "Not found" }, { status: 404 });

  design = await refreshVisualization(design);
  design = await deliverResultOnce(design);

  return NextResponse.json(toPublicStatus(design), { headers: { "Cache-Control": "no-store" } });
}
