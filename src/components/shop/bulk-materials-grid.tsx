"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Minus, Plus, ShoppingCart, Phone, Calculator, Check } from "lucide-react";
import { toast } from "sonner";
import { useCartStore } from "@/stores/cartStore";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";

type Product = {
  id: string;
  name: string;
  slug: string;
  price_per_unit_cents: number;
  web_price_per_unit_cents?: number | null;
  unit_display: string;
  delivery_type: string;
  material_class: string;
  images: string[];
  category_id: string;
  categories: { name: string; slug: string; sort_order: number } | null;
};

type ProductGroup = { name: string; slug: string; sortOrder: number; products: Product[] };

const PRESETS = [3, 5, 10, 15, 20];

function getWebPrice(p: Product): number {
  return p.web_price_per_unit_cents ?? p.price_per_unit_cents;
}

function formatPrice(cents: number): string {
  const d = cents / 100;
  return d % 1 === 0 ? `$${d}` : `$${d.toFixed(2)}`;
}

function QuickOrderSheet({ product, onClose }: { product: Product; onClose: () => void }) {
  const router = useRouter();
  const addItem = useCartStore((s) => s.addItem);
  const cartItems = useCartStore((s) => s.items);
  const updateQuantity = useCartStore((s) => s.updateQuantity);

  const cartItem = cartItems.find((i) => i.id === product.id);
  const webPrice = getWebPrice(product);
  const [qty, setQty] = useState(cartItem?.quantity ?? 5);
  const [added, setAdded] = useState(false);
  const subtotal = qty * webPrice;

  async function handleAdd() {
    if (qty <= 0) return;
    try {
      if (cartItem) {
        await updateQuantity(product.id, qty);
      } else {
        await addItem({
          id: product.id,
          name: product.name,
          quantity: qty,
          unitPriceCents: webPrice,
          deliveryType: "bulk" as any,
          materialClass: (product.material_class || "default") as any,
        });
      }
      setAdded(true);
      toast.success(`${qty} yd ${product.name} added to cart`);
      setTimeout(() => { router.push("/cart"); }, 800);
    } catch {
      toast.error("Failed to add to cart. Please try again.");
    }
  }

  if (added) {
    return (
      <div className="py-8 text-center">
        <Check className="mx-auto size-12 text-green-600" />
        <p className="mt-2 text-lg font-bold">{qty} yd added!</p>
        <p className="text-sm text-muted-foreground">Going to cart...</p>
      </div>
    );
  }

  return (
    <div className="space-y-5 px-2 pb-4">
      <SheetTitle className="flex items-center justify-between">
        <span className="text-xl font-bold text-primary">{product.name}</span>
        <span className="text-lg font-bold text-accent">{formatPrice(webPrice)}/yd</span>
      </SheetTitle>

      <p className="text-sm text-muted-foreground">How many cubic yards?</p>

      {/* Preset buttons */}
      <div className="flex gap-2">
        {PRESETS.map((p) => (
          <button
            key={p}
            onClick={() => setQty(p)}
            className={`flex-1 rounded-xl py-3 text-lg font-bold transition-colors border-2 ${
              qty === p
                ? "bg-accent/10 text-accent border-accent"
                : "bg-muted/50 text-foreground/70 border-border hover:border-accent/30"
            }`}
          >
            {p}
          </button>
        ))}
      </div>

      {/* Custom qty */}
      <div className="flex items-center justify-center gap-4">
        <button onClick={() => setQty(Math.max(1, qty - 1))}
          className="flex size-12 items-center justify-center rounded-xl border-2 border-border bg-muted/50 text-2xl font-bold hover:bg-muted">
          −
        </button>
        <input
          type="number"
          value={qty}
          onChange={(e) => { const n = parseInt(e.target.value); if (!isNaN(n) && n > 0) setQty(n); }}
          className="w-20 rounded-xl border-2 border-border bg-background py-3 text-center text-2xl font-bold focus:outline-none focus:ring-2 focus:ring-accent [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
          inputMode="numeric"
        />
        <button onClick={() => setQty(qty + 1)}
          className="flex size-12 items-center justify-center rounded-xl border-2 border-border bg-muted/50 text-2xl font-bold hover:bg-muted">
          +
        </button>
      </div>

      {/* Subtotal */}
      <div className="text-center">
        <p className="text-sm text-muted-foreground">Subtotal</p>
        <p className="text-2xl font-bold text-primary">{formatPrice(subtotal)}</p>
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <button onClick={handleAdd}
          className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-accent py-4 text-base font-bold text-accent-foreground hover:bg-accent/90 active:scale-[0.97] transition-transform">
          <ShoppingCart className="size-5" />
          Add to Cart — {qty} yd
        </button>
        <Link href={`/shop/${product.slug}`}
          className="flex items-center justify-center rounded-xl border-2 border-border px-5 py-4 text-sm font-medium text-foreground/70 hover:bg-muted">
          Details
        </Link>
      </div>

      <p className="text-center text-xs text-muted-foreground">
        Delivery starts at ~$45 to most Suffolk County towns
      </p>
    </div>
  );
}

