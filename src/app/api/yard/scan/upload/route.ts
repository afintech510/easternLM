import { NextResponse } from "next/server";
import { requirePOS } from "@/lib/admin/auth";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  const auth = await requirePOS();
  if (auth instanceof NextResponse) return auth;

  const supabase = getSupabaseAdminClient() as any;

  // Ensure bucket exists
  const { data: buckets } = await supabase.storage.listBuckets();
  const bucketExists = (buckets ?? []).some((b: { name: string }) => b.name === "supplier-invoices");
  if (!bucketExists) {
    await supabase.storage.createBucket("supplier-invoices", { public: false });
  }

  const fd = await request.formData();
  const files = fd.getAll("files") as File[];
  const supplierId = (fd.get("supplier_id") as string) || null;
  const documentType = (fd.get("document_type") as string) || "invoice";
  const companyName = (fd.get("company_name") as string) || "";
  const documentNumber = (fd.get("document_number") as string) || "";
  const address = (fd.get("address") as string) || "";
  const productName = (fd.get("product_name") as string) || "";
  const quantity = (fd.get("quantity") as string) || "";
  const cost = (fd.get("cost") as string) || "";
  const staffId = (fd.get("staff_id") as string) || auth.userId;

  if (!files.length) {
    return NextResponse.json({ error: "No files provided" }, { status: 400 });
  }

  // Upload files to Supabase Storage
  const prefix = supplierId || "unassigned";
  const fileUrls: string[] = [];

  for (const file of files) {
    const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const path = `${prefix}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

    const buffer = Buffer.from(await file.arrayBuffer());
    const { error: uploadError } = await supabase.storage
      .from("supplier-invoices")
      .upload(path, buffer, { contentType: file.type || "image/jpeg" });

    if (uploadError) {
      console.error("Upload error:", uploadError);
      return NextResponse.json({ error: `Upload failed: ${uploadError.message}` }, { status: 500 });
    }

    fileUrls.push(path);
  }

  // Build notes JSON with metadata from quick review
  const metaNotes: Record<string, string> = {};
  if (companyName) metaNotes.company_name = companyName;
  if (documentNumber) metaNotes.document_number = documentNumber;
  if (address) metaNotes.address = address;
  if (productName) metaNotes.product_name = productName;
  if (quantity) metaNotes.quantity = quantity;
  if (cost) metaNotes.cost = cost;

  const notesStr = Object.keys(metaNotes).length > 0 ? JSON.stringify(metaNotes) : null;

  // Create invoice record
  const { data: invoice, error: insertError } = await supabase
    .from("supplier_invoices")
    .insert({
      supplier_id: supplierId,
      file_urls: fileUrls,
      ocr_status: "pending",
      document_type: documentType,
      uploaded_by: staffId,
      invoice_number: documentNumber || null,
      notes: notesStr,
    })
    .select("id")
    .single();

  if (insertError) {
    console.error("Insert error:", insertError);
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, invoiceId: invoice.id });
}
