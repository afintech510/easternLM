import { NextResponse } from "next/server";

const RC_CLIENT_ID = "aCtUW9yyeLhdl5lTGj019d";
const RC_CLIENT_SECRET = "REDACTED_RINGCENTRAL_SECRET";
const RC_SERVER = "https://platform.ringcentral.com";
const WEBHOOK_URL = "https://easternlm.com/api/webhooks/ringcentral";

/**
 * GET /api/cron/ringcentral-renew
 * Renews or creates the RingCentral webhook subscription.
 * Should be called daily via cron (subscriptions expire every 7 days).
 */
export async function GET() {
  const jwt = process.env.RINGCENTRAL_JWT;
  if (!jwt) {
    return NextResponse.json({ error: "RINGCENTRAL_JWT not set" }, { status: 500 });
  }

  try {
    // 1. Get access token
    const authRes = await fetch(`${RC_SERVER}/restapi/oauth/token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${Buffer.from(`${RC_CLIENT_ID}:${RC_CLIENT_SECRET}`).toString("base64")}`,
      },
      body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
    });

    if (!authRes.ok) {
      const err = await authRes.text();
      return NextResponse.json({ error: `Auth failed: ${err}` }, { status: 500 });
    }

    const { access_token } = await authRes.json();

    // 2. Check existing subscriptions
    const listRes = await fetch(`${RC_SERVER}/restapi/v1.0/subscription`, {
      headers: { Authorization: `Bearer ${access_token}` },
    });
    const listData = await listRes.json();
    const existing = listData.records?.find(
      (s: any) => s.deliveryMode?.address === WEBHOOK_URL && s.status === "Active"
    );

    if (existing) {
      // 3a. Renew existing subscription
      const renewRes = await fetch(`${RC_SERVER}/restapi/v1.0/subscription/${existing.id}/renew`, {
        method: "POST",
        headers: { Authorization: `Bearer ${access_token}` },
      });

      if (renewRes.ok) {
        const renewed = await renewRes.json();
        return NextResponse.json({
          ok: true,
          action: "renewed",
          subscriptionId: existing.id,
          expiresAt: renewed.expirationTime,
        });
      }

      // Renew failed — delete and recreate
      await fetch(`${RC_SERVER}/restapi/v1.0/subscription/${existing.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${access_token}` },
      });
    }

    // 3b. Create new subscription
    const createRes = await fetch(`${RC_SERVER}/restapi/v1.0/subscription`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${access_token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        eventFilters: [
          "/restapi/v1.0/account/~/extension/~/presence?detailedTelephonyState=true",
          "/restapi/v1.0/account/~/extension/~/message-store/instant?type=SMS",
        ],
        deliveryMode: {
          transportType: "WebHook",
          address: WEBHOOK_URL,
        },
      }),
    });

    if (!createRes.ok) {
      const err = await createRes.text();
      return NextResponse.json({ error: `Create failed: ${err}` }, { status: 500 });
    }

    const sub = await createRes.json();
    return NextResponse.json({
      ok: true,
      action: "created",
      subscriptionId: sub.id,
      expiresAt: sub.expirationTime,
      filters: sub.eventFilters,
    });
  } catch (err) {
    return NextResponse.json({
      error: err instanceof Error ? err.message : "Unknown error",
    }, { status: 500 });
  }
}
