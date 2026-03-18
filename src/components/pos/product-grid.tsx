"use client";

import { useMemo, useState } from "react";
import { Minus, Plus, Search, X } from "lucide-react";
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
type CartQty = Record<string, number>;

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
      {/* Search — fixed at top */}
      <div className="shrink-0 border-b border-zinc-800 p-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setSelectedCat(null); }}
            placeholder="Search products…"
            className="w-full rounded-lg bg-zinc-800 py-2 pl-9 pr-8 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-amber-500/50"
          />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-500">
              <X className="size-4" />
            </button>
          )}
        </div>
      </div>

      {/* Category pills — fixed, wraps to multiple rows */}
      <div className="shrink-0 border-b border-zinc-800 px-2 py-1.5">
        <div className="flex flex-wrap gap-1">
          <button
            onClick={() => setSelectedCat(null)}
            className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${!selectedCat ? "bg-amber-600 text-white" : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"}`}
          >
            All
          </button>
          {categories.map((cat) => (
            <button
              key={cat.slug}
              onClick={() => setSelectedCat(selectedCat === cat.slug ? null : cat.slug)}
              className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${selectedCat === cat.slug ? "bg-amber-600 text-white" : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"}`}
            >
              {cat.name} <span className="text-[10px] opacity-50">{cat.count}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Product grid — scrollable, hidden scrollbar */}
      <div className="flex-1 overflow-y-auto p-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {filtered.map((product) => (
            <ProductTile
              key={product.id}
              product={product}
              cartQty={cartQtys[product.id] ?? 0}
              isBulk={product.delivery_type === "bulk"}
              onAdd={(qty) => onAddProduct(product, qty)}
              onSetQty={(qty) => onSetQty(product.id, qty)}
            />
          ))}
        </div>
        {filtered.length === 0 && (
          <div className="py-16 text-center text-sm text-zinc-600">No products found</div>
        )}
      </div>
    </div>
  );
}

function ProductTile({
  product, cartQty, isBulk, onAdd, onSetQty,
}: {
  product: PosProduct; cartQty: number; isBulk: boolean;
  onAdd: (qty: number) => void; onSetQty: (qty: number) => void;
}) {
  const [inputQty, setInputQty] = useState("");
  const [imgError, setImgError] = useState(false);
  const isInCart = cartQty > 0;

  function handleQtyChange(delta: number) {
    const newQty = Math.max(0, cartQty + delta);
    if (newQty === 0) onSetQty(0);
    else if (cartQty === 0) onAdd(delta);
    else onSetQty(newQty);
  }

  function handleInputSubmit() {
    const parsed = parseFloat(inputQty);
    if (Number.isFinite(parsed) && parsed > 0) {
      if (cartQty === 0) onAdd(parsed);
      else onSetQty(parsed);
    } else if (inputQty === "0") {
      onSetQty(0);
    }
    setInputQty("");
  }

  function handleQuickAdd(qty: number) {
    if (cartQty === 0) onAdd(qty);
    else onSetQty(cartQty + qty);
  }

  const showImage = product.image_url && !imgError;

  return (
    <div className={`relative flex flex-col rounded-lg border transition-colors ${
      isInCart
        ? "border-green-500/60 bg-green-950/20"
        : "border-zinc-800 bg-zinc-900 hover:border-zinc-700"
    }`}>
      {/* Cart qty badge */}
      {isInCart && (
        <div className="absolute -right-1 -top-1 z-10 flex size-6 items-center justify-center rounded-full bg-green-500 text-[11px] font-bold text-white shadow">
          {cartQty}
        </div>
      )}

      {/* Image / placeholder */}
      <div className="h-16 w-full overflow-hidden rounded-t-lg bg-zinc-800/60">
        {showImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={product.image_url!}
            alt=""
            className="h-full w-full object-cover"
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="flex h-full items-center justify-center text-xl font-bold text-zinc-700">
            {product.name.charAt(0)}
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex flex-1 flex-col px-2 pt-1.5 pb-1">
        <p className="text-[9px] uppercase tracking-wider text-zinc-600">{product.category_name}</p>
        <p className="text-[11px] font-medium leading-tight text-zinc-200 line-clamp-2">{product.name}</p>
        <p className="mt-auto pt-0.5 text-sm font-bold text-amber-400">
          {formatUsd(product.price_per_unit_cents)}
          <span className="ml-0.5 text-[9px] font-normal text-zinc-500">/{product.unit_label}</span>
        </p>
      </div>

      {/* Qty controls */}
      <div className="border-t border-zinc-800/60 px-1.5 py-1.5 space-y-1">
        {/* Quick presets for bulk */}
        {isBulk && (
          <div className="flex gap-0.5">
            {BULK_PRESETS.map((n) => (
              <button
                key={n}
                onClick={() => handleQuickAdd(n)}
                className="flex-1 rounded bg-zinc-800 py-1 text-[10px] font-semibold text-zinc-400 hover:bg-amber-600/20 hover:text-amber-400 active:bg-amber-600/30"
              >
                +{n}
              </button>
            ))}
          </div>
        )}

        {/* -/input/+ row — LARGE touch targets */}
        <div className="flex items-center gap-0.5">
          <button
            onClick={() => handleQtyChange(-1)}
            disabled={cartQty <= 0}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-zinc-800 text-zinc-300 hover:bg-red-900/40 hover:text-red-300 disabled:opacity-20 active:bg-red-900/60"
          >
            <Minus className="size-5" />
          </button>

          <input
            type="text"
            inputMode="decimal"
            value={inputQty || (isInCart ? String(cartQty) : "")}
            onChange={(e) => setInputQty(e.target.value)}
            onFocus={() => setInputQty(isInCart ? String(cartQty) : "")}
            onBlur={() => { if (inputQty) handleInputSubmit(); }}
            onKeyDown={(e) => { if (e.key === "Enter") handleInputSubmit(); }}
            placeholder="0"
            className="h-10 w-10 flex-1 rounded-md border border-zinc-700/50 bg-zinc-800/30 text-center text-xs font-semibold text-zinc-200 placeholder:text-zinc-700 focus:border-amber-500/50 focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
          />

          <button
            onClick={() => handleQtyChange(1)}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-zinc-800 text-zinc-300 hover:bg-green-900/40 hover:text-green-300 active:bg-green-900/60"
          >
            <Plus className="size-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
