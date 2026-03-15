"use client";

import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, Clock, Play, Trash2 } from "lucide-react";
import { formatUsd } from "@/lib/format";

type HeldOrder = {
  id: string;
  customer_name: string | null;
  customer_phone: string | null;
  items: Array<{ product_name: string; quantity: number; unit_price_cents: number; line_total_cents: number }>;
  delivery_method: string;
  delivery_fee_cents: number;
  notes: string | null;
  created_at: string;
};

export default function PosHeldOrdersPage() {
  const [orders, setOrders] = useState<HeldOrder[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchHeld = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/pos/held");
    if (res.ok) setOrders((await res.json()).orders || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchHeld(); }, [fetchHeld]);

  async function cancelHeld(id: string) {
    if (!confirm("Cancel this held order?")) return;
    await fetch("/api/pos/held", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    fetchHeld();
  }

  function resumeOrder(order: HeldOrder) {
    // Store in sessionStorage and redirect to register
    sessionStorage.setItem("pos_resume_order", JSON.stringify(order));
    window.location.href = "/pos";
  }

  function timeAgo(dateStr: string): string {
    const mins = Math.round((Date.now() - new Date(dateStr).getTime()) / 60000);
    if (mins < 60) return `${mins}m ago`;
    return `${Math.round(mins / 60)}h ${mins % 60}m ago`;
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-4 border-b border-zinc-800 px-4 py-3">
        <a href="/pos" className="text-zinc-400 hover:text-zinc-200"><ArrowLeft className="h-5 w-5" /></a>
        <h1 className="text-lg font-bold">Held Orders</h1>
        <span className="ml-auto rounded-full bg-amber-900/50 px-3 py-0.5 text-sm text-amber-300">{orders.length} held</span>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {loading ? (
          <div className="py-20 text-center text-zinc-500">Loading...</div>
        ) : orders.length === 0 ? (
          <div className="py-20 text-center text-zinc-500">No held orders</div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {orders.map((order) => {
              const total = order.items.reduce((s, i) => s + i.line_total_cents, 0);
              return (
                <div key={order.id} className="rounded-xl border border-zinc-800 bg-zinc-900 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="font-semibold">{order.customer_name || "Walk-in"}</p>
                    <span className="flex items-center gap-1 text-xs text-zinc-500">
                      <Clock className="h-3 w-3" /> {timeAgo(order.created_at)}
                    </span>
                  </div>

                  <div className="text-xs text-zinc-400 space-y-0.5">
                    {order.items.map((item, i) => (
                      <p key={i}>{item.quantity} × {item.product_name}</p>
                    ))}
                  </div>

                  <div className="flex items-center justify-between border-t border-zinc-800 pt-2">
                    <span className="font-bold text-amber-400">{formatUsd(total)}</span>
                    <span className="text-xs text-zinc-500">{order.delivery_method}</span>
                  </div>

                  {order.notes && <p className="text-xs text-zinc-500">{order.notes}</p>}

                  <div className="flex gap-2">
                    <button
                      onClick={() => resumeOrder(order)}
                      className="flex-1 flex items-center justify-center gap-1 rounded-lg bg-green-700 py-2 text-sm font-semibold text-white hover:bg-green-600"
                    >
                      <Play className="h-3.5 w-3.5" /> Resume
                    </button>
                    <button
                      onClick={() => cancelHeld(order.id)}
                      className="rounded-lg bg-zinc-800 px-3 py-2 text-sm text-red-400 hover:bg-zinc-700"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
