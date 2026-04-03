"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { MapPin, Phone, Search, ShoppingCart, Tag, User, CreditCard, ChevronDown, ChevronUp, AlertTriangle, Shield } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type OrderHistoryItem = {
  wc_order_id: number;
  order_date: string;
  order_total_cents: number;
  items: Array<{ name: string; quantity: number; costCents: number }>;
  delivery_address: string | null;
  payment_method: string | null;
};

type Customer = {
  id: string;
  phone: string | null;
  email: string | null;
  first_name: string | null;
  last_name: string | null;
  company_name: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  tags: string[];
  total_orders: number;
  total_spent_cents: number;
  first_order_at: string | null;
  last_order_at: string | null;
  recent_orders: OrderHistoryItem[];
  // Charge account fields
  is_charge_account: boolean | null;
  charge_account_name: string | null;
  credit_limit_cents: number | null;
  payment_terms: string | null;
  billing_email: string | null;
  billing_address: string | null;
  current_balance_cents: number | null;
  is_scammer: boolean;
  scammer_note: string | null;
};

function formatUsd(cents: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);
}

function formatPhone(phone: string) {
  if (phone.length === 10) return `(${phone.slice(0, 3)}) ${phone.slice(3, 6)}-${phone.slice(6)}`;
  return phone;
}

const TAG_COLORS: Record<string, string> = {
  repeat: "bg-green-100 text-green-800",
  "high-value": "bg-amber-100 text-amber-800",
  contractor: "bg-blue-100 text-blue-800",
  "account-customer": "bg-purple-100 text-purple-800",
  "mulch-buyer": "bg-emerald-100 text-emerald-800",
  "gravel-buyer": "bg-stone-200 text-stone-800",
  "mason-buyer": "bg-orange-100 text-orange-800",
};

