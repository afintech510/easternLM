"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Calculator,
  Calendar,
  CreditCard,
  LogOut,
  MapPin,
  Minus,
  Package,
  Plus,
  Search,
  Trash2,
  Truck,
  UserPlus,
  Users,
  Wifi,
  X,
} from "lucide-react";

declare global {
  interface Window {
    google: any;
  }
}
import { formatUsd } from "@/lib/format";
import { PosTerminal } from "@/lib/pos/terminal";
import { ReceiptPrinter } from "@/lib/pos/printer";

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
  order_count?: number;
  image_url?: string;
};

type LineItem = {
  id: string; // unique key for the line
  product: PosProduct;
  quantity: number;
  price_cents: number; // per unit override (for custom items)
  note?: string;
};

type PosCategory = { slug: string; name: string; count: number };

type MiddleTab = "calculator" | "delivery" | "customer";

type RouteInfo = {
  roundTripMiles: number;
  roundTripMinutes: number;
};

const TAX_RATE = 0.0875;
const CC_SURCHARGE = 0.03;

const TIME_WINDOWS = [
  { value: "morning", label: "Morning (7 AM - 10 AM)" },
  { value: "midday", label: "Mid-day (10 AM - 1 PM)" },
  { value: "afternoon", label: "Afternoon (1 PM - 4 PM)" },
  { value: "flexible", label: "Flexible" },
];

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

  // Middle column state
  const [middleTab, setMiddleTab] = useState<MiddleTab>("calculator");
  const [calcLength, setCalcLength] = useState("");
  const [calcWidth, setCalcWidth] = useState("");
  const [calcDepth, setCalcDepth] = useState("");

  // Delivery form state
  const [delName, setDelName] = useState("");
  const [delEmail, setDelEmail] = useState("");
  const [delPhone, setDelPhone] = useState("");
  const [delAddress, setDelAddress] = useState("");
  const [delDate, setDelDate] = useState("");
  const [delTimeWindow, setDelTimeWindow] = useState("flexible");
  const [delNotes, setDelNotes] = useState("");
  const [routeInfo, setRouteInfo] = useState<RouteInfo | null>(null);
  const [googleLoaded, setGoogleLoaded] = useState(false);
  const addressInputRef = useRef<HTMLInputElement>(null);

  // Customer tab state
  const [custSearch, setCustSearch] = useState("");
  const [custResults, setCustResults] = useState<Array<{ id: string; first_name: string | null; last_name: string | null; phone: string | null; email: string | null; address: string | null; city: string | null; total_orders: number; total_spent_cents: number; tags: string[] }>>([]);
  const [custSearching, setCustSearching] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<typeof custResults[0] | null>(null);
  const [showNewCustomer, setShowNewCustomer] = useState(false);
  const [newCustName, setNewCustName] = useState("");
  const [newCustPhone, setNewCustPhone] = useState("");
  const [newCustEmail, setNewCustEmail] = useState("");
  const [newCustAddress, setNewCustAddress] = useState("");
  const [showLeadForm, setShowLeadForm] = useState(false);
  const [leadServiceType, setLeadServiceType] = useState("");
  const [leadDescription, setLeadDescription] = useState("");
  const [leadTimeline, setLeadTimeline] = useState("within-2-weeks");
  const [leadSaving, setLeadSaving] = useState(false);

  // UI state
  const [showNumpad, setShowNumpad] = useState<{ product: PosProduct; qty: string } | null>(null);
  const [showCashDialog, setShowCashDialog] = useState(false);
  const [cashTendered, setCashTendered] = useState("");
  const [showCustomItem, setShowCustomItem] = useState(false);
  const [customItemName, setCustomItemName] = useState("");
  const [customItemPrice, setCustomItemPrice] = useState("");
  const [processing, setProcessing] = useState(false);
  const [showNotes, setShowNotes] = useState(false);
  const [terminalStatus, setTerminalStatus] = useState<"disconnected" | "simulated" | "connected">("disconnected");
  const [cardPaymentStatus, setCardPaymentStatus] = useState<string | null>(null);
  const [autoPrint, setAutoPrint] = useState(true);
  const [autoDrawer, setAutoDrawer] = useState(true);
  const [printerConnected, setPrinterConnected] = useState(false);
  const terminalRef = useRef(new PosTerminal());
  const printerRef = useRef(new ReceiptPrinter());

  // Load products
  useEffect(() => {
    fetch("/api/pos/products")
      .then((r) => r.json())
      .then((data) => {
        setProducts(data.products || []);
        setCategories(data.categories || []);
      });
    // Auto-connect simulated reader in test mode
    terminalRef.current.useSimulated();
    setTerminalStatus("simulated");
  }, []);

  // When delivery method switches to "delivery", auto-switch middle tab
  useEffect(() => {
    if (deliveryMethod === "delivery") {
      setMiddleTab("delivery");
    }
  }, [deliveryMethod]);

  // Load Google Maps script
  useEffect(() => {
    if (typeof window !== "undefined" && (window as any).google) {
      setGoogleLoaded(true);
      return;
    }
    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=REDACTED_GOOGLE_MAPS_KEY&libraries=places`;
    script.async = true;
    script.onload = () => setGoogleLoaded(true);
    document.head.appendChild(script);
  }, []);

  // Attach Google Places autocomplete to address input
  useEffect(() => {
    if (!googleLoaded || !addressInputRef.current || !(window as any).google) return;
    const autocomplete = new (window as any).google.maps.places.Autocomplete(addressInputRef.current, {
      componentRestrictions: { country: "us" },
      types: ["address"],
    });
    autocomplete.addListener("place_changed", () => {
      const place = autocomplete.getPlace();
      if (place.formatted_address) {
        setDelAddress(place.formatted_address);
        setDeliveryAddress(place.formatted_address);
        calculateDeliveryFee(place.formatted_address);
      }
    });
  }, [googleLoaded, middleTab]); // re-run when switching to delivery tab

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

  // Calculator result
  const calcYards = useMemo(() => {
    const l = parseFloat(calcLength);
    const w = parseFloat(calcWidth);
    const d = parseFloat(calcDepth);
    if (isNaN(l) || isNaN(w) || isNaN(d) || l <= 0 || w <= 0 || d <= 0) return null;
    // L and W in feet, D in inches -> cubic yards
    return (l * w * (d / 12)) / 27;
  }, [calcLength, calcWidth, calcDepth]);

  // Get cart quantity for a product
  const getCartQty = useCallback(
    (productId: string) => {
      const item = items.find((i) => i.product.id === productId);
      return item ? item.quantity : 0;
    },
    [items]
  );

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

  async function calculateDeliveryFee(address: string) {
    try {
      const res = await fetch("/api/delivery/distance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address }),
      });
      if (res.ok) {
        const data = await res.json();
        const oneWayMiles = data.distanceMeters / 1609.344;
        const roundTripMiles = Math.round(oneWayMiles * 2 * 10) / 10;
        const roundTripMinutes = Math.round((data.durationSeconds * 2 + 5 * 60) / 60);
        setRouteInfo({ roundTripMiles, roundTripMinutes });

        // Calculate fee using the delivery formula
        const fuelCost = (roundTripMiles / 6) * 5;
        const laborCost = (roundTripMinutes / 60) * 32;
        const raw = fuelCost + laborCost;
        const withProfit = raw * 2;
        const fee = Math.max(Math.ceil(withProfit / 5) * 5, 25);
        setDeliveryFeeCents(fee * 100);
      }
    } catch {
      // silently fail — staff can manually set fee
    }
  }

  async function searchCustomers(q: string) {
    if (q.length < 2) { setCustResults([]); return; }
    setCustSearching(true);
    try {
      const res = await fetch(`/api/admin/customers/search?q=${encodeURIComponent(q)}`);
      if (res.ok) {
        const data = await res.json();
        setCustResults(data.customers || []);
      }
    } catch { /* ignore */ }
    setCustSearching(false);
  }

  function selectCustomer(cust: typeof custResults[0]) {
    setSelectedCustomer(cust);
    const fullName = [cust.first_name, cust.last_name].filter(Boolean).join(" ");
    setCustomerName(fullName || "Walk-in");
    setCustomerPhone(cust.phone || "");
    setDelName(fullName);
    setDelEmail(cust.email || "");
    setDelPhone(cust.phone || "");
    if (cust.address) {
      setDelAddress(cust.address + (cust.city ? `, ${cust.city}, NY` : ""));
      setDeliveryAddress(cust.address + (cust.city ? `, ${cust.city}, NY` : ""));
    }
  }

  async function createNewCustomer() {
    if (!newCustName || !newCustPhone) return;
    try {
      const names = newCustName.trim().split(/\s+/);
      const firstName = names[0] || "";
      const lastName = names.slice(1).join(" ") || "";
      const phone = newCustPhone.replace(/\D/g, "");
      const res = await fetch("/api/admin/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ first_name: firstName, last_name: lastName, phone, email: newCustEmail || null, address: newCustAddress || null }),
      });
      if (res.ok) {
        const data = await res.json();
        const newCust = { id: data.id, first_name: firstName, last_name: lastName, phone, email: newCustEmail || null, address: newCustAddress || null, city: null, total_orders: 0, total_spent_cents: 0, tags: [] };
        selectCustomer(newCust);
        setShowNewCustomer(false);
        setNewCustName(""); setNewCustPhone(""); setNewCustEmail(""); setNewCustAddress("");
      }
    } catch { /* ignore */ }
  }

  async function saveServiceLead() {
    if (!leadServiceType) return;
    setLeadSaving(true);
    try {
      const name = selectedCustomer ? [selectedCustomer.first_name, selectedCustomer.last_name].filter(Boolean).join(" ") : customerName;
      const phone = selectedCustomer?.phone || customerPhone || delPhone;
      await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name || "Walk-in",
          phone: phone || "",
          email: selectedCustomer?.email || delEmail || "",
          town: "",
          service_type: leadServiceType,
          description: leadDescription,
          timeline: leadTimeline,
        }),
      });
      setShowLeadForm(false);
      setLeadServiceType(""); setLeadDescription("");
      alert("Service lead saved!");
    } catch { alert("Failed to save lead"); }
    setLeadSaving(false);
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

  async function afterSale(method: "card" | "cash", orderPayload: Record<string, unknown>) {
    // Print receipt
    if (autoPrint) {
      const receiptItems = (orderPayload.items as Array<Record<string, unknown>>).map((i) => ({
        productName: i.product_name as string,
        quantity: i.quantity as number,
        unit: "ea",
        unitPriceCents: i.unit_price_cents as number,
        lineTotalCents: i.line_total_cents as number,
      }));
      await printerRef.current.printReceipt({
        createdAt: new Date().toISOString(),
        items: receiptItems,
        subtotalCents: orderPayload.subtotal_cents as number,
        taxCents: orderPayload.tax_cents as number,
        deliveryFeeCents: (orderPayload.delivery_fee_cents as number) || 0,
        ccSurchargeCents: method === "card" ? (orderPayload.cc_fee_cents as number) || 0 : 0,
        totalCents: orderPayload.grand_total_cents as number,
        paymentMethod: method === "card" ? "card_terminal" : "cash",
        cashTenderedCents: orderPayload.cash_tendered_cents as number | undefined,
        changeDueCents: orderPayload.cash_tendered_cents
          ? (orderPayload.cash_tendered_cents as number) - (orderPayload.grand_total_cents as number)
          : undefined,
        customerName: orderPayload.customer_name as string,
        deliveryAddress: orderPayload.delivery_address as string | undefined,
        notes: orderPayload.notes as string | undefined,
      });
    }

    // Open cash drawer on cash sales
    if (method === "cash" && autoDrawer) {
      await printerRef.current.openCashDrawer();
    }
  }

  function resetRegister() {
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
    setCardPaymentStatus(null);
    setRouteInfo(null);
    setDelAddress("");
    setDelName("");
    setDelEmail("");
    setDelPhone("");
    setDelDate("");
    setDelTimeWindow("flexible");
    setDelNotes("");
  }

  async function completeSale(method: "card" | "cash") {
    setProcessing(true);
    try {
      // Create order first
      const orderPayload = {
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
        cc_fee_cents: method === "card" ? ccFeeCents : 0,
        delivery_fee_cents: deliveryFeeCents,
        grand_total_cents: method === "card" ? grandTotalCents : subtotalCents + taxCents + deliveryFeeCents,
        payment_method: method === "card" ? "card_terminal" : "cash",
        delivery_method: deliveryMethod,
        delivery_address: deliveryMethod === "delivery" ? (delAddress || deliveryAddress) : null,
        customer_name: delName || customerName,
        customer_phone: delPhone || customerPhone || null,
        customer_email: delEmail || null,
        delivery_date: delDate || null,
        delivery_time_window: deliveryMethod === "delivery" ? delTimeWindow : null,
        notes: delNotes || orderNotes || null,
        cash_tendered_cents: method === "cash" ? Math.round(parseFloat(cashTendered) * 100) : null,
      };

      const orderRes = await fetch("/api/pos/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(orderPayload),
      });

      if (!orderRes.ok) {
        const err = await orderRes.json();
        alert("Order failed: " + (err.error || "Unknown error"));
        return;
      }

      const { orderId } = await orderRes.json();

      if (method === "card") {
        // Process card payment via Stripe Terminal
        setCardPaymentStatus("Waiting for card...");
        const totalForCard = grandTotalCents;
        const result = await terminalRef.current.collectPayment({
          amountCents: totalForCard,
          orderId,
        });

        if (result.success) {
          setCardPaymentStatus("Payment approved!");
          await afterSale(method, orderPayload);
          setTimeout(resetRegister, 1500);
        } else {
          setCardPaymentStatus("Payment failed: " + (result.error || "Unknown"));
          setTimeout(() => setCardPaymentStatus(null), 3000);
        }
      } else {
        // Cash — sale already recorded
        await afterSale(method, orderPayload);
        resetRegister();
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
    <div className="flex h-full w-full overflow-hidden">
      {/* ── LEFT: Product Catalog ── */}
      <div className="flex min-w-0 flex-1 flex-col border-r border-zinc-800">
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
        <div className="flex-1 overflow-y-auto p-3 scrollbar-none" style={{ scrollbarWidth: "none" }}>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
            {filteredProducts.map((product) => {
              const cartQty = getCartQty(product.id);
              const isBulk = product.delivery_type === "bulk";
              return (
                <div
                  key={product.id}
                  className={`relative flex flex-col rounded-lg border bg-zinc-900 text-left transition-colors hover:border-amber-600/50 hover:bg-zinc-800 ${
                    cartQty > 0 ? "border-amber-600/40" : "border-zinc-800"
                  }`}
                >
                  {/* Image area */}
                  {product.image_url ? (
                    <div
                      className="h-[60px] w-full rounded-t-lg bg-cover bg-center"
                      style={{ backgroundImage: `url(${product.image_url})` }}
                    />
                  ) : (
                    <div className="flex h-[60px] w-full items-center justify-center rounded-t-lg bg-zinc-800/50">
                      <Package className="h-6 w-6 text-zinc-700" />
                    </div>
                  )}

                  {/* Cart badge */}
                  {cartQty > 0 && (
                    <div className="absolute right-1.5 top-1.5 flex h-6 min-w-6 items-center justify-center rounded-full bg-amber-600 px-1.5 text-xs font-bold text-white">
                      {cartQty}
                    </div>
                  )}

                  {/* Product info - clickable for bulk */}
                  <button
                    onClick={() => {
                      if (isBulk) {
                        setShowNumpad({ product, qty: String(product.min_qty || 1) });
                      } else {
                        addItem(product);
                      }
                    }}
                    className="flex flex-1 flex-col p-3 text-left"
                  >
                    <span className="text-xs text-zinc-500">{product.category_name}</span>
                    <span className="mt-0.5 text-sm font-medium leading-tight">{product.name}</span>
                    <span className="mt-auto pt-2 text-lg font-bold text-amber-400">
                      {formatUsd(product.price_per_unit_cents)}
                      <span className="text-xs font-normal text-zinc-500">/{product.unit_label}</span>
                    </span>
                  </button>

                  {/* +/- buttons for non-bulk */}
                  {!isBulk && (
                    <div className="flex items-center justify-between border-t border-zinc-800 px-2 py-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          const item = items.find((i) => i.product.id === product.id);
                          if (item) updateQuantity(item.id, item.quantity - 1);
                        }}
                        disabled={cartQty === 0}
                        className="flex h-[44px] w-[44px] items-center justify-center rounded-lg bg-zinc-800 text-zinc-400 hover:bg-zinc-700 disabled:opacity-30"
                      >
                        <Minus className="h-4 w-4" />
                      </button>
                      <span className="font-mono text-sm text-zinc-400">
                        {cartQty > 0 ? cartQty : ""}
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          addItem(product, 1);
                        }}
                        className="flex h-[44px] w-[44px] items-center justify-center rounded-lg bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          {filteredProducts.length === 0 && (
            <div className="flex h-32 items-center justify-center text-zinc-500">
              {searchQuery ? "No products found" : "Select a category"}
            </div>
          )}
        </div>
      </div>

      {/* ── MIDDLE: Calculator / Delivery ── */}
      <div className="flex w-[380px] shrink-0 flex-col border-r border-zinc-800 bg-zinc-950">
        {/* Tabs */}
        <div className="flex border-b border-zinc-800">
          {([
            { key: "calculator" as MiddleTab, label: "Calculator", icon: Calculator },
            { key: "delivery" as MiddleTab, label: "Delivery", icon: Truck },
            { key: "customer" as MiddleTab, label: "Customer", icon: Users },
          ]).map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setMiddleTab(key)}
              className={`flex flex-1 items-center justify-center gap-1.5 py-3 text-sm font-medium transition-colors ${
                middleTab === key
                  ? "border-b-2 border-amber-500 bg-zinc-900 text-amber-400"
                  : "text-zinc-500 hover:bg-zinc-900 hover:text-zinc-300"
              }`}
            >
              <Icon className="h-4 w-4" />
              {label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="flex-1 overflow-y-auto p-4">
          {/* Calculator Tab */}
          {middleTab === "calculator" && (
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-zinc-300">Yards Calculator</h3>
              <p className="text-xs text-zinc-500">
                Enter dimensions to calculate cubic yards needed.
              </p>
              <div className="space-y-3">
                <div>
                  <label className="mb-1 block text-xs text-zinc-400">Length (feet)</label>
                  <input
                    type="number"
                    value={calcLength}
                    onChange={(e) => setCalcLength(e.target.value)}
                    placeholder="0"
                    className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-amber-500"
                    step="0.5"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-zinc-400">Width (feet)</label>
                  <input
                    type="number"
                    value={calcWidth}
                    onChange={(e) => setCalcWidth(e.target.value)}
                    placeholder="0"
                    className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-amber-500"
                    step="0.5"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-zinc-400">Depth (inches)</label>
                  <input
                    type="number"
                    value={calcDepth}
                    onChange={(e) => setCalcDepth(e.target.value)}
                    placeholder="0"
                    className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-amber-500"
                    step="0.5"
                  />
                </div>
              </div>

              {/* Result */}
              {calcYards !== null && (
                <div className="rounded-lg border border-amber-600/30 bg-amber-900/20 p-4">
                  <p className="text-xs text-amber-400/70">Estimated material needed:</p>
                  <p className="mt-1 text-3xl font-bold text-amber-400">
                    {calcYards.toFixed(2)} <span className="text-lg font-normal">yards</span>
                  </p>
                  <p className="mt-1 text-xs text-zinc-500">
                    {parseFloat(calcLength)} ft x {parseFloat(calcWidth)} ft x {parseFloat(calcDepth)} in
                  </p>
                </div>
              )}

              {/* Quick reference */}
              <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-3">
                <p className="mb-2 text-xs font-semibold text-zinc-400">Quick Reference</p>
                <div className="space-y-1 text-xs text-zinc-500">
                  <p>1 yard covers ~108 sq ft at 3&quot; deep</p>
                  <p>1 yard covers ~162 sq ft at 2&quot; deep</p>
                  <p>1 yard = 27 cubic feet</p>
                </div>
              </div>
            </div>
          )}

          {/* Delivery Tab */}
          {middleTab === "delivery" && (
            <div className="space-y-3">
              {/* Google Maps embed */}
              <div className="overflow-hidden rounded-lg border border-zinc-800">
                <iframe
                  width="100%"
                  height="250"
                  style={{ border: 0 }}
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  src={
                    delAddress
                      ? `https://www.google.com/maps/embed/v1/place?key=REDACTED_GOOGLE_MAPS_KEY&q=${encodeURIComponent(delAddress)}&maptype=satellite&zoom=17`
                      : `https://www.google.com/maps/embed/v1/place?key=REDACTED_GOOGLE_MAPS_KEY&q=110+Frowein+Road+Center+Moriches+NY+11934&maptype=satellite&zoom=14`
                  }
                />
              </div>

              {/* Delivery address with autocomplete */}
              <div>
                <label className="mb-1 block text-xs text-zinc-400">Delivery Address</label>
                <input
                  ref={addressInputRef}
                  type="text"
                  value={delAddress}
                  onChange={(e) => { setDelAddress(e.target.value); setDeliveryAddress(e.target.value); }}
                  placeholder="123 Main St, Center Moriches, NY"
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>

              {/* Auto-calculated route info */}
              {routeInfo && (
                <div className="rounded-lg border border-amber-600/30 bg-amber-900/20 px-3 py-2.5">
                  <p className="text-sm font-medium text-amber-300">
                    {routeInfo.roundTripMiles} mi round trip &middot; ~{routeInfo.roundTripMinutes} min &middot; Fee: {formatUsd(deliveryFeeCents)}
                  </p>
                </div>
              )}

              {/* Customer info */}
              <div>
                <label className="mb-1 block text-xs text-zinc-400">Customer Name</label>
                <input
                  type="text"
                  value={delName}
                  onChange={(e) => { setDelName(e.target.value); setCustomerName(e.target.value || "Walk-in"); }}
                  placeholder="Customer name"
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-zinc-400">Email</label>
                <input
                  type="email"
                  value={delEmail}
                  onChange={(e) => setDelEmail(e.target.value)}
                  placeholder="customer@email.com"
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-zinc-400">Phone</label>
                <input
                  type="tel"
                  value={delPhone}
                  onChange={(e) => { setDelPhone(e.target.value); setCustomerPhone(e.target.value); }}
                  placeholder="(631) 555-0123"
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>

              {/* Delivery scheduling */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs text-zinc-400">Delivery Date</label>
                  <input
                    type="date"
                    value={delDate}
                    onChange={(e) => setDelDate(e.target.value)}
                    className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-amber-500"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-zinc-400">Time Window</label>
                  <select
                    value={delTimeWindow}
                    onChange={(e) => setDelTimeWindow(e.target.value)}
                    className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-amber-500"
                  >
                    {TIME_WINDOWS.map((tw) => (
                      <option key={tw.value} value={tw.value}>{tw.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="mb-1 block text-xs text-zinc-400">Delivery Notes</label>
                <textarea
                  value={delNotes}
                  onChange={(e) => { setDelNotes(e.target.value); setOrderNotes(e.target.value); }}
                  placeholder="Gate code, driveway instructions, etc."
                  rows={2}
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>

              {/* Fee override */}
              <div className="flex items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-900 p-3">
                <span className="text-xs text-zinc-500">Delivery Fee: $</span>
                <input
                  type="number"
                  value={deliveryFeeCents / 100 || ""}
                  onChange={(e) => setDeliveryFeeCents(Math.round(parseFloat(e.target.value || "0") * 100))}
                  placeholder="0"
                  className="w-20 rounded border border-zinc-700 bg-zinc-800 px-2 py-1.5 text-sm focus:outline-none"
                  step="5"
                />
                <button onClick={() => setDeliveryFeeCents(0)} className="text-xs text-amber-400 hover:underline">FREE</button>
              </div>
            </div>
          )}

          {/* Customer Tab */}
          {middleTab === "customer" && (
            <div className="space-y-3">
              {/* Search existing customer */}
              <div>
                <label className="mb-1 block text-xs text-zinc-400">Search Customer</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                  <input
                    type="text"
                    value={custSearch}
                    onChange={(e) => { setCustSearch(e.target.value); searchCustomers(e.target.value); }}
                    placeholder="Phone, name, or address..."
                    className="w-full rounded-lg border border-zinc-700 bg-zinc-800 py-2.5 pl-9 pr-3 text-sm focus:outline-none focus:ring-1 focus:ring-amber-500"
                  />
                </div>
              </div>

              {/* Search results */}
              {custSearching && <p className="text-xs text-zinc-500">Searching...</p>}
              {custResults.length > 0 && (
                <div className="max-h-48 overflow-y-auto rounded-lg border border-zinc-800">
                  {custResults.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => { selectCustomer(c); setCustSearch(""); setCustResults([]); }}
                      className={`w-full border-b border-zinc-800 px-3 py-2.5 text-left text-sm transition-colors last:border-0 hover:bg-zinc-800 ${selectedCustomer?.id === c.id ? "bg-amber-900/30" : ""}`}
                    >
                      <p className="font-medium">{[c.first_name, c.last_name].filter(Boolean).join(" ") || "—"}</p>
                      <p className="text-xs text-zinc-500">{c.phone || "No phone"} · {c.total_orders} orders · {formatUsd(c.total_spent_cents)}</p>
                      {c.address && <p className="text-xs text-zinc-600 truncate">{c.address}{c.city ? `, ${c.city}` : ""}</p>}
                    </button>
                  ))}
                </div>
              )}

              {/* Selected customer card */}
              {selectedCustomer && (
                <div className="rounded-lg border border-amber-600/30 bg-amber-900/20 p-3 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-amber-300">
                      {[selectedCustomer.first_name, selectedCustomer.last_name].filter(Boolean).join(" ")}
                    </p>
                    <button onClick={() => { setSelectedCustomer(null); setCustomerName("Walk-in"); setCustomerPhone(""); }} className="text-xs text-zinc-500 hover:text-zinc-300">Clear</button>
                  </div>
                  {selectedCustomer.phone && <p className="text-xs text-zinc-400"><a href={`tel:+1${selectedCustomer.phone}`} className="hover:text-amber-400">{selectedCustomer.phone}</a></p>}
                  {selectedCustomer.email && <p className="text-xs text-zinc-500">{selectedCustomer.email}</p>}
                  {selectedCustomer.address && <p className="text-xs text-zinc-500">{selectedCustomer.address}{selectedCustomer.city ? `, ${selectedCustomer.city}` : ""}</p>}
                  <div className="flex gap-2 pt-1">
                    <span className="rounded bg-zinc-800 px-2 py-0.5 text-xs text-zinc-400">{selectedCustomer.total_orders} orders</span>
                    <span className="rounded bg-zinc-800 px-2 py-0.5 text-xs text-zinc-400">{formatUsd(selectedCustomer.total_spent_cents)} lifetime</span>
                  </div>
                  {selectedCustomer.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 pt-1">
                      {selectedCustomer.tags.map((tag) => (
                        <span key={tag} className="rounded bg-zinc-800 px-1.5 py-0.5 text-[10px] text-zinc-500">{tag}</span>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* New customer form */}
              <button
                onClick={() => setShowNewCustomer(!showNewCustomer)}
                className="flex w-full items-center gap-2 rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2.5 text-sm text-zinc-300 hover:bg-zinc-700"
              >
                <UserPlus className="h-4 w-4 text-amber-400" />
                {showNewCustomer ? "Cancel" : "Add New Customer"}
              </button>

              {showNewCustomer && (
                <div className="space-y-2 rounded-lg border border-zinc-800 bg-zinc-900 p-3">
                  <input type="text" value={newCustName} onChange={(e) => setNewCustName(e.target.value)} placeholder="Full name *" className="w-full rounded border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-amber-500" />
                  <input type="tel" value={newCustPhone} onChange={(e) => setNewCustPhone(e.target.value)} placeholder="Phone * (631-555-1234)" className="w-full rounded border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-amber-500" />
                  <input type="email" value={newCustEmail} onChange={(e) => setNewCustEmail(e.target.value)} placeholder="Email (optional)" className="w-full rounded border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-amber-500" />
                  <input type="text" value={newCustAddress} onChange={(e) => setNewCustAddress(e.target.value)} placeholder="Address (optional)" className="w-full rounded border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-amber-500" />
                  <button onClick={createNewCustomer} disabled={!newCustName || !newCustPhone} className="w-full rounded-lg bg-amber-600 py-2.5 text-sm font-bold text-white hover:bg-amber-500 disabled:opacity-30">
                    Save Customer
                  </button>
                </div>
              )}

              {/* Divider */}
              <div className="border-t border-zinc-800 pt-3">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">Service Lead</p>
              </div>

              {/* Service lead */}
              {!showLeadForm ? (
                <button
                  onClick={() => setShowLeadForm(true)}
                  className="flex w-full items-center gap-2 rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2.5 text-sm text-zinc-300 hover:bg-zinc-700"
                >
                  <Package className="h-4 w-4 text-amber-400" />
                  Create Service Lead
                </button>
              ) : (
                <div className="space-y-2 rounded-lg border border-zinc-800 bg-zinc-900 p-3">
                  <select value={leadServiceType} onChange={(e) => setLeadServiceType(e.target.value)} className="w-full rounded border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-amber-500">
                    <option value="">Select service type *</option>
                    <option value="gravel-driveway-new">Gravel driveway — new</option>
                    <option value="gravel-driveway-resurface">Gravel driveway — resurface</option>
                    <option value="paver-driveway">Paver driveway</option>
                    <option value="driveway-edging">Driveway edging</option>
                    <option value="landscaping-design">Landscaping — design &amp; install</option>
                    <option value="landscaping-grading">Landscaping — grading &amp; drainage</option>
                    <option value="landscaping-sod">Landscaping — sod / lawn</option>
                    <option value="landscaping-retaining-wall">Landscaping — retaining wall</option>
                    <option value="masonry-patio">Masonry — patio</option>
                    <option value="masonry-walkway">Masonry — walkway</option>
                    <option value="masonry-fireplace">Masonry — fireplace / outdoor kitchen</option>
                    <option value="masonry-veneer">Masonry — stone veneer / steps</option>
                    <option value="property-maintenance">Property maintenance</option>
                    <option value="other">Other</option>
                  </select>
                  <select value={leadTimeline} onChange={(e) => setLeadTimeline(e.target.value)} className="w-full rounded border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm focus:outline-none">
                    <option value="asap">ASAP / this week</option>
                    <option value="within-2-weeks">Within 2 weeks</option>
                    <option value="within-a-month">Within a month</option>
                    <option value="just-planning">Just getting quotes</option>
                  </select>
                  <textarea value={leadDescription} onChange={(e) => setLeadDescription(e.target.value)} placeholder="Project details..." rows={2} className="w-full rounded border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-amber-500" />
                  <div className="flex gap-2">
                    <button onClick={saveServiceLead} disabled={!leadServiceType || leadSaving} className="flex-1 rounded-lg bg-amber-600 py-2.5 text-sm font-bold text-white hover:bg-amber-500 disabled:opacity-30">
                      {leadSaving ? "Saving..." : "Save Lead"}
                    </button>
                    <button onClick={() => setShowLeadForm(false)} className="rounded-lg bg-zinc-800 px-4 py-2.5 text-sm text-zinc-400 hover:bg-zinc-700">Cancel</button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── RIGHT: Current Sale ── */}
      <div className="flex w-[340px] shrink-0 flex-col bg-zinc-900">
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
                <div key={item.id} className="px-3 py-2.5">
                  {/* Line 1: Full product name + unit price */}
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-semibold leading-tight">{item.product.name}</p>
                    <span className="shrink-0 text-xs text-zinc-500">
                      {formatUsd(item.price_cents)}/{item.product.unit_label}
                    </span>
                  </div>
                  {/* Line 2: Qty selector left, line total + delete right */}
                  <div className="mt-1.5 flex items-center justify-between">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => updateQuantity(item.id, item.quantity - (item.product.qty_step || 1))}
                        className="rounded bg-zinc-800 p-1.5 hover:bg-zinc-700"
                      >
                        <Minus className="h-3.5 w-3.5" />
                      </button>
                      <span className="w-9 text-center font-mono text-sm font-semibold">{item.quantity}</span>
                      <button
                        onClick={() => updateQuantity(item.id, item.quantity + (item.product.qty_step || 1))}
                        className="rounded bg-zinc-800 p-1.5 hover:bg-zinc-700"
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold">{formatUsd(item.price_cents * item.quantity)}</span>
                      <button onClick={() => removeItem(item.id)} className="p-1 text-zinc-600 hover:text-red-400">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
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
              className={`flex-1 rounded-lg py-2.5 text-sm font-semibold ${deliveryMethod === "pickup" ? "bg-amber-600 text-white" : "bg-zinc-800 text-zinc-400"}`}
            >
              Pickup
            </button>
            <button
              onClick={() => setDeliveryMethod("delivery")}
              className={`flex-1 rounded-lg py-2.5 text-sm font-semibold ${deliveryMethod === "delivery" ? "bg-amber-600 text-white" : "bg-zinc-800 text-zinc-400"}`}
            >
              Delivery
            </button>
            <button onClick={() => setShowNotes(!showNotes)} className="rounded-lg bg-zinc-800 px-3 text-xs text-zinc-400 hover:bg-zinc-700">
              Notes
            </button>
          </div>
        </div>

        {/* Totals */}
        <div className="border-t border-zinc-800 px-3 py-2.5 text-sm">
          <div className="flex justify-between"><span className="text-zinc-400">Subtotal</span><span>{formatUsd(subtotalCents)}</span></div>
          <div className="flex justify-between"><span className="text-zinc-400">Tax (8.75%)</span><span>{formatUsd(taxCents)}</span></div>
          {deliveryFeeCents > 0 && <div className="flex justify-between"><span className="text-zinc-400">Delivery</span><span>{formatUsd(deliveryFeeCents)}</span></div>}
          {paymentMethod === "card" && <div className="flex justify-between"><span className="text-zinc-400">CC Fee (3%)</span><span>{formatUsd(ccFeeCents)}</span></div>}
          <div className="mt-1 flex justify-between border-t border-zinc-700 pt-1 text-lg font-bold">
            <span>TOTAL</span><span className="text-amber-400">{formatUsd(grandTotalCents)}</span>
          </div>
        </div>

        {/* Terminal status + Card payment status */}
        {cardPaymentStatus && (
          <div className="border-t border-zinc-800 px-3 py-2">
            <div className="flex items-center gap-2 rounded-lg bg-amber-900/30 px-3 py-2 text-sm text-amber-300">
              <CreditCard className="h-4 w-4 animate-pulse" />
              {cardPaymentStatus}
            </div>
          </div>
        )}

        {/* Action buttons */}
        <div className="space-y-2 border-t border-zinc-800 p-3">
          {/* Terminal indicator */}
          <div className="flex items-center justify-center gap-1.5 text-xs text-zinc-500">
            <Wifi className={`h-3 w-3 ${terminalStatus === "disconnected" ? "text-red-500" : "text-green-500"}`} />
            {terminalStatus === "simulated" ? "Simulated Reader" : terminalStatus === "connected" ? "Reader Connected" : "No Reader"}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => { setPaymentMethod("card"); completeSale("card"); }}
              disabled={items.length === 0 || processing || terminalStatus === "disconnected"}
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
