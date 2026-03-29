import { NextResponse } from "next/server";
import {
  getRingCentralAccessToken,
  getRingCentralServerUrl,
} from "@/lib/ringcentral/auth";

const WEBHOOK_URL = "https://easternlm.com/api/webhooks/ringcentral";

/**
 * GET /api/cron/ringcentral-renew
 * Renews or creates the RingCentral webhook subscription.
 * Should be called daily via cron (subscriptions expire every 7 days).
 */
export async function GET() {
  try {
    const access_token = await getRingCentralAccessToken();
    const RC_SERVER = getRingCentralServerUrl();

    // Check existing subscriptions
    const listRes = await fetch(`${RC_SERVER}/restapi/v1.0/subscription`, {
      headers: { Authorization: `Bearer ${access_token}` },
    });
    const listData = await listRes.json();
    const existing = listData.records?.find(
      (s: any) => s.deliveryMode?.address === WEBHOOK_URL && s.status === "Active"
    );

    if (existing) {
      // Renew existing subscription
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

    // Create new subscription with telephony session events
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
          "/restapi/v1.0/account/~/telephony/sessions",
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