export default function AdminCustomersPage() {
  const [query, setQuery] = useState("");
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showChargeEdit, setShowChargeEdit] = useState(false);
  const [chargeForm, setChargeForm] = useState({
    is_charge_account: false,
    charge_account_name: "",
    credit_limit_cents: "",
    payment_terms: "Net 30",
    billing_email: "",
    billing_address: "",
  });
  const [savingCharge, setSavingCharge] = useState(false);
  const [showFlagged, setShowFlagged] = useState(false);
  const [flaggedCustomers, setFlaggedCustomers] = useState<Customer[]>([]);
  const [loadingFlagged, setLoadingFlagged] = useState(false);

  const search = useCallback(async () => {
    if (query.trim().length < 2) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/customers/search?q=${encodeURIComponent(query.trim())}`);
      if (res.ok) {
        const data = await res.json();
        setCustomers(data.customers ?? []);
      }
    } finally {
      setLoading(false);
    }
  }, [query]);

  const selected = customers.find((c) => c.id === selectedId) || flaggedCustomers.find((c) => c.id === selectedId);

  function openChargeEdit(c: Customer) {
    setChargeForm({
      is_charge_account: c.is_charge_account ?? false,
      charge_account_name: c.charge_account_name ?? c.company_name ?? "",
      credit_limit_cents: c.credit_limit_cents ? (c.credit_limit_cents / 100).toFixed(0) : "",
      payment_terms: c.payment_terms ?? "Net 30",
      billing_email: c.billing_email ?? c.email ?? "",
      billing_address: c.billing_address ?? [c.address, c.city, c.state, c.zip].filter(Boolean).join(", ") ?? "",
    });
    setShowChargeEdit(true);
  }

  async function saveChargeAccount() {
    if (!selectedId) return;
    setSavingCharge(true);
    await fetch(`/api/admin/customers/${selectedId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        is_charge_account: chargeForm.is_charge_account,
        charge_account_name: chargeForm.charge_account_name || null,
        credit_limit_cents: chargeForm.credit_limit_cents ? Math.round(parseFloat(chargeForm.credit_limit_cents) * 100) : null,
        payment_terms: chargeForm.payment_terms || "Net 30",
        billing_email: chargeForm.billing_email || null,
        billing_address: chargeForm.billing_address || null,
      }),
    });
    // Refresh search results to pick up new values
    const res = await fetch(`/api/admin/customers/search?q=${encodeURIComponent(query.trim())}`);
    if (res.ok) {
      const data = await res.json();
      setCustomers(data.customers ?? []);
    }
    setSavingCharge(false);
    setShowChargeEdit(false);
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Customer Search</h1>
      <p className="text-sm text-muted-foreground">Search by phone number, name, address, or company.</p>

      {/* Flagged filter toggle */}
      <div className="flex gap-2">
        <button onClick={() => { setShowFlagged(false); }} className={`rounded-lg px-3 py-1.5 text-sm font-medium ${!showFlagged ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}>All Customers</button>
        <button onClick={async () => {
          setShowFlagged(true);
          setLoadingFlagged(true);
          const res = await fetch("/api/admin/customers/search?flagged=true");
          if (res.ok) { const data = await res.json(); setFlaggedCustomers(data.customers ?? []); }
          setLoadingFlagged(false);
        }} className={`rounded-lg px-3 py-1.5 text-sm font-medium flex items-center gap-1.5 ${showFlagged ? "bg-red-600 text-white" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}>
          <AlertTriangle className="size-3.5" /> Flagged
        </button>
      </div>

      {/* Search bar */}
      {!showFlagged && <form onSubmit={(e) => { e.preventDefault(); search(); }} className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Phone, name, or address..."
            className="pl-9 text-base"
            autoFocus
          />
        </div>
        <Button type="submit" disabled={loading || query.trim().length < 2}>
          {loading ? "Searching..." : "Search"}
        </Button>
      </form>}

      <div className="grid gap-4 lg:grid-cols-[1fr_1.2fr]">
        {/* Results list */}
        <div className="space-y-1">
          {(() => {
            const displayList = showFlagged ? flaggedCustomers : customers;
            const isLoading = showFlagged ? loadingFlagged : loading;
            if (isLoading) return <p className="py-8 text-center text-sm text-muted-foreground">Loading...</p>;
            if (displayList.length === 0) {
              if (showFlagged) return <p className="py-8 text-center text-sm text-muted-foreground">No flagged customers</p>;
              if (query) return <p className="py-8 text-center text-sm text-muted-foreground">No customers found for &ldquo;{query}&rdquo;</p>;
              return null;
            }
            return displayList.map((c) => {
              const name = c.company_name || `${c.first_name || ""} ${c.last_name || ""}`.trim() || "(unnamed)";
              const isSelected = selectedId === c.id;
              return (
                <button
                  key={c.id}
                  onClick={() => setSelectedId(isSelected ? null : c.id)}
                  className={`flex w-full items-start gap-3 rounded-lg border p-3 text-left transition-colors ${c.is_scammer ? "border-red-500/30" : ""} ${isSelected ? "border-accent bg-accent/5" : "hover:bg-muted/50"}`}
                >
                  <User className={`mt-0.5 size-4 shrink-0 ${c.is_scammer ? "text-red-500" : "text-muted-foreground"}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold truncate">{name}</p>
                      {c.is_scammer && <span className="rounded bg-red-100 px-1.5 py-0.5 text-[10px] font-bold text-red-700 dark:bg-red-900/40 dark:text-red-400">FRAUD</span>}
                    </div>
                    <div className="flex flex-wrap gap-x-3 text-xs text-muted-foreground">
                      {c.phone && <span>{formatPhone(c.phone)}</span>}
                      {c.city && <span>{c.city}</span>}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-semibold">{c.total_orders} orders</p>
                    <p className="text-xs text-muted-foreground">{formatUsd(c.total_spent_cents)}</p>
                  </div>
                </button>
              );
            });
          })()}
        </div>

        {/* Customer detail */}
        {selected && (
          <div className="rounded-lg border bg-card p-5 space-y-5 lg:sticky lg:top-20 lg:self-start">
            {/* Scammer warning */}
            {selected.is_scammer && (
              <div className="rounded-lg border border-red-500 bg-red-50 dark:bg-red-950/30 p-3 space-y-2">
                <p className="text-sm font-bold text-red-700 dark:text-red-400 flex items-center gap-2">
                  <AlertTriangle className="size-4" /> FRAUD FLAG
                </p>
                {selected.scammer_note && <p className="text-xs text-red-600 dark:text-red-300">{selected.scammer_note}</p>}
                <button
                  onClick={async () => {
                    if (!confirm("Remove fraud flag from this customer? This will allow their quotes to work again.")) return;
                    await fetch(`/api/admin/customers/${selected.id}`, {
                      method: "PATCH",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ is_scammer: false, scammer_note: null }),
                    });
                    // Refresh
                    if (showFlagged) {
                      setFlaggedCustomers(prev => prev.map(c => c.id === selected.id ? { ...c, is_scammer: false, scammer_note: null } : c));
                    }
                    setCustomers(prev => prev.map(c => c.id === selected.id ? { ...c, is_scammer: false, scammer_note: null } : c));
                  }}
                  className="rounded border border-red-300 dark:border-red-700 px-3 py-1 text-xs font-medium text-red-700 dark:text-red-300 hover:bg-red-100 dark:hover:bg-red-900/30"
                >
                  <Shield className="inline size-3 mr-1" /> Remove Fraud Flag
                </button>
              </div>
            )}

            <div>
              <h2 className="text-lg font-semibold">
                {selected.company_name || `${selected.first_name || ""} ${selected.last_name || ""}`.trim() || "(unnamed)"}
              </h2>
              {selected.company_name && selected.first_name && (
                <p className="text-sm text-muted-foreground">{selected.first_name} {selected.last_name}</p>
              )}
            </div>

            {/* Contact */}
            <div className="grid gap-2 sm:grid-cols-2 text-sm">
              {selected.phone && (
                <a href={`tel:+1${selected.phone}`} className="flex items-center gap-2 font-medium text-accent hover:underline">
                  <Phone className="size-4" /> {formatPhone(selected.phone)}
                </a>
              )}
              {selected.email && (
                <a href={`mailto:${selected.email}`} className="flex items-center gap-2 text-muted-foreground hover:text-accent truncate">
                  {selected.email}
                </a>
              )}
              {selected.address && (
                <p className="flex items-start gap-2 text-muted-foreground sm:col-span-2">
                  <MapPin className="mt-0.5 size-4 shrink-0" />
                  {selected.address}{selected.city ? `, ${selected.city}` : ""}{selected.state ? `, ${selected.state}` : ""} {selected.zip}
                </p>
              )}
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-3 rounded-lg bg-muted/50 p-3 text-center">
              <div>
                <p className="text-lg font-bold">{selected.total_orders}</p>
                <p className="text-xs text-muted-foreground">Orders</p>
              </div>
              <div>
                <p className="text-lg font-bold">{formatUsd(selected.total_spent_cents)}</p>
                <p className="text-xs text-muted-foreground">Lifetime</p>
              </div>
              <div>
                <p className="text-lg font-bold">{selected.last_order_at ? new Date(selected.last_order_at).toLocaleDateString("en-US", { month: "short", year: "2-digit" }) : "—"}</p>
                <p className="text-xs text-muted-foreground">Last Order</p>
              </div>
            </div>

            {/* Tags */}
            {selected.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {selected.tags.map((tag) => (
                  <Badge key={tag} className={`border-0 ${TAG_COLORS[tag] || "bg-gray-100 text-gray-700"}`}>
                    <Tag className="mr-1 size-3" />{tag}
                  </Badge>
                ))}
              </div>
            )}

            {/* Order history */}
            <div>
              <h3 className="mb-2 text-sm font-semibold">Order History</h3>
              {selected.recent_orders.length > 0 ? (
                <div className="space-y-2 max-h-80 overflow-y-auto">
                  {selected.recent_orders.map((order, i) => (
                    <div key={`${order.wc_order_id}-${i}`} className="rounded-lg border bg-background p-3 text-sm">
                      <div className="flex justify-between">
                        <span className="font-medium">#{order.wc_order_id}</span>
                        <span className="font-semibold">{formatUsd(order.order_total_cents)}</span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {new Date(order.order_date).toLocaleDateString()} &middot; {order.payment_method || "card"}
                      </p>
                      {order.items && order.items.length > 0 && (
                        <div className="mt-1.5 space-y-0.5">
                          {order.items.slice(0, 5).map((item, j) => (
                            <p key={j} className="text-xs text-muted-foreground">{item.name} &times; {item.quantity}</p>
                          ))}
                          {order.items.length > 5 && <p className="text-xs text-muted-foreground">+{order.items.length - 5} more</p>}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : <p className="text-sm text-muted-foreground">No order history available</p>}
            </div>

            {/* Charge Account */}
            <div className="border-t pt-4">
              <button
                className="flex w-full items-center justify-between text-sm font-semibold"
                onClick={() => showChargeEdit ? setShowChargeEdit(false) : openChargeEdit(selected)}
              >
                <span className="flex items-center gap-2">
                  <CreditCard className="size-4" />
                  Charge Account
                  {selected.is_charge_account && (
                    <span className="ml-1 rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-medium text-indigo-700">Active</span>
                  )}
                </span>
                {showChargeEdit ? <ChevronUp className="size-4 text-muted-foreground" /> : <ChevronDown className="size-4 text-muted-foreground" />}
              </button>

              {!showChargeEdit && selected.is_charge_account && (
                <div className="mt-2 space-y-0.5 text-xs text-muted-foreground">
                  {selected.charge_account_name && <p className="font-medium text-foreground">{selected.charge_account_name}</p>}
                  <p>Balance: <span className="font-medium text-foreground">{formatUsd(selected.current_balance_cents ?? 0)}</span>
                    {selected.credit_limit_cents ? ` / ${formatUsd(selected.credit_limit_cents)} limit` : ""}
                  </p>
                  <p>Terms: {selected.payment_terms ?? "Net 30"}</p>
                </div>
              )}

              {showChargeEdit && (
                <div className="mt-3 space-y-3 rounded-lg border bg-muted/30 p-4">
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={chargeForm.is_charge_account}
                      onChange={(e) => setChargeForm((f) => ({ ...f, is_charge_account: e.target.checked }))}
                      className="rounded"
                    />
                    Enable charge account
                  </label>
                  {chargeForm.is_charge_account && (
                    <>
                      <div className="space-y-1">
                        <label className="text-xs text-muted-foreground">Account Name</label>
                        <Input value={chargeForm.charge_account_name} onChange={(e) => setChargeForm((f) => ({ ...f, charge_account_name: e.target.value }))} placeholder="GP Landscape Design" />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <label className="text-xs text-muted-foreground">Credit Limit ($)</label>
                          <Input value={chargeForm.credit_limit_cents} onChange={(e) => setChargeForm((f) => ({ ...f, credit_limit_cents: e.target.value }))} placeholder="5000" />
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs text-muted-foreground">Terms</label>
                          <select
                            value={chargeForm.payment_terms}
                            onChange={(e) => setChargeForm((f) => ({ ...f, payment_terms: e.target.value }))}
                            className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                          >
                            <option>Net 15</option>
                            <option>Net 30</option>
                            <option>Net 45</option>
                            <option>Net 60</option>
                            <option>Due on Receipt</option>
                          </select>
                        </div>
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs text-muted-foreground">Billing Email</label>
                        <Input type="email" value={chargeForm.billing_email} onChange={(e) => setChargeForm((f) => ({ ...f, billing_email: e.target.value }))} placeholder="billing@company.com" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs text-muted-foreground">Billing Address</label>
                        <Input value={chargeForm.billing_address} onChange={(e) => setChargeForm((f) => ({ ...f, billing_address: e.target.value }))} placeholder="123 Main St, City, NY 11934" />
                      </div>
                    </>
                  )}
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="flex-1" onClick={() => setShowChargeEdit(false)}>Cancel</Button>
                    <Button size="sm" className="flex-1" onClick={saveChargeAccount} disabled={savingCharge}>
                      {savingCharge ? "Saving…" : "Save"}
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {/* Contractor Discount */}
            <div className="border-t pt-4">
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={(selected as any).contractor_discount ?? false}
                  onChange={async (e) => {
                    const val = e.target.checked;
                    await fetch(`/api/admin/customers/${selected.id}`, {
                      method: "PATCH",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ contractor_discount: val }),
                    });
                    setCustomers(prev => prev.map(c => c.id === selected.id ? { ...c, contractor_discount: val } as any : c));
                    setFlaggedCustomers(prev => prev.map(c => c.id === selected.id ? { ...c, contractor_discount: val } as any : c));
                  }}
                  className="rounded"
                />
                <span className="font-medium">5% Contractor Pickup Discount</span>
              </label>
              <p className="text-xs text-muted-foreground mt-1">Auto-applies 5% discount on pickup orders at POS</p>
            </div>

            <Button asChild className="w-full">
              <Link href={`/shop`}>
                <ShoppingCart className="size-4" /> Start New Order
              </Link>
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
