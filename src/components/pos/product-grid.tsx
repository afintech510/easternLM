"use client";

import { useMemo, useState, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { Calculator, Plus, Search, X, Lock, LockOpen, GripVertical, Check } from "lucide-react";
import { formatUsd } from "@/lib/format";
import {
  DndContext, closestCenter, PointerSensor, TouchSensor,
  useSensor, useSensors, type DragEndEvent,
} from "@dnd-kit/core";
import { SortableContext, rectSortingStrategy, useSortable, arrayMove } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

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

const BULK_PRESETS = [3, 5, 10];
const GRID_OPTIONS = [5, 6, 7, 8, 9, 10] as const;

export function POSProductGrid({ products, categories, cartQtys, onAddProduct, onSetQty, onOpenCalculator, onOpenNewLead, theme: t }: Props) {
  const [search, setSearch] = useState("");
  const [selectedCat, setSelectedCat] = useState<string | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [reorderedIds, setReorderedIds] = useState<string[] | null>(null);
  const [saving, setSaving] = useState(false);
  const [gridCols, setGridCols] = useState<number>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("pos-grid-cols");
      return saved ? parseInt(saved) : 5;
    }
    return 5;
  });

  const filtered = useMemo(() => {
    let list = products;
    if (selectedCat) list = list.filter((p) => p.category_slug === selectedCat);
    if (search) {
      const q = search.toLowerCase();
      list = list.filter((p) =>
        p.name.toLowerCase().includes(q) ||
        p.category_name.toLowerCase().includes(q) ||
        (p.slug && p.slug.includes(q)) ||
        ((p as any).barcode && (p as any).barcode.includes(q)) ||
        ((p as any).sku && (p as any).sku.toLowerCase().includes(q))
      );
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

  // DnD sensors — pointer needs distance, touch needs long-press
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } }),
  );

  // Apply reorder if in edit mode
  const displayProducts = useMemo(() => {
    if (!editMode || !reorderedIds) return filtered;
    const idOrder = new Map(reorderedIds.map((id, i) => [id, i]));
    return [...filtered].sort((a, b) => {
      const ai = idOrder.get(a.id) ?? 9999;
      const bi = idOrder.get(b.id) ?? 9999;
      return ai - bi;
    });
  }, [filtered, editMode, reorderedIds]);

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const ids = displayProducts.map((p) => p.id);
    const oldIndex = ids.indexOf(active.id as string);
    const newIndex = ids.indexOf(over.id as string);
    if (oldIndex === -1 || newIndex === -1) return;
    setReorderedIds(arrayMove(ids, oldIndex, newIndex));
  }

  function startEditMode() {
    setReorderedIds(filtered.map((p) => p.id));
    setEditMode(true);
  }

  function cancelEditMode() {
    setEditMode(false);
    setReorderedIds(null);
  }

  async function saveOrder() {
    if (!reorderedIds) return;
    setSaving(true);
    await fetch("/api/pos/product-order", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ order: reorderedIds }),
    });
    setSaving(false);
    setEditMode(false);
    setReorderedIds(null);
  }

  return (
    <div className="flex h-full flex-col">
      {/* Edit mode banner */}
      {editMode && (
        <div className="flex items-center justify-between bg-amber-600/20 border-b border-amber-600/40 px-3 py-2">
          <span className="flex items-center gap-2 text-xs font-semibold text-amber-400">
            <LockOpen className="size-4" /> Drag tiles to reorder
          </span>
          <div className="flex gap-2">
            <button onClick={saveOrder} disabled={saving} className="flex items-center gap-1 rounded-md bg-green-600 px-3 py-1 text-xs font-semibold text-white hover:bg-green-500 disabled:opacity-50">
              <Check className="size-3.5" /> {saving ? "Saving..." : "Save Order"}
            </button>
            <button onClick={cancelEditMode} className="rounded-md border border-zinc-600 px-3 py-1 text-xs text-zinc-400 hover:bg-zinc-800">Cancel</button>
          </div>
        </div>
      )}

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
          {/* Lock/unlock reorder */}
          <button
            onClick={() => editMode ? cancelEditMode() : startEditMode()}
            className={`shrink-0 rounded-lg p-2 transition-colors ${editMode ? "bg-amber-500/20 text-amber-400" : `${card} ${muted} ${hover}`}`}
            title={editMode ? "Editing tile order" : "Reorder tiles"}
          >
            {editMode ? <LockOpen className="size-5" /> : <Lock className="size-5" />}
          </button>
          {/* Grid column selector */}
          <div className="flex items-center gap-0.5 shrink-0">
            {GRID_OPTIONS.map((n) => (
              <button
                key={n}
                onClick={() => { setGridCols(n); localStorage.setItem("pos-grid-cols", String(n)); }}
                className={`size-6 rounded text-[10px] font-bold ${gridCols === n ? "bg-amber-600 text-white" : `${card} ${muted} hover:text-amber-400`}`}
                title={`${n} columns`}
              >
                {n}
              </button>
            ))}
          </div>
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
        {editMode ? (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={displayProducts.map((p) => p.id)} strategy={rectSortingStrategy}>
              <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${gridCols}, minmax(0, 1fr))` }}>
                {displayProducts.map((product) => (
                  <SortableTile key={product.id} product={product} card={card} border={border} muted={muted} />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        ) : (
          <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${gridCols}, minmax(0, 1fr))` }}>
            {displayProducts.map((product) => (
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
        )}
        {displayProducts.length === 0 && (
          <div className={`py-16 text-center text-sm ${muted}`}>No products found</div>
        )}
      </div>
    </div>
  );
}

