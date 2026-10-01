import { NextResponse } from "next/server";
import { listInstallWeeks } from "@/lib/holiday-lights/bookings";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET → install weeks with remaining spots (capacity − paid − active checkout holds). */
export async function GET() {
  try {
    const weeks = await listInstallWeeks();
    return NextResponse.json({ weeks }, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    console.error("[holiday-lights] weeks failed:", err);
    return NextResponse.json({ error: "Couldn't load install weeks." }, { status: 500 });
  }
}
