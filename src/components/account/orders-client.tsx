"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type AccountOrder = {
  id: string;
  status: string;
  delivery_method: string;
  grand_total_cents: number;
  placed_at: string;
  created_at: string;
  stripe_checkout_session_id: string | null;
};

function formatUsd(cents: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(cents / 100);
}

export function OrdersClient() {
  const [email, setEmail] = useState("");
  const [orders, setOrders] = useState<AccountOrder[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-12 md:py-16">
      <header className="space-y-2">
        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-muted-foreground">Account</p>
        <h1 className="[font-family:var(--font-display)] text-4xl text-primary">Order History</h1>
        <p className="text-sm text-muted-foreground">
          Enter your checkout email to see recent orders and status updates.
        </p>
      </header>

      <div className="flex flex-wrap gap-2 rounded-2xl border bg-card p-4">
        <Input
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="you@example.com"
          className="min-w-72 flex-1"
        />
        <Button
          disabled={isLoading || email.trim().length < 5}
          onClick={async () => {
            setError(null);
            setIsLoading(true);
            try {
              const response = await fetch(`/api/account/orders?email=${encodeURIComponent(email.trim())}`, {
                cache: "no-store",
              });
              const body = (await response.json()) as { orders?: AccountOrder[]; error?: string };
              if (!response.ok) {
                throw new Error(body.error ?? "Failed to load orders.");
              }
              setOrders(body.orders ?? []);
            } catch (loadError) {
              setOrders([]);
              setError(loadError instanceof Error ? loadError.message : "Failed to load orders.");
            } finally {
              setIsLoading(false);
            }
          }}
        >
          {isLoading ? "Loading..." : "Load Orders"}
        </Button>
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      {orders.length > 0 ? (
        <div className="space-y-3">
          {orders.map((order) => (
            <article key={order.id} className="rounded-2xl border bg-card p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold">{order.id}</p>
                  <p className="text-xs text-muted-foreground">
                    Placed: {new Date(order.placed_at ?? order.created_at).toLocaleString()}
                  </p>
                </div>
                <span className="rounded-full border border-primary/25 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                  {order.status}
                </span>
              </div>
              <div className="mt-2 grid gap-1 text-sm text-muted-foreground sm:grid-cols-3">
                <p>Method: {order.delivery_method}</p>
                <p>Total: {formatUsd(order.grand_total_cents)}</p>
                <p>Session: {order.stripe_checkout_session_id ? "linked" : "none"}</p>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">No orders loaded yet.</p>
      )}
    </div>
  );
}
