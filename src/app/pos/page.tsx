"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { LogOut, Minus, Package, Plus, Search, Trash2, X } from "lucide-react";
import { formatUsd } from "@/lib/format";

// ─── Types ────────────────────────────────────────────────────────

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
};

type LineItem = {
  id: string; // unique key for the line
  product: PosProduct;
  quantity: number;
  price_cents: number; // per unit override (for custom items)
  note?: string;
};

type PosCategory = { slug: string; name: string; count: number };

const TAX_RATE = 0.0875;
const CC_SURCHARGE = 0.03;

// ─── Component ────────────────────────────────────────────────────

export default function PosRegisterPage() {
  // Product catalog
  const [products, setProducts] = useState<PosProduct[]>([]);
  const [categories, setCategories] = useState<PosCategory[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Current sale
  const [items, setItems] = useState<LineItem[]>([]);
  const [customerName, setCustomerName] = useState("Walk-in");
  const [customerPhone, setCustomerPhone] = useState("");
  const [deliveryMethod, setDeliveryMethod] = useState<"pickup" | "delivery">("pickup");
  const [deliveryFeeCents, setDeliveryFeeCents] = useState(0);
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [orderNotes, setOrderNotes] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"card" | "cash" | null>(null);

  // UI state
  const [showNumpad, setShowNumpad] = useState<{ product: PosProduct; qty: string } | null>(null);
  const [showCashDialog, setShowCashDialog] = useState(false);
  const [cashTendered, setCashTendered] = useState("");
  const [showCustomItem, setShowCustomItem] = useState(false);
  const [customItemName, setCustomItemName] = useState("");
  const [customItemPrice, setCustomItemPrice] = useState("");
  const [processing, setProcessing] = useState(false);
  const [showNotes, setShowNotes] = useState(false);

  // Load products
  useEffect(() => {
    fetch("/api/pos/products")
      .then((r) => r.json())
      .then((data) => {
        setProducts(data.products || []);
        setCategories(data.categories || []);
      });
  }, []);

  // Filtered products
  const filteredProducts = useMemo(() => {
    let list = products;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      list = list.filter((p) => p.name.toLowerCase().includes(q) || p.slug.includes(q));
    } else if (selectedCategory) {
      list = list.filter((p) => p.category_slug === selectedCategory);
    }
    return list;
  }, [products, searchQuery, selectedCategory]);

  // Totals
  const subtotalCents = items.reduce((sum, item) => sum + item.price_cents * item.quantity, 0);
  const taxCents = Math.round(subtotalCents * TAX_RATE);
  const ccFeeCents = paymentMethod === "card" ? Math.round((subtotalCents + taxCents + deliveryFeeCents) * CC_SURCHARGE) : 0;
  const grandTotalCents = subtotalCents + taxCents + deliveryFeeCents + ccFeeCents;

  // ── Actions ──────────────────────────────────────────────────────

  const addItem = useCallback((product: PosProduct, qty: number = 1) => {
    setItems((prev) => {
      const existing = prev.find((i) => i.product.id === product.id);
      if (existing) {
        return prev.map((i) => i.product.id === product.id ? { ...i, quantity: i.quantity + qty } : i);
      }
      return [...prev, { id: crypto.randomUUID(), product, quantity: qty, price_cents: product.price_per_unit_cents }];
    });
  }, []);

  const removeItem = useCallback((id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
  }, []);

  const updateQuantity = useCallback((id: string, qty: number) => {
    if (qty <= 0) { removeItem(id); return; }
    setItems((prev) => prev.map((i) => i.id === id ? { ...i, quantity: qty } : i));
  }, [removeItem]);

  function clearSale() {
    if (items.length > 0 && !confirm("Clear current sale?")) return;
    setItems([]);
    setCustomerName("Walk-in");
    setCustomerPhone("");
    setDeliveryMethod("pickup");
    setDeliveryFeeCents(0);
    setDeliveryAddress("");
    setOrderNotes("");
    setPaymentMethod(null);
  }

  function addCustomItem() {
    if (!customItemName || !customItemPrice) return;
    const priceCents = Math.round(parseFloat(customItemPrice) * 100);
    if (isNaN(priceCents) || priceCents <= 0) return;

    const customProduct: PosProduct = {
      id: "custom-" + Date.now(),
      name: customItemName,
      slug: "custom",
      price_per_unit_cents: priceCents,
      unit_label: "ea",
      category_slug: "custom",
      category_name: "Custom",
      delivery_type: "non-bulk",
      min_qty: 1,
      qty_step: 1,
    };
    addItem(customProduct, 1);
    setCustomItemName("");
    setCustomItemPrice("");
    setShowCustomItem(false);
  }

  async function completeSale(method: "card" | "cash") {
    setProcessing(true);
    try {
      const res = await fetch("/api/pos/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: items.map((i) => ({
            product_id: i.product.id,
            product_name: i.product.name,
            product_slug: i.product.slug,
            quantity: i.quantity,
            unit_price_cents: i.price_cents,
            line_total_cents: i.price_cents * i.quantity,
          })),
          subtotal_cents: subtotalCents,
          tax_cents: taxCents,
          cc_fee_cents: ccFeeCents,
          delivery_fee_cents: deliveryFeeCents,
          grand_total_cents: grandTotalCents,
          payment_method: method === "card" ? "card_terminal" : "cash",
          delivery_method: deliveryMethod,
          delivery_address: deliveryMethod === "delivery" ? deliveryAddress : null,
          customer_name: customerName,
          customer_phone: customerPhone || null,
          notes: orderNotes || null,
          cash_tendered_cents: method === "cash" ? Math.round(parseFloat(cashTendered) * 100) : null,
        }),
      });

      if (res.ok) {
        // Sale complete — clear register
        setItems([]);
        setCustomerName("Walk-in");
        setCustomerPhone("");
        setDeliveryMethod("pickup");
        setDeliveryFeeCents(0);
        setDeliveryAddress("");
        setOrderNotes("");
        setPaymentMethod(null);
        setShowCashDialog(false);
        setCashTendered("");
      }
    } finally {
      setProcessing(false);
    }
  }

  // ── Keyboard shortcuts ───────────────────────────────────────────

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "F1") { e.preventDefault(); document.getElementById("pos-search")?.focus(); }
      if (e.key === "F2") { e.preventDefault(); if (items.length > 0) { setPaymentMethod("card"); completeSale("card"); } }
      if (e.key === "F3") { e.preventDefault(); if (items.length > 0) { setPaymentMethod("cash"); setShowCashDialog(true); } }
      if (e.key === "Escape") { setShowNumpad(null); setShowCashDialog(false); setShowCustomItem(false); setShowNotes(false); }
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items.length]);

  // ── Render ───────────────────────────────────────────────────────

  return (
    <div className="flex h-full">
      {/* ── LEFT: Product Catalog ── */}
      <div className="flex flex-1 flex-col border-r border-zinc-800">
        {/* Search */}
        <div className="border-b border-zinc-800 p-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-zinc-500" />
            <input
              id="pos-search"
              type="text"
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setSelectedCategory(null); }}
              placeholder="Search products... (F1)"
              className="w-full rounded-lg border border-zinc-700 bg-zinc-800 py-3 pl-10 pr-4 text-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300">
                <X className="h-5 w-5" />
              </button>
            )}
          </div>
        </div>

        {/* Categories */}
        <div className="flex flex-wrap gap-2 border-b border-zinc-800 p-3">
          {categories.map((cat) => (
            <button
              key={cat.slug}
              onClick={() => { setSelectedCategory(cat.slug === selectedCategory ? null : cat.slug); setSearchQuery(""); }}
              className={`rounded-lg px-4 py-2.5 text-sm font-medium transition-colors ${
                selectedCategory === cat.slug
                  ? "bg-amber-600 text-white"
                  : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
              }`}
            >
              {cat.name}
            </button>
          ))}
          <button
            onClick={() => setShowCustomItem(true)}
            className="rounded-lg bg-zinc-800 px-4 py-2.5 text-sm font-medium text-amber-400 hover:bg-zinc-700"
          >
            + Custom
          </button>
        </div>

        {/* Product grid */}
        <div className="flex-1 overflow-y-auto p-3">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
            {filteredProducts.map((product) => (
              <button
                key={product.id}
                onClick={() => {
                  if (product.delivery_type === "bulk") {
                    setShowNumpad({ product, qty: String(product.min_qty || 1) });
                  } else {
                    addItem(product);
                  }
                }}
                className="flex flex-col rounded-lg border border-zinc-800 bg-zinc-900 p-3 text-left transition-colors hover:border-amber-600/50 hover:bg-zinc-800"
              >
                <span className="text-xs text-zinc-500">{product.category_name}</span>
                <span className="mt-0.5 text-sm font-medium leading-tight">{product.name}</span>
                <span className="mt-auto pt-2 text-lg font-bold text-amber-400">
                  {formatUsd(product.price_per_unit_cents)}
                  <span className="text-xs font-normal text-zinc-500">/{product.unit_label}</span>
                </span>
              </button>
            ))}
          </div>
          {filteredProducts.length === 0 && (
            <div className="flex h-32 items-center justify-center text-zinc-500">
              {searchQuery ? "No products found" : "Select a category"}
            </div>
          )}
        </div>
      </div>

      {/* ── RIGHT: Current Sale ── */}
      <div className="flex w-[380px] flex-col bg-zinc-900">
        {/* Customer */}
        <div className="border-b border-zinc-800 p-3">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <input
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="w-full bg-transparent text-sm font-semibold focus:outline-none"
                placeholder="Customer name"
              />
              <input
                type="tel"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                className="w-full bg-transparent text-xs text-zinc-400 focus:outline-none"
                placeholder="Phone (optional)"
              />
            </div>
            <button onClick={() => window.location.href = "/pos/login"} className="text-zinc-500 hover:text-zinc-300" title="Sign out">
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Line items */}
        <div className="flex-1 overflow-y-auto">
          {items.length === 0 ? (
            <div className="flex h-full items-center justify-center text-zinc-600">
              <div className="text-center">
                <Package className="mx-auto h-10 w-10" />
                <p className="mt-2 text-sm">No items yet</p>
              </div>
            </div>
          ) : (
            <div className="divide-y divide-zinc-800">
              {items.map((item) => (
                <div key={item.id} className="flex items-center gap-2 px-3 py-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{item.product.name}</p>
                    <p className="text-xs text-zinc-500">
                      {formatUsd(item.price_cents)} × {item.quantity}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => updateQuantity(item.id, item.quantity - (item.product.qty_step || 1))} className="rounded bg-zinc-800 p-1 hover:bg-zinc-700">
                      <Minus className="h-3.5 w-3.5" />
                    </button>
                    <span className="w-10 text-center text-sm font-mono">{item.quantity}</span>
                    <button onClick={() => updateQuantity(item.id, item.quantity + (item.product.qty_step || 1))} className="rounded bg-zinc-800 p-1 hover:bg-zinc-700">
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <span className="w-20 text-right text-sm font-semibold">
                    {formatUsd(item.price_cents * item.quantity)}
                  </span>
                  <button onClick={() => removeItem(item.id)} className="text-zinc-600 hover:text-red-400">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Notes */}
        {showNotes && (
          <div className="border-t border-zinc-800 p-3">
            <textarea
              value={orderNotes}
              onChange={(e) => setOrderNotes(e.target.value)}
              placeholder="Order notes (delivery instructions, etc.)"
              rows={2}
              className="w-full rounded border border-zinc-700 bg-zinc-800 p-2 text-sm focus:outline-none focus:ring-1 focus:ring-amber-500"
            />
          </div>
        )}

        {/* Delivery / Pickup */}
        <div className="border-t border-zinc-800 p-3">
          <div className="flex gap-2">
            <button
              onClick={() => { setDeliveryMethod("pickup"); setDeliveryFeeCents(0); }}
              className={`flex-1 rounded-lg py-2 text-sm font-semibold ${deliveryMethod === "pickup" ? "bg-amber-600 text-white" : "bg-zinc-800 text-zinc-400"}`}
            >
              Pickup
            </button>
            <button
              onClick={() => setDeliveryMethod("delivery")}
              className={`flex-1 rounded-lg py-2 text-sm font-semibold ${deliveryMethod === "delivery" ? "bg-amber-600 text-white" : "bg-zinc-800 text-zinc-400"}`}
            >
              Delivery
            </button>
            <button onClick={() => setShowNotes(!showNotes)} className="rounded-lg bg-zinc-800 px-3 text-xs text-zinc-400 hover:bg-zinc-700">
              Notes
            </button>
          </div>
          {deliveryMethod === "delivery" && (
            <div className="mt-2 space-y-2">
              <input
                type="text"
                value={deliveryAddress}
                onChange={(e) => setDeliveryAddress(e.target.value)}
                placeholder="Delivery address"
                className="w-full rounded border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
              <div className="flex items-center gap-2">
                <span className="text-xs text-zinc-500">Fee: $</span>
                <input
                  type="number"
                  value={deliveryFeeCents / 100 || ""}
                  onChange={(e) => setDeliveryFeeCents(Math.round(parseFloat(e.target.value || "0") * 100))}
                  placeholder="0"
                  className="w-20 rounded border border-zinc-700 bg-zinc-800 px-2 py-1 text-sm focus:outline-none"
                  step="5"
                />
                <button onClick={() => setDeliveryFeeCents(0)} className="text-xs text-amber-400 hover:underline">FREE</button>
              </div>
            </div>
          )}
        </div>

        {/* Totals */}
        <div className="border-t border-zinc-800 px-3 py-2 text-sm">
          <div className="flex justify-between"><span className="text-zinc-400">Subtotal</span><span>{formatUsd(subtotalCents)}</span></div>
          <div className="flex justify-between"><span className="text-zinc-400">Tax (8.75%)</span><span>{formatUsd(taxCents)}</span></div>
          {deliveryFeeCents > 0 && <div className="flex justify-between"><span className="text-zinc-400">Delivery</span><span>{formatUsd(deliveryFeeCents)}</span></div>}
          {paymentMethod === "card" && <div className="flex justify-between"><span className="text-zinc-400">CC Fee (3%)</span><span>{formatUsd(ccFeeCents)}</span></div>}
          <div className="mt-1 flex justify-between border-t border-zinc-700 pt-1 text-lg font-bold">
            <span>TOTAL</span><span className="text-amber-400">{formatUsd(grandTotalCents)}</span>
          </div>
        </div>

        {/* Action buttons */}
        <div className="border-t border-zinc-800 p-3 space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => { setPaymentMethod("card"); completeSale("card"); }}
              disabled={items.length === 0 || processing}
              className="rounded-lg bg-green-700 py-3 text-sm font-bold text-white hover:bg-green-600 disabled:opacity-30"
            >
              PAY — CARD (F2)
            </button>
            <button
              onClick={() => { setPaymentMethod("cash"); setShowCashDialog(true); }}
              disabled={items.length === 0 || processing}
              className="rounded-lg bg-blue-700 py-3 text-sm font-bold text-white hover:bg-blue-600 disabled:opacity-30"
            >
              PAY — CASH (F3)
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button onClick={clearSale} className="rounded-lg bg-zinc-800 py-2 text-sm text-zinc-400 hover:bg-zinc-700">
              Cancel
            </button>
            <button onClick={() => alert("Hold order — coming soon")} disabled={items.length === 0} className="rounded-lg bg-zinc-800 py-2 text-sm text-zinc-400 hover:bg-zinc-700 disabled:opacity-30">
              Hold Order
            </button>
          </div>
        </div>
      </div>

      {/* ── OVERLAYS ── */}

      {/* Numpad */}
      {showNumpad && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70" onClick={() => setShowNumpad(null)}>
          <div className="w-72 rounded-2xl bg-zinc-900 p-6" onClick={(e) => e.stopPropagation()}>
            <p className="text-sm text-zinc-400">{showNumpad.product.name}</p>
            <p className="text-xs text-zinc-500">{formatUsd(showNumpad.product.price_per_unit_cents)} / {showNumpad.product.unit_label}</p>
            <div className="my-4 text-center">
              <span className="text-4xl font-bold">{showNumpad.qty || "0"}</span>
              <span className="ml-1 text-lg text-zinc-500">{showNumpad.product.unit_label}</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {["7","8","9","4","5","6","1","2","3",".","0","⌫"].map((key) => (
                <button
                  key={key}
                  onClick={() => {
                    if (key === "⌫") setShowNumpad({ ...showNumpad, qty: showNumpad.qty.slice(0, -1) });
                    else setShowNumpad({ ...showNumpad, qty: showNumpad.qty + key });
                  }}
                  className="rounded-lg bg-zinc-800 py-3 text-lg font-semibold hover:bg-zinc-700"
                >
                  {key}
                </button>
              ))}
            </div>
            <button
              onClick={() => {
                const qty = parseFloat(showNumpad.qty);
                if (qty > 0) addItem(showNumpad.product, qty);
                setShowNumpad(null);
              }}
              className="mt-3 w-full rounded-lg bg-amber-600 py-3 font-bold text-white hover:bg-amber-500"
            >
              Add to Sale
            </button>
          </div>
        </div>
      )}

      {/* Cash dialog */}
      {showCashDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70" onClick={() => setShowCashDialog(false)}>
          <div className="w-80 rounded-2xl bg-zinc-900 p-6" onClick={(e) => e.stopPropagation()}>
            <p className="text-lg font-bold">Cash Payment</p>
            <p className="mt-2 text-2xl font-bold text-amber-400">
              Total: {formatUsd(subtotalCents + taxCents + deliveryFeeCents)}
            </p>
            <p className="text-xs text-zinc-500">(No CC surcharge for cash)</p>
            <div className="mt-4">
              <label className="text-sm text-zinc-400">Cash tendered:</label>
              <input
                type="number"
                value={cashTendered}
                onChange={(e) => setCashTendered(e.target.value)}
                className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-3 text-2xl font-bold focus:outline-none focus:ring-2 focus:ring-amber-500"
                autoFocus
                step="0.01"
              />
            </div>
            {cashTendered && parseFloat(cashTendered) * 100 >= subtotalCents + taxCents + deliveryFeeCents && (
              <p className="mt-2 text-lg font-semibold text-green-400">
                Change: {formatUsd(Math.round(parseFloat(cashTendered) * 100) - (subtotalCents + taxCents + deliveryFeeCents))}
              </p>
            )}
            <button
              onClick={() => completeSale("cash")}
              disabled={!cashTendered || parseFloat(cashTendered) * 100 < subtotalCents + taxCents + deliveryFeeCents || processing}
              className="mt-4 w-full rounded-lg bg-green-700 py-3 font-bold text-white hover:bg-green-600 disabled:opacity-30"
            >
              {processing ? "Processing..." : "Complete Sale"}
            </button>
          </div>
        </div>
      )}

      {/* Custom item */}
      {showCustomItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70" onClick={() => setShowCustomItem(false)}>
          <div className="w-80 rounded-2xl bg-zinc-900 p-6" onClick={(e) => e.stopPropagation()}>
            <p className="text-lg font-bold">Custom Item</p>
            <div className="mt-4 space-y-3">
              <input
                type="text"
                value={customItemName}
                onChange={(e) => setCustomItemName(e.target.value)}
                placeholder="Item name"
                className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 focus:outline-none focus:ring-1 focus:ring-amber-500"
                autoFocus
              />
              <input
                type="number"
                value={customItemPrice}
                onChange={(e) => setCustomItemPrice(e.target.value)}
                placeholder="Price ($)"
                className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 focus:outline-none focus:ring-1 focus:ring-amber-500"
                step="0.01"
              />
            </div>
            <button
              onClick={addCustomItem}
              disabled={!customItemName || !customItemPrice}
              className="mt-4 w-full rounded-lg bg-amber-600 py-3 font-bold text-white hover:bg-amber-500 disabled:opacity-30"
            >
              Add to Sale
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
