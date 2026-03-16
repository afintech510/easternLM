"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowUpDown, Save, Search } from "lucide-react";
import { Button } from "@/components/ui/button";

type Product = {
  id: string;
  name: string;
  slug: string;
  category_id: string;
  category_name: string;
  price_per_unit_cents: number;
  unit_display: string;
  delivery_type: string;
  visible_web: boolean;
  visible_pos: boolean;
  is_active: boolean;
};

type Category = { id: string; name: string; slug: string };

export default function BulkProductEditor() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [changes, setChanges] = useState<Map<string, Partial<Product>>>(
    new Map(),
  );
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [visibilityFilter, setVisibilityFilter] = useState("all");
  const [sortField, setSortField] = useState<keyof Product>("name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [editingCell, setEditingCell] = useState<{
    id: string;
    field: string;
  } | null>(null);
  const [editValue, setEditValue] = useState("");

  // Fetch products
  useEffect(() => {
    async function load() {
      const [prodRes, catRes] = await Promise.all([
        fetch("/api/admin/products"),
        fetch("/api/admin/categories"),
      ]);
      if (prodRes.ok) {
        const data = await prodRes.json();
        // Map products to include category_name
        setProducts(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (data || []).map((p: any) => ({
            ...p,
            category_name: p.categories?.name || p.category_name || "Other",
          })),
        );
      }
      if (catRes.ok) {
        const data = await catRes.json();
        setCategories(data || []);
      }
      setLoading(false);
    }
    load();
  }, []);

  // Filter and sort
  const filtered = useMemo(() => {
    let list = [...products];
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (p) => p.name.toLowerCase().includes(q) || p.slug.includes(q),
      );
    }
    if (categoryFilter !== "all") {
      list = list.filter((p) => p.category_id === categoryFilter);
    }
    if (visibilityFilter === "web")
      list = list.filter((p) => p.visible_web);
    else if (visibilityFilter === "pos")
      list = list.filter((p) => p.visible_pos && !p.visible_web);
    else if (visibilityFilter === "hidden")
      list = list.filter((p) => !p.visible_web && !p.visible_pos);

    list.sort((a, b) => {
      const aVal = a[sortField];
      const bVal = b[sortField];
      if (typeof aVal === "string" && typeof bVal === "string")
        return sortDir === "asc"
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal);
      if (typeof aVal === "number" && typeof bVal === "number")
        return sortDir === "asc" ? aVal - bVal : bVal - aVal;
      return 0;
    });
    return list;
  }, [products, search, categoryFilter, visibilityFilter, sortField, sortDir]);

  function updateProduct(id: string, field: string, value: unknown) {
    setProducts((prev) =>
      prev.map((p) => (p.id === id ? { ...p, [field]: value } : p)),
    );
    setChanges((prev) => {
      const next = new Map(prev);
      const existing = next.get(id) || {};
      next.set(id, { ...existing, [field]: value } as Partial<Product>);
      return next;
    });
  }

  function startEdit(
    id: string,
    field: string,
    currentValue: string | number,
  ) {
    setEditingCell({ id, field });
    setEditValue(
      String(
        field === "price_per_unit_cents"
          ? (currentValue as number) / 100
          : currentValue,
      ),
    );
  }

  function commitEdit() {
    if (!editingCell) return;
    const { id, field } = editingCell;
    if (field === "price_per_unit_cents") {
      updateProduct(id, field, Math.round(parseFloat(editValue) * 100));
    } else {
      updateProduct(id, field, editValue);
    }
    setEditingCell(null);
  }

  async function saveChanges() {
    if (changes.size === 0) return;
    setSaving(true);
    const updates = Array.from(changes.entries()).map(([id, fields]) => ({
      id,
      ...fields,
    }));
    const res = await fetch("/api/admin/products/bulk", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ updates }),
    });
    if (res.ok) {
      setChanges(new Map());
    }
    setSaving(false);
  }

  // Bulk actions
  async function bulkAction(action: string) {
    if (selected.size === 0) return;
    const ids = Array.from(selected);
    let updates: Array<{ id: string } & Record<string, unknown>> = [];

    if (action === "web")
      updates = ids.map((id) => ({
        id,
        visible_web: true,
        visible_pos: true,
      }));
    else if (action === "pos-only")
      updates = ids.map((id) => ({
        id,
        visible_web: false,
        visible_pos: true,
      }));
    else if (action === "hide")
      updates = ids.map((id) => ({
        id,
        visible_web: false,
        visible_pos: false,
      }));
    else if (action === "activate")
      updates = ids.map((id) => ({ id, is_active: true }));
    else if (action === "deactivate")
      updates = ids.map((id) => ({ id, is_active: false }));

    if (updates.length === 0) return;

    const res = await fetch("/api/admin/products/bulk", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ updates }),
    });
    if (res.ok) {
      // Update local state
      for (const u of updates) {
        setProducts((prev) =>
          prev.map((p) => (p.id === u.id ? { ...p, ...u } : p)),
        );
      }
      setSelected(new Set());
    }
  }

  function toggleSort(field: keyof Product) {
    if (sortField === field)
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortField(field);
      setSortDir("asc");
    }
  }

  const allSelected =
    filtered.length > 0 && filtered.every((p) => selected.has(p.id));

  // Render
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Bulk Product Editor</h1>
          <p className="text-sm text-muted-foreground">
            {products.length} products &middot; {changes.size} unsaved changes
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href="/admin/products">Card View</Link>
          </Button>
          {changes.size > 0 && (
            <Button onClick={saveChanges} disabled={saving}>
              <Save className="mr-1 h-4 w-4" />
              {saving ? "Saving..." : `Save ${changes.size} Changes`}
            </Button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative max-w-xs flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search products..."
            className="w-full rounded-md border bg-background py-2 pl-9 pr-3 text-sm"
          />
        </div>
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="rounded-md border bg-background px-3 py-2 text-sm"
        >
          <option value="all">All Categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <select
          value={visibilityFilter}
          onChange={(e) => setVisibilityFilter(e.target.value)}
          className="rounded-md border bg-background px-3 py-2 text-sm"
        >
          <option value="all">All Visibility</option>
          <option value="web">Web + POS</option>
          <option value="pos">POS Only</option>
          <option value="hidden">Hidden</option>
        </select>
        {selected.size > 0 && (
          <div className="flex gap-1">
            <Button
              size="sm"
              variant="outline"
              onClick={() => bulkAction("web")}
            >
              Set Web+POS
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => bulkAction("pos-only")}
            >
              Set POS Only
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => bulkAction("hide")}
            >
              Hide
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => bulkAction("deactivate")}
            >
              Deactivate
            </Button>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="w-10 px-3 py-2">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={(e) => {
                    if (e.target.checked)
                      setSelected(new Set(filtered.map((p) => p.id)));
                    else setSelected(new Set());
                  }}
                />
              </th>
              <th
                className="cursor-pointer px-3 py-2 text-left"
                onClick={() => toggleSort("name")}
              >
                Name{" "}
                <ArrowUpDown className="inline h-3 w-3 text-muted-foreground" />
              </th>
              <th className="px-3 py-2 text-left">Category</th>
              <th
                className="cursor-pointer px-3 py-2 text-right"
                onClick={() => toggleSort("price_per_unit_cents")}
              >
                Price{" "}
                <ArrowUpDown className="inline h-3 w-3 text-muted-foreground" />
              </th>
              <th className="px-3 py-2 text-center">Unit</th>
              <th className="px-3 py-2 text-center">Web</th>
              <th className="px-3 py-2 text-center">POS</th>
              <th className="px-3 py-2 text-center">Active</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td
                  colSpan={8}
                  className="px-4 py-8 text-center text-muted-foreground"
                >
                  Loading...
                </td>
              </tr>
            ) : (
              filtered.map((p) => {
                const hasChanges = changes.has(p.id);
                return (
                  <tr
                    key={p.id}
                    className={`border-b hover:bg-muted/30 ${hasChanges ? "bg-amber-50/5" : ""}`}
                  >
                    <td className="px-3 py-2">
                      <input
                        type="checkbox"
                        checked={selected.has(p.id)}
                        onChange={(e) => {
                          const next = new Set(selected);
                          if (e.target.checked) next.add(p.id);
                          else next.delete(p.id);
                          setSelected(next);
                        }}
                      />
                    </td>
                    <td className="px-3 py-2">
                      {editingCell?.id === p.id &&
                      editingCell?.field === "name" ? (
                        <input
                          type="text"
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          onBlur={commitEdit}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") commitEdit();
                            if (e.key === "Escape") setEditingCell(null);
                          }}
                          autoFocus
                          className="w-full rounded border px-2 py-1 text-sm"
                        />
                      ) : (
                        <span
                          onClick={() => startEdit(p.id, "name", p.name)}
                          className="cursor-pointer hover:underline"
                        >
                          {p.name}
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-xs text-muted-foreground">
                      {p.category_name}
                    </td>
                    <td className="px-3 py-2 text-right">
                      {editingCell?.id === p.id &&
                      editingCell?.field === "price_per_unit_cents" ? (
                        <input
                          type="number"
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          onBlur={commitEdit}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") commitEdit();
                            if (e.key === "Escape") setEditingCell(null);
                          }}
                          autoFocus
                          step="0.01"
                          className="w-20 rounded border px-2 py-1 text-right text-sm"
                        />
                      ) : (
                        <span
                          onClick={() =>
                            startEdit(
                              p.id,
                              "price_per_unit_cents",
                              p.price_per_unit_cents,
                            )
                          }
                          className="cursor-pointer font-medium hover:underline"
                        >
                          ${(p.price_per_unit_cents / 100).toFixed(2)}
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-center text-xs text-muted-foreground">
                      {p.unit_display ||
                        (p.delivery_type === "bulk" ? "/yd" : "/ea")}
                    </td>
                    <td className="px-3 py-2 text-center">
                      <input
                        type="checkbox"
                        checked={p.visible_web}
                        onChange={(e) =>
                          updateProduct(
                            p.id,
                            "visible_web",
                            e.target.checked,
                          )
                        }
                      />
                    </td>
                    <td className="px-3 py-2 text-center">
                      <input
                        type="checkbox"
                        checked={p.visible_pos}
                        onChange={(e) =>
                          updateProduct(
                            p.id,
                            "visible_pos",
                            e.target.checked,
                          )
                        }
                      />
                    </td>
                    <td className="px-3 py-2 text-center">
                      <input
                        type="checkbox"
                        checked={p.is_active}
                        onChange={(e) =>
                          updateProduct(
                            p.id,
                            "is_active",
                            e.target.checked,
                          )
                        }
                      />
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-muted-foreground">
        Showing {filtered.length} of {products.length} products
      </p>
    </div>
  );
}
