"use client";

import { useEffect, useState } from "react";
import { Loader2, Plus, Trash2, CheckCircle, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

interface PromoCode {
  id: string;
  code: string;
  description: string | null;
  discount_type: "percent" | "fixed";
  discount_value: number;
  min_order_cents: number;
  max_uses: number | null;
  used_count: number;
  valid_from: string | null;
  valid_until: string | null;
  is_active: boolean;
  created_at: string;
}

export default function PromoCodesPage() {
  const [codes, setCodes] = useState<PromoCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [saving, setSaving] = useState(false);

  // New code form
  const [newCode, setNewCode] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newType, setNewType] = useState<"percent" | "fixed">("percent");
  const [newValue, setNewValue] = useState("5");
  const [newMaxUses, setNewMaxUses] = useState("");
  const [newValidUntil, setNewValidUntil] = useState("");

  async function load() {
    setLoading(true);
    const res = await fetch("/api/admin/promo-codes");
    if (res.ok) {
      const data = await res.json();
      setCodes(data.codes ?? []);
    }
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function create() {
    if (!newCode.trim()) return;
    setSaving(true);
    const res = await fetch("/api/admin/promo-codes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        code: newCode,
        description: newDesc || null,
        discount_type: newType,
        discount_value: parseFloat(newValue),
        max_uses: newMaxUses ? parseInt(newMaxUses) : null,
        valid_until: newValidUntil || null,
      }),
    });
    if (res.ok) {
      setShowNew(false);
      setNewCode(""); setNewDesc(""); setNewValue("5"); setNewMaxUses(""); setNewValidUntil("");
      await load();
    } else {
      const d = await res.json();
      alert(d.error || "Failed to create");
    }
    setSaving(false);
  }

  async function toggleActive(id: string, isActive: boolean) {
    await fetch("/api/admin/promo-codes", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, is_active: !isActive }),
    });
    await load();
  }

  const active = codes.filter((c) => c.is_active);
  const inactive = codes.filter((c) => !c.is_active);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Promo Codes</h1>
          <p className="text-sm text-muted-foreground">
            Manage discount codes for web checkout
          </p>
        </div>
        <Button onClick={() => setShowNew(true)}>
          <Plus className="mr-2 size-4" /> New Code
        </Button>
      </div>

      {/* Create form */}
      {showNew && (
        <div className="rounded-lg border bg-card p-5 space-y-4">
          <h3 className="font-semibold">Create Promo Code</h3>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Code</label>
              <Input value={newCode} onChange={(e) => setNewCode(e.target.value.toUpperCase())} placeholder="SPRING25" />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Description</label>
              <Input value={newDesc} onChange={(e) => setNewDesc(e.target.value)} placeholder="Spring 2026 promo" />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Discount Type</label>
              <select value={newType} onChange={(e) => setNewType(e.target.value as "percent" | "fixed")} className="w-full rounded-md border px-3 py-2 text-sm bg-background">
                <option value="percent">Percentage (%)</option>
                <option value="fixed">Fixed Amount ($)</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">
                Discount Value {newType === "percent" ? "(%)" : "($)"}
              </label>
              <Input type="number" value={newValue} onChange={(e) => setNewValue(e.target.value)} placeholder="5" />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Max Uses (blank = unlimited)</label>
              <Input type="number" value={newMaxUses} onChange={(e) => setNewMaxUses(e.target.value)} placeholder="100" />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Expires (blank = never)</label>
              <Input type="date" value={newValidUntil} onChange={(e) => setNewValidUntil(e.target.value)} />
            </div>
          </div>
          <div className="flex gap-2">
            <Button onClick={create} disabled={saving || !newCode.trim()}>
              {saving ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
              Create Code
            </Button>
            <Button variant="outline" onClick={() => setShowNew(false)}>Cancel</Button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="size-5 animate-spin" /></div>
      ) : codes.length === 0 ? (
        <div className="rounded-lg border bg-muted/50 p-8 text-center">
          <p className="text-muted-foreground">No promo codes yet. Create one to get started.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Active codes */}
          {active.length > 0 && (
            <div className="rounded-lg border overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted/30">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Code</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Discount</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Description</th>
                    <th className="px-4 py-3 text-center font-medium text-muted-foreground">Uses</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Expires</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {active.map((c) => (
                    <tr key={c.id} className="hover:bg-muted/20">
                      <td className="px-4 py-3">
                        <span className="font-mono font-semibold">{c.code}</span>
                      </td>
                      <td className="px-4 py-3">
                        <Badge className="bg-green-100 text-green-700">
                          {c.discount_type === "percent" ? `${c.discount_value}% off` : `$${c.discount_value} off`}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground text-xs">{c.description || "—"}</td>
                      <td className="px-4 py-3 text-center">
                        <span className="font-medium">{c.used_count}</span>
                        {c.max_uses && <span className="text-muted-foreground"> / {c.max_uses}</span>}
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {c.valid_until ? new Date(c.valid_until).toLocaleDateString() : "Never"}
                      </td>
                      <td className="px-4 py-3">
                        <Button variant="ghost" size="sm" onClick={() => toggleActive(c.id, c.is_active)}>
                          <XCircle className="size-4 text-red-400" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Inactive codes */}
          {inactive.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-2">Inactive ({inactive.length})</h3>
              <div className="rounded-lg border overflow-hidden opacity-60">
                <table className="w-full text-sm">
                  <tbody className="divide-y">
                    {inactive.map((c) => (
                      <tr key={c.id}>
                        <td className="px-4 py-2 font-mono line-through">{c.code}</td>
                        <td className="px-4 py-2 text-xs text-muted-foreground">{c.description || "—"}</td>
                        <td className="px-4 py-2 text-center text-xs">{c.used_count} uses</td>
                        <td className="px-4 py-2">
                          <Button variant="ghost" size="sm" onClick={() => toggleActive(c.id, c.is_active)}>
                            <CheckCircle className="size-4 text-green-400" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
