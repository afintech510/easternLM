"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2, Phone, Mail, Shield, X } from "lucide-react";

type Provider = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  categories: string[];
  insurance_expiration: string | null;
  is_active: boolean;
  notes: string | null;
  internal_rate_percent: number;
  created_at: string;
};

const CATEGORY_OPTIONS = [
  "landscaping", "masonry", "driveways", "cleanup",
  "power-washing", "mulching", "grading", "paving",
];

export default function ProvidersClient() {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Partial<Provider> | null>(null);
  const [saving, setSaving] = useState(false);

  const fetchProviders = async () => {
    const res = await fetch("/api/admin/providers");
    const data = await res.json();
    setProviders(data.providers || []);
    setLoading(false);
  };

  useEffect(() => { fetchProviders(); }, []);

  const handleSave = async () => {
    if (!editing?.name?.trim()) return;
    setSaving(true);
    await fetch("/api/admin/providers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editing),
    });
    setEditing(null);
    setSaving(false);
    fetchProviders();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this provider?")) return;
    await fetch("/api/admin/providers", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    fetchProviders();
  };

  const toggleCategory = (cat: string) => {
    if (!editing) return;
    const cats = editing.categories || [];
    setEditing({
      ...editing,
      categories: cats.includes(cat)
        ? cats.filter((c) => c !== cat)
        : [...cats, cat],
    });
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold" style={{ fontFamily: "var(--font-display)" }}>
            Providers / Crews
          </h1>
          <p className="text-sm text-muted-foreground">
            Manage crews dispatched for Book-a-Crew bookings
          </p>
        </div>
        <Button onClick={() => setEditing({ name: "", categories: [], is_active: true, internal_rate_percent: 70 })}>
          <Plus className="h-4 w-4 mr-1" /> Add Provider
        </Button>
      </div>

      {loading ? (
        <p className="text-muted-foreground">Loading...</p>
      ) : providers.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <p>No providers yet. Add your first crew above.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {providers.map((p) => (
            <div key={p.id} className="border rounded-[0.625rem] p-4 flex items-start justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-bold">{p.name}</span>
                  {!p.is_active && <Badge variant="secondary">Inactive</Badge>}
                  {p.insurance_expiration && new Date(p.insurance_expiration) < new Date() && (
                    <Badge variant="destructive" className="text-xs">
                      <Shield className="h-3 w-3 mr-1" /> Insurance expired
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                  {p.phone && <span className="flex items-center gap-1"><Phone className="h-3 w-3" /> {p.phone}</span>}
                  {p.email && <span className="flex items-center gap-1"><Mail className="h-3 w-3" /> {p.email}</span>}
                </div>
                {p.categories.length > 0 && (
                  <div className="flex gap-1 flex-wrap mt-1">
                    {p.categories.map((c) => (
                      <Badge key={c} variant="outline" className="text-xs">{c}</Badge>
                    ))}
                  </div>
                )}
                <div className="text-xs text-muted-foreground">
                  Rate: {p.internal_rate_percent}% · {p.notes || ""}
                </div>
              </div>
              <div className="flex gap-1">
                <Button size="sm" variant="ghost" onClick={() => setEditing(p)}>
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button size="sm" variant="ghost" className="text-red-600" onClick={() => handleDelete(p.id)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit/Add Modal */}
      {editing && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-card rounded-[0.625rem] p-6 w-full max-w-md space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-bold">{editing.id ? "Edit" : "Add"} Provider</h2>
              <button onClick={() => setEditing(null)}><X className="h-5 w-5" /></button>
            </div>

            <div>
              <label className="text-sm font-medium">Name *</label>
              <input
                value={editing.name || ""}
                onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                className="mt-1 w-full h-9 rounded-lg border px-3 text-sm"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium">Phone</label>
                <input
                  value={editing.phone || ""}
                  onChange={(e) => setEditing({ ...editing, phone: e.target.value })}
                  className="mt-1 w-full h-9 rounded-lg border px-3 text-sm"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Email</label>
                <input
                  value={editing.email || ""}
                  onChange={(e) => setEditing({ ...editing, email: e.target.value })}
                  className="mt-1 w-full h-9 rounded-lg border px-3 text-sm"
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium">Categories</label>
              <div className="flex flex-wrap gap-1.5 mt-1">
                {CATEGORY_OPTIONS.map((c) => (
                  <button
                    key={c}
                    onClick={() => toggleCategory(c)}
                    className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                      (editing.categories || []).includes(c)
                        ? "bg-primary text-primary-foreground border-primary"
                        : "border-border hover:bg-muted"
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium">Insurance Expiration</label>
                <input
                  type="date"
                  value={editing.insurance_expiration || ""}
                  onChange={(e) => setEditing({ ...editing, insurance_expiration: e.target.value })}
                  className="mt-1 w-full h-9 rounded-lg border px-3 text-sm"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Rate %</label>
                <input
                  type="number"
                  value={editing.internal_rate_percent ?? 70}
                  onChange={(e) => setEditing({ ...editing, internal_rate_percent: Number(e.target.value) })}
                  className="mt-1 w-full h-9 rounded-lg border px-3 text-sm"
                  min={0}
                  max={100}
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium">Notes</label>
              <textarea
                value={editing.notes || ""}
                onChange={(e) => setEditing({ ...editing, notes: e.target.value })}
                className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
                rows={2}
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={editing.is_active ?? true}
                onChange={(e) => setEditing({ ...editing, is_active: e.target.checked })}
                id="active"
              />
              <label htmlFor="active" className="text-sm">Active</label>
            </div>

            <div className="flex gap-2 pt-2">
              <Button onClick={handleSave} disabled={saving || !editing.name?.trim()} className="flex-1">
                {saving ? "Saving..." : "Save"}
              </Button>
              <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
