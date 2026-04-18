"use client";

import { useCallback, useEffect, useState } from "react";
import { Edit2, Loader2, Plus, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { InstantBookService, ServicePackage } from "@/lib/book-now/types";

const CATEGORIES = ["install", "cleanup", "maintenance", "washing", "masonry"];

function formatUsd(cents: number) {
  return `$${(cents / 100).toFixed(0)}`;
}

export function AdminServicesClient() {
  const [services, setServices] = useState<InstantBookService[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Partial<InstantBookService> | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/admin/services/book-now");
    const body = await res.json();
    setServices(body.services || []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleToggleActive(service: InstantBookService) {
    const res = await fetch("/api/admin/services/book-now", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...service, is_active: !service.is_active }),
    });
    if (res.ok) load();
  }

  async function handleDelete(service: InstantBookService) {
    if (!confirm(`Delete "${service.name}"? This can't be undone.`)) return;
    const res = await fetch("/api/admin/services/book-now", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: service.id }),
    });
    if (res.ok) load();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Book-Now Services</h1>
          <p className="text-sm text-muted-foreground">
            Manage the instant-book landscape services menu. Toggle active/inactive for seasonality.
          </p>
        </div>
        <Button onClick={() => setEditing({
          slug: "",
          name: "",
          tagline: "",
          description: "",
          includes: [],
          icon: "Truck",
          category: "install",
          packages: [],
          is_active: true,
          is_featured: false,
          sort_order: (services[services.length - 1]?.sort_order ?? 0) + 10,
          season_start_month: null,
          season_end_month: null,
          notes: "",
        })}>
          <Plus className="size-4" /> New Service
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-10"><Loader2 className="size-6 animate-spin text-muted-foreground" /></div>
      ) : (
        <div className="rounded-xl border bg-card">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-4 py-2 text-left font-medium">Order</th>
                <th className="px-4 py-2 text-left font-medium">Service</th>
                <th className="px-4 py-2 text-left font-medium">Category</th>
                <th className="px-4 py-2 text-left font-medium">Packages</th>
                <th className="px-4 py-2 text-left font-medium">Status</th>
                <th className="px-4 py-2 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {services.map((s) => (
                <tr key={s.id} className="border-b last:border-0">
                  <td className="px-4 py-3 text-muted-foreground">{s.sort_order}</td>
                  <td className="px-4 py-3">
                    <p className="font-medium">{s.name}</p>
                    <p className="text-xs text-muted-foreground">{s.slug}</p>
                  </td>
                  <td className="px-4 py-3 capitalize">{s.category}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {(s.packages || []).map((p) => `${p.name} (${p.unit === "quote" ? "quote" : formatUsd(p.price_cents)})`).join(" · ") || "—"}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      onClick={() => handleToggleActive(s)}
                      className={`rounded-full px-2 py-0.5 text-xs font-medium transition-colors ${
                        s.is_active
                          ? "bg-green-100 text-green-700 hover:bg-green-200"
                          : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                      }`}
                    >
                      {s.is_active ? "Active" : "Hidden"}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button size="sm" variant="ghost" onClick={() => setEditing(s)}>
                      <Edit2 className="size-3.5" />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => handleDelete(s)} className="text-destructive">
                      <Trash2 className="size-3.5" />
                    </Button>
                  </td>
                </tr>
              ))}
              {services.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-10 text-center text-muted-foreground">No services yet. Click "New Service" to add one.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {editing && <EditServiceModal service={editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); load(); }} />}
    </div>
  );
}

