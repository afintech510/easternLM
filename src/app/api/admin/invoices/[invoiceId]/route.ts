import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/auth";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

type RouteContext = { params: Promise<{ invoiceId: string }> };

export async function GET(_req: Request, context: RouteContext) {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  const { invoiceId } = await context.params;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = getSupabaseAdminClient() as any;

  const { data: invoice, error } = await supabase
    .from("supplier_invoices")
    .select("*, suppliers(id, name, slug)")
    .eq("id", invoiceId)
    .single();

  if (error || !invoice) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Generate signed URLs for each file
  const signedUrls: string[] = [];
  for (const path of invoice.file_urls ?? []) {
    const { data } = await supabase.storage
      .from("supplier-invoices")
      .createSignedUrl(path, 3600); // 1-hour expiry
    signedUrls.push(data?.signedUrl ?? "");
  }

  return NextResponse.json({ invoice: { ...invoice, signed_urls: signedUrls } });
}

export async function PATCH(request: Request, context: RouteContext) {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  const { invoiceId } = await context.params;
  const body = await request.json();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = getSupabaseAdminClient() as any;

  // If confirming, set confirmed fields and update product costs
  if (body.ocr_status === "confirmed") {
    body.confirmed_at = new Date().toISOString();
    body.confirmed_by = auth.userId;

    // Apply price updates from line items
    const lineItems: Array<{
      supplier_product_id?: string;
      unit_cost_cents?: number;
      matched?: boolean;
    }> = body.line_items ?? [];

    for (const item of lineItems) {
      if (!item.supplier_product_id || !item.unit_cost_cents) continue;

      // Get current cost
      const { data: current } = await supabase
        .from("supplier_products")
        .select("cost_per_unit_cents")
        .eq("id", item.supplier_product_id)
        .single();

      if (current && current.cost_per_unit_cents !== item.unit_cost_cents) {
        // Log price history
        await supabase.from("supplier_price_history").insert({
          supplier_product_id: item.supplier_product_id,
          old_cost_cents: current.cost_per_unit_cents,
          new_cost_cents: item.unit_cost_cents,
          source: "invoice",
        });
        // Update cost
        await supabase
          .from("supplier_products")
          .update({ cost_per_unit_cents: item.unit_cost_cents, last_price_update: new Date().toISOString() })
          .eq("id", item.supplier_product_id);
      }
    }
  }

  // If marking paid
  if (body.is_paid === true && !body.paid_at) {
    body.paid_at = new Date().toISOString();
  }

  body.updated_at = new Date().toISOString();

  const { error } = await supabase
    .from("supplier_invoices")
    .update(body)
    .eq("id", invoiceId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
