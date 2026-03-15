"use client";

import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, Printer, RotateCcw, Search } from "lucide-react";
import { formatUsd } from "@/lib/format";

type PosOrder = {
  id: string;
  created_at: string;
  status: string;
  customer_name: string | null;
  customer_phone: string | null;
  items: Array<{ product_name: string; quantity: number; line_total_cents: number }>;
  grand_total_cents: number;
  delivery_method: string;
  payment_method: string;
  notes: string | null;
};

const STATUS_COLORS: Record<string, string> = {
  paid: "text-green-400",
  refunded: "text-red-400",
  partially_refunded: "text-amber-400",
  pending_payment: "text-yellow-400",
};

export default function PosOrdersPage() {
  const [orders, setOrders] = useState<PosOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);
  const [selectedOrder, setSelectedOrder] = useState<PosOrder | null>(null);
  const [refunding, setRefunding] = useState(false);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    const params = search ? `q=${encodeURIComponent(search)}` : `date=${selectedDate}`;
    const res = await fetch(`/api/pos/orders?${params}`);
    if (res.ok) {
      const data = await res.json();
      setOrders(data.orders || []);
    }
    setLoading(false);
  }, [search, selectedDate]);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  async function refundOrder(orderId: string, full: boolean) {
    if (!confirm(full ? "Process full refund?" : "Enter partial refund amount:")) return;
    setRefunding(true);
    await fetch(`/api/pos/orders/${orderId}/refund`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason: "staff-initiated" }),
    });
    setRefunding(false);
    setSelectedOrder(null);
    fetchOrders();
  }

  const totalSales = orders.filter((o) => o.status === "paid").reduce((s, o) => s + o.grand_total_cents, 0);

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center gap-4 border-b border-zinc-800 px-4 py-3">
        <a href="/pos" className="text-zinc-400 hover:text-zinc-200"><ArrowLeft className="h-5 w-5" /></a>
        <h1 className="text-lg font-bold">Today&apos;s Sales</h1>
        <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="rounded border border-zinc-700 bg-zinc-800 px-2 py-1 text-sm" />
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name or phone..." className="w-full rounded border border-zinc-700 bg-zinc-800 py-1.5 pl-8 pr-3 text-sm" />
        </div>
        <div className="ml-auto text-right">
          <p className="text-lg font-bold text-amber-400">{formatUsd(totalSales)}</p>
          <p className="text-xs text-zinc-500">{orders.length} orders</p>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Order list */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="py-20 text-center text-zinc-500">Loading...</div>
          ) : orders.length === 0 ? (
            <div className="py-20 text-center text-zinc-500">No orders found</div>
          ) : (
            <table className="w-full text-sm">
              <thead><tr className="border-b border-zinc-800 text-left text-zinc-500">
                <th className="px-4 py-2">Time</th>
                <th className="px-4 py-2">Customer</th>
                <th className="px-4 py-2">Items</th>
                <th className="px-4 py-2 text-right">Total</th>
                <th className="px-4 py-2">Payment</th>
                <th className="px-4 py-2">Status</th>
              </tr></thead>
              <tbody>
                {orders.map((o) => (
                  <tr key={o.id} onClick={() => setSelectedOrder(o)} className="border-b border-zinc-800/50 cursor-pointer hover:bg-zinc-800/50">
                    <td className="px-4 py-2 text-zinc-400">{new Date(o.created_at).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}</td>
                    <td className="px-4 py-2">{o.customer_name || "Walk-in"}</td>
                    <td className="px-4 py-2 text-zinc-400 text-xs max-w-48 truncate">{o.items?.map((i) => `${i.quantity} ${i.product_name}`).join(", ")}</td>
                    <td className="px-4 py-2 text-right font-mono">{formatUsd(o.grand_total_cents)}</td>
                    <td className="px-4 py-2 text-xs">{o.payment_method === "card_terminal" ? "Card" : o.payment_method}</td>
                    <td className={`px-4 py-2 text-xs font-medium ${STATUS_COLORS[o.status] || ""}`}>{o.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Order detail sidebar */}
        {selectedOrder && (
          <div className="w-80 border-l border-zinc-800 overflow-y-auto p-4 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-bold">Order Detail</h2>
              <button onClick={() => setSelectedOrder(null)} className="text-zinc-500 hover:text-zinc-300"><X className="h-4 w-4" /></button>
            </div>

            <div className="text-sm space-y-1">
              <p><span className="text-zinc-500">Customer:</span> {selectedOrder.customer_name || "Walk-in"}</p>
              {selectedOrder.customer_phone && <p><span className="text-zinc-500">Phone:</span> {selectedOrder.customer_phone}</p>}
              <p><span className="text-zinc-500">Time:</span> {new Date(selectedOrder.created_at).toLocaleString()}</p>
              <p><span className="text-zinc-500">Type:</span> {selectedOrder.delivery_method}</p>
              <p><span className="text-zinc-500">Payment:</span> {selectedOrder.payment_method}</p>
            </div>

            <div className="border-t border-zinc-800 pt-3">
              <p className="text-xs text-zinc-500 mb-2">Items:</p>
              {selectedOrder.items?.map((item, i) => (
                <div key={i} className="flex justify-between text-sm py-0.5">
                  <span>{item.quantity} {item.product_name}</span>
                  <span className="text-zinc-400">{formatUsd(item.line_total_cents)}</span>
                </div>
              ))}
              <div className="mt-2 pt-2 border-t border-zinc-800 flex justify-between font-bold">
                <span>Total</span>
                <span className="text-amber-400">{formatUsd(selectedOrder.grand_total_cents)}</span>
              </div>
            </div>

            {selectedOrder.notes && (
              <div className="rounded bg-zinc-800 p-2 text-xs text-zinc-400">{selectedOrder.notes}</div>
            )}

            <div className="space-y-2 border-t border-zinc-800 pt-3">
              <button className="w-full rounded-lg bg-zinc-800 py-2 text-sm hover:bg-zinc-700 flex items-center justify-center gap-2">
                <Printer className="h-4 w-4" /> Reprint Receipt
              </button>
              {selectedOrder.status === "paid" && (
                <button
                  onClick={() => refundOrder(selectedOrder.id, true)}
                  disabled={refunding}
                  className="w-full rounded-lg bg-red-900/50 py-2 text-sm text-red-300 hover:bg-red-900 flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <RotateCcw className="h-4 w-4" /> {refunding ? "Processing..." : "Full Refund"}
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function X({ className }: { className?: string }) {
  return <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>;
}
