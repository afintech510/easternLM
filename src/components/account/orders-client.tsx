"use client";

import Link from "next/link";
import { useState } from "react";
import { ChevronDown, Package, RotateCcw, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCartStore } from "@/stores/cartStore";

type OrderItem = {
  product_name: string;
  quantity: number;
  unit_price_cents: number;
  delivery_type: string;
  material_class: string;
};

type AccountOrder = {
  id: string;
  status: string;
  delivery_method: string;
  grand_total_cents: number;
  materials_subtotal_cents: number;
  delivery_fee_cents: number;
  tax_cents: number;
  placed_at: string;
  created_at: string;
  customer_name: string | null;
  delivery_address: string | null;
  order_items: OrderItem[];
};

function formatUsd(cents: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);
}

const STATUS_STYLES: Record<string, string> = {
  paid: "bg-green-100 text-green-800 border-green-200",
  pending: "bg-yellow-100 text-yellow-800 border-yellow-200",
  processing: "bg-blue-100 text-blue-800 border-blue-200",
  delivered: "bg-green-200 text-green-900 border-green-300",
  cancelled: "bg-gray-100 text-gray-600 border-gray-200",
  expired: "bg-red-100 text-red-700 border-red-200",
};

export function OrdersClient() {
  const [email, setEmail] = useState("");
  const [orders, setOrders] = useState<AccountOrder[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const addItem = useCartStore((s) => s.addItem);

  async function loadOrders() {
    setError(null);
    setIsLoading(true);
    try {
      const response = await fetch(`/api/account/orders?email=${encodeURIComponent(email.trim())}`, { cache: "no-store" });
      const body = (await response.json()) as { orders?: AccountOrder[]; error?: string };
      if (!response.ok) throw new Error(body.error ?? "Failed to load orders.");
      setOrders(body.orders ?? []);
    } catch (err) {
      setOrders([]);
      setError(err instanceof Error ? err.message : "Failed to load orders.");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleReorder(order: AccountOrder) {
    for (const item of order.order_items || []) {
      await addItem({
        id: `reorder-${item.product_name}-${Date.now()}`,
        name: item.product_name,
        quantity: item.quantity,
        unitPriceCents: item.unit_price_cents,
        deliveryType: (item.delivery_type as "bulk" | "non-bulk") || "bulk",
        materialClass: (item.material_class as "mulch" | "default") || "default",
      });
    }
    window.location.href = "/cart";
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-12 md:py-16">
      <header className="mb-8">
        <h1 className="[font-family:var(--font-display)] text-3xl text-primary">Order History</h1>
        <p className="mt-1 text-sm text-muted-foreground">Enter the email you used at checkout to view your orders.</p>
      </header>

      {/* Email lookup */}
      <form
        onSubmit={(e) => { e.preventDefault(); loadOrders(); }}
        className="mb-8 flex gap-2 rounded-xl border bg-card p-4"
      >
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="pl-9"
          />
        </div>
        <Button type="submit" disabled={isLoading || email.trim().length < 5}>
          {isLoading ? "Loading..." : "Find Orders"}
        </Button>
      </form>

      {error && <p className="mb-4 text-sm text-destructive">{error}</p>}

      {/* Orders list */}
      {orders.length > 0 ? (
        <div className="space-y-3">
          {orders.map((order) => {
            const isExpanded = expandedId === order.id;
            const date = new Date(order.placed_at ?? order.created_at);
            return (
              <article key={order.id} className="rounded-xl border bg-card overflow-hidden">
                {/* Header row */}
                <button
                  className="flex w-full items-center gap-4 p-4 text-left hover:bg-muted/30"
                  onClick={() => setExpandedId(isExpanded ? null : order.id)}
                >
                  <Package className="size-5 shrink-0 text-muted-foreground" />
                  <div className="flex-1">
                    <p className="text-sm font-semibold">
                      {date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {order.delivery_method} &middot; {order.order_items?.length || 0} item{(order.order_items?.length || 0) !== 1 ? "s" : ""}
                    </p>
                  </div>
                  <span className="text-sm font-bold">{formatUsd(order.grand_total_cents)}</span>
                  <Badge className={`border ${STATUS_STYLES[order.status] || "bg-gray-100 text-gray-600"}`}>
                    {order.status}
                  </Badge>
                  <ChevronDown className={`size-4 text-muted-foreground transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                </button>

                {/* Expanded details */}
                {isExpanded && (
                  <div className="border-t p-4 space-y-4">
                    {/* Items */}
                    <div>
                      <h3 className="mb-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">Items</h3>
                      <div className="space-y-1.5">
                        {(order.order_items || []).map((item, i) => (
                          <div key={i} className="flex justify-between text-sm">
                            <span>{item.product_name} &times; {item.quantity}</span>
                            <span className="font-medium">{formatUsd(Math.round(item.quantity * item.unit_price_cents))}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Breakdown */}
                    <div className="rounded-lg bg-muted/30 p-3 text-sm space-y-1">
                      <div className="flex justify-between"><span className="text-muted-foreground">Materials</span><span>{formatUsd(order.materials_subtotal_cents)}</span></div>
                      <div className="flex justify-between"><span className="text-muted-foreground">Delivery</span><span>{formatUsd(order.delivery_fee_cents)}</span></div>
                      <div className="flex justify-between"><span className="text-muted-foreground">Tax</span><span>{formatUsd(order.tax_cents)}</span></div>
                      <div className="flex justify-between border-t pt-1 font-semibold"><span>Total</span><span>{formatUsd(order.grand_total_cents)}</span></div>
                    </div>

                    {/* Delivery info */}
                    {order.delivery_address && (
                      <p className="text-sm text-muted-foreground">
                        Delivered to: <span className="font-medium text-foreground">{order.delivery_address}</span>
                      </p>
                    )}

                    {/* Reorder */}
                    {order.order_items?.length > 0 && (
                      <Button variant="outline" size="sm" onClick={() => handleReorder(order)}>
                        <RotateCcw className="size-4" /> Reorder These Items
                      </Button>
                    )}
                  </div>
                )}
              </article>
            );
          })}
        </div>
      ) : orders.length === 0 && !isLoading && email ? (
        <div className="rounded-xl border bg-card p-8 text-center">
          <p className="text-muted-foreground">No orders found for this email.</p>
          <Button asChild variant="outline" className="mt-3">
            <Link href="/shop">Start Shopping</Link>
          </Button>
        </div>
      ) : null}
    </div>
  );
}
