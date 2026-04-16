import { NextResponse } from "next/server";

// Phase 00 stub — Phase 01 implements the full OAuth start flow.
// This endpoint will redirect to Google's OAuth consent screen with
// scopes: adwords + content, access_type=offline, prompt=consent.

export async function GET() {
  return NextResponse.json(
    {
      error: "Not implemented",
      message: "Phase 01 will implement the Google OAuth start flow.",
      phase: "00-stub",
    },
    { status: 501 }
  );
}
