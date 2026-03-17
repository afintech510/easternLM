import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/auth";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import Anthropic from "@anthropic-ai/sdk";

const IMAGE_MEDIA_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"] as const;
type ImageMediaType = (typeof IMAGE_MEDIA_TYPES)[number];

function isImageMediaType(t: string): t is ImageMediaType {
  return IMAGE_MEDIA_TYPES.includes(t as ImageMediaType);
}

function getMediaType(path: string): string {
  const ext = path.split(".").pop()?.toLowerCase() ?? "";
  if (ext === "pdf") return "application/pdf";
  if (ext === "png") return "image/png";
  if (ext === "gif") return "image/gif";
  if (ext === "webp") return "image/webp";
  return "image/jpeg";
}

// Rough string similarity (0–1)
function similarity(a: string, b: string): number {
  const an = a.toLowerCase().replace(/[^a-z0-9]/g, "");
  const bn = b.toLowerCase().replace(/[^a-z0-9]/g, "");
  if (!an || !bn) return 0;
  let matches = 0;
  for (let i = 0; i < Math.min(an.length, bn.length); i++) {
    if (an[i] === bn[i]) matches++;
  }
  return matches / Math.max(an.length, bn.length);
}

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  const { invoiceId } = await request.json();
  if (!invoiceId) return NextResponse.json({ error: "invoiceId required" }, { status: 400 });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "ANTHROPIC_API_KEY not configured" }, { status: 500 });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = getSupabaseAdminClient() as any;

  // Load invoice + supplier products for matching
  const { data: invoice, error: invErr } = await supabase
    .from("supplier_invoices")
    .select("*, suppliers(id, name)")
    .eq("id", invoiceId)
    .single();

  if (invErr || !invoice) return NextResponse.json({ error: "Invoice not found" }, { status: 404 });

  // Mark as processing
  await supabase
    .from("supplier_invoices")
    .update({ ocr_status: "processing", updated_at: new Date().toISOString() })
    .eq("id", invoiceId);

  try {
    const anthropic = new Anthropic({ apiKey });

    // Build content blocks from uploaded files
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const contentBlocks: any[] = [];

    for (const filePath of invoice.file_urls ?? []) {
      // Download file from Supabase storage
      const { data: fileData, error: dlErr } = await supabase.storage
        .from("supplier-invoices")
        .download(filePath);

      if (dlErr || !fileData) continue;

      const mediaType = getMediaType(filePath);
      const arrayBuffer = await fileData.arrayBuffer();
      const base64 = Buffer.from(arrayBuffer).toString("base64");

      if (mediaType === "application/pdf") {
        contentBlocks.push({
          type: "document",
          source: { type: "base64", media_type: "application/pdf", data: base64 },
        });
      } else if (isImageMediaType(mediaType)) {
        contentBlocks.push({
          type: "image",
          source: { type: "base64", media_type: mediaType, data: base64 },
        });
      }
    }

    if (!contentBlocks.length) {
      throw new Error("No readable files found in invoice");
    }

    contentBlocks.push({
      type: "text",
      text: `You are extracting data from a supplier invoice for "${invoice.suppliers?.name ?? "supplier"}".

Extract and return a JSON object with exactly this structure:
{
  "invoice_number": "string or null",
  "invoice_date": "YYYY-MM-DD or null",
  "total_amount_cents": integer (total in cents, null if unclear),
  "line_items": [
    {
      "description": "exact product description from invoice",
      "quantity": number,
      "unit": "cy|ton|bag|each|lb|yard|sf|lf or best guess",
      "unit_cost_cents": integer (unit price in cents),
      "total_cents": integer (line total in cents),
      "notes": "any notes like delivery fee, discount, etc or null"
    }
  ]
}

Rules:
- Convert all dollar amounts to cents (multiply by 100, round to integer)
- Include ALL line items including delivery charges, fees, discounts
- If a value is missing or illegible, use null
- Return ONLY valid JSON, no markdown, no explanation`,
    });

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 4096,
      messages: [{ role: "user", content: contentBlocks }],
    });

    const rawText = response.content
      .filter((b) => b.type === "text")
      .map((b) => (b as { type: "text"; text: string }).text)
      .join("");

    // Parse the JSON from response
    let extracted: {
      invoice_number?: string | null;
      invoice_date?: string | null;
      total_amount_cents?: number | null;
      line_items?: Array<{
        description: string;
        quantity: number;
        unit: string;
        unit_cost_cents: number;
        total_cents: number;
        notes?: string | null;
      }>;
    } = {};

    try {
      const jsonMatch = rawText.match(/\{[\s\S]*\}/);
      if (jsonMatch) extracted = JSON.parse(jsonMatch[0]);
    } catch {
      throw new Error("Failed to parse Claude response as JSON");
    }

    // Load supplier products for fuzzy matching
    const { data: supplierProducts } = await supabase
      .from("supplier_products")
      .select("id, supplier_product_name, cost_per_unit_cents")
      .eq("supplier_id", invoice.supplier_id);

    const products: Array<{ id: string; supplier_product_name: string; cost_per_unit_cents: number }> =
      supplierProducts ?? [];

    // Auto-match line items to supplier products
    const enrichedItems = (extracted.line_items ?? []).map((item) => {
      let bestMatch: { id: string; supplier_product_name: string; cost_per_unit_cents: number } | null = null;
      let bestScore = 0.4; // minimum threshold

      for (const p of products) {
        const score = similarity(item.description, p.supplier_product_name);
        if (score > bestScore) {
          bestScore = score;
          bestMatch = p;
        }
      }

      const priceChanged =
        bestMatch !== null &&
        item.unit_cost_cents !== null &&
        bestMatch.cost_per_unit_cents !== item.unit_cost_cents;

      return {
        ...item,
        supplier_product_id: bestMatch?.id ?? null,
        matched_name: bestMatch?.supplier_product_name ?? null,
        current_cost_cents: bestMatch?.cost_per_unit_cents ?? null,
        price_changed: priceChanged,
      };
    });

    // Save extracted data
    await supabase
      .from("supplier_invoices")
      .update({
        ocr_status: "extracted",
        extracted_at: new Date().toISOString(),
        invoice_number: extracted.invoice_number ?? null,
        invoice_date: extracted.invoice_date ?? null,
        total_amount_cents: extracted.total_amount_cents ?? null,
        line_items: enrichedItems,
        raw_extraction: rawText,
        updated_at: new Date().toISOString(),
      })
      .eq("id", invoiceId);

    return NextResponse.json({ ok: true, line_items: enrichedItems });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Extraction failed";
    await supabase
      .from("supplier_invoices")
      .update({ ocr_status: "failed", updated_at: new Date().toISOString() })
      .eq("id", invoiceId);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
