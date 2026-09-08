/**
 * RingCentral Webhook Registration
 * Run: npx tsx scripts/ringcentral-setup.ts
 *
 * Registers a webhook subscription for incoming telephony sessions.
 * RingCentral will POST to our endpoint on every incoming call.
 */

const RC_CLIENT_ID = process.env.RINGCENTRAL_CLIENT_ID!;
const RC_CLIENT_SECRET = process.env.RINGCENTRAL_CLIENT_SECRET!;

if (!RC_CLIENT_ID || !RC_CLIENT_SECRET) {
  throw new Error("Set RINGCENTRAL_CLIENT_ID and RINGCENTRAL_CLIENT_SECRET in the environment.");
}
const RC_SERVER = "https://platform.ringcentral.com"; // production
const WEBHOOK_URL = "https://easternlm.com/api/webhooks/ringcentral";

async function getAccessToken(): Promise<string> {
  const res = await fetch(`${RC_SERVER}/restapi/oauth/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${Buffer.from(`${RC_CLIENT_ID}:${RC_CLIENT_SECRET}`).toString("base64")}`,
    },
    body: new URLSearchParams({
      grant_type: "client_credentials",
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Auth failed: ${res.status} — ${err}`);
  }

  const data = await res.json();
  console.log("Access token obtained, expires in", data.expires_in, "seconds");
  return data.access_token;
}

async function createWebhookSubscription(token: string) {
  // First, list existing subscriptions to avoid duplicates
  const listRes = await fetch(`${RC_SERVER}/restapi/v1.0/subscription`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (listRes.ok) {
    const listData = await listRes.json();
    const existing = listData.records?.find(
      (s: any) => s.deliveryMode?.address === WEBHOOK_URL
    );
    if (existing) {
      console.log("Subscription already exists:", existing.id);
      console.log("Status:", existing.status);
      console.log("Expiration:", existing.expirationTime);
      return;
    }
  }

  // Create new subscription
  const res = await fetch(`${RC_SERVER}/restapi/v1.0/subscription`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      eventFilters: [
        "/restapi/v1.0/account/~/telephony/sessions",
      ],
      deliveryMode: {
        transportType: "WebHook",
        address: WEBHOOK_URL,
      },
      expirationTime: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error("Subscription creation failed:", res.status, err);
    return;
  }

  const sub = await res.json();
  console.log("Webhook subscription created!");
  console.log("  ID:", sub.id);
  console.log("  Status:", sub.status);
  console.log("  Expiration:", sub.expirationTime);
  console.log("  URL:", WEBHOOK_URL);
}

async function main() {
  console.log("Registering RingCentral webhook...");
  console.log("  Endpoint:", WEBHOOK_URL);
  const token = await getAccessToken();
  await createWebhookSubscription(token);
}

main().catch(console.error);
