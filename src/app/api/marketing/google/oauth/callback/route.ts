import { NextResponse } from "next/server";

// Phase 00 stub — Phase 01 implements the full OAuth callback flow.
// This endpoint will exchange the authorization code for tokens,
// encrypt the refresh token, and store in mktg_google_accounts.

export async function GET() {
  return NextResponse.json(
    {
      error: "Not implemented",
      message: "Phase 01 will implement the Google OAuth callback flow.",
      phase: "00-stub",
    },
    { status: 501 }
  );
}
