import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { ProductList } from "@/components/admin/products/product-list";

function tryGetAdmin() {
  try {
    return getSupabaseAdminClient();
  } catch {
    return null;
  }
}

export default async function AdminProductsPage() {
  const supabase = tryGetAdmin();

  let products: Array<Record<string, unknown>> = [];
  let categories: Array<Record<string, unknown>> = [];

  if (supabase) {
    const [productsRes, categoriesRes] = await Promise.all([
      supabase
        .from("products")
        .select("*, categories(name, slug)")
        .order("sort_order")
        .order("name"),
      supabase.from("categories").select("*").order("sort_order").order("name"),
    ]);
    products = (productsRes.data as Array<Record<string, unknown>>) ?? [];
    categories = (categoriesRes.data as Array<Record<string, unknown>>) ?? [];
  }

  return (
    <div className="space-y-6">
      <h1 className="[font-family:var(--font-display)] text-3xl text-primary">Products</h1>
      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      <ProductList initialProducts={products as any} categories={categories as any} />
    </div>
  );
}
