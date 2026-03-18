"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, Loader2, Minus, Package, Plus, TrendingDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

interface Product {
  id: string;
  name: string;
  slug: string;
  stock_qty: number;
  low_stock_threshold: number;
  stock_unit: string;
  track_inventory: boolean;
  delivery_type: string;
  categories: { name: string } | null;
}

const REASONS = [
  { value: "received", label: "Received (delivery in)" },
  { value: "sold", label: "Sold" },
  { value: "manual", label: "Manual adjustment" },
  { value: "damaged", label: "Damaged / waste" },
  { value: "count", label: "Physical count" },
];

export default function InventoryPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "low" | "tracked">("tracked");
  const [adjusting, setAdjusting] = useState<string | null>(null);
  const [adjQty, setAdjQty] = useState("");
  const [adjReason, setAdjReason] = useState("received");
  const [adjNotes, setAdjNotes] = useState("");
  const [saving, setSaving] = useState(false);

  async function loadProducts() {
    setLoading(true);
    const r = await fetch("/api/admin/inventory");
    if (r.ok) {
      const d = await r.json();
      setProducts(d.products ?? []);
    }
    setLoading(false);
  }

  useEffect(() => { loadProducts(); }, []);

  const filtered = products
    .filter((p) => {
      if (filter === "tracked" && !p.track_inventory) return false;
      if (filter === "low" && (p.stock_qty > p.low_stock_threshold || !p.track_inventory)) return false;
      if (search && !p.name.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    })
    .sort((a, b) => {
      if (filter === "low") return a.stock_qty - b.stock_qty;
      return a.name.localeCompare(b.name);
    });

  const lowStockCount = products.filter(
    (p) => p.track_inventory && p.stock_qty <= p.low_stock_threshold,
  ).length;

  async function submitAdjustment(productId: string) {
    if (!adjQty) return;
    setSaving(true);
    const r = await fetch("/api/admin/inventory", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        product_id: productId,
        adjustment_qty: parseFloat(adjQty),
        reason: adjReason,
        notes: adjNotes || undefined,
      }),
    });
    if (r.ok) {
      const d = await r.json();
      setProducts((prev) =>
        prev.map((p) => p.id === productId ? { ...p, stock_qty: d.newQty } : p),
      );
      setAdjusting(null);
      setAdjQty("");
      setAdjNotes("");
    }
    setSaving(false);
  }

  async function toggleTracking(product: Product) {
    const r = await fetch(`/api/admin/products/${product.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ track_inventory: !product.track_inventory }),
    });
    if (r.ok) {
      setProducts((prev) =>
        prev.map((p) => p.id === product.id ? { ...p, track_inventory: !p.track_inventory } : p),
      );
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="[font-family:var(--font-display)] text-3xl text-primary">Inventory</h1>
          <p className="text-sm text-muted-foreground">Track stock levels for yard materials.</p>
        </div>
        {lowStockCount > 0 && (
          <Badge variant="destructive" className="gap-1">
            <TrendingDown className="size-3" /> {lowStockCount} low stock
          </Badge>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <Input
          placeholder="Search products…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-64"
        />
        <div className="flex gap-1">
          {(["tracked", "low", "all"] as const).map((f) => (
            <Button key={f} size="sm" variant={filter === f ? "default" : "outline"} onClick={() => setFilter(f)}>
              {f === "tracked" ? "Tracked" : f === "low" ? "Low Stock" : "All Products"}
            </Button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="py-20 text-center"><Loader2 className="mx-auto size-6 animate-spin text-muted-foreground" /></div>
      ) : filtered.length === 0 ? (
        <div className="py-16 text-center">
          <Package className="mx-auto mb-3 size-10 text-muted-foreground/40" />
          <p className="text-muted-foreground">
            {filter === "tracked" ? "No products with inventory tracking enabled." : "No products match your search."}
          </p>
          {filter === "tracked" && (
            <p className="mt-2 text-xs text-muted-foreground">Switch to &quot;All Products&quot; and enable tracking on items you want to monitor.</p>
          )}
        </div>
      ) : (
        <div className="rounded-lg border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/30">
              <tr>
                <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Product</th>
                <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Category</th>
                <th className="px-4 py-2.5 text-right text-xs font-medium text-muted-foreground">Stock</th>
                <th className="px-4 py-2.5 text-right text-xs font-medium text-muted-foreground">Low Threshold</th>
                <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Status</th>
                <th className="px-4 py-2.5" />
              </tr>
            </thead>
            <tbody className="divide-y">
              {filtered.map((p) => {
                const isLow = p.track_inventory && p.stock_qty <= p.low_stock_threshold;
                const isAdjusting = adjusting === p.id;
                return (
                  <tr key={p.id} className={isLow ? "bg-red-50/50" : ""}>
                    <td className="px-4 py-3 font-medium">{p.name}</td>
                    <td className="px-4 py-3 text-muted-foreground">{p.categories?.name ?? "—"}</td>
                    <td className="px-4 py-3 text-right">
                      <span className={`font-semibold ${isLow ? "text-red-600" : ""}`}>
                        {p.stock_qty}
                      </span>
                      <span className="ml-1 text-xs text-muted-foreground">{p.stock_unit}</span>
                    </td>
                    <td className="px-4 py-3 text-right text-muted-foreground">{p.low_stock_threshold}</td>
                    <td className="px-4 py-3">
                      {!p.track_inventory ? (
                        <span className="text-xs text-muted-foreground">Not tracked</span>
                      ) : isLow ? (
                        <Badge variant="destructive" className="gap-1 text-xs">
                          <AlertTriangle className="size-3" /> Low
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-green-700 border-green-200 text-xs">OK</Badge>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        {p.track_inventory ? (
                          <>
                            {isAdjusting ? (
                              <div className="flex items-center gap-1">
                                <Input
                                  type="number"
                                  value={adjQty}
                                  onChange={(e) => setAdjQty(e.target.value)}
                                  placeholder="+10 or -5"
                                  className="w-20 h-7 text-xs"
                                />
                                <select
                                  value={adjReason}
                                  onChange={(e) => setAdjReason(e.target.value)}
                                  className="h-7 rounded border bg-background px-1 text-xs"
                                >
                                  {REASONS.map((r) => (
                                    <option key={r.value} value={r.value}>{r.label}</option>
                                  ))}
                                </select>
                                <Button size="sm" className="h-7 text-xs px-2" onClick={() => submitAdjustment(p.id)} disabled={saving}>
                                  {saving ? <Loader2 className="size-3 animate-spin" /> : "Save"}
                                </Button>
                                <Button size="sm" variant="ghost" className="h-7 text-xs px-1" onClick={() => setAdjusting(null)}>✕</Button>
                              </div>
                            ) : (
                              <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => { setAdjusting(p.id); setAdjQty(""); setAdjNotes(""); }}>
                                Adjust
                              </Button>
                            )}
                          </>
                        ) : (
                          <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => toggleTracking(p)}>
                            Enable Tracking
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
