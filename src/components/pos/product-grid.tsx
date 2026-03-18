"use client";

import { useMemo, useState } from "react";
import { Minus, Plus, Search } from "lucide-react";
import { formatUsd } from "@/lib/format";

type PosProduct = {
  id: string;
  name: string;
  slug: string;
  price_per_unit_cents: number;
  unit_label: string;
  category_slug: string;
  category_name: string;
  delivery_type: string;
  min_qty: number;
  qty_step: number;
  image_url?: string | null | undefined;
};

type PosCategory = { slug: string; name: string; count: number };

type CartQty = Record<string, number>; // product id -> qty in cart

interface Props {
  products: PosProduct[];
  categories: PosCategory[];
  cartQtys: CartQty;
  onAddProduct: (product: PosProduct, qty: number) => void;
  onSetQty: (productId: string, qty: number) => void;
}

const BULK_PRESETS = [3, 5, 10, 15, 20];

export function POSProductGrid({ products, categories, cartQtys, onAddProduct, onSetQty }: Props) {
  const [search, setSearch] = useState("");
  const [selectedCat, setSelectedCat] = useState<string | null>(null);

  const filtered = useMemo(() => {
    let list = products;
    if (selectedCat) list = list.filter((p) => p.category_slug === selectedCat);
    if (search) {
      const q = search.toLowerCase();
      list = list.filter((p) => p.name.toLowerCase().includes(q) || p.category_name.toLowerCase().includes(q));
    }
    return list;
  }, [products, selectedCat, search]);

  return (
    <div className="flex h-full flex-col">
      {/* Search — fixed */}
      <div className="shrink-0 border-b border-zinc-800 p-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search products…"
            className="w-full rounded-lg bg-zinc-800 py-2.5 pl-10 pr-3 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-amber-500/50"
          />
        </div>
      </div>

      {/* Category pills — fixed */}
      <div className="shrink-0 overflow-x-auto border-b border-zinc-800 px-3 py-2">
        <div className="flex gap-1.5">
          <button
            onClick={() => setSelectedCat(null)}
            className={`shrink-0 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${!selectedCat ? "bg-amber-600 text-white" : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"}`}
          >
            All
          </button>
          {categories.map((cat) => (
            <button
              key={cat.slug}
              onClick={() => setSelectedCat(selectedCat === cat.slug ? null : cat.slug)}
              className={`shrink-0 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${selectedCat === cat.slug ? "bg-amber-600 text-white" : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"}`}
            >
              {cat.name} <span className="ml-1 text-[10px] opacity-60">{cat.count}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Product grid — scrollable */}
      <div className="flex-1 overflow-y-auto p-3">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {filtered.map((product) => {
            const inCart = cartQtys[product.id] ?? 0;
            const isBulk = product.delivery_type === "bulk";
            return (
              <ProductTile
                key={product.id}
                product={product}
                cartQty={inCart}
                isBulk={isBulk}
                onAdd={(qty) => onAddProduct(product, qty)}
                onSetQty={(qty) => onSetQty(product.id, qty)}
              />
            );
          })}
          {filtered.length === 0 && (
            <div className="col-span-full py-16 text-center text-sm text-zinc-600">
              No products match your search
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ProductTile({
  product,
  cartQty,
  isBulk,
  onAdd,
  onSetQty,
}: {
  product: PosProduct;
  cartQty: number;
  isBulk: boolean;
  onAdd: (qty: number) => void;
  onSetQty: (qty: number) => void;
}) {
  const [inputQty, setInputQty] = useState("");
  const isInCart = cartQty > 0;

  function handleQtyChange(delta: number) {
    const newQty = Math.max(0, cartQty + delta);
    if (newQty === 0) {
      onSetQty(0);
    } else if (cartQty === 0) {
      onAdd(delta);
    } else {
      onSetQty(newQty);
    }
  }

  function handleInputSubmit() {
    const parsed = parseFloat(inputQty);
    if (Number.isFinite(parsed) && parsed >= 0) {
      if (parsed === 0) onSetQty(0);
      else if (cartQty === 0) onAdd(parsed);
      else onSetQty(parsed);
    }
    setInputQty("");
  }

  function handleQuickAdd(qty: number) {
    if (cartQty === 0) onAdd(qty);
    else onSetQty(cartQty + qty);
  }

  return (
    <div
      className={`relative flex flex-col rounded-xl border transition-colors ${
        isInCart
          ? "border-green-500/50 bg-zinc-800/80 shadow-[0_0_8px_rgba(34,197,94,0.15)]"
          : "border-zinc-800 bg-zinc-900 hover:border-zinc-700"
      }`}
    >
      {/* Cart qty badge */}
      {isInCart && (
        <div className="absolute -right-1.5 -top-1.5 z-10 flex size-7 items-center justify-center rounded-full bg-green-500 text-xs font-bold text-white shadow">
          {cartQty}
        </div>
      )}

      {/* Image / placeholder */}
      <div className="h-20 w-full overflow-hidden rounded-t-xl bg-zinc-800">
        {product.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={product.image_url}
            alt={product.name}
            className="h-full w-full object-cover"
            onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; (e.target as HTMLImageElement).parentElement!.classList.add("fallback-active"); }}
          />
        ) : null}
        {!product.image_url && (
          <div className="flex h-full items-center justify-center text-2xl font-bold text-zinc-700">
            {product.name.charAt(0)}
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex flex-1 flex-col px-2.5 pt-2 pb-1">
        <p className="text-[10px] uppercase tracking-wider text-zinc-600">{product.category_name}</p>
        <p className="text-xs font-medium leading-tight text-zinc-200 line-clamp-2">{product.name}</p>
        <p className="mt-auto pt-1 text-sm font-bold text-amber-400">
          {formatUsd(product.price_per_unit_cents)}
          <span className="ml-1 text-[10px] font-normal text-zinc-500">/{product.unit_label}</span>
        </p>
      </div>

      {/* Qty controls */}
      <div className="border-t border-zinc-800 px-2 py-2 space-y-1.5">
        {/* Quick preset buttons for bulk */}
        {isBulk && (
          <div className="flex gap-1">
            {BULK_PRESETS.map((n) => (
              <button
                key={n}
                onClick={() => handleQuickAdd(n)}
                className="flex-1 rounded bg-zinc-800 py-1 text-[11px] font-medium text-zinc-400 hover:bg-amber-600/20 hover:text-amber-400 active:bg-amber-600/30 transition-colors"
              >
                +{n}
              </button>
            ))}
          </div>
        )}

        {/* -/+/input row */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => handleQtyChange(-1)}
            disabled={cartQty <= 0}
            className="flex size-8 items-center justify-center rounded-md bg-zinc-800 text-zinc-400 hover:bg-red-900/30 hover:text-red-400 disabled:opacity-20 active:bg-red-900/50 transition-colors"
          >
            <Minus className="size-3.5" />
          </button>

          <input
            type="text"
            inputMode="decimal"
            value={inputQty || (isInCart ? String(cartQty) : "")}
            onChange={(e) => setInputQty(e.target.value)}
            onFocus={() => setInputQty(isInCart ? String(cartQty) : "")}
            onBlur={() => { if (inputQty) handleInputSubmit(); }}
            onKeyDown={(e) => { if (e.key === "Enter") handleInputSubmit(); }}
            placeholder={isInCart ? String(cartQty) : "0"}
            className="h-8 flex-1 rounded-md border border-zinc-700 bg-zinc-800/50 text-center text-sm font-semibold text-zinc-200 placeholder:text-zinc-600 focus:border-amber-500/50 focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
          />

          <button
            onClick={() => handleQtyChange(1)}
            className="flex size-8 items-center justify-center rounded-md bg-zinc-800 text-zinc-400 hover:bg-green-900/30 hover:text-green-400 active:bg-green-900/50 transition-colors"
          >
            <Plus className="size-3.5" />
          </button>

          {!isBulk && (
            <button
              onClick={() => handleQuickAdd(1)}
              className="flex h-8 items-center justify-center rounded-md bg-amber-600 px-3 text-xs font-bold text-white hover:bg-amber-500 active:bg-amber-700 transition-colors"
            >
              ADD
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
