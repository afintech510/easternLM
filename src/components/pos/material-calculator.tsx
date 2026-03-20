"use client";

import { useState, useMemo } from "react";
import { X, Plus, Trash2, Circle, Square, Search } from "lucide-react";
import { formatUsd } from "@/lib/format";

type Product = {
  id: string;
  name: string;
  slug: string;
  price_per_unit_cents: number;
  unit_label: string;
  category_name: string;
  delivery_type: string;
};

interface Area {
  id: string;
  type: "rect" | "circle";
  // Rectangle
  length: string;
  width: string;
  // Circle
  diameter: string;
  // Shared
  depth: string;
}

function newArea(type: "rect" | "circle"): Area {
  return {
    id: crypto.randomUUID(),
    type,
    length: "",
    width: "",
    diameter: "",
    depth: "",
  };
}

function calcAreaSqFt(area: Area): number {
  if (area.type === "rect") {
    const l = parseFloat(area.length) || 0;
    const w = parseFloat(area.width) || 0;
    return l * w;
  }
  const d = parseFloat(area.diameter) || 0;
  return Math.PI * (d / 2) ** 2;
}

function calcYards(areas: Area[], compactionPct: number): number {
  let totalCuFt = 0;
  for (const area of areas) {
    const sqFt = calcAreaSqFt(area);
    const depthIn = parseFloat(area.depth) || 0;
    totalCuFt += sqFt * (depthIn / 12);
  }
  const yards = totalCuFt / 27;
  return yards * (1 + compactionPct / 100);
}

interface Props {
  products: Product[];
  onAddToCart: (product: Product, qty: number) => void;
  onClose: () => void;
}