function EditServiceModal({
  service,
  onClose,
  onSaved,
}: {
  service: Partial<InstantBookService>;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<Partial<InstantBookService>>(service);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function updateField<K extends keyof InstantBookService>(key: K, value: InstantBookService[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function addPackage() {
    setForm((prev) => ({
      ...prev,
      packages: [...(prev.packages || []), { name: "", price_cents: 0, unit: "flat" }],
    }));
  }

  function updatePackage(index: number, updates: Partial<ServicePackage>) {
    setForm((prev) => {
      const packages = [...(prev.packages || [])];
      packages[index] = { ...packages[index], ...updates };
      return { ...prev, packages };
    });
  }

  function removePackage(index: number) {
    setForm((prev) => ({
      ...prev,
      packages: (prev.packages || []).filter((_, i) => i !== index),
    }));
  }

  function addInclude() {
    setForm((prev) => ({ ...prev, includes: [...(prev.includes || []), ""] }));
  }

  function updateInclude(index: number, value: string) {
    setForm((prev) => {
      const arr = [...(prev.includes || [])];
      arr[index] = value;
      return { ...prev, includes: arr };
    });
  }

  function removeInclude(index: number) {
    setForm((prev) => ({
      ...prev,
      includes: (prev.includes || []).filter((_, i) => i !== index),
    }));
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      const payload = {
        ...form,
        includes: (form.includes || []).filter((i) => i.trim()),
        packages: (form.packages || []).filter((p) => p.name.trim()),
      };
      const res = await fetch("/api/admin/services/book-now", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Save failed");
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/60 p-4" onClick={onClose}>
      <div className="my-8 w-full max-w-2xl rounded-2xl bg-card p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">{form.id ? "Edit Service" : "New Service"}</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X className="size-5" /></button>
        </div>

        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium">Name</label>
              <input value={form.name || ""} onChange={(e) => updateField("name", e.target.value)}
                className="w-full rounded-md border px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Slug (URL)</label>
              <input value={form.slug || ""} onChange={(e) => updateField("slug", e.target.value)}
                className="w-full rounded-md border px-3 py-2 text-sm font-mono" placeholder="mulch-install" />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">Tagline (one liner)</label>
            <input value={form.tagline || ""} onChange={(e) => updateField("tagline", e.target.value)}
              className="w-full rounded-md border px-3 py-2 text-sm" />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">Description</label>
            <textarea value={form.description || ""} onChange={(e) => updateField("description", e.target.value)}
              rows={3} className="w-full rounded-md border px-3 py-2 text-sm" />
          </div>

          <div>
            <div className="mb-1 flex items-center justify-between">
              <label className="block text-sm font-medium">What's included</label>
              <Button size="sm" variant="outline" onClick={addInclude}><Plus className="size-3" /> Add</Button>
            </div>
            <div className="space-y-2">
              {(form.includes || []).map((inc, i) => (
                <div key={i} className="flex gap-2">
                  <input value={inc} onChange={(e) => updateInclude(i, e.target.value)}
                    className="flex-1 rounded-md border px-3 py-2 text-sm" />
                  <button onClick={() => removeInclude(i)} className="text-muted-foreground hover:text-destructive">
                    <X className="size-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium">Category</label>
              <select value={form.category || "install"} onChange={(e) => updateField("category", e.target.value)}
                className="w-full rounded-md border px-3 py-2 text-sm capitalize">
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Sort order</label>
              <input type="number" value={form.sort_order ?? 0}
                onChange={(e) => updateField("sort_order", parseInt(e.target.value, 10) || 0)}
                className="w-full rounded-md border px-3 py-2 text-sm" />
            </div>
          </div>

          <div>
            <div className="mb-1 flex items-center justify-between">
              <label className="block text-sm font-medium">Packages / Pricing</label>
              <Button size="sm" variant="outline" onClick={addPackage}><Plus className="size-3" /> Add Package</Button>
            </div>
            <div className="space-y-2">
              {(form.packages || []).map((pkg, i) => (
                <div key={i} className="space-y-2 rounded-md border p-3">
                  <div className="flex items-center gap-2">
                    <input value={pkg.name} onChange={(e) => updatePackage(i, { name: e.target.value })}
                      placeholder="Package name (e.g. '3 yards', 'Half day')"
                      className="flex-1 rounded-md border px-3 py-2 text-sm" />
                    <button onClick={() => removePackage(i)} className="text-muted-foreground hover:text-destructive">
                      <X className="size-4" />
                    </button>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <select value={pkg.unit} onChange={(e) => updatePackage(i, { unit: e.target.value as ServicePackage["unit"] })}
                      className="rounded-md border px-3 py-2 text-sm">
                      <option value="flat">Flat price</option>
                      <option value="per_unit">Per unit</option>
                      <option value="quote">Custom quote</option>
                    </select>
                    {pkg.unit !== "quote" ? (
                      <div className="flex items-center gap-1">
                        <span className="text-sm text-muted-foreground">$</span>
                        <input type="number" value={pkg.price_cents / 100}
                          onChange={(e) => updatePackage(i, { price_cents: Math.round(parseFloat(e.target.value || "0") * 100) })}
                          className="flex-1 rounded-md border px-3 py-2 text-sm" />
                      </div>
                    ) : (
                      <div className="text-sm text-muted-foreground">Routes to custom quote form</div>
                    )}
                  </div>
                  <input value={pkg.description || ""} onChange={(e) => updatePackage(i, { description: e.target.value })}
                    placeholder="Optional description"
                    className="w-full rounded-md border px-3 py-2 text-sm" />
                </div>
              ))}
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium">Season start month (1-12, optional)</label>
              <input type="number" min={1} max={12} value={form.season_start_month ?? ""}
                onChange={(e) => updateField("season_start_month", e.target.value ? parseInt(e.target.value, 10) : null)}
                className="w-full rounded-md border px-3 py-2 text-sm" placeholder="e.g. 3 for March" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Season end month (1-12)</label>
              <input type="number" min={1} max={12} value={form.season_end_month ?? ""}
                onChange={(e) => updateField("season_end_month", e.target.value ? parseInt(e.target.value, 10) : null)}
                className="w-full rounded-md border px-3 py-2 text-sm" placeholder="e.g. 11 for November" />
            </div>
          </div>

          <div className="flex items-center gap-6">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={!!form.is_active}
                onChange={(e) => updateField("is_active", e.target.checked)}
                className="size-4" />
              Active (visible to customers)
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={!!form.is_featured}
                onChange={(e) => updateField("is_featured", e.target.checked)}
                className="size-4" />
              Featured
            </label>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <div className="flex gap-2 border-t pt-4">
            <Button variant="outline" onClick={onClose} className="flex-1">Cancel</Button>
            <Button onClick={handleSave} disabled={saving} className="flex-1">
              {saving ? <><Loader2 className="size-4 animate-spin" /> Saving...</> : "Save"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
