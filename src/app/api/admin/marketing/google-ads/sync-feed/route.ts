import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { listMerchantProducts } from "@/lib/marketing/merchant-api";

const MERCHANT_ID = process.env.GMC_MERCHANT_ID || "5578269156";

export async function POST() {
  const supabase = getSupabaseAdminClient();

  const { data: account } = await (supabase as any)
    .from("mktg_google_accounts")
    .select("merchant_id")
    .eq("brand_id", "eastern-lm")
    .single();

  const merchantId = account?.merchant_id || MERCHANT_ID;

  let products: any[];
  try {
    products = await listMerchantProducts(merchantId);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }

  const { data: localProducts } = await (supabase as any)
    .from("products")
    .select("id, slug");

  const slugToId = new Map<string, string>();
  for (const p of localProducts || []) {
    slugToId.set(p.slug, p.id);
    slugToId.set(`elm-${p.slug}-online`, p.id);
    slugToId.set(`elm-${p.slug}-local`, p.id);
  }

  let synced = 0;
  const errors: string[] = [];

  for (const product of products) {
    const offerId = product.offerId || product.name?.split("/").pop() || "";
    const channel = product.channel?.toLowerCase() || "online";

    const itemIssues: any[] = product.productStatus?.itemLevelIssues || [];
    const hasDisapproval = itemIssues.some(
      (i: any) => i.severity === "DISAPPROVED"
    );
    const status = hasDisapproval
      ? "disapproved"
      : itemIssues.length > 0
        ? "pending"
        : "approved";

    const disapprovalReasons = itemIssues
      .filter((i: any) => i.severity === "DISAPPROVED")
      .map((i: any) => i.description || i.detail || i.code)
      .join("; ");

    const productId = slugToId.get(offerId) || slugToId.get(offerId.replace(/^elm-/, "").replace(/-online$|-local$/, ""));

    try {
      await (supabase as any).from("mktg_google_products").upsert(
        {
          id: crypto.randomUUID(),
          brand_id: "eastern-lm",
          product_id: productId || null,
          gmc_offer_id: offerId,
          channel,
          content_language: "en",
          feed_label: "US",
          last_synced_at: new Date().toISOString(),
          last_sync_status: status,
          disapproval_reason: disapprovalReasons || null,
        },
        { onConflict: "brand_id,gmc_offer_id,channel" }
      );
      synced++;
    } catch (err: any) {
      errors.push(`${offerId}: ${err.message}`);
    }
  }

  return NextResponse.json({
    synced,
    total: products.length,
    failed: errors.length,
    errors: errors.slice(0, 5),
    needsMigration: errors.length > 0 && errors[0]?.includes("not-null"),
  });
}
