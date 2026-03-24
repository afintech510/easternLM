"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Calculator,
  Calendar,
  ClipboardList,
  CreditCard,
  Edit3,
  LogOut,
  MapPin,
  Minus,
  Package,
  Plus,
  Search,
  Printer,
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
import { formatShortDateTime, formatDeliveryDate, formatShortDeliveryDate, formatTimeWindow, formatPhone, formatPaymentMethod } from "@/lib/format-date";
import { PosTerminal } from "@/lib/pos/terminal";
import { ReceiptPrinter } from "@/lib/pos/printer";
import { CallerIdPopup } from "@/components/pos/caller-id-popup";
import { MaterialCalculator } from "@/components/pos/material-calculator";
import { NewLeadModal } from "@/components/pos/new-lead-modal";
import { SaveQuoteModal } from "@/components/pos/save-quote-modal";
import { QuoteBuilder } from "@/components/pos/quote-builder";
import { PhoneOrderModal } from "@/components/pos/phone-order-modal";
import { POSProductGrid } from "@/components/pos/product-grid";
import { initBarcodeScanner } from "@/lib/pos/barcode-scanner";
import { CheckoutOverlay } from "@/components/pos/checkout/checkout-overlay";
import { RefundModal } from "@/components/pos/refund/refund-modal";

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
  image_url?: string | null;
};

type LineItem = {
  id: string; // unique key for the line
  product: PosProduct;
  quantity: number;
  price_cents: number; // per unit override (for custom items)
  note?: string;
};

type PosCategory = { slug: string; name: string; count: number };

