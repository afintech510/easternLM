"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Calculator, Minus, Plus, Search, X } from "lucide-react";
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

export type PosTheme = {
  bg: string; card: string; border: string; text: string;
  muted: string; accent: string; accentBg: string; input: string; hover: string;
};

interface Props {
  products: PosProduct[];
  categories: PosCategory[];
  cartQtys: CartQty;
  onAddProduct: (product: PosProduct, qty: number) => void;
  onSetQty: (productId: string, qty: number) => void;
  onOpenCalculator?: () => void;
  onOpenNewLead?: () => void;
  theme?: PosTheme;
}

const BULK_PRESETS = [3, 5, 10, 15, 20];

export function POSProductGrid({ products, categories, cartQtys, onAddProduct, onSetQty, onOpenCalculator, onOpenNewLead, theme: t }: Props) {
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

  const card = t?.card ?? "bg-zinc-900";
  const border = t?.border ?? "border-zinc-800";
  const input = t?.input ?? "bg-zinc-800 border-zinc-700";
  const muted = t?.muted ?? "text-zinc-500";
  const accent = t?.accent ?? "text-amber-400";
  const accentBg = t?.accentBg ?? "bg-amber-600";
  const hover = t?.hover ?? "hover:bg-zinc-800";

  return (
    <div className="flex h-full flex-col">
      {/* Header: POS icon + Search */}
      <div className={`shrink-0 border-b ${border} p-2`}>
        <div className="flex items-center gap-2">
          {/* Company logo */}
          <Link href="/yard/register" className="shrink-0">
            <Image
              src="/logo-elm-blue.webp"
              alt="Eastern LM"
              width={100}
              height={28}
              className="brightness-0 invert opacity-80"
            />
          </Link>
          {/* Search */}
          <div className="relative flex-1">
          <Search className={`absolute left-3 top-1/2 size-4 -translate-y-1/2 ${muted}`} />
          <input
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setSelectedCat(null); }}
            placeholder="Search products…"
            className={`w-full rounded-lg py-2 pl-9 pr-8 text-sm ${input} focus:outline-none focus:ring-1 focus:ring-amber-500/50`}
          />
          {search && (
            <button onClick={() => setSearch("")} className={`absolute right-2 top-1/2 -translate-y-1/2 ${muted}`}>
              <X className="size-4" />
            </button>
          )}
          </div>
          {/* Calculator button */}
          {onOpenCalculator && (
            <button
              onClick={onOpenCalculator}
              className={`shrink-0 rounded-lg border ${border} ${input} p-2 transition-colors ${hover}`}
              title="Material Calculator"
            >
              <Calculator className="size-5 text-amber-400" />
            </button>
          )}
          {/* New Service Lead button */}
          {onOpenNewLead && (
            <button
              onClick={onOpenNewLead}
              className={`shrink-0 rounded-lg border ${border} ${input} p-1.5 transition-colors ${hover}`}
              title="New Service Lead"
              style={{ filter: "drop-shadow(0 0 3px #39ff1466)" }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="24" height="24">
                <g fill="#39FF14" stroke="#39FF14">
                  <circle cx="28" cy="14" r="6.5" stroke="none" />
                  <path d="M 11 29 C 11 21, 21 19, 28 19 C 35 19, 45 21, 45 29 Z" stroke="none" />
                  <circle cx="72" cy="14" r="6.5" stroke="none" />
                  <path d="M 55 29 C 55 21, 65 19, 72 19 C 79 19, 89 21, 89 29 Z" stroke="none" />
                  <g strokeWidth="4" fill="none" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="8" y1="36" x2="92" y2="36" />
                    <path d="M 14 36 L 41 63 L 41 76" />
                    <path d="M 86 36 L 59 63 L 59 76" />
                  </g>
                  <g strokeWidth="3.5" fill="none">
                    <ellipse cx="50" cy="84" rx="16" ry="6" />
                    <path d="M 34 90 A 16 6 0 0 0 66 90" strokeLinecap="round" />
                  </g>
                  <g strokeWidth="1.5" fill="none" strokeLinecap="round">
                    <line x1="50" y1="80" x2="50" y2="88" />
                    <path d="M 52.5 81.5 C 52.5 80, 47.5 80, 47.5 82.5 C 47.5 85, 52.5 83, 52.5 85.5 C 52.5 88, 47.5 88, 47.5 86.5" />
                  </g>
                </g>
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Categories — wraps */}
      <div className={`shrink-0 border-b ${border} px-2 py-1.5`}>
        <div className="flex flex-wrap gap-1">
          <button
            onClick={() => setSelectedCat(null)}
            className={`rounded-md px-2.5 py-1 text-xs font-medium ${!selectedCat ? `${accentBg} text-white` : `${card} ${muted}`}`}
          >
            All
          </button>
          {categories.map((cat) => (
            <button
              key={cat.slug}
              onClick={() => setSelectedCat(selectedCat === cat.slug ? null : cat.slug)}
              className={`rounded-md px-2.5 py-1 text-xs font-medium ${selectedCat === cat.slug ? `${accentBg} text-white` : `${card} ${muted}`}`}
            >
              {cat.name} <span className="text-[10px] opacity-50">{cat.count}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Product grid */}
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
              card={card} border={border} input={input} muted={muted} accent={accent} accentBg={accentBg}
            />
          ))}
        </div>
        {filtered.length === 0 && (
          <div className={`py-16 text-center text-sm ${muted}`}>No products found</div>
        )}
      </div>
    </div>
  );
}

