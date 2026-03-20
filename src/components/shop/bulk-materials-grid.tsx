"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Minus, Plus, ShoppingCart, Phone, Calculator, X, Check } from "lucide-react";
import { toast } from "sonner";
import { useCartStore } from "@/stores/cartStore";
import {
  Sheet, SheetContent, SheetTitle,
} from "@/components/ui/sheet";

type Product = {
  id: string;
  name: string;
  slug: string;
  price_per_unit_cents: number;
  unit_display: string;
  delivery_type: string;
  material_class: string;
  images: string[];
  category_id: string;
  categories: { name: string; slug: string; sort_order: number } | null;
};

type ProductGroup = {
  name: string;
  slug: string;
  sortOrder: number;
  products: Product[];
};

const PRESETS = [3, 5, 10, 15, 20];

function formatPrice(cents: number): string {
  const dollars = cents / 100;
  return dollars % 1 === 0 ? `$${dollars}` : `$${dollars.toFixed(2)}`;
}

function QuickOrderSheet({ product, onClose }: { product: Product; onClose: () => void }) {
  const addItem = useCartStore((s) => s.addItem);
  const cartItems = useCartStore((s) => s.items);
  const updateQuantity = useCartStore((s) => s.updateQuantity);

  const cartItem = cartItems.find((i) => i.id === product.id);
  const [qty, setQty] = useState(cartItem?.quantity ?? 5);
  const [added, setAdded] = useState(false);

  const subtotal = qty * product.price_per_unit_cents;

  function handleAdd() {
    if (qty <= 0) return;
    if (cartItem) {
      updateQuantity(product.id, qty);
    } else {
      addItem({
        id: product.id,
        name: product.name,
        quantity: qty,
        unitPriceCents: product.price_per_unit_cents,
        deliveryType: "bulk" as any,
        materialClass: (product.material_class || "default") as any,
      });
    }
    setAdded(true);
    toast.success(`${qty} yd ${product.name} added to cart`, {
      action: { label: "View Cart", onClick: () => { window.location.href = "/cart"; } },
    });
    setTimeout(() => { setAdded(false); onClose(); }, 1200);
  }

  if (added) {
    return (
      <div className="py-8 text-center">
        <Check className="mx-auto size-12 text-green-500" />
        <p className="mt-2 text-lg font-bold text-white">{qty} yd added!</p>
      </div>
    );
  }

  return (
    <div className="space-y-5 pb-4">
      <SheetTitle className="flex items-center justify-between">
        <span className="text-xl font-bold text-white">{product.name}</span>
        <span className="text-lg font-bold text-green-400">{formatPrice(product.price_per_unit_cents)}/yd</span>
      </SheetTitle>

      <p className="text-sm text-zinc-400">How many cubic yards?</p>

      {/* Preset buttons */}
      <div className="flex gap-2">
        {PRESETS.map((p) => (
          <button
            key={p}
            onClick={() => setQty(p)}
            className={`flex-1 rounded-xl py-3 text-lg font-bold transition-colors ${
              qty === p
                ? "bg-green-700 text-white border-2 border-green-500"
                : "bg-zinc-800 text-zinc-300 border-2 border-zinc-700 hover:border-zinc-500"
            }`}
          >
            {p}
          </button>
        ))}
      </div>

      {/* Custom qty */}
      <div className="flex items-center justify-center gap-4">
        <button onClick={() => setQty(Math.max(1, qty - 1))}
          className="flex size-12 items-center justify-center rounded-xl bg-zinc-800 text-2xl font-bold text-white hover:bg-zinc-700">
          −
        </button>
        <input
          type="number"
          value={qty}
          onChange={(e) => { const n = parseInt(e.target.value); if (!isNaN(n) && n > 0) setQty(n); }}
          className="w-20 rounded-xl bg-zinc-800 py-3 text-center text-2xl font-bold text-white focus:outline-none focus:ring-2 focus:ring-green-500 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
          inputMode="numeric"
        />
        <button onClick={() => setQty(qty + 1)}
          className="flex size-12 items-center justify-center rounded-xl bg-zinc-800 text-2xl font-bold text-white hover:bg-zinc-700">
          +
        </button>
      </div>

      {/* Subtotal */}
      <div className="text-center">
        <p className="text-sm text-zinc-500">Subtotal</p>
        <p className="text-2xl font-bold text-white">{formatPrice(subtotal)}</p>
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <button onClick={handleAdd}
          className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-green-700 py-4 text-base font-bold text-white hover:bg-green-600 active:scale-[0.97] transition-transform">
          <ShoppingCart className="size-5" />
          Add to Cart — {qty} yd
        </button>
        <Link href={`/shop/${product.slug}`}
          className="flex items-center justify-center rounded-xl border border-zinc-700 px-5 py-4 text-sm font-medium text-zinc-300 hover:bg-zinc-800">
          Details
        </Link>
      </div>

      <p className="text-center text-xs text-zinc-600">
        Delivery starts at ~$45 to most Suffolk County towns
      </p>
    </div>
  );
}

