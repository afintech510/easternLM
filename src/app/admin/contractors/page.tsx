"use client";

import { useEffect, useState } from "react";
import { Loader2, Plus, Phone, Mail, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

type Contractor = {
  id: string;
  name: string;
  company_name: string | null;
  phone: string;
  email: string | null;
  service_types: string[];
  max_active_leads: number;
  current_active_leads: number;
  total_leads_assigned: number;
  total_leads_won: number;
  win_rate: number | null;
  is_active: boolean;
};

const SERVICES = ["driveways", "landscaping", "masonry", "property-maintenance"];

export default function ContractorsPage() {
  const [contractors, setContractors] = useState<Contractor[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name: "", company_name: "", phone: "", email: "", service_types: [] as string[], notes: "" });
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    const r = await fetch("/api/admin/contractors");
    if (r.ok) setContractors((await r.json()).contractors ?? []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function addContractor() {
    if (!form.name || !form.phone) return;
    setSaving(true);
    await fetch("/api/admin/contractors", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setSaving(false);
    setShowAdd(false);
    setForm({ name: "", company_name: "", phone: "", email: "", service_types: [], notes: "" });
    load();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="[font-family:var(--font-display)] text-3xl text-primary">Contractors</h1>
          <p className="text-sm text-muted-foreground">Manage contractors who receive lead assignments via SMS.</p>
        </div>
        <Button onClick={() => setShowAdd(true)}><Plus className="size-4 mr-1" /> Add Contractor</Button>
      </div>

      {showAdd && (
        <div className="rounded-xl border bg-card p-5 space-y-3">
          <h3 className="font-semibold">New Contractor</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <Input placeholder="Name *" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <Input placeholder="Company" value={form.company_name} onChange={(e) => setForm({ ...form, company_name: e.target.value })} />
            <Input placeholder="Phone *" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            <Input placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Specialties</label>
            <div className="flex gap-2 mt-1">
              {SERVICES.map((s) => (
                <label key={s} className="flex items-center gap-1.5 text-sm">
                  <input type="checkbox" checked={form.service_types.includes(s)}
                    onChange={(e) => setForm({ ...form, service_types: e.target.checked ? [...form.service_types, s] : form.service_types.filter((t) => t !== s) })}
                    className="accent-accent" />
                  {s}
                </label>
              ))}
            </div>
          </div>
          <div className="flex gap-2">
            <Button onClick={addContractor} disabled={saving || !form.name || !form.phone}>{saving ? "Saving..." : "Add Contractor"}</Button>
            <Button variant="outline" onClick={() => setShowAdd(false)}>Cancel</Button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="py-20 text-center"><Loader2 className="mx-auto size-6 animate-spin text-muted-foreground" /></div>
      ) : contractors.length === 0 ? (
        <p className="py-16 text-center text-muted-foreground">No contractors yet. Add one to start assigning leads.</p>
      ) : (
        <div className="rounded-lg border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/30">
              <tr>
                <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Name</th>
                <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Specialties</th>
                <th className="px-4 py-2.5 text-right text-xs font-medium text-muted-foreground">Active Leads</th>
                <th className="px-4 py-2.5 text-right text-xs font-medium text-muted-foreground">Assigned</th>
                <th className="px-4 py-2.5 text-right text-xs font-medium text-muted-foreground">Won</th>
                <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Contact</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {contractors.map((c) => (
                <tr key={c.id} className={`hover:bg-muted/20 ${!c.is_active ? "opacity-50" : ""}`}>
                  <td className="px-4 py-3">
                    <p className="font-medium">{c.name}</p>
                    {c.company_name && <p className="text-xs text-muted-foreground">{c.company_name}</p>}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {c.service_types.map((s) => <Badge key={s} variant="outline" className="text-[10px]">{s}</Badge>)}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right font-medium">{c.current_active_leads} / {c.max_active_leads}</td>
                  <td className="px-4 py-3 text-right text-muted-foreground">{c.total_leads_assigned}</td>
                  <td className="px-4 py-3 text-right text-muted-foreground">{c.total_leads_won}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <a href={`tel:${c.phone}`} className="text-muted-foreground hover:text-accent"><Phone className="size-4" /></a>
                      {c.email && <a href={`mailto:${c.email}`} className="text-muted-foreground hover:text-accent"><Mail className="size-4" /></a>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