function ProductTile({
  product, cartQty, isBulk, onAdd, onSetQty,
  card, border, input, muted, accent, accentBg,
}: {
  product: PosProduct; cartQty: number; isBulk: boolean;
  onAdd: (qty: number) => void; onSetQty: (qty: number) => void;
  card: string; border: string; input: string; muted: string;
  accent: string; accentBg: string;
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
      isInCart ? "border-green-500/60 bg-green-950/20" : `${border} ${card}`
    }`}>
      {isInCart && (
        <div className="absolute -right-1 -top-1 z-10 flex size-6 items-center justify-center rounded-full bg-green-500 text-[11px] font-bold text-white shadow">
          {cartQty}
        </div>
      )}

      {/* Image — SQUARE 1:1, object-contain to show full image */}
      <div className={`aspect-[4/3] w-full overflow-hidden rounded-t-lg ${card}`}>
        {showImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={product.image_url!} alt="" className="h-full w-full object-contain object-top p-1" onError={() => setImgError(true)} />
        ) : (
          <div className={`flex h-full items-center justify-center text-2xl font-bold ${muted}`}>
            {product.name.charAt(0)}
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex flex-col px-2 pt-1 pb-0.5">
        <p className={`text-[9px] uppercase tracking-wider ${muted}`}>{product.category_name}</p>
        <p className="text-[11px] font-medium leading-tight line-clamp-2">{product.name}</p>
        <p className={`mt-0.5 text-sm font-bold ${accent}`}>
          {formatUsd(product.price_per_unit_cents)}
          <span className={`ml-0.5 text-[9px] font-normal ${muted}`}>/{product.unit_label}</span>
        </p>
      </div>

      {/* Qty controls */}
      <div className={`mt-auto border-t ${border} px-1.5 py-1.5 space-y-1`}>
        {isBulk && (
          <div className="flex gap-0.5">
            {BULK_PRESETS.map((n) => (
              <button key={n} onClick={() => handleQuickAdd(n)}
                className={`flex-1 rounded ${card} py-1 text-[10px] font-semibold ${muted} hover:text-amber-400 active:bg-amber-600/30`}
              >+{n}</button>
            ))}
          </div>
        )}

        <div className="flex items-center gap-0.5">
          <button onClick={() => handleQtyChange(-1)} disabled={cartQty <= 0}
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-md ${card} hover:bg-red-900/40 hover:text-red-300 disabled:opacity-20`}
          ><Minus className="size-5" /></button>

          <input
            type="text" inputMode="decimal"
            value={inputQty || (isInCart ? String(cartQty) : "")}
            onChange={(e) => setInputQty(e.target.value)}
            onFocus={() => setInputQty(isInCart ? String(cartQty) : "")}
            onBlur={() => { if (inputQty) handleInputSubmit(); }}
            onKeyDown={(e) => { if (e.key === "Enter") handleInputSubmit(); }}
            placeholder="0"
            className={`h-10 w-8 flex-1 rounded-md ${input} text-center text-xs font-semibold focus:border-amber-500/50 focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none`}
          />

          <button onClick={() => handleQtyChange(1)}
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-md ${card} hover:bg-green-900/40 hover:text-green-300`}
          ><Plus className="size-5" /></button>
        </div>
      </div>
    </div>
  );
}
