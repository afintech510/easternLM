"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Building2, Plus, Phone, Mail, Truck, PackageOpen, ArrowUpDown } from "lucide-react";

type Supplier = {
  id: string;
  name: string;
  city: string | null;
  state: string | null;
  fulfillment_type: "pickup" | "delivery" | "both";
  payment_terms: string | null;
  phone: string | null;
  email: string | null;
  is_active: boolean;
  product_count: number;
};

const FULFILLMENT_LABELS: Record<string, { label: string; color: string }> = {
  pickup: { label: "We Pick Up", color: "bg-blue-100 text-blue-800" },
  delivery: { label: "They Deliver", color: "bg-green-100 text-green-800" },
  both: { label: "Both", color: "bg-purple-100 text-purple-800" },
};

const PAYMENT_TERMS = ["Net 7", "Net 15", "Net 30", "Net 60", "COD"];

const BLANK: Omit<Supplier, "id" | "product_count" | "is_active"> & {
  address: string; contact_name: string; website: string;
  account_number: string; notes: string; zip: string;
} = {
  name: "", city: "", state: "NY", fulfillment_type: "both",
  payment_terms: "COD", phone: "", email: "",
  address: "", contact_name: "", website: "",
  account_number: "", notes: "", zip: "",
};

export default function AdminSuppliersPage() {
  const router = useRouter();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ ...BLANK });
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");

  const fetchData = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/admin/suppliers");
    if (res.ok) {
      const data = await res.json();
      setSuppliers(data.suppliers ?? []);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  async function handleCreate() {
    if (!form.name || !form.address) return;
    setSaving(true);
    const res = await fetch("/api/admin/suppliers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (res.ok) {
      const data = await res.json();
      setShowForm(false);
      setForm({ ...BLANK });
      router.push(`/admin/suppliers/${data.supplier.id}`);
    }
    setSaving(false);
  }

  const filtered = suppliers.filter((s) =>
    !search || s.name.toLowerCase().includes(search.toLowerCase()) ||
    (s.city ?? "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Suppliers</h1>
          <p className="text-sm text-muted-foreground">Manage vendor relationships, products, and costs</p>
        </div>
        <Button onClick={() => setShowForm(true)}>
          <Plus className="size-4" /> Add Supplier
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-lg border bg-card p-3 text-center">
          <p className="text-2xl font-bold text-primary">{suppliers.filter((s) => s.is_active).length}</p>
          <p className="text-xs text-muted-foreground">Active Suppliers</p>
        </div>
        <div className="rounded-lg border bg-card p-3 text-center">
          <p className="text-2xl font-bold text-accent">{suppliers.reduce((n, s) => n + s.product_count, 0)}</p>
          <p className="text-xs text-muted-foreground">Total Products</p>
        </div>
        <div className="rounded-lg border bg-card p-3 text-center">
          <p className="text-2xl font-bold text-blue-600">{suppliers.filter((s) => s.fulfillment_type !== "pickup").length}</p>
          <p className="text-xs text-muted-foreground">Can Deliver to Us</p>
        </div>
      </div>

      {/* Search */}
      <div className="flex gap-2">
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name or city..."
          className="max-w-xs"
        />
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50 text-left">
              <th className="px-4 py-3 font-medium">
                <span className="flex items-center gap-1"><ArrowUpDown className="size-3" /> Name</span>
              </th>
              <th className="px-4 py-3 font-medium">Location</th>
              <th className="px-4 py-3 font-medium">Fulfillment</th>
              <th className="px-4 py-3 font-medium">Products</th>
              <th className="px-4 py-3 font-medium">Payment</th>
              <th className="px-4 py-3 font-medium">Contact</th>
              <th className="px-4 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">Loading...</td></tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center">
                  <Building2 className="mx-auto mb-2 size-10 text-muted-foreground/30" />
                  <p className="text-muted-foreground">No suppliers yet. Add your first supplier to get started.</p>
                </td>
              </tr>
            ) : filtered.map((s) => {
              const ft = FULFILLMENT_LABELS[s.fulfillment_type];
              return (
                <tr
                  key={s.id}
                  className="border-b cursor-pointer hover:bg-muted/40 transition-colors"
                  onClick={() => router.push(`/admin/suppliers/${s.id}`)}
                >
                  <td className="px-4 py-3">
                    <p className="font-medium">{s.name}</p>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {s.city ? `${s.city}, ${s.state}` : s.state ?? "—"}
                  </td>
                  <td className="px-4 py-3">
                    <Badge className={ft.color}>{ft.label}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    <span className="flex items-center gap-1 text-muted-foreground">
                      <PackageOpen className="size-3.5" /> {s.product_count}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{s.payment_terms ?? "—"}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      {s.phone && (
                        <a href={`tel:${s.phone}`} onClick={(e) => e.stopPropagation()}
                          className="text-primary hover:underline flex items-center gap-0.5 text-xs">
                          <Phone className="size-3" /> {s.phone}
                        </a>
                      )}
                      {s.email && (
                        <a href={`mailto:${s.email}`} onClick={(e) => e.stopPropagation()}
                          className="text-muted-foreground hover:text-primary flex items-center gap-0.5 text-xs">
                          <Mail className="size-3" />
                        </a>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <Badge className={s.is_active ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-500"}>
                      {s.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Add Supplier Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setShowForm(false)}>
          <div className="w-full max-w-lg rounded-xl border bg-card p-6 shadow-xl space-y-4"
            onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Add Supplier</h2>
              <button onClick={() => setShowForm(false)} className="text-muted-foreground hover:text-foreground text-xl leading-none">&times;</button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="mb-1 block text-xs font-medium text-muted-foreground">Supplier Name *</label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="ABC Quarry" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">Contact Name</label>
                <Input value={form.contact_name} onChange={(e) => setForm({ ...form, contact_name: e.target.value })} placeholder="John Smith" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">Phone</label>
                <Input value={form.phone ?? ""} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="(631) 555-1234" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">Email</label>
                <Input value={form.email ?? ""} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="orders@supplier.com" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">Website</label>
                <Input value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} placeholder="https://..." />
              </div>
              <div className="col-span-2">
                <label className="mb-1 block text-xs font-medium text-muted-foreground">Address *</label>
                <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="123 Quarry Road" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">City</label>
                <Input value={form.city ?? ""} onChange={(e) => setForm({ ...form, city: e.target.value })} placeholder="Riverhead" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">ZIP</label>
                <Input value={form.zip} onChange={(e) => setForm({ ...form, zip: e.target.value })} placeholder="11901" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">Fulfillment</label>
                <select value={form.fulfillment_type} onChange={(e) => setForm({ ...form, fulfillment_type: e.target.value as "pickup" | "delivery" | "both" })}
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm">
                  <option value="pickup">We Pick Up</option>
                  <option value="delivery">They Deliver</option>
                  <option value="both">Both</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">Payment Terms</label>
                <select value={form.payment_terms ?? ""} onChange={(e) => setForm({ ...form, payment_terms: e.target.value })}
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm">
                  <option value="">— Select —</option>
                  {PAYMENT_TERMS.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">Our Account #</label>
                <Input value={form.account_number} onChange={(e) => setForm({ ...form, account_number: e.target.value })} placeholder="ELM-001" />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
              <Button onClick={handleCreate} disabled={saving || !form.name || !form.address}>
                {saving ? "Saving..." : "Create Supplier"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
