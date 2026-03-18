"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ArrowLeft, Phone, Mail, Globe, MapPin, Truck, Package,
  Edit3, Check, X, Plus, Trash2, ExternalLink, TrendingUp, FileText
} from "lucide-react";

type Supplier = {
  id: string; name: string; slug: string; contact_name: string | null;
  phone: string | null; email: string | null; website: string | null;
  address: string; city: string | null; state: string | null; zip: string | null;
  fulfillment_type: "pickup" | "delivery" | "both";
  delivery_fee_notes: string | null; minimum_order_notes: string | null;
  payment_terms: string | null; account_number: string | null;
  notes: string | null; is_active: boolean; created_at: string;
  pricelist_effective_date: string | null;
  pricelist_documents: any[];
};

type SupplierProduct = {
  id: string; supplier_id: string; product_id: string | null;
  supplier_product_name: string; supplier_sku: string | null;
  cost_per_unit_cents: number; unit: string;
  our_price_per_unit_cents: number | null;
  is_available: boolean; lead_time_days: number | null;
  minimum_order_qty: number | null; notes: string | null;
  last_price_update: string;
  products: { name: string; slug: string } | null;
};

const PAYMENT_TERMS = ["Net 7", "Net 15", "Net 30", "Net 60", "COD"];
const UNITS = ["yard", "ton", "bag", "pallet", "each", "lb"];

function fmt(cents: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);
}

function margin(cost: number, price: number) {
  if (!cost || !price) return null;
  return Math.round(((price - cost) / cost) * 100);
}

function marginColor(pct: number | null) {
  if (pct === null) return "text-muted-foreground";
  if (pct >= 100) return "text-green-600 font-semibold";
  if (pct >= 60) return "text-amber-600";
  return "text-red-600";
}

const FULFILLMENT_CONFIG = {
  pickup: { label: "We Pick Up", icon: Truck, color: "bg-blue-100 text-blue-800" },
  delivery: { label: "They Deliver", icon: Package, color: "bg-green-100 text-green-800" },
  both: { label: "Pickup & Delivery", icon: Truck, color: "bg-purple-100 text-purple-800" },
};

const BLANK_PRODUCT = {
  supplier_product_name: "", supplier_sku: "", cost_per_unit_cents: "",
  our_price_per_unit_cents: "", unit: "yard", is_available: true,
  lead_time_days: "", minimum_order_qty: "", notes: "", product_id: "",
};

