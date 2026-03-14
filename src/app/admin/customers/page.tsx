"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { MapPin, Phone, Search, ShoppingCart, Tag, User } from "lucide-react";
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

  const selected = customers.find((c) => c.id === selectedId);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Customer Search</h1>
      <p className="text-sm text-muted-foreground">Search by phone number, name, address, or company.</p>

      {/* Search bar */}
      <form onSubmit={(e) => { e.preventDefault(); search(); }} className="flex gap-2">
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
      </form>

      <div className="grid gap-4 lg:grid-cols-[1fr_1.2fr]">
        {/* Results list */}
        <div className="space-y-1">
          {customers.length > 0 ? customers.map((c) => {
            const name = c.company_name || `${c.first_name || ""} ${c.last_name || ""}`.trim() || "(unnamed)";
            const isSelected = selectedId === c.id;
            return (
              <button
                key={c.id}
                onClick={() => setSelectedId(isSelected ? null : c.id)}
                className={`flex w-full items-start gap-3 rounded-lg border p-3 text-left transition-colors ${isSelected ? "border-accent bg-accent/5" : "hover:bg-muted/50"}`}
              >
                <User className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate">{name}</p>
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
          }) : query && !loading ? (
            <p className="py-8 text-center text-sm text-muted-foreground">No customers found for &ldquo;{query}&rdquo;</p>
          ) : null}
        </div>

        {/* Customer detail */}
        {selected && (
          <div className="rounded-lg border bg-card p-5 space-y-5 lg:sticky lg:top-20 lg:self-start">
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
