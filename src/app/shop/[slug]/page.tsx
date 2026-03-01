import Link from "next/link";
import { notFound } from "next/navigation";
import { ProductDetailClient } from "@/components/shop/product-detail-client";
import { getShopProductBySlug } from "@/lib/data/catalog";

type ShopProductPageProps = {
  params: Promise<{ slug: string }>;
};

export default async function ShopProductPage({ params }: ShopProductPageProps) {
  const { slug } = await params;
  const bundle = await getShopProductBySlug(slug);

  if (!bundle) {
    notFound();
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-12 md:py-16">
      <nav className="text-sm text-muted-foreground">
        <Link href="/shop" className="hover:text-primary hover:underline">
          Shop
        </Link>{" "}
        /{" "}
        <Link
          href={`/shop?category=${bundle.product.categorySlug}`}
          className="hover:text-primary hover:underline"
        >
          {bundle.product.categoryName}
        </Link>{" "}
        / <span className="text-foreground">{bundle.product.name}</span>
      </nav>
      <ProductDetailClient product={bundle.product} relatedProducts={bundle.relatedProducts} />
    </div>
  );
}