export function MaterialCalculator({ products, onAddToCart, onClose }: Props) {
  const [areas, setAreas] = useState<Area[]>([newArea("rect")]);
  const [compaction, setCompaction] = useState(0);
  const [productSearch, setProductSearch] = useState("");
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [showProductDropdown, setShowProductDropdown] = useState(false);

  // Filter to bulk products only (sold per yard/ton)
  const bulkProducts = useMemo(
    () =>
      products.filter(
        (p) =>
          p.delivery_type === "bulk" ||
          p.unit_label.toLowerCase().includes("yard") ||
          p.unit_label.toLowerCase().includes("ton")
      ),
    [products]
  );

  const filteredProducts = useMemo(() => {
    if (!productSearch.trim()) return bulkProducts.slice(0, 15);
    const q = productSearch.toLowerCase();
    return bulkProducts
      .filter((p) => p.name.toLowerCase().includes(q) || p.category_name.toLowerCase().includes(q))
      .slice(0, 15);
  }, [bulkProducts, productSearch]);

  const totalSqFt = areas.reduce((s, a) => s + calcAreaSqFt(a), 0);
  const totalYards = calcYards(areas, compaction);
  const roundedYards = Math.ceil(totalYards);
  const totalCost = selectedProduct ? roundedYards * selectedProduct.price_per_unit_cents : 0;

  function updateArea(id: string, updates: Partial<Area>) {
    setAreas((prev) => prev.map((a) => (a.id === id ? { ...a, ...updates } : a)));
  }

  function removeArea(id: string) {
    setAreas((prev) => (prev.length <= 1 ? prev : prev.filter((a) => a.id !== id)));
  }

  function handleAddToCart() {
    if (!selectedProduct || roundedYards <= 0) return;
    onAddToCart(selectedProduct, roundedYards);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="relative w-full max-w-lg rounded-2xl border border-zinc-700 bg-zinc-900 shadow-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-800 px-5 py-4">
          <h2 className="text-lg font-semibold text-zinc-100">Material Calculator</h2>
          <button onClick={onClose} className="text-zinc-500 hover:text-zinc-300">
            <X className="size-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
          {/* Areas */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-zinc-300">Measurement Areas</p>
              <div className="flex gap-1">
                <button
                  onClick={() => setAreas((p) => [...p, newArea("rect")])}
                  className="flex items-center gap-1 rounded-md border border-zinc-700 px-2 py-1 text-xs text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
                >
                  <Square className="size-3" /> Rectangle
                </button>
                <button
                  onClick={() => setAreas((p) => [...p, newArea("circle")])}
                  className="flex items-center gap-1 rounded-md border border-zinc-700 px-2 py-1 text-xs text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
                >
                  <Circle className="size-3" /> Circle
                </button>
              </div>
            </div>

            {areas.map((area, i) => (
              <div
                key={area.id}
                className="rounded-lg border border-zinc-800 bg-zinc-800/50 p-3 space-y-2"
              >
                <div className="flex items-center justify-between">
                  <p className="text-xs font-medium text-zinc-400">
                    {area.type === "rect" ? "Rectangle" : "Circle"} {areas.length > 1 ? `#${i + 1}` : ""}
                  </p>
                  {areas.length > 1 && (
                    <button onClick={() => removeArea(area.id)} className="text-zinc-600 hover:text-red-400">
                      <Trash2 className="size-3.5" />
                    </button>
                  )}
                </div>

                <div className="grid gap-2 grid-cols-3">
                  {area.type === "rect" ? (
                    <>
                      <div>
                        <label className="mb-0.5 block text-[10px] text-zinc-500">Length (ft)</label>
                        <input
                          type="number"
                          value={area.length}
                          onChange={(e) => updateArea(area.id, { length: e.target.value })}
                          placeholder="0"
                          className="w-full rounded border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-sm text-zinc-100 focus:outline-none focus:ring-1 focus:ring-amber-500"
                        />
                      </div>
                      <div>
                        <label className="mb-0.5 block text-[10px] text-zinc-500">Width (ft)</label>
                        <input
                          type="number"
                          value={area.width}
                          onChange={(e) => updateArea(area.id, { width: e.target.value })}
                          placeholder="0"
                          className="w-full rounded border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-sm text-zinc-100 focus:outline-none focus:ring-1 focus:ring-amber-500"
                        />
                      </div>
                    </>
                  ) : (
                    <div className="col-span-2">
                      <label className="mb-0.5 block text-[10px] text-zinc-500">Diameter (ft)</label>
                      <input
                        type="number"
                        value={area.diameter}
                        onChange={(e) => updateArea(area.id, { diameter: e.target.value })}
                        placeholder="0"
                        className="w-full rounded border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-sm text-zinc-100 focus:outline-none focus:ring-1 focus:ring-amber-500"
                      />
                    </div>
                  )}
                  <div>
                    <label className="mb-0.5 block text-[10px] text-zinc-500">Depth (in)</label>
                    <input
                      type="number"
                      value={area.depth}
                      onChange={(e) => updateArea(area.id, { depth: e.target.value })}
                      placeholder="0"
                      className="w-full rounded border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-sm text-zinc-100 focus:outline-none focus:ring-1 focus:ring-amber-500"
                    />
                  </div>
                </div>

                {calcAreaSqFt(area) > 0 && (
                  <p className="text-[10px] text-zinc-500">
                    {calcAreaSqFt(area).toFixed(1)} sq ft
                  </p>
                )}
              </div>
            ))}
          </div>

          {/* Compaction slider */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-sm font-medium text-zinc-300">Compaction Extra</label>
              <span className="text-sm font-semibold text-amber-400">{compaction}%</span>
            </div>
            <input
              type="range"
              min={0}
              max={10}
              step={1}
              value={compaction}
              onChange={(e) => setCompaction(parseInt(e.target.value))}
              className="w-full accent-amber-500"
            />
            <div className="flex justify-between text-[10px] text-zinc-600">
              <span>0%</span>
              <span>5%</span>
              <span>10%</span>
            </div>
          </div>

          {/* Totals */}
          <div className="rounded-lg border border-zinc-700 bg-zinc-800/80 px-4 py-3">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-[10px] text-zinc-500">Total Area</p>
                <p className="text-lg font-bold text-zinc-100">{totalSqFt.toFixed(0)}</p>
                <p className="text-[10px] text-zinc-500">sq ft</p>
              </div>
              <div>
                <p className="text-[10px] text-zinc-500">Cubic Yards</p>
                <p className="text-lg font-bold text-amber-400">{totalYards.toFixed(2)}</p>
                <p className="text-[10px] text-zinc-500">{compaction > 0 ? `incl. ${compaction}%` : "exact"}</p>
              </div>
              <div>
                <p className="text-[10px] text-zinc-500">Order Qty</p>
                <p className="text-lg font-bold text-zinc-100">{roundedYards}</p>
                <p className="text-[10px] text-zinc-500">yards</p>
              </div>
            </div>
          </div>

          {/* Material search */}
          <div className="relative">
            <label className="mb-1 block text-sm font-medium text-zinc-300">Select Material</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-500" />
              <input
                type="text"
                value={selectedProduct ? selectedProduct.name : productSearch}
                onChange={(e) => {
                  setProductSearch(e.target.value);
                  setSelectedProduct(null);
                  setShowProductDropdown(true);
                }}
                onFocus={() => setShowProductDropdown(true)}
                placeholder="Search mulch, gravel, stone, topsoil..."
                className="w-full rounded-lg border border-zinc-700 bg-zinc-800 py-2.5 pl-9 pr-8 text-sm text-zinc-100 focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
              {selectedProduct && (
                <button
                  onClick={() => { setSelectedProduct(null); setProductSearch(""); }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
                >
                  <X className="size-4" />
                </button>
              )}
            </div>

            {showProductDropdown && !selectedProduct && (
              <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-48 overflow-y-auto rounded-lg border border-zinc-700 bg-zinc-900 shadow-xl">
                {filteredProducts.length === 0 ? (
                  <p className="px-3 py-2 text-xs text-zinc-500">No bulk materials found</p>
                ) : (
                  filteredProducts.map((p) => (
                    <button
                      key={p.id}
                      className="flex w-full items-center justify-between border-b border-zinc-800 px-3 py-2 text-left hover:bg-zinc-800 last:border-0"
                      onClick={() => {
                        setSelectedProduct(p);
                        setProductSearch("");
                        setShowProductDropdown(false);
                      }}
                    >
                      <div>
                        <p className="text-sm text-zinc-100">{p.name}</p>
                        <p className="text-[10px] text-zinc-500">{p.category_name}</p>
                      </div>
                      <p className="text-sm font-semibold text-amber-400">
                        {formatUsd(p.price_per_unit_cents)}/{p.unit_label}
                      </p>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Price summary */}
          {selectedProduct && roundedYards > 0 && (
            <div className="rounded-lg border border-amber-600/30 bg-amber-900/20 px-4 py-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-amber-300">{selectedProduct.name}</p>
                  <p className="text-xs text-zinc-400">
                    {roundedYards} {selectedProduct.unit_label} × {formatUsd(selectedProduct.price_per_unit_cents)}
                  </p>
                </div>
                <p className="text-xl font-bold text-amber-300">{formatUsd(totalCost)}</p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-zinc-800 px-5 py-4 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 rounded-lg border border-zinc-700 py-2.5 text-sm font-medium text-zinc-400 hover:bg-zinc-800"
          >
            Cancel
          </button>
          <button
            onClick={handleAddToCart}
            disabled={!selectedProduct || roundedYards <= 0}
            className="flex-1 rounded-lg bg-amber-600 py-2.5 text-sm font-semibold text-white hover:bg-amber-500 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Add {roundedYards > 0 ? `${roundedYards} yd` : ""} to Cart
          </button>
        </div>
      </div>
    </div>
  );
}