export default function SupplierDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [supplier, setSupplier] = useState<Supplier | null>(null);
  const [products, setProducts] = useState<SupplierProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"products" | "pricelist" | "notes" | "invoices">("products");

  // Edit supplier state
  const [editingSupplier, setEditingSupplier] = useState(false);
  const [supplierForm, setSupplierForm] = useState<Partial<Supplier>>({});
  const [savingSupplier, setSavingSupplier] = useState(false);

  // Product row editing
  const [editingRow, setEditingRow] = useState<string | null>(null);
  const [rowForm, setRowForm] = useState<Record<string, string | boolean>>({});
  const [savingRow, setSavingRow] = useState(false);

  // Add product
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [newProduct, setNewProduct] = useState({ ...BLANK_PRODUCT });
  const [savingNew, setSavingNew] = useState(false);
  const [ourProducts, setOurProducts] = useState<Array<{ id: string; name: string; slug: string }>>([]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [supRes, prodRes] = await Promise.all([
      fetch(`/api/admin/suppliers/${id}`),
      fetch("/api/admin/products"),
    ]);
    if (supRes.ok) {
      const data = await supRes.json();
      setSupplier(data.supplier);
      setProducts(data.products ?? []);
    }
    if (prodRes.ok) {
      const data = await prodRes.json();
      const list = Array.isArray(data) ? data : data.products ?? [];
      setOurProducts(list.map((p: any) => ({ id: p.id, name: p.name, slug: p.slug })));
    }
    setLoading(false);
  }, [id]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ── Supplier editing ──────────────────────────────────────
  function startEditSupplier() {
    if (!supplier) return;
    setSupplierForm({ ...supplier });
    setEditingSupplier(true);
  }

  async function saveSupplier() {
    setSavingSupplier(true);
    await fetch(`/api/admin/suppliers/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(supplierForm),
    });
    await fetchData();
    setEditingSupplier(false);
    setSavingSupplier(false);
  }

  // ── Product row editing ───────────────────────────────────
  function startEditRow(p: SupplierProduct) {
    setEditingRow(p.id);
    setRowForm({
      supplier_product_name: p.supplier_product_name,
      supplier_sku: p.supplier_sku ?? "",
      cost_per_unit_cents: String(p.cost_per_unit_cents / 100),
      our_price_per_unit_cents: p.our_price_per_unit_cents ? String(p.our_price_per_unit_cents / 100) : "",
      unit: p.unit,
      is_available: p.is_available,
      lead_time_days: p.lead_time_days ? String(p.lead_time_days) : "",
      notes: p.notes ?? "",
      product_id: p.product_id ?? "",
    });
  }

  async function saveRow(productId: string) {
    setSavingRow(true);
    const payload: Record<string, unknown> = {
      supplier_product_name: rowForm.supplier_product_name,
      supplier_sku: rowForm.supplier_sku || null,
      cost_per_unit_cents: Math.round(parseFloat(rowForm.cost_per_unit_cents as string) * 100),
      our_price_per_unit_cents: rowForm.our_price_per_unit_cents
        ? Math.round(parseFloat(rowForm.our_price_per_unit_cents as string) * 100)
        : null,
      unit: rowForm.unit,
      is_available: rowForm.is_available,
      lead_time_days: rowForm.lead_time_days ? parseInt(rowForm.lead_time_days as string) : null,
      notes: rowForm.notes || null,
      product_id: rowForm.product_id || null,
    };
    await fetch(`/api/admin/suppliers/${id}/products/${productId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    await fetchData();
    setEditingRow(null);
    setSavingRow(false);
  }

  async function deleteRow(productId: string) {
    if (!confirm("Remove this product from supplier?")) return;
    await fetch(`/api/admin/suppliers/${id}/products/${productId}`, { method: "DELETE" });
    setProducts((prev) => prev.filter((p) => p.id !== productId));
  }

  // ── Add product ───────────────────────────────────────────
  async function addProduct() {
    if (!newProduct.supplier_product_name || !newProduct.cost_per_unit_cents) return;
    setSavingNew(true);
    const payload = {
      supplier_product_name: newProduct.supplier_product_name,
      supplier_sku: newProduct.supplier_sku || null,
      cost_per_unit_cents: Math.round(parseFloat(newProduct.cost_per_unit_cents) * 100),
      our_price_per_unit_cents: newProduct.our_price_per_unit_cents
        ? Math.round(parseFloat(newProduct.our_price_per_unit_cents) * 100)
        : null,
      unit: newProduct.unit,
      is_available: newProduct.is_available,
      lead_time_days: newProduct.lead_time_days ? parseInt(newProduct.lead_time_days) : null,
      minimum_order_qty: newProduct.minimum_order_qty ? parseFloat(newProduct.minimum_order_qty) : null,
      notes: newProduct.notes || null,
      product_id: newProduct.product_id || null,
    };
    const res = await fetch(`/api/admin/suppliers/${id}/products`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      const data = await res.json();
      setProducts((prev) => [...prev, data.product]);
      setShowAddProduct(false);
      setNewProduct({ ...BLANK_PRODUCT });
    }
    setSavingNew(false);
  }

  async function toggleActive() {
    if (!supplier) return;
    await fetch(`/api/admin/suppliers/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_active: !supplier.is_active }),
    });
    setSupplier((s) => s ? { ...s, is_active: !s.is_active } : s);
  }

  if (loading) return <div className="p-8 text-center text-muted-foreground">Loading...</div>;
  if (!supplier) return <div className="p-8 text-center text-muted-foreground">Supplier not found.</div>;

  const ft = FULFILLMENT_CONFIG[supplier.fulfillment_type];

  return (
    <div className="space-y-6">
      {/* Back */}
      <button onClick={() => router.push("/admin/suppliers")}
        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> All Suppliers
      </button>

      {/* Header card */}
      <div className="rounded-xl border bg-card p-5">
        {editingSupplier ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="mb-1 block text-xs font-medium text-muted-foreground">Name</label>
                <Input value={supplierForm.name ?? ""} onChange={(e) => setSupplierForm({ ...supplierForm, name: e.target.value })} />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">Contact Name</label>
                <Input value={supplierForm.contact_name ?? ""} onChange={(e) => setSupplierForm({ ...supplierForm, contact_name: e.target.value })} />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">Phone</label>
                <Input value={supplierForm.phone ?? ""} onChange={(e) => setSupplierForm({ ...supplierForm, phone: e.target.value })} />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">Email</label>
                <Input value={supplierForm.email ?? ""} onChange={(e) => setSupplierForm({ ...supplierForm, email: e.target.value })} />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">Website</label>
                <Input value={supplierForm.website ?? ""} onChange={(e) => setSupplierForm({ ...supplierForm, website: e.target.value })} />
              </div>
              <div className="col-span-2">
                <label className="mb-1 block text-xs font-medium text-muted-foreground">Address</label>
                <Input value={supplierForm.address ?? ""} onChange={(e) => setSupplierForm({ ...supplierForm, address: e.target.value })} />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">City</label>
                <Input value={supplierForm.city ?? ""} onChange={(e) => setSupplierForm({ ...supplierForm, city: e.target.value })} />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">ZIP</label>
                <Input value={supplierForm.zip ?? ""} onChange={(e) => setSupplierForm({ ...supplierForm, zip: e.target.value })} />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">Fulfillment</label>
                <select value={supplierForm.fulfillment_type} onChange={(e) => setSupplierForm({ ...supplierForm, fulfillment_type: e.target.value as Supplier["fulfillment_type"] })}
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm">
                  <option value="pickup">We Pick Up</option>
                  <option value="delivery">They Deliver</option>
                  <option value="both">Both</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">Payment Terms</label>
                <select value={supplierForm.payment_terms ?? ""} onChange={(e) => setSupplierForm({ ...supplierForm, payment_terms: e.target.value })}
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm">
                  <option value="">— None —</option>
                  {PAYMENT_TERMS.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">Our Account #</label>
                <Input value={supplierForm.account_number ?? ""} onChange={(e) => setSupplierForm({ ...supplierForm, account_number: e.target.value })} />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">Min Order Notes</label>
                <Input value={supplierForm.minimum_order_notes ?? ""} onChange={(e) => setSupplierForm({ ...supplierForm, minimum_order_notes: e.target.value })} placeholder="e.g. 5 yard minimum" />
              </div>
              <div className="col-span-2">
                <label className="mb-1 block text-xs font-medium text-muted-foreground">Delivery Fee Notes</label>
                <Input value={supplierForm.delivery_fee_notes ?? ""} onChange={(e) => setSupplierForm({ ...supplierForm, delivery_fee_notes: e.target.value })} placeholder="e.g. Free delivery over $500" />
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={saveSupplier} disabled={savingSupplier} size="sm">{savingSupplier ? "Saving..." : "Save"}</Button>
              <Button variant="outline" size="sm" onClick={() => setEditingSupplier(false)}>Cancel</Button>
            </div>
          </div>
        ) : (
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-3 flex-1">
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-2xl font-semibold">{supplier.name}</h1>
                <Badge className={ft.color}>{ft.label}</Badge>
                {!supplier.is_active && <Badge className="bg-gray-100 text-gray-500">Inactive</Badge>}
              </div>

              <div className="grid gap-1.5 text-sm">
                {supplier.address && (
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <MapPin className="size-3.5 shrink-0" />
                    <span>{supplier.address}{supplier.city ? `, ${supplier.city}` : ""}{supplier.state ? `, ${supplier.state}` : ""}{supplier.zip ? ` ${supplier.zip}` : ""}</span>
                    <a href={`https://maps.google.com/?q=${encodeURIComponent(`${supplier.address} ${supplier.city ?? ""} ${supplier.state ?? ""}`)}`}
                      target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}
                      className="text-primary hover:underline flex items-center gap-0.5 text-xs">
                      <ExternalLink className="size-3" /> Map
                    </a>
                  </div>
                )}
                {supplier.phone && (
                  <div className="flex items-center gap-1.5">
                    <Phone className="size-3.5 text-muted-foreground shrink-0" />
                    <a href={`tel:${supplier.phone}`} className="text-primary hover:underline">{supplier.phone}</a>
                    {supplier.contact_name && <span className="text-muted-foreground text-xs">· {supplier.contact_name}</span>}
                  </div>
                )}
                {supplier.email && (
                  <div className="flex items-center gap-1.5">
                    <Mail className="size-3.5 text-muted-foreground shrink-0" />
                    <a href={`mailto:${supplier.email}`} className="text-primary hover:underline">{supplier.email}</a>
                  </div>
                )}
                {supplier.website && (
                  <div className="flex items-center gap-1.5">
                    <Globe className="size-3.5 text-muted-foreground shrink-0" />
                    <a href={supplier.website} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline text-xs">{supplier.website}</a>
                  </div>
                )}
              </div>

              <div className="flex flex-wrap gap-4 text-sm pt-1">
                {supplier.payment_terms && (
                  <div><span className="text-xs text-muted-foreground">Payment: </span><span className="font-medium">{supplier.payment_terms}</span></div>
                )}
                {supplier.account_number && (
                  <div><span className="text-xs text-muted-foreground">Acct #: </span><span className="font-medium font-mono">{supplier.account_number}</span></div>
                )}
                {supplier.minimum_order_notes && (
                  <div><span className="text-xs text-muted-foreground">Min Order: </span><span className="font-medium">{supplier.minimum_order_notes}</span></div>
                )}
                {supplier.delivery_fee_notes && (
                  <div><span className="text-xs text-muted-foreground">Delivery: </span><span className="font-medium">{supplier.delivery_fee_notes}</span></div>
                )}
                {supplier.pricelist_effective_date && (
                  <div><span className="text-xs text-muted-foreground">Price List: </span><span className="font-medium">Effective {new Date(supplier.pricelist_effective_date + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span></div>
                )}
              </div>
            </div>

            <div className="flex gap-2 shrink-0">
              <Button size="sm" variant="outline" onClick={startEditSupplier}>
                <Edit3 className="size-3.5" /> Edit
              </Button>
              <Button size="sm" variant={supplier.is_active ? "ghost" : "outline"}
                className={supplier.is_active ? "text-muted-foreground" : ""}
                onClick={toggleActive}>
                {supplier.is_active ? "Deactivate" : "Activate"}
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b">
        {(["products", "pricelist", "notes", "invoices"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${tab === t ? "border-accent text-accent" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
            {t === "products" ? `Products (${products.length})` : t === "pricelist" ? "Price List" : t === "notes" ? "Notes" : "Invoices"}
          </button>
        ))}
      </div>

      {/* Products Tab */}
      {tab === "products" && (
        <div className="space-y-3">
          <div className="flex justify-end">
            <Button size="sm" onClick={() => setShowAddProduct(true)}>
              <Plus className="size-3.5" /> Add Product
            </Button>
          </div>

          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50 text-left">
                  <th className="px-3 py-2.5 font-medium">Their Name</th>
                  <th className="px-3 py-2.5 font-medium">Our Product</th>
                  <th className="px-3 py-2.5 font-medium">Cost</th>
                  <th className="px-3 py-2.5 font-medium">Our Price</th>
                  <th className="px-3 py-2.5 font-medium">
                    <span className="flex items-center gap-1"><TrendingUp className="size-3" /> Margin</span>
                  </th>
                  <th className="px-3 py-2.5 font-medium">Unit</th>
                  <th className="px-3 py-2.5 font-medium">Avail.</th>
                  <th className="px-3 py-2.5 font-medium">Lead</th>
                  <th className="px-3 py-2.5 font-medium w-20"></th>
                </tr>
              </thead>
              <tbody>
                {products.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-8 text-center text-muted-foreground">
                      No products yet. Click &ldquo;Add Product&rdquo; to start tracking costs.
                    </td>
                  </tr>
                ) : products.map((p) => {
                  const isEditing = editingRow === p.id;
                  const mgn = margin(p.cost_per_unit_cents, p.our_price_per_unit_cents ?? 0);

                  if (isEditing) {
                    return (
                      <tr key={p.id} className="border-b bg-accent/5">
                        <td className="px-2 py-1.5">
                          <Input value={rowForm.supplier_product_name as string} onChange={(e) => setRowForm({ ...rowForm, supplier_product_name: e.target.value })} className="h-7 text-xs" />
                        </td>
                        <td className="px-2 py-1.5">
                          <select
                            value={(rowForm.product_id as string) ?? ""}
                            onChange={(e) => setRowForm({ ...rowForm, product_id: e.target.value || "" })}
                            className="h-7 w-32 rounded border bg-background px-1 text-xs"
                          >
                            <option value="">— Unlinked —</option>
                            {ourProducts.map((op) => <option key={op.id} value={op.id}>{op.name}</option>)}
                          </select>
                        </td>
                        <td className="px-2 py-1.5">
                          <Input value={rowForm.cost_per_unit_cents as string} onChange={(e) => setRowForm({ ...rowForm, cost_per_unit_cents: e.target.value })}
                            className="h-7 text-xs w-20" placeholder="12.00" type="number" step="0.01" />
                        </td>
                        <td className="px-2 py-1.5">
                          <Input value={rowForm.our_price_per_unit_cents as string} onChange={(e) => setRowForm({ ...rowForm, our_price_per_unit_cents: e.target.value })}
                            className="h-7 text-xs w-20" placeholder="27.00" type="number" step="0.01" />
                        </td>
                        <td className="px-2 py-1.5 text-xs text-muted-foreground">
                          {rowForm.cost_per_unit_cents && rowForm.our_price_per_unit_cents
                            ? (() => {
                                const m = margin(
                                  Math.round(parseFloat(rowForm.cost_per_unit_cents as string) * 100),
                                  Math.round(parseFloat(rowForm.our_price_per_unit_cents as string) * 100)
                                );
                                return <span className={marginColor(m)}>{m !== null ? `${m}%` : "—"}</span>;
                              })()
                            : "—"}
                        </td>
                        <td className="px-2 py-1.5">
                          <select value={rowForm.unit as string} onChange={(e) => setRowForm({ ...rowForm, unit: e.target.value })}
                            className="h-7 rounded border bg-background px-1 text-xs w-16">
                            {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
                          </select>
                        </td>
                        <td className="px-2 py-1.5">
                          <input type="checkbox" checked={rowForm.is_available as boolean} onChange={(e) => setRowForm({ ...rowForm, is_available: e.target.checked })} className="h-4 w-4" />
                        </td>
                        <td className="px-2 py-1.5">
                          <Input value={rowForm.lead_time_days as string} onChange={(e) => setRowForm({ ...rowForm, lead_time_days: e.target.value })}
                            className="h-7 text-xs w-12" placeholder="1" type="number" />
                        </td>
                        <td className="px-2 py-1.5">
                          <div className="flex gap-1">
                            <button onClick={() => saveRow(p.id)} disabled={savingRow}
                              className="rounded bg-green-600 p-1 text-white hover:bg-green-500">
                              <Check className="size-3" />
                            </button>
                            <button onClick={() => setEditingRow(null)}
                              className="rounded bg-muted p-1 text-muted-foreground hover:text-foreground">
                              <X className="size-3" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  }

                  return (
                    <tr key={p.id} className="border-b hover:bg-muted/30 group">
                      <td className="px-3 py-2.5">
                        <p className="font-medium">{p.supplier_product_name}</p>
                        {p.supplier_sku && <p className="text-xs text-muted-foreground">SKU: {p.supplier_sku}</p>}
                        {p.notes && <p className="text-xs text-muted-foreground italic">{p.notes}</p>}
                      </td>
                      <td className="px-3 py-2.5 text-xs text-muted-foreground">
                        {p.products ? (
                          <span className="text-primary">{p.products.name}</span>
                        ) : (
                          <span className="italic">Unlinked</span>
                        )}
                      </td>
                      <td className="px-3 py-2.5 font-medium tabular-nums">
                        {fmt(p.cost_per_unit_cents)}/{p.unit}
                      </td>
                      <td className="px-3 py-2.5 tabular-nums text-muted-foreground">
                        {p.our_price_per_unit_cents ? `${fmt(p.our_price_per_unit_cents)}/${p.unit}` : "—"}
                      </td>
                      <td className="px-3 py-2.5">
                        <span className={marginColor(mgn)}>
                          {mgn !== null ? `${mgn}%` : "—"}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-muted-foreground">{p.unit}</td>
                      <td className="px-3 py-2.5">
                        <span className={p.is_available ? "text-green-600" : "text-red-500"}>
                          {p.is_available ? "✓" : "✗"}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-muted-foreground text-xs">
                        {p.lead_time_days ? `${p.lead_time_days}d` : "—"}
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => startEditRow(p)} className="rounded p-1 hover:bg-muted">
                            <Edit3 className="size-3.5 text-muted-foreground" />
                          </button>
                          <button onClick={() => deleteRow(p.id)} className="rounded p-1 hover:bg-muted">
                            <Trash2 className="size-3.5 text-muted-foreground hover:text-destructive" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Add Product Form */}
          {showAddProduct && (
            <div className="rounded-lg border bg-card p-4 space-y-3">
              <h3 className="text-sm font-semibold">Add Product</h3>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                <div className="col-span-2 sm:col-span-1">
                  <label className="mb-1 block text-xs text-muted-foreground">Their Product Name *</label>
                  <Input value={newProduct.supplier_product_name} onChange={(e) => setNewProduct({ ...newProduct, supplier_product_name: e.target.value })} placeholder="Crusher Run RCA" />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-muted-foreground">SKU</label>
                  <Input value={newProduct.supplier_sku} onChange={(e) => setNewProduct({ ...newProduct, supplier_sku: e.target.value })} placeholder="CR-001" />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-muted-foreground">Unit</label>
                  <select value={newProduct.unit} onChange={(e) => setNewProduct({ ...newProduct, unit: e.target.value })}
                    className="w-full rounded-md border bg-background px-3 py-2 text-sm">
                    {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs text-muted-foreground">Their Cost *</label>
                  <Input value={newProduct.cost_per_unit_cents} onChange={(e) => setNewProduct({ ...newProduct, cost_per_unit_cents: e.target.value })}
                    placeholder="12.00" type="number" step="0.01" />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-muted-foreground">Our Sell Price</label>
                  <Input value={newProduct.our_price_per_unit_cents} onChange={(e) => setNewProduct({ ...newProduct, our_price_per_unit_cents: e.target.value })}
                    placeholder="27.00" type="number" step="0.01" />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-muted-foreground">Lead Time (days)</label>
                  <Input value={newProduct.lead_time_days} onChange={(e) => setNewProduct({ ...newProduct, lead_time_days: e.target.value })} placeholder="1" type="number" />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-muted-foreground">Min Order Qty</label>
                  <Input value={newProduct.minimum_order_qty} onChange={(e) => setNewProduct({ ...newProduct, minimum_order_qty: e.target.value })} placeholder="5" type="number" />
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <label className="mb-1 block text-xs text-muted-foreground">Notes</label>
                  <Input value={newProduct.notes} onChange={(e) => setNewProduct({ ...newProduct, notes: e.target.value })} placeholder="Optional notes" />
                </div>
                <div className="flex items-end pb-1">
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={newProduct.is_available} onChange={(e) => setNewProduct({ ...newProduct, is_available: e.target.checked })} className="h-4 w-4 rounded" />
                    Available now
                  </label>
                </div>
              </div>

              {/* Margin preview */}
              {newProduct.cost_per_unit_cents && newProduct.our_price_per_unit_cents && (
                <div className="text-sm">
                  Margin: {(() => {
                    const m = margin(
                      Math.round(parseFloat(newProduct.cost_per_unit_cents) * 100),
                      Math.round(parseFloat(newProduct.our_price_per_unit_cents) * 100)
                    );
                    return <span className={marginColor(m)}>{m !== null ? `${m}%` : "—"}</span>;
                  })()}
                </div>
              )}

              <div className="flex gap-2">
                <Button size="sm" onClick={addProduct} disabled={savingNew || !newProduct.supplier_product_name || !newProduct.cost_per_unit_cents}>
                  {savingNew ? "Saving..." : "Add Product"}
                </Button>
                <Button size="sm" variant="outline" onClick={() => { setShowAddProduct(false); setNewProduct({ ...BLANK_PRODUCT }); }}>
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Pricelist Tab — clean printable view */}
      {tab === "pricelist" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">{supplier.name} — Price List</h2>
              {supplier.pricelist_effective_date && (
                <p className="text-sm text-muted-foreground">Effective {new Date(supplier.pricelist_effective_date + "T12:00:00").toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</p>
              )}
              {supplier.minimum_order_notes && (
                <p className="text-sm text-amber-600 mt-1">{supplier.minimum_order_notes}</p>
              )}
            </div>
            <Button size="sm" variant="outline" onClick={() => window.print()}>Print</Button>
          </div>

          {/* Group by unit */}
          {(() => {
            const byUnit: Record<string, SupplierProduct[]> = {};
            products.forEach((p) => { (byUnit[p.unit] ??= []).push(p); });
            return Object.entries(byUnit).map(([unit, items]) => (
              <div key={unit}>
                <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                  Sold by the {unit}
                </h3>
                <div className="rounded-lg border overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/30">
                      <tr>
                        <th className="px-4 py-2 text-left font-medium">Material</th>
                        <th className="px-4 py-2 text-right font-medium">Supplier Cost</th>
                        <th className="px-4 py-2 text-right font-medium">Our Price</th>
                        <th className="px-4 py-2 text-right font-medium">Margin</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {items.sort((a, b) => a.supplier_product_name.localeCompare(b.supplier_product_name)).map((p) => {
                        const mgn = margin(p.cost_per_unit_cents, p.our_price_per_unit_cents ?? 0);
                        return (
                          <tr key={p.id} className="hover:bg-muted/20">
                            <td className="px-4 py-2.5 font-medium">{p.supplier_product_name}</td>
                            <td className="px-4 py-2.5 text-right tabular-nums">{fmt(p.cost_per_unit_cents)}/{unit}</td>
                            <td className="px-4 py-2.5 text-right tabular-nums">
                              {p.our_price_per_unit_cents ? `${fmt(p.our_price_per_unit_cents)}/${unit}` : <span className="text-muted-foreground italic">Not set</span>}
                            </td>
                            <td className={`px-4 py-2.5 text-right tabular-nums ${marginColor(mgn)}`}>
                              {mgn !== null ? `${mgn}%` : "—"}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            ));
          })()}

          <p className="text-xs text-muted-foreground">
            Prices are for material picked up at supplier location.
            {supplier.address && ` ${supplier.address}, ${supplier.city ?? ""} ${supplier.state ?? ""} ${supplier.zip ?? ""}`}
          </p>
        </div>
      )}

      {/* Notes Tab */}
      {tab === "notes" && (
        <div className="space-y-3">
          <textarea
            defaultValue={supplier.notes ?? ""}
            onBlur={async (e) => {
              await fetch(`/api/admin/suppliers/${id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ notes: e.target.value }),
              });
              setSupplier((s) => s ? { ...s, notes: e.target.value } : s);
            }}
            className="w-full min-h-[200px] rounded-lg border bg-card p-4 text-sm focus:outline-none focus:ring-2 focus:ring-accent resize-y"
            placeholder="Internal notes about this supplier — pricing history, reliability, contacts, terms negotiated..."
          />
          <p className="text-xs text-muted-foreground">Notes auto-save when you click away.</p>
        </div>
      )}

      {/* Invoices Tab */}
      {tab === "invoices" && (
        <div className="flex flex-col items-center gap-4 py-8">
          <FileText className="size-10 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">Manage and scan invoices from this supplier</p>
          <Link href={`/admin/suppliers/${id}/invoices`}>
            <Button><FileText className="mr-2 size-4" />Open Invoices</Button>
          </Link>
        </div>
      )}
    </div>
  );
}