/** Sortable tile wrapper for edit mode */
function SortableTile({ product, card, border, muted }: { product: PosProduct; card: string; border: string; muted: string }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: product.id });
  const { material } = parseName(product.name);
  const showImage = product.image_url;
  const [imgErr, setImgErr] = useState(false);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 50 : "auto" as const,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`relative flex flex-col rounded-lg border-2 border-dashed border-amber-500/50 cursor-grab active:cursor-grabbing ${card} ${isDragging ? "ring-2 ring-amber-400 shadow-lg" : ""}`}
    >
      <div className="absolute right-1 top-1 z-10 text-amber-400/60">
        <GripVertical className="size-4" />
      </div>
      <div className={`aspect-[5/4] w-full overflow-hidden rounded-t-lg ${card}`}>
        {showImage && !imgErr ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={product.image_url!} alt="" className="h-full w-full object-cover" onError={() => setImgErr(true)} />
        ) : (
          <div className={`flex h-full items-center justify-center text-2xl font-bold ${muted}`}>{product.name.charAt(0)}</div>
        )}
      </div>
      <div className="px-2 py-1.5">
        <p className="text-sm font-semibold leading-tight line-clamp-2">{material}</p>
        <p className={`text-xs ${muted}`}>{formatUsd(product.price_per_unit_cents)}/{product.unit_label}</p>
      </div>
    </div>
  );
}

/** Parse product name into material name + size spec */
function parseName(name: string): { material: string; size: string } {
  // Common size patterns: 3/4", 1/2", 3/8", 18x18", 3'x100', etc.
  const sizePatterns = [
    /^(\d[\d\/]*["']\s*(?:x\s*\d[\d\/]*["'])?\s*)/i, // leading: 3/4" or 18x18"
    /(\d[\d\/]*["']\s*(?:x\s*\d[\d\/]*["'])?)\s*$/i,   // trailing
    /^(\d+\s*(?:yard|yd|ft|lb|oz|gal|pk|bag|roll|ton|each)s?\b)/i,
  ];

  for (const pat of sizePatterns) {
    const m = name.match(pat);
    if (m) {
      const size = m[1].trim();
      const material = name.replace(m[1], "").replace(/^[\s\-–—,]+|[\s\-–—,]+$/g, "").trim();
      return { material: material || name, size };
    }
  }

  // Try to split on " - " separator
  const dashParts = name.split(/\s*[-–—]\s*/);
  if (dashParts.length >= 2) {
    // Check which part looks like a size
    const sizeIdx = dashParts.findIndex(p => /\d/.test(p) && /["'x×]/.test(p));
    if (sizeIdx >= 0) {
      const size = dashParts.splice(sizeIdx, 1)[0];
      return { material: dashParts.join(" - "), size };
    }
    return { material: dashParts[0], size: dashParts.slice(1).join(" ") };
  }

  return { material: name, size: "" };
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
  const { material, size } = parseName(product.name);

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
  const priceWhole = Math.floor(product.price_per_unit_cents / 100);
  const priceCents = product.price_per_unit_cents % 100;
  const priceStr = priceCents === 0 ? `$${priceWhole}` : formatUsd(product.price_per_unit_cents);
  const unitShort = product.unit_label.replace("per cubic yard", "yd").replace("cubic yard", "yd").replace("yard", "yd").replace("each", "ea").replace("bag", "bag");

  return (
    <div className={`relative flex flex-col rounded-lg border transition-colors ${
      isInCart ? "border-green-500/60 bg-green-950/20" : `${border} ${card}`
    }`}>
      {/* Qty badge — click to remove from cart */}
      {isInCart && (
        <button
          onClick={(e) => { e.stopPropagation(); onSetQty(0); }}
          className="absolute -right-1 -top-1 z-10 flex size-6 items-center justify-center rounded-full bg-green-500 text-[11px] font-bold text-white shadow hover:bg-red-500 active:scale-90 transition-colors"
          title="Click to remove from cart"
        >
          {cartQty}
        </button>
      )}

      {/* Image */}
      <div className={`aspect-[5/4] w-full overflow-hidden rounded-t-lg ${card}`}>
        {showImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={product.image_url!} alt="" className="h-full w-full object-cover" onError={() => setImgError(true)} />
        ) : (
          <div className={`flex h-full items-center justify-center text-2xl font-bold ${muted}`}>
            {product.name.charAt(0)}
          </div>
        )}
      </div>

      {/* Material name + size/price row */}
      <div className="flex flex-col px-2 pt-1.5 pb-1">
        <p className="text-sm font-semibold leading-tight line-clamp-2">{material}</p>
        <div className="mt-0.5 flex items-baseline justify-between">
          <span className={`text-[11px] ${muted}`}>{size}</span>
          <span className={`text-sm font-bold ${accent}`}>
            {priceStr} <span className={`text-[10px] font-normal ${muted}`}>{unitShort}</span>
          </span>
        </div>
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
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-md ${card} text-lg hover:bg-red-900/40 hover:text-red-300 disabled:opacity-20`}
          >−</button>

          <input
            type="text" inputMode="decimal"
            value={inputQty || (isInCart ? String(cartQty) : "")}
            onChange={(e) => setInputQty(e.target.value)}
            onFocus={() => setInputQty(isInCart ? String(cartQty) : "")}
            onBlur={() => { if (inputQty) handleInputSubmit(); }}
            onKeyDown={(e) => { if (e.key === "Enter") handleInputSubmit(); }}
            placeholder="0"
            className={`h-9 w-8 flex-1 rounded-md ${input} text-center text-sm font-semibold focus:border-amber-500/50 focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none`}
          />

          <button onClick={() => handleQtyChange(1)}
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-md ${card} text-lg hover:bg-green-900/40 hover:text-green-300`}
          >+</button>
        </div>
      </div>
    </div>
  );
}
