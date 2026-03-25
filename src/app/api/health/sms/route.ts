import { NextResponse } from "next/server";

export async function GET() {
  const rcConfigured = !!process.env.RINGCENTRAL_JWT;

  const twilioConfigured = !!(
    process.env.TWILIO_ACCOUNT_SID &&
    process.env.TWILIO_AUTH_TOKEN
  );

  return NextResponse.json({
    provider: rcConfigured ? "ringcentral" : twilioConfigured ? "twilio" : "none",
    configured: rcConfigured || twilioConfigured,
    hasJwtToken: !!process.env.RINGCENTRAL_JWT,
    fromNumber: "+16318746244",
    fallbackFromNumber: "+13153625323",
    marketingFromNumber: process.env.RINGCENTRAL_SMS_MARKETING_FROM ?? null,
    fallbackProvider: twilioConfigured ? "twilio" : "none",
    twilioConfigured,
  });
}
