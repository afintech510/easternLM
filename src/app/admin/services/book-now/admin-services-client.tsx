"use client";

import { useCallback, useEffect, useState } from "react";
import { Edit2, Loader2, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { InstantBookService, ServicePricing } from "@/lib/book-now/types";
import { getServiceSchema } from "@/lib/book-now/schemas";
import { formatUsd } from "@/lib/book-now/pricing";

const CATEGORIES = ["install", "cleanup", "maintenance", "washing", "masonry"];

type ServiceDraft = Partial<InstantBookService> & { pricing: ServicePricing };

export function AdminServicesClient() {
  const [services, setServices] = useState<InstantBookService[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<ServiceDraft | null>(null);

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

  function priceSummary(s: InstantBookService): string {
    const p = s.pricing || ({} as ServicePricing);
    if (p.tiers) {
      return Object.entries(p.tiers).map(([k, v]) => `${k}: ${formatUsd(v as number)}`).join(" · ");
    }
    const parts: string[] = [];
    if (p.base_cents) parts.push(`base ${formatUsd(p.base_cents)}`);
    if (p.per_unit_cents) parts.push(`+${formatUsd(p.per_unit_cents)}/unit`);
    if (p.min_total_cents) parts.push(`min ${formatUsd(p.min_total_cents)}`);
    if (p.flat_cents) parts.push(`flat ${formatUsd(p.flat_cents)}`);
    return parts.join(" · ") || "—";
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Book-Now Services</h1>
        <p className="text-sm text-muted-foreground">
          Manage the Book-a-Crew service catalog. Toggle active/inactive for seasonality.
        </p>
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
                <th className="px-4 py-2 text-left font-medium">Mode</th>
                <th className="px-4 py-2 text-left font-medium">Pricing</th>
                <th className="px-4 py-2 text-left font-medium">Status</th>
                <th className="px-4 py-2 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {services.map((s) => {
                const schema = getServiceSchema(s.slug);
                return (
                  <tr key={s.id} className="border-b last:border-0">
                    <td className="px-4 py-3 text-muted-foreground">{s.sort_order}</td>
                    <td className="px-4 py-3">
                      <p className="font-medium">{s.name}</p>
                      <p className="text-xs text-muted-foreground">{s.slug}</p>
                    </td>
                    <td className="px-4 py-3">
                      {schema ? (
                        <span className="inline-flex rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
                          {schema.mode}
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">No schema</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {priceSummary(s)}
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
                      <Button size="sm" variant="ghost" onClick={() => setEditing({ ...s, pricing: s.pricing || {} })}>
                        <Edit2 className="size-3.5" />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => handleDelete(s)} className="text-destructive">
                        <Trash2 className="size-3.5" />
                      </Button>
                    </td>
                  </tr>
                );
              })}
              {services.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-10 text-center text-muted-foreground">
                  No services yet. Run the migration to seed the catalog.
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm">
        <p className="font-semibold text-amber-900">How pricing works</p>
        <p className="mt-1 text-amber-800">
          Each service has a pricing mode (<code>flat</code> / <code>tiered</code> / <code>per_unit</code> / <code>quote_only</code>) defined in code
          (<code>src/lib/book-now/schemas.ts</code>). The <strong>rates</strong> are editable here.
        </p>
      </div>

      {editing && <EditServiceModal service={editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); load(); }} />}
    </div>
  );
}

function EditServiceModal({
  service,
  onClose,
  onSaved,
}: {
  service: ServiceDraft;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<ServiceDraft>(service);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const schema = form.slug ? getServiceSchema(form.slug) : null;

  function updateField<K extends keyof InstantBookService>(key: K, value: InstantBookService[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function updatePricing<K extends keyof ServicePricing>(key: K, value: ServicePricing[K]) {
    setForm((prev) => ({ ...prev, pricing: { ...prev.pricing, [key]: value } }));
  }

  function updateTier(tierKey: string, cents: number) {
    setForm((prev) => ({
      ...prev,
      pricing: { ...prev.pricing, tiers: { ...(prev.pricing.tiers || {}), [tierKey]: cents } },
    }));
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/services/book-now", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
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

  const pricing = form.pricing;
  const tierKeys = schema?.inputs.find((i) => i.type === "tier")?.options?.map((o) => o.value) || [];

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
              <label className="mb-1 block text-sm font-medium">Slug (matches code schema)</label>
              <input value={form.slug || ""} onChange={(e) => updateField("slug", e.target.value)}
                className="w-full rounded-md border px-3 py-2 text-sm font-mono" />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">Tagline</label>
            <input value={form.tagline || ""} onChange={(e) => updateField("tagline", e.target.value)}
              className="w-full rounded-md border px-3 py-2 text-sm" />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">Description</label>
            <textarea value={form.description || ""} onChange={(e) => updateField("description", e.target.value)}
              rows={2} className="w-full rounded-md border px-3 py-2 text-sm" />
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

          <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <p className="font-semibold text-sm">Pricing rates</p>
              {schema && (
                <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs text-blue-700">Mode: {schema.mode}</span>
              )}
            </div>

            {schema?.mode === "per_unit" && (
              <div className="grid gap-3 sm:grid-cols-3">
                <DollarInput label="Base fee" cents={pricing.base_cents || 0} onChange={(c) => updatePricing("base_cents", c)} />
                <DollarInput label="Per-unit rate" cents={pricing.per_unit_cents || 0} onChange={(c) => updatePricing("per_unit_cents", c)} />
                <DollarInput label="Minimum total" cents={pricing.min_total_cents || 0} onChange={(c) => updatePricing("min_total_cents", c)} />
              </div>
            )}

            {schema?.mode === "tiered" && (
              <div className="space-y-2">
                {tierKeys.map((key) => (
                  <DollarInput
                    key={key}
                    label={key}
                    cents={pricing.tiers?.[key] || 0}
                    onChange={(c) => updateTier(key, c)}
                  />
                ))}
              </div>
            )}

            {schema?.mode === "flat" && (
              <DollarInput label="Flat price" cents={pricing.flat_cents || 0} onChange={(c) => updatePricing("flat_cents", c)} />
            )}

            {schema?.mode === "quote_only" && (
              <p className="text-sm text-muted-foreground italic">This service routes to the custom-quote form. No pricing fields.</p>
            )}

            {!schema && (
              <p className="text-sm text-amber-700">
                ⚠️ No code schema for <code>{form.slug}</code>. Add one in <code>src/lib/book-now/schemas.ts</code> before this service can render.
              </p>
            )}
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium">Season start month (1-12)</label>
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

          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={!!form.is_active}
              onChange={(e) => updateField("is_active", e.target.checked)}
              className="size-4" />
            Active (visible to customers)
          </label>

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

function DollarInput({ label, cents, onChange }: { label: string; cents: number; onChange: (cents: number) => void }) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium capitalize">{label}</label>
      <div className="relative">
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">$</span>
        <input
          type="number"
          step="0.01"
          min={0}
          value={(cents / 100).toFixed(2)}
          onChange={(e) => onChange(Math.round(parseFloat(e.target.value || "0") * 100))}
          className="w-full rounded-md border bg-background py-2 pl-7 pr-3 text-sm"
        />
      </div>
    </div>
  );
}