function MaterialTile({ product, onClick }: { product: Product; onClick: () => void }) {
  const imgUrl = product.images?.[0];
  const webPrice = getWebPrice(product);

  return (
    <button
      onClick={onClick}
      className="group relative overflow-hidden rounded-2xl bg-muted shadow-md border border-border/50 active:scale-[0.97] transition-transform text-left w-full hover:shadow-lg"
    >
      <div className="aspect-square relative overflow-hidden rounded-t-2xl">
        {imgUrl ? (
          <Image src={imgUrl} alt={product.name} fill
            className="object-cover transition-transform group-hover:scale-105"
            sizes="(max-width: 768px) 50vw, 25vw" />
        ) : (
          <div className="flex h-full items-center justify-center bg-muted text-4xl font-bold text-muted-foreground/30">
            {product.name.charAt(0)}
          </div>
        )}
      </div>

      {/* Text below image — site theme */}
      <div className="p-3 bg-card">
        <h3 className="text-sm sm:text-base font-bold text-foreground leading-tight">
          {product.name}
        </h3>
        <p className="text-sm font-semibold text-accent mt-0.5">
          {formatPrice(webPrice)}/yd
        </p>
      </div>
    </button>
  );
}

export function BulkMaterialsGrid({ products }: { products: Product[] }) {
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  const groups = useMemo<ProductGroup[]>(() => {
    const map = new Map<string, ProductGroup>();
    for (const p of products) {
      const catName = p.categories?.name ?? "Other";
      const catSlug = p.categories?.slug ?? "other";
      const sortOrder = p.categories?.sort_order ?? 999;
      if (!map.has(catSlug)) map.set(catSlug, { name: catName, slug: catSlug, sortOrder, products: [] });
      map.get(catSlug)!.products.push(p);
    }
    return Array.from(map.values()).sort((a, b) => a.sortOrder - b.sortOrder);
  }, [products]);

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className="[font-family:var(--font-display)] text-3xl md:text-4xl text-primary">Bulk Materials</h1>
          <p className="mt-1 text-muted-foreground">Tap a material to order — delivered by dump truck</p>
        </div>

        {/* Product groups */}
        {groups.map((group) => (
          <div key={group.slug} className="mb-4">
            <h2 className="pt-4 pb-3 text-xs font-bold uppercase tracking-[0.15em] text-muted-foreground border-b border-border mb-3">
              {group.name}
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4">
              {group.products.map((product) => (
                <MaterialTile key={product.id} product={product} onClick={() => setSelectedProduct(product)} />
              ))}
            </div>
          </div>
        ))}

        {/* Bottom CTAs */}
        <div className="mt-10 space-y-3">
          <a href="tel:+16318746244"
            className="flex items-center justify-center gap-2 h-14 w-full rounded-xl bg-primary text-primary-foreground font-semibold text-lg hover:bg-primary/90">
            <Phone className="size-5" /> Call (631) 874-6244
          </a>
          <Link href="/calculator"
            className="flex items-center justify-center gap-2 h-14 w-full rounded-xl border-2 border-border text-foreground font-medium hover:bg-muted">
            <Calculator className="size-5" /> Material Calculator — How much do I need?
          </Link>
          <Link href="/shop"
            className="flex items-center justify-center gap-2 h-12 w-full text-sm text-muted-foreground hover:text-foreground">
            Looking for bags, tools, cement, or pavers? Browse Full Catalog →
          </Link>
        </div>
      </div>

      {/* Quick Order Bottom Sheet */}
      <Sheet open={!!selectedProduct} onOpenChange={(open) => { if (!open) setSelectedProduct(null); }}>
        <SheetContent side="bottom" className="rounded-t-3xl border-t-2 border-border px-6 pb-8">
          {selectedProduct && (
            <QuickOrderSheet product={selectedProduct} onClose={() => setSelectedProduct(null)} />
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
