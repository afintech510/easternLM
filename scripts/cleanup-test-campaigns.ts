import { config } from "dotenv";
config({ path: ".env.local" });
import { GoogleAdsApi, enums } from "google-ads-api";

const CUSTOMER_ID = process.env.GOOGLE_ADS_CUSTOMER_ID || "5409526270";

async function cleanup() {
  const api = new GoogleAdsApi({
    client_id: process.env.GOOGLE_OAUTH_CLIENT_ID!,
    client_secret: process.env.GOOGLE_OAUTH_CLIENT_SECRET!,
    developer_token: process.env.GOOGLE_ADS_DEVELOPER_TOKEN!,
  });
  const customer = api.Customer({
    customer_id: CUSTOMER_ID,
    refresh_token: process.env.GOOGLE_ADS_REFRESH_TOKEN!,
  });

  const campaigns = await customer.query(`
    SELECT campaign.id, campaign.name, campaign.status, campaign.resource_name
    FROM campaign
    WHERE campaign.status != 'REMOVED'
    ORDER BY campaign.name
  `);

  const toRemove = campaigns.filter((c: any) => {
    const name = c.campaign.name;
    return name.includes("Spring 2026") || name.startsWith("TEST") || name.startsWith("Debug-") || name.startsWith("ELM-Test-");
  });

  console.log(`Removing ${toRemove.length} campaigns...`);
  for (const c of toRemove) {
    const camp = (c as any).campaign;
    try {
      await customer.campaigns.remove([camp.resource_name]);
      console.log(`  Removed: ${camp.name}`);
    } catch (e: any) {
      console.error(`  Failed: ${camp.name}: ${e.message}`);
      if (e.errors) console.error(JSON.stringify(e.errors[0], null, 2));
    }
  }
  console.log("Done!");
}

cleanup().catch(e => console.error("Error:", e.message));