function MaterialTile({ product, onClick }: { product: Product; onClick: () => void }) {
  const imgUrl = product.images?.[0];

  return (
    <button
      onClick={onClick}
      className="group relative overflow-hidden rounded-2xl bg-zinc-800 shadow-lg active:scale-[0.97] transition-transform text-left w-full"
    >
      <div className="aspect-square relative overflow-hidden">
        {imgUrl ? (
          <Image
            src={imgUrl}
            alt={product.name}
            fill
            className="object-cover transition-transform group-hover:scale-105"
            sizes="(max-width: 768px) 50vw, 25vw"
          />
        ) : (
          <div className="flex h-full items-center justify-center bg-zinc-800 text-4xl font-bold text-zinc-600">
            {product.name.charAt(0)}
          </div>
        )}
        {/* Dark gradient for text readability */}
        <div className="absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-black/80 to-transparent" />
      </div>

      {/* Text overlay */}
      <div className="absolute inset-x-0 bottom-0 p-3">
        <h3 className="text-base sm:text-lg font-bold text-white leading-tight drop-shadow-md">
          {product.name}
        </h3>
        <p className="text-sm sm:text-base font-semibold text-green-400 drop-shadow-md mt-0.5">
          {formatPrice(product.price_per_unit_cents)}/yd
        </p>
      </div>
    </button>
  );
}

export function BulkMaterialsGrid({ products }: { products: Product[] }) {
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  // Group products by category
  const groups = useMemo<ProductGroup[]>(() => {
    const map = new Map<string, ProductGroup>();
    for (const p of products) {
      const catName = p.categories?.name ?? "Other";
      const catSlug = p.categories?.slug ?? "other";
      const sortOrder = p.categories?.sort_order ?? 999;
      if (!map.has(catSlug)) {
        map.set(catSlug, { name: catName, slug: catSlug, sortOrder, products: [] });
      }
      map.get(catSlug)!.products.push(p);
    }
    return Array.from(map.values()).sort((a, b) => a.sortOrder - b.sortOrder);
  }, [products]);

  return (
    <div className="min-h-screen bg-zinc-950">
      <div className="mx-auto max-w-6xl px-3 py-6 sm:px-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-white sm:text-3xl">Bulk Materials</h1>
          <p className="mt-1 text-sm text-zinc-400">Tap a material to order — delivered by dump truck</p>
        </div>

        {/* Product groups */}
        {groups.map((group) => (
          <div key={group.slug} className="mb-2">
            <h2 className="pt-4 pb-3 text-xs font-bold uppercase tracking-[0.15em] text-zinc-500">
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
            className="flex items-center justify-center gap-2 h-14 w-full rounded-xl bg-green-800 text-white font-semibold text-lg hover:bg-green-700">
            <Phone className="size-5" /> Call (631) 874-6244
          </a>
          <Link href="/calculator"
            className="flex items-center justify-center gap-2 h-14 w-full rounded-xl border border-zinc-700 text-zinc-300 font-medium hover:bg-zinc-900">
            <Calculator className="size-5" /> Material Calculator — How much do I need?
          </Link>
          <Link href="/shop"
            className="flex items-center justify-center gap-2 h-12 w-full text-sm text-zinc-500 hover:text-zinc-300">
            Looking for bags, tools, cement, or pavers? Browse Full Catalog →
          </Link>
        </div>
      </div>

      {/* Quick Order Bottom Sheet */}
      <Sheet open={!!selectedProduct} onOpenChange={(open) => { if (!open) setSelectedProduct(null); }}>
        <SheetContent side="bottom" className="rounded-t-3xl bg-zinc-900 border-zinc-700 pb-8">
          {selectedProduct && (
            <QuickOrderSheet product={selectedProduct} onClose={() => setSelectedProduct(null)} />
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
