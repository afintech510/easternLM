import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/auth";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

type Params = { params: Promise<{ id: string }> };

export async function POST(_request: Request, { params }: Params) {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  const supabase = getSupabaseAdminClient();

  // 1. Fetch source product
  const { data: source, error } = await supabase
    .from("products")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !source) {
    return NextResponse.json({ error: "Product not found" }, { status: 404 });
  }

  // 2. Strip fields that must not be copied
  const {
    id: _id,
    slug,
    created_at: _created,
    updated_at: _updated,
    wc_id: _wcId,
    ...copyFields
  } = source;

  // 3. Generate unique slug
  let newSlug = `${slug}-copy`;
  let suffix = 1;
  while (true) {
    const { data: existing } = await supabase
      .from("products")
      .select("id")
      .eq("slug", newSlug)
      .maybeSingle();
    if (!existing) break;
    suffix++;
    newSlug = `${slug}-copy-${suffix}`;
  }

  // 4. Insert duplicate — hidden by default
  const { data: newProduct, error: insertError } = await supabase
    .from("products")
    .insert({
      ...copyFields,
      name: `${source.name} (Copy)`,
      slug: newSlug,
      visible_web: false,
      visible_pos: false,
    })
    .select()
    .single();

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  // 5. Copy supplier links
  const { data: supplierLinks } = await supabase
    .from("supplier_products")
    .select("*")
    .eq("product_id", id);

  if (supplierLinks && supplierLinks.length > 0) {
    for (const link of supplierLinks) {
      const {
        id: _linkId,
        product_id: _pid,
        created_at: _c,
        updated_at: _u,
        ...linkCopy
      } = link;
      await supabase.from("supplier_products").insert({
        ...linkCopy,
        product_id: newProduct.id,
      });
    }
  }

  return NextResponse.json({
    ok: true,
    product: newProduct,
    message: `Duplicated as "${newProduct.name}"`,
  });
}
