"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, ChevronRight, MoreHorizontal, Plus, Search, ArrowUpDown } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { formatUsd } from "@/lib/format";
import { ProductForm } from "./product-form";

type Category = { id: string; name: string; slug: string; is_active: boolean; sort_order: number };
type Product = {
  id: string; name: string; slug: string; category_id: string; delivery_type: string;
  material_class: string; price_per_unit_cents: number; web_price_per_unit_cents?: number | null;
  unit: string; unit_display: string; is_active: boolean; visible_web: boolean; visible_pos: boolean;
  sort_order: number; min_qty: number; max_qty: number; step_qty: number;
  pallet_qty: number | null; pallet_price_cents: number | null;
  description: string; images: string[]; recommended_uses: string[]; pairs_well_with: string[];
  is_taxable: boolean; categories: { name: string; slug: string } | null;
};

type SortKey = "name" | "category" | "price" | "type" | "status" | "sort_order";

function EditableCell({ value, onSave, type = "text", prefix }: {
  value: string; onSave: (v: string) => void; type?: string; prefix?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const ref = useRef<HTMLInputElement>(null);

  if (!editing) {
    return (
      <span
        className="cursor-pointer rounded px-1 py-0.5 hover:bg-accent/10 hover:ring-1 hover:ring-accent/20"
        onClick={() => { setDraft(value); setEditing(true); setTimeout(() => ref.current?.focus(), 50); }}
      >
        {prefix}{value}
      </span>
    );
  }

  return (
    <input
      ref={ref}
      type={type}
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={() => { if (draft !== value) onSave(draft); setEditing(false); }}
      onKeyDown={(e) => { if (e.key === "Enter") { if (draft !== value) onSave(draft); setEditing(false); } if (e.key === "Escape") setEditing(false); }}
      className="w-full rounded border bg-background px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
    />
  );
}

export function ProductList({ initialProducts, categories }: { initialProducts: Product[]; categories: Category[] }) {
  const router = useRouter();
  const [products, setProducts] = useState(initialProducts);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [activeFilter, setActiveFilter] = useState("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortAsc, setSortAsc] = useState(true);

  const filtered = products
    .filter((p) => {
      if (search && !p.name.toLowerCase().includes(search.toLowerCase())) return false;
      if (categoryFilter !== "all" && p.category_id !== categoryFilter) return false;
      if (activeFilter === "active" && !p.is_active) return false;
      if (activeFilter === "inactive" && p.is_active) return false;
      return true;
    })
    .sort((a, b) => {
      let cmp = 0;
      if (sortKey === "name") cmp = a.name.localeCompare(b.name);
      else if (sortKey === "category") cmp = (a.categories?.name ?? "").localeCompare(b.categories?.name ?? "");
      else if (sortKey === "price") cmp = a.price_per_unit_cents - b.price_per_unit_cents;
      else if (sortKey === "type") cmp = a.delivery_type.localeCompare(b.delivery_type);
      else if (sortKey === "status") cmp = (a.visible_web ? 0 : 1) - (b.visible_web ? 0 : 1);
      else if (sortKey === "sort_order") cmp = a.sort_order - b.sort_order;
      return sortAsc ? cmp : -cmp;
    });

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortAsc(!sortAsc);
    else { setSortKey(key); setSortAsc(true); }
  }

  async function quickSave(productId: string, field: string, value: unknown) {
    const res = await fetch(`/api/admin/products/${productId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [field]: value }),
    });
    if (res.ok) {
      setProducts((prev) => prev.map((p) => p.id === productId ? { ...p, [field]: value } : p));
      toast.success("Saved");
    } else {
      toast.error("Save failed");
    }
  }

  async function toggleActive(product: Product) {
    await quickSave(product.id, "is_active", !product.is_active);
  }

  function handleSaved() {
    setExpandedId(null);
    setIsCreateOpen(false);
    router.refresh();
    fetch("/api/admin/products").then((r) => r.json()).then((data) => { if (Array.isArray(data)) setProducts(data); });
  }

  const SortHeader = ({ label, k }: { label: string; k: SortKey }) => (
    <th
      className="px-3 py-2.5 text-left text-xs font-medium text-muted-foreground cursor-pointer hover:text-foreground select-none"
      onClick={() => toggleSort(k)}
    >
      <span className="flex items-center gap-1">
        {label}
        <ArrowUpDown className={`size-3 ${sortKey === k ? "text-accent" : "text-muted-foreground/40"}`} />
      </span>
    </th>
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search products…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-[180px]"><SelectValue placeholder="Category" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={activeFilter} onValueChange={setActiveFilter}>
          <SelectTrigger className="w-[130px]"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>
        <Button onClick={() => setIsCreateOpen(true)}><Plus className="mr-2 size-4" /> New Product</Button>
      </div>

      <p className="text-xs text-muted-foreground">{filtered.length} products — click any cell to edit inline, or expand row for full form</p>

      <div className="rounded-lg border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/30">
            <tr>
              <th className="w-8 px-2" />
              <SortHeader label="Name" k="name" />
              <SortHeader label="Category" k="category" />
              <th className="px-3 py-2.5 text-left text-xs font-medium text-muted-foreground">Yard Price</th>
              <th className="px-3 py-2.5 text-left text-xs font-medium text-muted-foreground">Web Price</th>
              <SortHeader label="Type" k="type" />
              <SortHeader label="Visibility" k="status" />
              <SortHeader label="Sort #" k="sort_order" />
              <th className="w-10" />
            </tr>
          </thead>
          <tbody className="divide-y">
            {filtered.length === 0 && (
              <tr><td colSpan={9} className="text-center text-muted-foreground py-8">No products found</td></tr>
            )}
            {filtered.map((product) => {
              const isExpanded = expandedId === product.id;
              return (
                <tr key={product.id} className="group">
                  {/* Expand toggle */}
                  <td className="px-2">
                    <button
                      onClick={() => setExpandedId(isExpanded ? null : product.id)}
                      className="rounded p-0.5 text-muted-foreground hover:text-foreground"
                    >
                      {isExpanded ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
                    </button>
                  </td>
                  {/* Name — click to edit */}
                  <td className={`px-3 py-2 font-medium ${!product.is_active ? "opacity-50" : ""}`}>
                    <EditableCell
                      value={product.name}
                      onSave={(v) => quickSave(product.id, "name", v)}
                    />
                    {isExpanded && (
                      <div className="mt-3 border-t pt-3">
                        <ProductForm
                          categories={categories}
                          product={product}
                          onSaved={handleSaved}
                          compact
                        />
                      </div>
                    )}
                  </td>
                  {/* Category */}
                  <td className="px-3 py-2 text-muted-foreground">{product.categories?.name ?? "—"}</td>
                  {/* Yard price — click to edit */}
                  <td className="px-3 py-2">
                    <EditableCell
                      value={(product.price_per_unit_cents / 100).toFixed(2)}
                      onSave={(v) => quickSave(product.id, "price_per_unit_cents", Math.round(parseFloat(v) * 100))}
                      type="number"
                      prefix="$"
                    />
                  </td>
                  {/* Web price — click to edit */}
                  <td className="px-3 py-2">
                    <EditableCell
                      value={((product.web_price_per_unit_cents ?? product.price_per_unit_cents) / 100).toFixed(2)}
                      onSave={(v) => quickSave(product.id, "web_price_per_unit_cents", Math.round(parseFloat(v) * 100))}
                      type="number"
                      prefix="$"
                    />
                  </td>
                  {/* Type */}
                  <td className="px-3 py-2">
                    <Badge variant="outline" className="text-xs">{product.delivery_type}</Badge>
                  </td>
                  {/* Visibility */}
                  <td className="px-3 py-2">
                    <Badge
                      variant={product.visible_web && product.visible_pos ? "default" : "secondary"}
                      className={`text-xs ${product.visible_web && !product.visible_pos ? "bg-blue-100 text-blue-800" : !product.visible_web && product.visible_pos ? "bg-amber-100 text-amber-800" : !product.visible_web && !product.visible_pos ? "bg-gray-100 text-gray-500" : ""}`}
                    >
                      {product.visible_web && product.visible_pos ? "Web+POS" : product.visible_web ? "Web" : product.visible_pos ? "POS" : "Hidden"}
                    </Badge>
                  </td>
                  {/* Sort Order — click to edit */}
                  <td className="px-3 py-2">
                    <EditableCell
                      value={String(product.sort_order)}
                      onSave={(v) => quickSave(product.id, "sort_order", parseInt(v) || 100)}
                      type="number"
                    />
                  </td>
                  {/* Actions */}
                  <td className="px-2">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="size-7"><MoreHorizontal className="size-4" /></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setExpandedId(isExpanded ? null : product.id)}>
                          {isExpanded ? "Collapse" : "Expand & Edit"}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => toggleActive(product)}>
                          {product.is_active ? "Deactivate" : "Activate"}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader><DialogTitle>New Product</DialogTitle></DialogHeader>
          <ProductForm categories={categories} onSaved={handleSaved} />
        </DialogContent>
      </Dialog>
    </div>
  );
}