type MiddleTab = "delivery" | "customer" | "transactions";

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
  const [paymentMethod, setPaymentMethod] = useState<"card" | "cash" | "cod" | "account" | null>(null);
  const [showAccountConfirm, setShowAccountConfirm] = useState(false);
  const [showCheckout, setShowCheckout] = useState(false);
  const [showRefund, setShowRefund] = useState<any>(null);
  const [showQuoteModal, setShowQuoteModal] = useState(false);
  const [quoteDeposit, setQuoteDeposit] = useState("200");
  const [quoteNote, setQuoteNote] = useState("");
  const [quoteSending, setQuoteSending] = useState(false);
  const [quoteResult, setQuoteResult] = useState<{ quoteNumber: string; quoteUrl: string; sent: string[] } | null>(null);

  // Tax exempt
  const [taxExempt, setTaxExempt] = useState(false);
  const [taxExemptCert, setTaxExemptCert] = useState("");

  // Pro pickup discount
  const [proDiscount, setProDiscount] = useState(false);

  // Manual discount
  const [showDiscountModal, setShowDiscountModal] = useState(false);
  const [discountType, setDiscountType] = useState<"percentage" | "amount">("percentage");
  const [discountValue, setDiscountValue] = useState("");
  const [discountReason, setDiscountReason] = useState("");

  // Held orders
  const [heldOrders, setHeldOrders] = useState<Array<{ id: string; customer_name: string; total_cents: number; item_count: number; held_at: string; reason: string }>>([]);
  const [showHoldModal, setShowHoldModal] = useState(false);
  const [holdReason, setHoldReason] = useState("");

  // Middle column state
  const [middleTab, setMiddleTab] = useState<MiddleTab>("delivery");
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
  const [delCustomerId, setDelCustomerId] = useState<string | null>(null);
  const [delCustomerStatus, setDelCustomerStatus] = useState<"" | "found" | "new" | "saving">("");
  const [routeInfo, setRouteInfo] = useState<RouteInfo | null>(null);
  const [delCustSearch, setDelCustSearch] = useState("");
  const [delCustResults, setDelCustResults] = useState<Array<{ id: string; first_name: string | null; last_name: string | null; company_name: string | null; phone: string | null; email: string | null; address: string | null; city: string | null; zip: string | null; total_orders: number; total_spent_cents: number; is_charge_account?: boolean; charge_account_name?: string | null; current_balance_cents?: number; credit_limit_cents?: number | null; payment_terms?: string | null }>>([]);
  const [delCustSearching, setDelCustSearching] = useState(false);
  const delCustTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [googleLoaded, setGoogleLoaded] = useState(false);
  const addressInputRef = useRef<HTMLInputElement>(null);

  // Customer tab state
  const [custSearch, setCustSearch] = useState("");
  const [custResults, setCustResults] = useState<Array<{ id: string; first_name: string | null; last_name: string | null; phone: string | null; email: string | null; address: string | null; city: string | null; total_orders: number; total_spent_cents: number; tags: string[]; is_charge_account?: boolean; charge_account_name?: string | null; credit_limit_cents?: number | null; current_balance_cents?: number; payment_terms?: string | null }>>([]);
  const [custSearching, setCustSearching] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<typeof custResults[0] | null>(null);
  const [showNewCustomer, setShowNewCustomer] = useState(false);
  const [newCustName, setNewCustName] = useState("");
  const [newCustPhone, setNewCustPhone] = useState("");
  const [newCustEmail, setNewCustEmail] = useState("");
  const [newCustAddress, setNewCustAddress] = useState("");
  const newCustAddressRef = useRef<HTMLInputElement>(null);
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
  const [showMaterialCalc, setShowMaterialCalc] = useState(false);
  const [showNewLead, setShowNewLead] = useState(false);
  const [showSaveQuote, setShowSaveQuote] = useState<"send" | "hold" | null>(null);
  const [showQuoteBuilder, setShowQuoteBuilder] = useState(false);
  const [showPhoneOrder, setShowPhoneOrder] = useState(false);
  const [accessConstraints, setAccessConstraints] = useState<Record<string, boolean>>({});
  const [terminalStatus, setTerminalStatus] = useState<"disconnected" | "simulated" | "connected">("disconnected");
  const [isOnline, setIsOnline] = useState(true);
  const [cardPaymentStatus, setCardPaymentStatus] = useState<string | null>(null);
  const [autoPrint, setAutoPrint] = useState(true);
  const [autoDrawer, setAutoDrawer] = useState(true);
  const [printerConnected, setPrinterConnected] = useState(false);
  const terminalRef = useRef(new PosTerminal());
  const printerRef = useRef(new ReceiptPrinter());

  // Customer order history
  const [custOrders, setCustOrders] = useState<Array<{ id: string; placed_at: string; grand_total_cents: number; materials_subtotal_cents: number; delivery_method: string; status: string; items?: Array<{ product_name: string; quantity: number; unit_price_cents: number }> }>>([]);

  // Customer edit modal
  const [showEditCustomer, setShowEditCustomer] = useState(false);
  const [editCust, setEditCust] = useState({ first_name: "", last_name: "", phone: "", email: "", address: "", city: "", company_name: "" });

  // Transactions tab state
  const [txnSearch, setTxnSearch] = useState("");
  const [txnDateFilter, setTxnDateFilter] = useState<"today" | "yesterday" | "week" | "all">("today");
  const [txnResults, setTxnResults] = useState<Array<{
    id: string;
    placed_at: string;
    customer_name: string;
    customer_phone: string | null;
    grand_total_cents: number;
    status: string;
    payment_method: string;
    delivery_method: string;
    source: string;
  }>>([]);
  const [txnLoading, setTxnLoading] = useState(false);
  const [selectedTxn, setSelectedTxn] = useState<string | null>(null);
  const [txnDetail, setTxnDetail] = useState<{
    id: string;
    placed_at: string;
    customer_name: string;
    customer_phone: string | null;
    customer_email: string | null;
    delivery_address: string | null;
    delivery_method: string;
    delivery_date: string | null;
    delivery_time_window: string | null;
    delivery_notes: string | null;
    access_constraints: Record<string, unknown> | null;
    grand_total_cents: number;
    materials_subtotal_cents: number;
    delivery_total_cents: number;
    tax_cents: number;
    cc_surcharge_cents: number;
    status: string;
    payment_method: string;
    source: string;
    metadata: Record<string, unknown>;
    items: Array<{ product_name: string; quantity: number; unit: string; unit_price_cents: number; line_subtotal_cents: number }>;
  } | null>(null);
  const txnFetchRef = useRef(0);

  // Theme
  const [theme, setTheme] = useState<"site" | "light" | "medium" | "dark">("dark");

  // Theme persistence
  useEffect(() => {
    const saved = localStorage.getItem("pos-theme");
    if (saved) setTheme(saved as "site" | "light" | "medium" | "dark");
  }, []);
  useEffect(() => {
    localStorage.setItem("pos-theme", theme);
  }, [theme]);

  const themes = {
    site: { bg: "bg-[#1a3a5c]", card: "bg-[#0f2a42]", border: "border-[#2a5a8c]", text: "text-white", muted: "text-blue-200/60", accent: "text-amber-400", accentBg: "bg-amber-500", input: "bg-[#0f2a42] border-[#2a5a8c]", hover: "hover:bg-[#1a4a6c]" },
    light: { bg: "bg-gray-100", card: "bg-white", border: "border-gray-200", text: "text-gray-900", muted: "text-gray-500", accent: "text-amber-600", accentBg: "bg-amber-500", input: "bg-white border-gray-300", hover: "hover:bg-gray-50" },
    medium: { bg: "bg-zinc-700", card: "bg-zinc-600", border: "border-zinc-500", text: "text-zinc-100", muted: "text-zinc-300", accent: "text-amber-400", accentBg: "bg-amber-500", input: "bg-zinc-600 border-zinc-500", hover: "hover:bg-zinc-500" },
    dark: { bg: "bg-zinc-950", card: "bg-zinc-900", border: "border-zinc-800", text: "text-zinc-100", muted: "text-zinc-500", accent: "text-amber-400", accentBg: "bg-amber-600", input: "bg-zinc-800 border-zinc-700", hover: "hover:bg-zinc-800" },
  };
  const t = themes[theme];

  // Register POS service worker for offline support + network status
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/pos-sw.js").catch(() => {});
    }
    const goOnline = () => setIsOnline(true);
    const goOffline = () => setIsOnline(false);
    setIsOnline(navigator.onLine);
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    return () => { window.removeEventListener("online", goOnline); window.removeEventListener("offline", goOffline); };
  }, []);

  // Load products
  useEffect(() => {
    fetch("/api/pos/products")
      .then((r) => r.json())
      .then((data) => {
        setProducts(data.products || []);
        setCategories(data.categories || []);
      });
    // Auto-detect real reader, fall back to simulated
    terminalRef.current.getReaders().then((readers) => {
      const online = readers.find((r) => r.status === "online");
      if (online) {
        terminalRef.current.connectReader(online.id);
        setTerminalStatus("connected");
      } else {
        terminalRef.current.useSimulated();
        setTerminalStatus("simulated");
      }
    }).catch(() => {
      terminalRef.current.useSimulated();
      setTerminalStatus("simulated");
    });

    // Load held orders
    fetch("/api/pos/held").then(r => r.json()).then(d => setHeldOrders((d.orders || []).map((o: Record<string, unknown>) => ({
      id: o.id as string,
      customer_name: (o.customer_name as string) || "Walk-in",
      total_cents: 0,
      item_count: ((o.items as unknown[]) || []).length,
      held_at: (o.created_at as string) || new Date().toISOString(),
      reason: (o.notes as string) || "",
    })))).catch(() => {});
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
        setDeliveryMethod("delivery");
        calculateDeliveryFee(place.formatted_address);
      }
    });
  }, [googleLoaded, middleTab]); // re-run when switching to delivery tab

  // Attach Google Places autocomplete to new customer address input
  useEffect(() => {
    if (!googleLoaded || !showNewCustomer || !newCustAddressRef.current || !(window as any).google) return;
    const autocomplete = new (window as any).google.maps.places.Autocomplete(newCustAddressRef.current, {
      componentRestrictions: { country: "us" },
      types: ["address"],
    });
    autocomplete.addListener("place_changed", () => {
      const place = autocomplete.getPlace();
      if (place.formatted_address) {
        setNewCustAddress(place.formatted_address);
      }
    });
  }, [googleLoaded, showNewCustomer]);

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
  const proDiscountCents = proDiscount ? Math.round(subtotalCents * 0.05) : 0;
  const manualDiscountCents = discountType === "percentage"
    ? Math.round(subtotalCents * (parseFloat(discountValue) || 0) / 100)
    : Math.round((parseFloat(discountValue) || 0) * 100);
  const subtotalAfterDiscounts = subtotalCents - proDiscountCents - manualDiscountCents;
  const taxCents = taxExempt ? 0 : Math.round(subtotalAfterDiscounts * TAX_RATE);
  const baseTotalCents = subtotalAfterDiscounts + taxCents + deliveryFeeCents;
  const cashTotalCents = baseTotalCents;
  const ccFeeCents = Math.round(baseTotalCents * CC_SURCHARGE);
  const cardTotalCents = baseTotalCents + ccFeeCents;
  // Legacy alias for existing code that uses grandTotalCents
  const grandTotalCents = paymentMethod === "card" ? cardTotalCents : cashTotalCents;

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

  // Barcode scanner — matches by barcode, sku, or slug
  useEffect(() => {
    return initBarcodeScanner((barcode) => {
      const match = products.find(
        (p) =>
          (p as any).barcode === barcode ||
          (p as any).sku === barcode ||
          p.slug === barcode ||
          p.name.toLowerCase() === barcode.toLowerCase(),
      );
      if (match) {
        addItem(match, 1);
      } else {
        alert(`Barcode not found: ${barcode}`);
      }
    });
  }, [products, addItem]);

  const removeItem = useCallback((id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
  }, []);

  const updateQuantity = useCallback((id: string, qty: number) => {
    if (qty <= 0) { removeItem(id); return; }
    setItems((prev) => prev.map((i) => i.id === id ? { ...i, quantity: qty } : i));
  }, [removeItem]);

  const updateItemPrice = useCallback((id: string, priceCents: number) => {
    setItems((prev) => prev.map((i) => i.id === id ? { ...i, price_cents: priceCents } : i));
  }, []);

  // For POSProductGrid: set/remove by product ID
  const setQtyForProduct = useCallback((productId: string, qty: number) => {
    if (qty <= 0) {
      setItems((prev) => prev.filter((i) => i.product.id !== productId));
    } else {
      setItems((prev) => {
        const existing = prev.find((i) => i.product.id === productId);
        if (existing) return prev.map((i) => i.product.id === productId ? { ...i, quantity: qty } : i);
        return prev;
      });
    }
  }, []);

  const cartQtys = useMemo(() => {
    const map: Record<string, number> = {};
    for (const item of items) map[item.product.id] = item.quantity;
    return map;
  }, [items]);

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

  // Auto-lookup customer by phone in delivery tab
  async function handleDeliveryPhoneLookup(phone: string) {
    const digits = phone.replace(/\D/g, "");
    if (digits.length < 10) return;
    try {
      const r = await fetch(`/api/pos/customers/lookup?phone=${encodeURIComponent(digits)}`);
      const d = await r.json();
      if (d.customer) {
        setDelName(`${d.customer.first_name ?? ""} ${d.customer.last_name ?? ""}`.trim());
        setDelEmail(d.customer.email ?? "");
        if (d.customer.address && !delAddress) setDelAddress(d.customer.address);
        setDelCustomerId(d.customer.id);
        setDelCustomerStatus("found");
        // Also set the main customer state
        setCustomerName(`${d.customer.first_name ?? ""} ${d.customer.last_name ?? ""}`.trim());
        setCustomerPhone(digits);
        setSelectedCustomer(d.customer);
      } else {
        setDelCustomerId(null);
        setDelCustomerStatus("new");
      }
    } catch { /* ignore */ }
  }

  async function handleSaveDeliveryCustomer() {
    if (!delPhone && !delName) return;
    setDelCustomerStatus("saving");
    try {
      const nameParts = delName.trim().split(/\s+/);
      const r = await fetch("/api/pos/customers/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: delPhone,
          first_name: nameParts[0] ?? "",
          last_name: nameParts.slice(1).join(" ") ?? "",
          email: delEmail || undefined,
          address: delAddress || undefined,
          source: "pos",
        }),
      });
      const d = await r.json();
      if (d.customer) {
        setDelCustomerId(d.customer.id);
        setDelCustomerStatus("found");
        setSelectedCustomer(d.customer);
      }
    } catch { setDelCustomerStatus(""); }
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

  async function fetchCustomerOrders(customerId: string) {
    try {
      const res = await fetch(`/api/admin/customers/${customerId}/orders`);
      if (res.ok) {
        const data = await res.json();
        setCustOrders((data.orders || []).map((o: Record<string, unknown>) => ({ ...o, items: o.order_items })));
      }
    } catch { setCustOrders([]); }
  }

  async function fetchTransactions() {
    setTxnLoading(true);
    const ticket = ++txnFetchRef.current;
    const params = new URLSearchParams();
    if (txnSearch) params.set("q", txnSearch);
    params.set("date", txnDateFilter);
    const res = await fetch(`/api/pos/transactions?${params}`);
    if (res.ok && ticket === txnFetchRef.current) {
      const data = await res.json();
      setTxnResults(data.orders || []);
    }
    if (ticket === txnFetchRef.current) setTxnLoading(false);
  }

  async function fetchTxnDetail(orderId: string) {
    const res = await fetch(`/api/admin/operations/${orderId}`);
    if (res.ok) {
      const data = await res.json();
      setTxnDetail({ ...data.order, items: data.order.order_items || data.items || [] });
      setSelectedTxn(orderId);
    }
  }

  // Fetch transactions when tab or date filter changes
  useEffect(() => {
    if (middleTab === "transactions") fetchTransactions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [middleTab, txnDateFilter]);

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
    // Auto-enable tax exempt if customer has it
    setTaxExempt((cust as Record<string, unknown>).tax_exempt as boolean || false);
    // Auto-apply pro discount for contractors on pickup
    const isPro = cust.tags?.some(t => t === 'contractor' || t === 'pro' || t === 'account-customer');
    setProDiscount(!!isPro && deliveryMethod === 'pickup');
    fetchCustomerOrders(cust.id);
  }

  async function saveEditCustomer() {
    if (!selectedCustomer) return;
    try {
      const res = await fetch(`/api/admin/customers/${selectedCustomer.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editCust),
      });
      if (res.ok) {
        setSelectedCustomer({ ...selectedCustomer, ...editCust });
        const fullName = [editCust.first_name, editCust.last_name].filter(Boolean).join(" ");
        setCustomerName(fullName || "Walk-in");
        setCustomerPhone(editCust.phone || "");
        setShowEditCustomer(false);
      }
    } catch { /* ignore */ }
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

  async function afterSale(method: "card" | "cash" | "account", orderPayload: Record<string, unknown>) {
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
        paymentMethod: method === "card" ? "card_terminal" : method === "account" ? "account" : "cash",
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
    setSelectedCustomer(null);
    setCustOrders([]);
    setTaxExempt(false);
    setTaxExemptCert("");
    setProDiscount(false);
    setDiscountValue("");
    setDiscountReason("");
    setShowDiscountModal(false);
    setShowAccountConfirm(false);
  }

  async function completeSale(method: "card" | "cash" | "cod" | "account") {
    setProcessing(true);
    try {
      // Determine totals based on method
      const isCard = method === "card";
      const isAccount = method === "account";
      const effectiveCcFee = isCard ? ccFeeCents : 0;
      const effectiveTotal = isCard ? cardTotalCents : cashTotalCents;

      // Create order first
      const orderPayload: Record<string, unknown> = {
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
        cc_fee_cents: effectiveCcFee,
        delivery_fee_cents: deliveryFeeCents,
        grand_total_cents: effectiveTotal,
        payment_method: isCard ? "card_terminal" : isAccount ? "account" : method === "cod" ? "cod" : "cash",
        customer_id: selectedCustomer?.id ?? delCustomerId ?? undefined,
        delivery_method: deliveryMethod,
        delivery_address: deliveryMethod === "delivery" ? (delAddress || deliveryAddress) : null,
        customer_name: delName || customerName,
        customer_phone: delPhone || customerPhone || null,
        customer_email: delEmail || null,
        delivery_date: delDate || null,
        delivery_time_window: deliveryMethod === "delivery" ? delTimeWindow : null,
        delivery_notes: delNotes || null,
        access_constraints: accessConstraints,
        notes: delNotes || orderNotes || null,
        cash_tendered_cents: method === "cash" ? Math.round(parseFloat(cashTendered) * 100) : null,
        // Discount and tax exempt fields
        tax_exempt: taxExempt,
        tax_exempt_certificate: taxExemptCert || null,
        discount_type: manualDiscountCents > 0 ? discountType : (proDiscountCents > 0 ? "pro_pickup" : null),
        discount_value: manualDiscountCents > 0 ? parseFloat(discountValue) : (proDiscountCents > 0 ? 5 : null),
        discount_reason: discountReason || (proDiscountCents > 0 ? "Pro pickup discount" : null),
        discount_amount_cents: proDiscountCents + manualDiscountCents,
      };

      // COD and account charges — save order as paid (will be collected later)
      if (method === "cod") {
        orderPayload.status_override = "confirmed";
      }
      if (isAccount) {
        orderPayload.status_override = "paid"; // Account charges count as paid (will invoice)
      }

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
        const totalForCard = cardTotalCents;
        const result = await terminalRef.current.collectPayment({
          amountCents: totalForCard,
          orderId,
        });

        if (result.success) {
          setCardPaymentStatus("Payment approved!");
          printReceipt(orderPayload, method);
          await afterSale(method, orderPayload);
          setTimeout(resetRegister, 1500);
        } else {
          setCardPaymentStatus("Payment failed: " + (result.error || "Unknown"));
          setTimeout(() => setCardPaymentStatus(null), 3000);
        }
      } else if (method === "cod") {
        // COD — just print receipt and reset
        printReceipt(orderPayload, method);
        await afterSale("cash", orderPayload);
        resetRegister();
      } else {
        // Cash — sale already recorded
        printReceipt(orderPayload, method);
        await afterSale(method, orderPayload);
        resetRegister();
      }
    } finally {
      setProcessing(false);
    }
  }

  // ── Receipt printing ────────────────────────────────────────────

  function printReceipt(orderData: Record<string, unknown>, method: string) {
    const w = window.open("", "_blank", "width=380,height=700");
    if (!w) return;
    const receiptItems = (orderData.items as Array<{ product_name: string; quantity: number; unit?: string; unit_price_cents: number; line_total_cents: number }>).filter(i => !i.product_name?.startsWith("Delivery Load") && !i.product_name?.startsWith("Sales Tax") && !i.product_name?.startsWith("Credit Card"));
    const fmt = (c: number) => `$${(c / 100).toFixed(2)}`;
    const delDate = orderData.delivery_date as string | null;
    const delTimeWindow = orderData.delivery_time_window as string | null;
    const delAddr = orderData.delivery_address as string | null;
    const delNotes = orderData.delivery_notes as string | null;
    const custPhone = orderData.customer_phone as string | null;
    w.document.write(`<!DOCTYPE html><html><head><title>Receipt</title>
      <style>body{font-family:monospace;max-width:380px;margin:0 auto;padding:20px;font-size:12px;}
      .center{text-align:center;} .bold{font-weight:bold;} .line{border-top:1px dashed #000;margin:8px 0;}
      .row{display:flex;justify-content:space-between;} .mt{margin-top:6px;}
      @media print{body{width:80mm;}}</style></head><body>
      <div class="center bold" style="font-size:14px;">EASTERN LANDSCAPE & MASON SUPPLY</div>
      <div class="center">110 Frowein Road · Center Moriches, NY 11934</div>
      <div class="center">(631) 874-6244</div>
      <div class="line"></div>
      <div>Date: ${new Date().toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" })} ${new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}</div>
      <div>Customer: ${orderData.customer_name || "Walk-in"}</div>
      ${custPhone ? `<div>Phone: ${formatPhone(custPhone)}</div>` : ""}
      <div class="line"></div>
      <div class="bold">ITEMS</div>
      ${receiptItems.map(i => `<div class="mt"><div>${i.product_name}</div><div class="row"><span>${i.quantity} ${i.unit || "unit"} × ${fmt(i.unit_price_cents)}</span><span>${fmt(i.line_total_cents)}</span></div></div>`).join("")}
      <div class="line"></div>
      <div class="row"><span>Subtotal</span><span>${fmt(orderData.subtotal_cents as number)}</span></div>
      ${(orderData.discount_amount_cents as number) > 0 ? `<div class="row"><span>Discount</span><span>-${fmt(orderData.discount_amount_cents as number)}</span></div>` : ""}
      ${(orderData.delivery_fee_cents as number) > 0 ? `<div class="row"><span>Delivery</span><span>${fmt(orderData.delivery_fee_cents as number)}</span></div>` : ""}
      <div class="row"><span>Tax (8.75%)</span><span>${fmt(orderData.tax_cents as number)}</span></div>
      ${method === "card" && (orderData.cc_fee_cents as number) > 0 ? `<div class="row"><span>CC Fee (3%)</span><span>${fmt(orderData.cc_fee_cents as number)}</span></div>` : ""}
      <div class="line"></div>
      <div class="row bold" style="font-size:14px;"><span>TOTAL</span><span>${fmt(orderData.grand_total_cents as number)}</span></div>
      <div class="mt">Payment: ${method === "card" ? "Card" : method === "cod" ? "CASH ON DELIVERY" : method === "cash" ? "Cash" : method}</div>
      ${method === "cod" ? `<div class="bold mt">AMOUNT DUE ON DELIVERY: ${fmt(orderData.grand_total_cents as number)}</div>` : ""}
      ${delAddr ? `
        <div class="line"></div>
        <div class="bold">DELIVERY</div>
        <div>${delAddr}</div>
        ${delDate ? `<div>Date: ${formatShortDeliveryDate(delDate)}</div>` : ""}
        ${delTimeWindow ? `<div>Time: ${formatTimeWindow(delTimeWindow)}</div>` : ""}
        ${delNotes ? `<div>Notes: ${delNotes}</div>` : ""}
      ` : ""}
      <div class="line"></div>
      <div class="center">Thank you for your business!</div>
      <div class="center">easternlm.com</div>
      </body></html>`);
    w.document.close();
    setTimeout(() => { w.print(); w.close(); }, 500);
  }

  function printDeliveryTicket(data: Record<string, unknown>) {
    const items = (data.items as Array<{ product_name: string; quantity: number; unit?: string }>);
    const fmt = (c: number) => `$${(c / 100).toFixed(2)}`;
    const constraints = data.access_constraints as Record<string, unknown> | null;
    const flags = constraints ? Object.entries(constraints).filter(([k, v]) => v === true && k !== "notes").map(([k]) => k) : [];
    const cNotes = constraints && typeof constraints.notes === "string" ? constraints.notes : null;
    const w = window.open("", "_blank", "width=380,height=700");
    if (!w) return;
    w.document.write(`<!DOCTYPE html><html><head><title>Delivery Ticket</title>
      <style>body{font-family:monospace;max-width:380px;margin:0 auto;padding:20px;font-size:12px;}
      .center{text-align:center;} .bold{font-weight:bold;} .line{border-top:2px solid #000;margin:8px 0;}
      .dashed{border-top:1px dashed #000;margin:8px 0;} .row{display:flex;justify-content:space-between;}
      .big{font-size:16px;} .mt{margin-top:6px;} .warn{background:#fff3cd;padding:6px;border:1px solid #ffc107;margin:4px 0;}</style></head><body>
      <div class="line"></div>
      <div class="center bold big">DELIVERY TICKET</div>
      <div class="center">EASTERN LANDSCAPE & MASON SUPPLY</div>
      <div class="line"></div>
      <div class="bold">CUSTOMER: ${data.customer_name || "Walk-in"}</div>
      ${data.customer_phone ? `<div class="bold">PHONE: ${formatPhone(data.customer_phone as string)} — CALL IF ISSUES</div>` : ""}
      <div class="line"></div>
      <div class="bold big">DELIVER TO:</div>
      <div class="bold" style="font-size:14px;">${data.delivery_address || "NO ADDRESS"}</div>
      ${data.delivery_date ? `<div class="mt bold">DATE: ${formatDeliveryDate(data.delivery_date as string)}</div>` : ""}
      ${data.delivery_time_window ? `<div class="bold">TIME: ${formatTimeWindow(data.delivery_time_window as string)}</div>` : ""}
      ${flags.length > 0 || cNotes ? `<div class="warn"><strong>ACCESS:</strong> ${[...flags, cNotes].filter(Boolean).join(" · ")}</div>` : ""}
      ${data.delivery_notes ? `<div class="mt">NOTES: ${data.delivery_notes}</div>` : ""}
      <div class="line"></div>
      <div class="bold big">MATERIAL TO LOAD:</div>
      ${items.map(i => `<div class="mt bold">${i.product_name}<br/>${i.quantity} ${i.unit || "unit"}</div><div class="row mt"><span>☐ LOADED</span><span>☐ DELIVERED</span></div>`).join('<div class="dashed"></div>')}
      <div class="line"></div>
      <div class="row bold"><span>ORDER TOTAL:</span><span>${fmt(data.grand_total_cents as number)}</span></div>
      <div class="bold mt">PAYMENT: ${formatPaymentMethod(data.payment_method as string).toUpperCase()}${(data.payment_method as string)?.includes("card") ? " (PAID — no collection needed)" : ""}</div>
      <div class="line"></div>
      <div class="mt">Driver signature: ___________________</div>
      <div class="mt">Date completed: ___________________</div>
      <div class="line"></div>
      </body></html>`);
    w.document.close();
    setTimeout(() => { w.print(); w.close(); }, 500);
  }

  // ── Hold / Resume orders ───────────────────────────────────────

  function refreshHeldOrders() {
    fetch("/api/pos/held").then(r => r.json()).then(d => setHeldOrders((d.orders || []).map((o: Record<string, unknown>) => ({
      id: o.id as string,
      customer_name: (o.customer_name as string) || "Walk-in",
      total_cents: 0,
      item_count: ((o.items as unknown[]) || []).length,
      held_at: (o.created_at as string) || new Date().toISOString(),
      reason: (o.notes as string) || "",
    })))).catch(() => {});
  }

  async function holdOrder() {
    if (items.length === 0) return;
    const res = await fetch("/api/pos/held", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        items: items.map(i => ({ product_id: i.product.id, product_name: i.product.name, product_slug: i.product.slug, quantity: i.quantity, unit_price_cents: i.price_cents, line_total_cents: i.price_cents * i.quantity })),
        customer_name: customerName,
        customer_phone: customerPhone || null,
        delivery_method: deliveryMethod,
        delivery_address: deliveryAddress || null,
        delivery_fee_cents: deliveryFeeCents,
        notes: holdReason || "Held order",
      }),
    });
    if (res.ok) {
      resetRegister();
      setShowHoldModal(false);
      setHoldReason("");
      refreshHeldOrders();
    }
  }

  async function resumeHeldOrder(orderId: string) {
    try {
      // First fetch the held order details
      const fetchRes = await fetch("/api/pos/held").then(r => r.json());
      const heldOrder = (fetchRes.orders || []).find((o: Record<string, unknown>) => o.id === orderId);
      if (!heldOrder) return;

      // Delete the held order
      const res = await fetch("/api/pos/held", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: orderId }),
      });
      if (res.ok) {
        // Load items back into register
        const orderItems = (heldOrder.items || []) as Array<Record<string, unknown>>;
        const loadedItems: LineItem[] = orderItems.map((item: Record<string, unknown>) => ({
          id: crypto.randomUUID(),
          product: {
            id: (item.product_id as string) || "custom-" + Date.now(),
            name: (item.product_name as string) || "Unknown",
            slug: (item.product_slug as string) || "custom",
            price_per_unit_cents: item.unit_price_cents as number,
            unit_label: "ea",
            category_slug: "custom",
            category_name: "Custom",
            delivery_type: "non-bulk",
            min_qty: 1,
            qty_step: 1,
          },
          quantity: item.quantity as number,
          price_cents: item.unit_price_cents as number,
        }));
        setItems(loadedItems);
        setCustomerName(heldOrder.customer_name || "Walk-in");
        setCustomerPhone(heldOrder.customer_phone || "");
        if (heldOrder.delivery_method === "delivery") {
          setDeliveryMethod("delivery");
          setDeliveryAddress(heldOrder.delivery_address || "");
          setDelAddress(heldOrder.delivery_address || "");
          setDeliveryFeeCents(heldOrder.delivery_fee_cents || 0);
        }
        setShowHoldModal(false);
        refreshHeldOrders();
      }
    } catch { /* ignore */ }
  }

  // ── Keyboard shortcuts ───────────────────────────────────────────

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "F1") { e.preventDefault(); document.getElementById("pos-search")?.focus(); }
      if (e.key === "F2") { e.preventDefault(); if (items.length > 0) { setShowCheckout(true); } }
      if (e.key === "F3") { e.preventDefault(); if (items.length > 0) { setShowCheckout(true); } }
      if (e.key === "F4") { e.preventDefault(); if (items.length > 0) { setShowCheckout(true); } }
      if (e.key === "F5") { e.preventDefault(); setShowQuoteBuilder(true); }
      if (e.key === "F6") { e.preventDefault(); if (items.length > 0) { setShowSaveQuote("hold"); } }
      if (e.key === "Escape") { setShowNumpad(null); setShowCashDialog(false); setShowCustomItem(false); setShowNotes(false); setShowEditCustomer(false); setShowDiscountModal(false); setShowHoldModal(false); setShowSaveQuote(null); }
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items.length]);

  // ── Render ───────────────────────────────────────────────────────

  return (
    <div className={`flex h-full w-full overflow-hidden ${t.text}`}>
      {/* Caller ID popup — RingCentral incoming call notifications */}
      {/* Phone Order Modal */}
      {showPhoneOrder && (
        <PhoneOrderModal
          amountCents={cashTotalCents + Math.round(cashTotalCents * 0.03)}
          customerName={delName || customerName}
          customerPhone={delPhone || customerPhone}
          customerEmail={delEmail}
          onClose={() => setShowPhoneOrder(false)}
          onSuccess={(piId) => {
            setShowPhoneOrder(false);
            clearSale();
          }}
        />
      )}

      {/* Save Quote / Hold Modal */}
      {showSaveQuote && (
        <SaveQuoteModal
          items={items}
          customerName={delName || customerName}
          customerPhone={delPhone || customerPhone}
          customerEmail={delEmail}
          customerId={selectedCustomer?.id ?? delCustomerId ?? null}
          deliveryMethod={deliveryMethod}
          deliveryAddress={delAddress || deliveryAddress}
          deliveryFeeCents={deliveryFeeCents}
          deliveryDate={delDate}
          deliveryTimeWindow={delTimeWindow}
          deliveryNotes={delNotes}
          accessConstraints={accessConstraints}
          routeInfo={routeInfo}
          defaultMode={showSaveQuote}
          onClose={() => setShowSaveQuote(null)}
          onSuccess={(result) => {
            setShowSaveQuote(null);
            clearSale();
            setDeliveryFeeCents(0);
            setRouteInfo(null);
            setDelAddress(""); setDelName(""); setDelPhone(""); setDelEmail("");
            setDelDate(""); setDelNotes(""); setDelCustomerId(null); setDelCustomerStatus("");
            setAccessConstraints({});
            setCustomerName("Walk-in"); setCustomerPhone(""); setSelectedCustomer(null);
          }}
        />
      )}

      {/* Quote Builder — full-screen overlay */}
      <QuoteBuilder
        open={showQuoteBuilder}
        onClose={() => setShowQuoteBuilder(false)}
        onSuccess={() => {
          setShowQuoteBuilder(false);
          clearSale();
          setDeliveryFeeCents(0);
          setRouteInfo(null);
          setDelAddress(""); setDelName(""); setDelPhone(""); setDelEmail("");
          setDelDate(""); setDelNotes(""); setDelCustomerId(null); setDelCustomerStatus("");
          setAccessConstraints({});
          setCustomerName("Walk-in"); setCustomerPhone(""); setSelectedCustomer(null);
        }}
        products={products}
        items={items}
        onAddItem={addItem}
        onUpdateQty={updateQuantity}
        onRemoveItem={removeItem}
        onUpdateItemPrice={updateItemPrice}
        customer={{
          name: delName || customerName,
          phone: delPhone || customerPhone,
          email: delEmail,
          id: selectedCustomer?.id ?? delCustomerId ?? null,
        }}
        onCustomerChange={(patch) => {
          if (patch.name !== undefined) { setDelName(patch.name); setCustomerName(patch.name); }
          if (patch.phone !== undefined) { setDelPhone(patch.phone); setCustomerPhone(patch.phone); }
          if (patch.email !== undefined) setDelEmail(patch.email);
          if (patch.id !== undefined) setDelCustomerId(patch.id);
        }}
        delivery={{
          method: deliveryMethod,
          address: delAddress || deliveryAddress,
          feeCents: deliveryFeeCents,
          date: delDate,
          timeWindow: delTimeWindow,
          notes: delNotes,
          constraints: accessConstraints,
          routeInfo,
        }}
        onDeliveryChange={(patch) => {
          if (patch.method !== undefined) setDeliveryMethod(patch.method);
          if (patch.address !== undefined) { setDelAddress(patch.address); setDeliveryAddress(patch.address); }
          if (patch.feeCents !== undefined) setDeliveryFeeCents(patch.feeCents);
          if (patch.date !== undefined) setDelDate(patch.date);
          if (patch.timeWindow !== undefined) setDelTimeWindow(patch.timeWindow);
          if (patch.notes !== undefined) setDelNotes(patch.notes);
          if (patch.constraints !== undefined) setAccessConstraints(patch.constraints);
          if (patch.routeInfo !== undefined) setRouteInfo(patch.routeInfo);
        }}
      />

      {/* New Lead Modal */}
      {showNewLead && (
        <NewLeadModal
          customerName={delName || customerName}
          customerPhone={delPhone || customerPhone}
          customerEmail={delEmail}
          customerAddress={delAddress || deliveryAddress}
          onClose={() => setShowNewLead(false)}
        />
      )}

      {/* Material Calculator Modal */}
      {showMaterialCalc && (
        <MaterialCalculator
          products={products}
          onAddToCart={(product, qty) => addItem(product as any, qty)}
          onClose={() => setShowMaterialCalc(false)}
        />
      )}

      <CallerIdPopup
        onAttachCustomer={(cust) => {
          setCustomerName(cust.name);
          setCustomerPhone(cust.phone);
          setDelName(cust.name);
          setDelPhone(cust.phone);
          setDelEmail(cust.email);
          if (cust.address) { setDelAddress(cust.address); setDeliveryAddress(cust.address); }
          setDelCustomerId(cust.id);
          setDelCustomerStatus("found");
        }}
      />
      {/* ── LEFT: Product Catalog ── */}
      <div className={`flex min-w-0 flex-1 flex-col border-r ${t.border}`}>
        <POSProductGrid
          products={products}
          categories={categories}
          cartQtys={cartQtys}
          onAddProduct={addItem}
          onSetQty={setQtyForProduct}
          onOpenCalculator={() => setShowMaterialCalc(true)}
          onOpenNewLead={() => setShowNewLead(true)}
          theme={t}
        />
      </div>

      {/* ── MIDDLE: Calculator / Delivery ── */}
      <div className={`flex w-[380px] shrink-0 flex-col border-r ${t.border} ${t.bg}`}>
        {/* Tabs */}
        <div className="flex border-b border-zinc-800">
          {([
            { key: "delivery" as MiddleTab, label: "Delivery", icon: Truck },
            { key: "customer" as MiddleTab, label: "Customer", icon: Users },
            { key: "transactions" as MiddleTab, label: "Transactions", icon: ClipboardList },
          ]).map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setMiddleTab(key)}
              className={`flex flex-1 items-center justify-center py-3 transition-colors ${
                middleTab === key
                  ? "border-b-2 border-amber-500 bg-zinc-900 text-amber-400"
                  : "text-zinc-500 hover:bg-zinc-900 hover:text-zinc-300"
              }`}
              title={label}
            >
              <Icon className="h-8 w-8" />
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="flex-1 overflow-y-auto p-4" style={{ scrollbarWidth: "thin", scrollbarColor: "#d97706 transparent" }}>
          {/* Delivery Tab */}
          {middleTab === "delivery" && (
            <div className="space-y-3">
              {/* Customer search */}
              <div className="relative">
                <input
                  type="text"
                  value={delCustSearch}
                  onChange={(e) => {
                    const v = e.target.value;
                    setDelCustSearch(v);
                    if (delCustTimerRef.current) clearTimeout(delCustTimerRef.current);
                    if (v.trim().length >= 2) {
                      setDelCustSearching(true);
                      delCustTimerRef.current = setTimeout(() => {
                        fetch(`/api/pos/customers/search?q=${encodeURIComponent(v.trim())}`)
                          .then(r => r.json())
                          .then(d => setDelCustResults(d.customers || []))
                          .catch(() => setDelCustResults([]))
                          .finally(() => setDelCustSearching(false));
                      }, 300);
                    } else {
                      setDelCustResults([]);
                      setDelCustSearching(false);
                    }
                  }}
                  placeholder="Search customer — name, phone, or address..."
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2.5 text-sm placeholder:text-zinc-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
                {delCustSearching && <div className="absolute right-3 top-3 size-3 animate-spin rounded-full border-2 border-amber-500 border-t-transparent" />}
                {delCustResults.length > 0 && (
                  <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-64 overflow-y-auto rounded-lg border border-zinc-700 bg-zinc-900 shadow-xl">
                    {delCustResults.map((c) => (
                      <button
                        key={c.id}
                        className="flex w-full flex-col gap-0.5 border-b border-zinc-800 px-3 py-2.5 text-left hover:bg-zinc-800 last:border-0"
                        onClick={() => {
                          // Select customer on both delivery + customer tabs
                          selectCustomer(c as any);
                          setDelCustomerId(c.id);
                          setDelCustomerStatus("found");
                          // Auto-calc delivery fee if address available
                          if (c.address) {
                            const fullAddr = c.address + (c.city ? `, ${c.city}` : "") + (c.zip ? ` ${c.zip}` : "");
                            setDelAddress(fullAddr); setDeliveryAddress(fullAddr);
                            setDeliveryMethod("delivery");
                            calculateDeliveryFee(fullAddr);
                          }
                          setDelCustSearch("");
                          setDelCustResults([]);
                        }}
                      >
                        <span className="text-sm font-medium text-zinc-100">
                          {[c.first_name, c.last_name].filter(Boolean).join(" ") || c.company_name || "—"}
                          {c.is_charge_account && <span className="ml-1.5 rounded bg-indigo-900/50 px-1.5 py-0.5 text-[10px] font-semibold text-indigo-300">ACCOUNT</span>}
                        </span>
                        <span className="text-xs text-zinc-400">
                          {c.phone || "no phone"} {c.address ? `· ${c.address}${c.city ? `, ${c.city}` : ""}` : ""}
                        </span>
                        <span className="text-[10px] text-zinc-500">
                          {c.total_orders} orders · ${((c.total_spent_cents || 0) / 100).toFixed(0)} lifetime
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Selected customer indicator */}
              {delCustomerStatus === "found" && delCustomerId && (
                <div className="flex items-center gap-2 rounded-lg border border-green-800/50 bg-green-900/20 px-3 py-2">
                  <div className="size-2 rounded-full bg-green-500" />
                  <span className="flex-1 text-xs text-green-300">{delName}{delPhone ? ` · ${delPhone}` : ""}</span>
                  <button onClick={() => { setDelCustomerId(null); setDelCustomerStatus(""); setDelName(""); setDelPhone(""); setDelEmail(""); setDelAddress(""); setCustomerName("Walk-in"); }} className="text-[10px] text-zinc-500 hover:text-zinc-300">Clear</button>
                </div>
              )}

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
                  onBlur={() => handleDeliveryPhoneLookup(delPhone)}
                  placeholder="(631) 555-0123"
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
                {delCustomerStatus === "found" && <p className="mt-1 text-[11px] text-green-400">Found existing customer</p>}
                {delCustomerStatus === "new" && <p className="mt-1 text-[11px] text-amber-400">New customer — saved on checkout</p>}
              </div>

              {/* Save Customer button */}
              {(delPhone || delName) && (
                <button
                  onClick={handleSaveDeliveryCustomer}
                  disabled={delCustomerStatus === "saving"}
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-800 py-2 text-xs font-medium text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200 disabled:opacity-50"
                >
                  {delCustomerStatus === "saving" ? "Saving..." : delCustomerId ? "Update Customer" : "Save Customer"}
                </button>
              )}

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

              {/* Access Constraints */}
              <div>
                <label className="mb-1.5 block text-xs text-zinc-400">Access Constraints</label>
                <div className="grid grid-cols-2 gap-1.5">
                  {[
                    { key: "low_wires", label: "Low Wires" },
                    { key: "narrow_driveway", label: "Narrow Driveway" },
                    { key: "soft_ground", label: "Soft Ground" },
                    { key: "gated", label: "Gated" },
                    { key: "steep", label: "Steep Approach" },
                    { key: "backyard", label: "Backyard Access" },
                  ].map((c) => (
                    <label key={c.key} className="flex items-center gap-2 rounded-md border border-zinc-800 px-2.5 py-2 cursor-pointer hover:bg-zinc-800/50">
                      <input
                        type="checkbox"
                        checked={!!accessConstraints[c.key]}
                        onChange={(e) => setAccessConstraints((prev) => ({ ...prev, [c.key]: e.target.checked }))}
                        className="size-3.5 rounded border-zinc-600 accent-amber-500"
                      />
                      <span className="text-xs text-zinc-300">{c.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Fee override with +/- buttons */}
              <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-3">
                <p className="mb-2 text-xs text-zinc-500 text-center">Delivery Fee</p>
                <div className="flex items-center justify-center gap-3">
                  <button
                    onClick={() => setDeliveryFeeCents(Math.max(0, deliveryFeeCents - 500))}
                    className="flex size-10 items-center justify-center rounded-lg border border-zinc-700 bg-zinc-800 text-xl font-bold text-zinc-300 hover:bg-zinc-700 active:scale-95"
                  >
                    −
                  </button>
                  <div className="text-center min-w-[80px]">
                    <input
                      type="number"
                      value={deliveryFeeCents / 100 || ""}
                      onChange={(e) => setDeliveryFeeCents(Math.round(parseFloat(e.target.value || "0") * 100))}
                      className="w-20 rounded-lg border border-zinc-700 bg-zinc-800 px-2 py-2 text-center text-lg font-bold text-amber-400 focus:outline-none focus:ring-1 focus:ring-amber-500"
                      step="5"
                    />
                  </div>
                  <button
                    onClick={() => setDeliveryFeeCents(deliveryFeeCents + 500)}
                    className="flex size-10 items-center justify-center rounded-lg border border-zinc-700 bg-zinc-800 text-xl font-bold text-zinc-300 hover:bg-zinc-700 active:scale-95"
                  >
                    +
                  </button>
                </div>
                <button onClick={() => setDeliveryFeeCents(0)} className="mt-2 w-full text-center text-xs text-green-400 hover:underline">Set FREE delivery</button>
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
                    <div className="flex items-center gap-2">
                      <button onClick={() => { setEditCust({ first_name: selectedCustomer.first_name || "", last_name: selectedCustomer.last_name || "", phone: selectedCustomer.phone || "", email: selectedCustomer.email || "", address: selectedCustomer.address || "", city: selectedCustomer.city || "", company_name: (selectedCustomer as Record<string, unknown>).company_name as string || "" }); setShowEditCustomer(true); }} className="text-xs text-amber-400 hover:text-amber-300 flex items-center gap-0.5"><Edit3 className="h-3 w-3" /> Edit</button>
                      <button onClick={() => { setSelectedCustomer(null); setCustomerName("Walk-in"); setCustomerPhone(""); setCustOrders([]); }} className="text-xs text-zinc-500 hover:text-zinc-300">Clear</button>
                    </div>
                  </div>
                  {selectedCustomer.phone && <p className="text-xs text-zinc-400"><a href={`tel:+1${selectedCustomer.phone}`} className="hover:text-amber-400">{selectedCustomer.phone}</a></p>}
                  {selectedCustomer.email && <p className="text-xs text-zinc-500">{selectedCustomer.email}</p>}
                  {selectedCustomer.address && <p className="text-xs text-zinc-500">{selectedCustomer.address}{selectedCustomer.city ? `, ${selectedCustomer.city}` : ""}</p>}
                  {/* Charge account info */}
                  {selectedCustomer.is_charge_account && (
                    <div className="rounded bg-indigo-900/40 border border-indigo-600/30 px-2 py-1.5 text-xs space-y-0.5">
                      <p className="font-semibold text-indigo-300">⚡ Charge Account</p>
                      <div className="flex gap-3 text-zinc-400">
                        <span>Balance: <span className={selectedCustomer.current_balance_cents ? "text-amber-400 font-medium" : "text-zinc-300"}>{formatUsd(selectedCustomer.current_balance_cents ?? 0)}</span></span>
                        {selectedCustomer.credit_limit_cents && <span>Limit: {formatUsd(selectedCustomer.credit_limit_cents)}</span>}
                        {selectedCustomer.payment_terms && <span>{selectedCustomer.payment_terms}</span>}
                      </div>
                    </div>
                  )}
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

              {/* Customer order history */}
              {selectedCustomer && custOrders.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-xs font-semibold text-zinc-400">Order History</p>
                  <div className="max-h-48 overflow-y-auto space-y-1" style={{ scrollbarWidth: "none" }}>
                    {custOrders.map((o) => (
                      <div key={o.id} className="rounded border border-zinc-800 bg-zinc-900 p-2 text-xs">
                        <div className="flex justify-between">
                          <span className="text-zinc-400">{new Date(o.placed_at).toLocaleDateString()}</span>
                          <span className="font-semibold text-amber-400">{formatUsd(o.grand_total_cents)}</span>
                        </div>
                        <div className="mt-1 text-zinc-500">
                          {o.items?.map((item, i) => (
                            <span key={i}>{i > 0 ? " \u00b7 " : ""}{item.quantity} {item.product_name}</span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
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
                  <input ref={newCustAddressRef} type="text" value={newCustAddress} onChange={(e) => setNewCustAddress(e.target.value)} placeholder="Start typing address..." className="w-full rounded border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-amber-500" />
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

          {/* Transactions Tab */}
          {middleTab === "transactions" && (
            <div className="space-y-3">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                <input
                  type="text"
                  value={txnSearch}
                  onChange={(e) => setTxnSearch(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") fetchTransactions(); }}
                  placeholder="Search order #, name, phone..."
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-800 py-2.5 pl-9 pr-3 text-sm focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>

              {/* Date filter */}
              <div className="flex gap-1">
                {(["today", "yesterday", "week", "all"] as const).map((f) => (
                  <button key={f} onClick={() => setTxnDateFilter(f)} className={`rounded px-3 py-1.5 text-xs font-medium ${txnDateFilter === f ? "bg-amber-600 text-white" : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"}`}>
                    {f === "today" ? "Today" : f === "yesterday" ? "Yesterday" : f === "week" ? "This Week" : "All"}
                  </button>
                ))}
              </div>

              {/* Results */}
              {txnLoading ? (
                <p className="text-xs text-zinc-500 text-center py-4">Loading...</p>
              ) : txnResults.length === 0 ? (
                <p className="text-xs text-zinc-500 text-center py-4">No transactions found</p>
              ) : (
                <div className="space-y-1 max-h-[calc(100vh-220px)] overflow-y-auto" style={{ scrollbarWidth: "none" }}>
                  {txnResults.map((txn) => (
                    <button
                      key={txn.id}
                      onClick={() => fetchTxnDetail(txn.id)}
                      className={`w-full rounded-lg border p-2.5 text-left text-xs transition-colors ${
                        selectedTxn === txn.id ? "border-amber-600 bg-amber-900/20" : "border-zinc-800 bg-zinc-900 hover:bg-zinc-800"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{txn.customer_name}</span>
                        <span className="font-semibold text-amber-400">{formatUsd(txn.grand_total_cents)}</span>
                      </div>
                      <div className="mt-1 flex items-center gap-2 text-zinc-500">
                        <span>{formatShortDateTime(txn.placed_at)}</span>
                        <span className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${
                          txn.status === "paid" ? "bg-green-900/30 text-green-400" :
                          txn.status === "confirmed" ? "bg-blue-900/30 text-blue-400" :
                          txn.status === "held" ? "bg-yellow-900/30 text-yellow-400" :
                          "bg-zinc-800 text-zinc-500"
                        }`}>{txn.status}</span>
                        <span className="text-zinc-600">{txn.payment_method}</span>
                        <span className="text-zinc-600">{txn.delivery_method}</span>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {/* Transaction detail */}
              {txnDetail && selectedTxn && (
                <div className="rounded-lg border border-zinc-700 bg-zinc-900 p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold text-zinc-300">Order #{txnDetail.id.slice(0, 8).toUpperCase()}</p>
                    <button onClick={() => { setSelectedTxn(null); setTxnDetail(null); }} className="text-xs text-zinc-500 hover:text-zinc-300">Close</button>
                  </div>

                  {/* Items */}
                  <div className="space-y-1">
                    {txnDetail.items.map((item, i) => (
                      <div key={i} className="flex justify-between text-xs">
                        <span className="text-zinc-400">{item.quantity} x {item.product_name}</span>
                        <span>{formatUsd(item.line_subtotal_cents)}</span>
                      </div>
                    ))}
                  </div>

                  <div className="border-t border-zinc-800 pt-2 space-y-0.5 text-xs">
                    <div className="flex justify-between"><span className="text-zinc-500">Subtotal</span><span>{formatUsd(txnDetail.materials_subtotal_cents)}</span></div>
                    {txnDetail.delivery_total_cents > 0 && <div className="flex justify-between"><span className="text-zinc-500">Delivery</span><span>{formatUsd(txnDetail.delivery_total_cents)}</span></div>}
                    <div className="flex justify-between"><span className="text-zinc-500">Tax</span><span>{formatUsd(txnDetail.tax_cents)}</span></div>
                    {txnDetail.cc_surcharge_cents > 0 && <div className="flex justify-between"><span className="text-zinc-500">CC Fee</span><span>{formatUsd(txnDetail.cc_surcharge_cents)}</span></div>}
                    <div className="flex justify-between font-semibold text-amber-400"><span>Total</span><span>{formatUsd(txnDetail.grand_total_cents)}</span></div>
                  </div>

                  {/* Customer */}
                  <div className="border-t border-zinc-800 pt-2 text-xs space-y-0.5">
                    <p className="font-medium text-zinc-300">{txnDetail.customer_name || "Walk-in"}</p>
                    {txnDetail.customer_phone && (
                      <a href={`tel:${txnDetail.customer_phone}`} className="text-amber-400 hover:underline">{formatPhone(txnDetail.customer_phone)}</a>
                    )}
                    {txnDetail.customer_email && <p className="text-zinc-500">{txnDetail.customer_email}</p>}
                  </div>

                  {/* Delivery */}
                  {txnDetail.delivery_method === "delivery" && (
                    <div className="border-t border-zinc-800 pt-2 text-xs space-y-0.5">
                      <p className="font-medium text-zinc-300">Delivery</p>
                      {txnDetail.delivery_address && <p className="text-zinc-400">{txnDetail.delivery_address}</p>}
                      {(() => {
                        const dd = txnDetail.delivery_date || String((txnDetail.metadata as Record<string, unknown>)?.deliveryDate ?? "");
                        return dd ? <p className="text-zinc-400">{formatDeliveryDate(dd)}</p> : null;
                      })()}
                      {txnDetail.delivery_time_window && <p className="text-zinc-400">{formatTimeWindow(txnDetail.delivery_time_window)}</p>}
                      {txnDetail.delivery_notes && <p className="text-zinc-500">Notes: {txnDetail.delivery_notes}</p>}
                    </div>
                  )}

                  <div className="border-t border-zinc-800 pt-2 text-xs text-zinc-500 space-y-0.5">
                    <p>{formatPaymentMethod(txnDetail.payment_method)} · {txnDetail.status}</p>
                    <p>{formatShortDateTime(txnDetail.placed_at)}</p>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 pt-1">
                    <button onClick={() => {
                      printReceipt({
                        items: txnDetail.items.map(i => ({ product_name: i.product_name, quantity: i.quantity, unit: i.unit, unit_price_cents: i.unit_price_cents, line_total_cents: i.line_subtotal_cents })),
                        subtotal_cents: txnDetail.materials_subtotal_cents,
                        tax_cents: txnDetail.tax_cents,
                        delivery_fee_cents: txnDetail.delivery_total_cents,
                        cc_fee_cents: txnDetail.cc_surcharge_cents,
                        grand_total_cents: txnDetail.grand_total_cents,
                        customer_name: txnDetail.customer_name,
                        customer_phone: txnDetail.customer_phone,
                        delivery_address: txnDetail.delivery_address,
                        delivery_date: txnDetail.delivery_date || (txnDetail.metadata as Record<string, unknown>)?.deliveryDate as string || null,
                        delivery_time_window: txnDetail.delivery_time_window,
                        delivery_notes: txnDetail.delivery_notes,
                        discount_amount_cents: 0,
                      }, txnDetail.payment_method.includes("card") ? "card" : txnDetail.payment_method);
                    }} className="flex-1 rounded bg-zinc-800 px-3 py-1.5 text-xs text-zinc-300 hover:bg-zinc-700 flex items-center justify-center gap-1.5">
                      <Printer className="w-3.5 h-3.5" /> Receipt
                    </button>
                    {txnDetail.delivery_method === "delivery" && (
                      <button onClick={() => {
                        printDeliveryTicket({
                          items: txnDetail.items.filter(i => !i.product_name?.startsWith("Delivery Load")),
                          customer_name: txnDetail.customer_name,
                          customer_phone: txnDetail.customer_phone,
                          delivery_address: txnDetail.delivery_address,
                          delivery_date: txnDetail.delivery_date || (txnDetail.metadata as Record<string, unknown>)?.deliveryDate as string || null,
                          delivery_time_window: txnDetail.delivery_time_window,
                          delivery_notes: txnDetail.delivery_notes,
                          access_constraints: txnDetail.access_constraints,
                          grand_total_cents: txnDetail.grand_total_cents,
                          payment_method: txnDetail.payment_method,
                        });
                      }} className="flex-1 rounded bg-zinc-800 px-3 py-1.5 text-xs text-zinc-300 hover:bg-zinc-700 flex items-center justify-center gap-1.5">
                        <Truck className="w-3.5 h-3.5" /> Delivery Ticket
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── RIGHT: Current Sale ── */}
      <div className={`flex w-[340px] shrink-0 flex-col ${t.card}`}>
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
            {selectedCustomer && (
              <button onClick={() => {
                setSelectedCustomer(null);
                setCustomerName("Walk-in");
                setCustomerPhone("");
                setCustOrders([]);
                setTaxExempt(false);
                setProDiscount(false);
              }} className="ml-2 rounded bg-red-900/30 p-1.5 text-red-400 hover:bg-red-900/50" title="Remove customer">
                <X className="h-4 w-4" />
              </button>
            )}
            <button onClick={() => window.location.href = "/pos/login"} className="text-zinc-500 hover:text-zinc-300" title="Sign out">
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Line items */}
        <div className="flex-1 overflow-y-auto" style={{ scrollbarWidth: "thin", scrollbarColor: "#d97706 transparent" }}>
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
              onClick={() => {
                setDeliveryMethod("pickup");
                setDeliveryFeeCents(0);
                if (selectedCustomer?.tags?.some(t => t === 'contractor' || t === 'pro' || t === 'account-customer')) {
                  setProDiscount(true);
                }
              }}
              className={`flex-1 rounded-lg py-2.5 text-sm font-semibold ${deliveryMethod === "pickup" ? "bg-amber-600 text-white" : "bg-zinc-800 text-zinc-400"}`}
            >
              Pickup
            </button>
            <button
              onClick={() => {
                setDeliveryMethod("delivery");
                setProDiscount(false);
              }}
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
          {proDiscount && (
            <div className="flex justify-between text-green-400">
              <span>Pro Pickup (-5%)</span>
              <span>-{formatUsd(proDiscountCents)}</span>
            </div>
          )}
          {manualDiscountCents > 0 && (
            <div className="flex justify-between text-green-400">
              <span>Discount{discountType === "percentage" ? ` (${discountValue}%)` : ""}</span>
              <span>-{formatUsd(manualDiscountCents)}</span>
            </div>
          )}
          <div className="flex items-center justify-between">
            <span className="text-zinc-400">Tax (8.75%)</span>
            <span>{taxExempt ? "$0.00" : formatUsd(taxCents)}</span>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setTaxExempt(!taxExempt)} className={`rounded px-2 py-0.5 text-[10px] ${taxExempt ? "bg-green-700 text-white" : "bg-zinc-800 text-zinc-500"}`}>
              {taxExempt ? "TAX EXEMPT \u2713" : "Tax Exempt"}
            </button>
            {taxExempt && (
              <input type="text" value={taxExemptCert} onChange={(e) => setTaxExemptCert(e.target.value)} placeholder="Cert #" className="w-24 rounded border border-zinc-700 bg-zinc-800 px-2 py-0.5 text-[10px] focus:outline-none" />
            )}
            <button onClick={() => setShowDiscountModal(true)} className="ml-auto text-[10px] text-amber-400 hover:underline">+ Discount</button>
          </div>
          {deliveryFeeCents > 0 && <div className="flex justify-between"><span className="text-zinc-400">Delivery</span><span>{formatUsd(deliveryFeeCents)}</span></div>}
          <div className="mt-1 border-t border-zinc-700 pt-1">
            <div className="flex justify-between font-semibold">
              <span className="text-zinc-300">Cash/COD Total</span><span>{formatUsd(cashTotalCents)}</span>
            </div>
            <div className="flex justify-between text-xs text-zinc-500">
              <span>CC Fee (3%)</span><span>+{formatUsd(ccFeeCents)}</span>
            </div>
            <div className="flex justify-between text-lg font-bold">
              <span>Card Total</span><span className="text-amber-400">{formatUsd(cardTotalCents)}</span>
            </div>
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

        {/* Action buttons — HOLD / QUOTE / CHECKOUT */}
        <div className="space-y-2 border-t border-zinc-800 p-3">
          {/* Status indicators */}
          <div className="flex items-center justify-center gap-3 text-xs text-zinc-500">
            <span className="flex items-center gap-1">
              <Wifi className={`h-3 w-3 ${terminalStatus === "disconnected" ? "text-red-500" : "text-green-500"}`} />
              {terminalStatus === "simulated" ? "Sim Reader" : terminalStatus === "connected" ? "Reader OK" : "No Reader"}
            </span>
            {!isOnline && (
              <span className="flex items-center gap-1 font-semibold text-amber-400">
                <span className="size-2 rounded-full bg-amber-400 animate-pulse" /> OFFLINE
              </span>
            )}
          </div>

          {/* Primary row: QUOTE + CHECKOUT */}
          <div className="grid grid-cols-[1fr_2fr] gap-2">
            <button
              onClick={() => setShowQuoteBuilder(true)}
              disabled={false}
              className="rounded-lg border border-amber-600/50 bg-amber-900/20 py-3 text-sm font-semibold text-amber-400 hover:bg-amber-900/40 disabled:opacity-30"
            >
              QUOTE
            </button>
            <button
              onClick={() => setShowCheckout(true)}
              disabled={items.length === 0 || processing}
              className="rounded-lg bg-green-600 py-3 text-base font-bold text-white hover:bg-green-500 disabled:opacity-30 active:bg-green-700 transition-colors"
            >
              CHECKOUT {formatUsd(cashTotalCents)}
            </button>
          </div>

          {/* Cancel */}
          <button onClick={clearSale} className="w-full rounded-lg bg-zinc-800/50 py-1.5 text-[11px] text-zinc-500 hover:bg-zinc-800">
            Cancel
          </button>
        </div>
      </div>

      {/* ── OVERLAYS ── */}

      {/* Checkout overlay */}
      {showCheckout && (
        <CheckoutOverlay
          cart={{
            itemCount: items.length,
            customerName: selectedCustomer ? `${selectedCustomer.first_name ?? ""} ${selectedCustomer.last_name ?? ""}`.trim() || delName || customerName : delName || customerName || "Walk-in",
            subtotalCents: subtotalCents,
            deliveryFeeCents: deliveryFeeCents,
            taxCents: taxExempt ? 0 : Math.round((subtotalCents - (proDiscount ? Math.round(subtotalCents * 0.05) : 0) - manualDiscountCents + deliveryFeeCents) * TAX_RATE),
            cashTotalCents: cashTotalCents,
            ccFeeCents: ccFeeCents,
            cardTotalCents: cardTotalCents,
            deliveryAddress: deliveryMethod === "delivery" ? (delAddress || deliveryAddress) : undefined,
            isChargeAccount: !!selectedCustomer?.is_charge_account,
            accountName: (selectedCustomer as any)?.charge_account_name ?? selectedCustomer?.first_name ?? "",
            accountBalance: selectedCustomer?.current_balance_cents ?? 0,
            itemsSummary: items.map((i: any) => `${i.quantity} ${i.product.name}`).join(", "),
          }}
          onPhoneOrder={() => { setShowCheckout(false); setShowPhoneOrder(true); }}
          onComplete={async (payments) => {
            setShowCheckout(false);
            // Map checkout overlay payments to completeSale
            const first = payments[0];
            if (!first) return;
            if (payments.length === 1) {
              // Single payment
              if (first.method === "cash") {
                setCashTendered(String((first.tenderedCents ?? 0) / 100));
                await completeSale("cash");
              } else if (first.method === "cod") {
                await completeSale("cod");
              } else if (first.method === "card_terminal") {
                await completeSale("card");
              } else if (first.method === "account") {
                setShowAccountConfirm(true);
              }
            } else {
              // Split payment — create order directly
              const effectiveTotal = payments.reduce((s, p) => s + p.amountCents, 0);
              const orderPayload: any = {
                items: items.map((i: any) => ({ product_id: i.product.id, product_name: i.product.name, product_slug: i.product.slug, quantity: i.quantity, unit_price_cents: i.price_cents, line_total_cents: i.quantity * i.price_cents })),
                subtotal_cents: subtotalCents, tax_cents: taxExempt ? 0 : Math.round(subtotalCents * TAX_RATE),
                cc_fee_cents: payments.filter(p => p.method === "card_terminal").reduce((s, p) => s + Math.round(p.amountCents * 0.03 / 1.03), 0),
                delivery_fee_cents: deliveryFeeCents, grand_total_cents: effectiveTotal,
                payment_method: "split", delivery_method: deliveryMethod,
                delivery_address: deliveryMethod === "delivery" ? (delAddress || deliveryAddress) : null,
                customer_name: delName || customerName, customer_phone: delPhone || customerPhone || null,
                customer_email: delEmail || null, customer_id: selectedCustomer?.id ?? delCustomerId ?? undefined,
                access_constraints: accessConstraints,
                delivery_date: delDate || null, delivery_time_window: delTimeWindow || null,
                delivery_notes: delNotes || null,
              };
              setProcessing(true);
              const res = await fetch("/api/pos/checkout", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(orderPayload) });
              setProcessing(false);
              if (res.ok) { clearSale(); alert("Split payment complete!"); }
              else alert("Checkout failed");
            }
          }}
          onCancel={() => setShowCheckout(false)}
          onProcessCard={async (amountCents) => {
            try {
              const terminal = terminalRef.current;
              const result = await terminal.collectPayment({ amountCents, orderId: "pending" });
              return result;
            } catch (err) {
              return { success: false, error: err instanceof Error ? err.message : "Card failed" };
            }
          }}
          processing={processing}
        />
      )}

      {/* Quick Quote modal */}
      {showQuoteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70" onClick={() => !quoteSending && setShowQuoteModal(false)}>
          <div className="w-[420px] max-h-[90vh] overflow-y-auto rounded-2xl bg-zinc-900 border border-teal-600/40 p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
            {quoteResult ? (
              <>
                <div className="text-center space-y-2">
                  <div className="mx-auto w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center">
                    <span className="text-green-400 text-xl">✓</span>
                  </div>
                  <h2 className="text-lg font-bold text-white">Quote Sent!</h2>
                  <p className="text-sm text-zinc-400">{quoteResult.quoteNumber}</p>
                  {quoteResult.sent.includes("sms") && <p className="text-xs text-green-400">SMS sent to {selectedCustomer?.phone}</p>}
                  {quoteResult.sent.includes("email") && <p className="text-xs text-green-400">Email sent to {selectedCustomer?.email}</p>}
                  <p className="text-xs text-zinc-500 break-all">{quoteResult.quoteUrl}</p>
                </div>
                <button onClick={() => setShowQuoteModal(false)} className="w-full rounded-lg bg-zinc-800 py-2.5 text-sm text-zinc-300 hover:bg-zinc-700">Close</button>
              </>
            ) : (
              <>
                <h2 className="text-lg font-bold text-white">Quick Quote</h2>

                {/* Customer */}
                <div className="rounded-lg bg-zinc-800 p-3 text-sm">
                  <p className="text-zinc-400">Customer</p>
                  <p className="font-medium text-white">{selectedCustomer?.first_name ?? (selectedCustomer as any)?.company_name ?? "Walk-in"} {selectedCustomer?.last_name ?? ""}</p>
                  {selectedCustomer?.phone && <p className="text-xs text-zinc-500">{selectedCustomer.phone}</p>}
                  {selectedCustomer?.email && <p className="text-xs text-zinc-500">{selectedCustomer.email}</p>}
                  {!selectedCustomer?.phone && !selectedCustomer?.email && (
                    <p className="text-xs text-amber-400 mt-1">Select a customer with phone or email to send</p>
                  )}
                </div>

                {/* Items */}
                {items.length > 0 ? (
                  <div className="space-y-1">
                    <p className="text-xs text-zinc-500 uppercase tracking-wider">Items</p>
                    {items.map((item: any, i: number) => (
                      <div key={i} className="flex justify-between text-sm">
                        <span className="text-zinc-300">{item.quantity}x {item.product.name}</span>
                        <span className="text-white font-medium">{formatUsd(item.quantity * item.price_cents)}</span>
                      </div>
                    ))}
                    <div className="border-t border-zinc-700 pt-2 mt-2 flex justify-between text-sm font-bold">
                      <span className="text-zinc-300">Total (incl. tax)</span>
                      <span className="text-white">{formatUsd(cashTotalCents)}</span>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-zinc-500 text-center py-4">No items in cart. Add products first, or use AI Quote from admin.</p>
                )}

                {/* Deposit + Note */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs text-zinc-500">Deposit ($)</label>
                    <input type="number" value={quoteDeposit} onChange={(e) => setQuoteDeposit(e.target.value)} className="w-full rounded-lg bg-zinc-800 border border-zinc-700 px-3 py-2 text-sm text-white focus:outline-none focus:border-teal-500" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-zinc-500">Valid (days)</label>
                    <input type="number" defaultValue={30} className="w-full rounded-lg bg-zinc-800 border border-zinc-700 px-3 py-2 text-sm text-white focus:outline-none focus:border-teal-500" readOnly />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-zinc-500">Note / Description</label>
                  <input type="text" value={quoteNote} onChange={(e) => setQuoteNote(e.target.value)} placeholder="e.g. driveway mulch refresh" className="w-full rounded-lg bg-zinc-800 border border-zinc-700 px-3 py-2 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-teal-500" />
                </div>

                {/* Send buttons */}
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { label: "Send SMS", via: ["sms"], disabled: !(selectedCustomer?.phone || delPhone || customerPhone) },
                    { label: "Send Email", via: ["email"], disabled: !(selectedCustomer?.email || delEmail) },
                    { label: "Send Both", via: ["sms", "email"], disabled: !(selectedCustomer?.phone || delPhone || customerPhone) && !(selectedCustomer?.email || delEmail) },
                  ].map(({ label, via, disabled }) => (
                    <button
                      key={label}
                      disabled={disabled || quoteSending || items.length === 0}
                      onClick={async () => {
                        setQuoteSending(true);
                        try {
                          const res = await fetch("/api/quotes/quick", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                              items: items.map((i: any) => ({
                                name: i.product.name,
                                quantity: i.quantity,
                                unit: i.product.unit_label ?? "each",
                                unitPriceCents: i.price_cents,
                              })),
                              customer: {
                                name: `${selectedCustomer?.first_name ?? ""} ${selectedCustomer?.last_name ?? ""}`.trim() || delName || customerName || "Customer",
                                phone: selectedCustomer?.phone || delPhone || customerPhone || undefined,
                                email: selectedCustomer?.email || delEmail || undefined,
                                address: selectedCustomer?.address || delAddress || undefined,
                                id: selectedCustomer?.id || delCustomerId || undefined,
                              },
                              deliveryFeeCents: 0,
                              depositCents: Math.round(parseFloat(quoteDeposit || "0") * 100),
                              note: quoteNote,
                              validDays: 30,
                              sendVia: via,
                            }),
                          });
                          const d = await res.json();
                          if (res.ok) {
                            setQuoteResult({ quoteNumber: d.quote.quoteNumber, quoteUrl: d.quote.quoteUrl, sent: d.sent });
                          } else {
                            alert(d.error ?? "Failed to create quote");
                          }
                        } catch { alert("Failed to create quote"); }
                        setQuoteSending(false);
                      }}
                      className="rounded-lg bg-teal-700 py-2.5 text-xs font-bold text-white hover:bg-teal-600 disabled:opacity-30"
                    >
                      {quoteSending ? "..." : label}
                    </button>
                  ))}
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    disabled={quoteSending || items.length === 0}
                    onClick={async () => {
                      setQuoteSending(true);
                      const res = await fetch("/api/quotes/quick", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          items: items.map((i: any) => ({ name: i.product.name, quantity: i.quantity, unit: i.product.unit_label ?? "each", unitPriceCents: i.price_cents })),
                          customer: { name: `${selectedCustomer?.first_name ?? ""} ${selectedCustomer?.last_name ?? ""}`.trim() || "Customer", phone: selectedCustomer?.phone, email: selectedCustomer?.email },
                          depositCents: Math.round(parseFloat(quoteDeposit || "0") * 100),
                          note: quoteNote,
                          validDays: 30,
                        }),
                      });
                      const d = await res.json();
                      setQuoteSending(false);
                      if (res.ok) setQuoteResult({ quoteNumber: d.quote.quoteNumber, quoteUrl: d.quote.quoteUrl, sent: [] });
                      else alert(d.error ?? "Failed");
                    }}
                    className="rounded-lg bg-zinc-800 py-2 text-xs text-zinc-400 hover:bg-zinc-700 disabled:opacity-30"
                  >
                    Save as Draft
                  </button>
                  <button onClick={() => setShowQuoteModal(false)} className="rounded-lg bg-zinc-800 py-2 text-xs text-zinc-400 hover:bg-zinc-700">Cancel</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Account charge confirm */}
      {showAccountConfirm && selectedCustomer?.is_charge_account && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70" onClick={() => setShowAccountConfirm(false)}>
          <div className="w-80 rounded-2xl bg-zinc-900 border border-indigo-600/40 p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
            <p className="text-sm font-semibold text-indigo-300">Charge to Account</p>
            <div className="rounded-lg bg-zinc-800 p-3 space-y-1 text-sm">
              <p className="font-bold text-white">{selectedCustomer.charge_account_name ?? [selectedCustomer.first_name, selectedCustomer.last_name].filter(Boolean).join(" ")}</p>
              <p className="text-zinc-400">Charge amount: <span className="text-white font-semibold">{formatUsd(cashTotalCents)}</span></p>
              <p className="text-zinc-400">New balance: <span className="text-amber-400 font-semibold">{formatUsd((selectedCustomer.current_balance_cents ?? 0) + cashTotalCents)}</span></p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setShowAccountConfirm(false)} className="flex-1 rounded-lg bg-zinc-800 py-2.5 text-sm text-zinc-400 hover:bg-zinc-700">Cancel</button>
              <button
                onClick={() => { setShowAccountConfirm(false); setPaymentMethod("account"); completeSale("account"); }}
                disabled={processing}
                className="flex-1 rounded-lg bg-indigo-700 py-2.5 text-sm font-bold text-white hover:bg-indigo-600"
              >
                Confirm Charge
              </button>
            </div>
          </div>
        </div>
      )}

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
              Total: {formatUsd(cashTotalCents)}
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
            {cashTendered && parseFloat(cashTendered) * 100 >= cashTotalCents && (
              <p className="mt-2 text-lg font-semibold text-green-400">
                Change: {formatUsd(Math.round(parseFloat(cashTendered) * 100) - cashTotalCents)}
              </p>
            )}
            <button
              onClick={() => completeSale("cash")}
              disabled={!cashTendered || parseFloat(cashTendered) * 100 < cashTotalCents || processing}
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

      {/* Discount modal */}
      {showDiscountModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70" onClick={() => setShowDiscountModal(false)}>
          <div className="w-80 rounded-2xl bg-zinc-900 p-6" onClick={(e) => e.stopPropagation()}>
            <p className="text-lg font-bold">Apply Discount</p>
            <div className="mt-3 flex gap-2">
              <button onClick={() => setDiscountType("percentage")} className={`flex-1 rounded py-2 text-sm ${discountType === "percentage" ? "bg-amber-600 text-white" : "bg-zinc-800 text-zinc-400"}`}>Percentage</button>
              <button onClick={() => setDiscountType("amount")} className={`flex-1 rounded py-2 text-sm ${discountType === "amount" ? "bg-amber-600 text-white" : "bg-zinc-800 text-zinc-400"}`}>Amount ($)</button>
            </div>
            <input type="number" value={discountValue} onChange={(e) => setDiscountValue(e.target.value)} placeholder={discountType === "percentage" ? "e.g. 10" : "e.g. 25.00"} className="mt-3 w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-3 text-xl focus:outline-none focus:ring-2 focus:ring-amber-500" autoFocus />
            <input type="text" value={discountReason} onChange={(e) => setDiscountReason(e.target.value)} placeholder="Reason (required)" className="mt-2 w-full rounded border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm focus:outline-none" />
            {manualDiscountCents > 0 && <p className="mt-2 text-sm text-amber-400">Discount: {formatUsd(manualDiscountCents)}</p>}
            <div className="mt-4 flex gap-2">
              <button onClick={() => setShowDiscountModal(false)} disabled={!discountValue || !discountReason} className="flex-1 rounded-lg bg-amber-600 py-3 font-bold text-white hover:bg-amber-500 disabled:opacity-30">Apply</button>
              <button onClick={() => { setDiscountValue(""); setDiscountReason(""); setShowDiscountModal(false); }} className="rounded-lg bg-zinc-800 px-4 py-3 text-zinc-400">Clear</button>
            </div>
          </div>
        </div>
      )}

      {/* Hold order modal */}
      {showHoldModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70" onClick={() => setShowHoldModal(false)}>
          <div className="w-96 rounded-2xl bg-zinc-900 p-6" onClick={(e) => e.stopPropagation()}>
            <p className="text-lg font-bold">Hold Order</p>
            <p className="text-sm text-zinc-400 mt-1">{items.length} items &middot; {formatUsd(subtotalCents)}</p>
            <textarea value={holdReason} onChange={(e) => setHoldReason(e.target.value)} placeholder="Note (optional): e.g. 'Quote for Smith'" rows={2} className="mt-3 w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-amber-500" autoFocus />
            <button onClick={holdOrder} disabled={items.length === 0} className="mt-3 w-full rounded-lg bg-amber-600 py-3 font-bold text-white hover:bg-amber-500 disabled:opacity-30">Hold Order</button>

            {heldOrders.length > 0 && (
              <>
                <p className="mt-4 text-xs font-semibold text-zinc-400">Held Orders ({heldOrders.length})</p>
                <div className="mt-2 max-h-40 space-y-1 overflow-y-auto" style={{ scrollbarWidth: "none" }}>
                  {heldOrders.map((h) => (
                    <div key={h.id} className="flex items-center justify-between rounded border border-zinc-800 bg-zinc-900/50 p-2 text-xs">
                      <div>
                        <p className="font-medium">{h.customer_name} &middot; {formatUsd(h.total_cents)}</p>
                        <p className="text-zinc-500">{h.reason} &middot; {new Date(h.held_at).toLocaleTimeString()}</p>
                      </div>
                      <button onClick={() => resumeHeldOrder(h.id)} className="rounded bg-amber-600/20 px-2 py-1 text-amber-400 hover:bg-amber-600/30">Resume</button>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Edit customer modal */}
      {showEditCustomer && selectedCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70" onClick={() => setShowEditCustomer(false)}>
          <div className="w-96 rounded-2xl bg-zinc-900 p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <p className="text-lg font-bold">Edit Customer</p>
              <button onClick={() => setShowEditCustomer(false)} className="text-zinc-500 hover:text-zinc-300"><X className="h-5 w-5" /></button>
            </div>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs text-zinc-400">First Name</label>
                  <input type="text" value={editCust.first_name} onChange={(e) => setEditCust({ ...editCust, first_name: e.target.value })} className="w-full rounded border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-amber-500" />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-zinc-400">Last Name</label>
                  <input type="text" value={editCust.last_name} onChange={(e) => setEditCust({ ...editCust, last_name: e.target.value })} className="w-full rounded border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-amber-500" />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-xs text-zinc-400">Phone</label>
                <input type="tel" value={editCust.phone} onChange={(e) => setEditCust({ ...editCust, phone: e.target.value })} className="w-full rounded border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-amber-500" />
              </div>
              <div>
                <label className="mb-1 block text-xs text-zinc-400">Email</label>
                <input type="email" value={editCust.email} onChange={(e) => setEditCust({ ...editCust, email: e.target.value })} className="w-full rounded border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-amber-500" />
              </div>
              <div>
                <label className="mb-1 block text-xs text-zinc-400">Address</label>
                <input type="text" value={editCust.address} onChange={(e) => setEditCust({ ...editCust, address: e.target.value })} className="w-full rounded border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-amber-500" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs text-zinc-400">City</label>
                  <input type="text" value={editCust.city} onChange={(e) => setEditCust({ ...editCust, city: e.target.value })} className="w-full rounded border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-amber-500" />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-zinc-400">Company</label>
                  <input type="text" value={editCust.company_name} onChange={(e) => setEditCust({ ...editCust, company_name: e.target.value })} className="w-full rounded border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-amber-500" />
                </div>
              </div>
              {selectedCustomer.tags.length > 0 && (
                <div>
                  <label className="mb-1 block text-xs text-zinc-400">Tags</label>
                  <div className="flex flex-wrap gap-1">
                    {selectedCustomer.tags.map((tag) => (
                      <span key={tag} className="rounded bg-zinc-800 px-1.5 py-0.5 text-[10px] text-zinc-500">{tag}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <button onClick={saveEditCustomer} className="mt-4 w-full rounded-lg bg-amber-600 py-3 font-bold text-white hover:bg-amber-500">
              Save Changes
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
