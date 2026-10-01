import { NextResponse } from "next/server";
import { sendSms } from "@/lib/sms";
import { DAY_MS, rateLimit, retryAfterHeaders } from "@/lib/rate-limit";
import { getDesignByToken, resultSmsBody } from "@/lib/holiday-lights/designs";

export const runtime = "nodejs";

/** POST → "Text me this": re-sends the result link to the unlocked phone (3/day per design). */
export async function POST(_request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const design = await getDesignByToken(token);
  if (!design) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!design.unlocked_at || !design.phone || !design.sms_consent) {
    return NextResponse.json({ error: "Enter your mobile number first." }, { status: 400 });
  }
  if (design.visualizer_status !== "ready") {
    return NextResponse.json({ error: "Your preview isn't ready yet." }, { status: 409 });
  }

  const limit = rateLimit(`text:design:${design.id}`, 3, DAY_MS);
  if (!limit.ok) return NextResponse.json({ error: "We already texted it a few times today." }, { status: 429, headers: retryAfterHeaders(limit) });

  const r = await sendSms(design.phone, resultSmsBody(design));
  if (!r.ok) return NextResponse.json({ error: "Couldn't send the text. Try again." }, { status: 502 });
  return NextResponse.json({ ok: true });
}
