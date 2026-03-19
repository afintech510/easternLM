"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Phone, Mail, MapPin, Plus, Calendar, AlertCircle,
  Loader2, Search, ArrowRight, MessageSquare,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { formatUsd } from "@/lib/format";

type Lead = {
  id: string;
  lead_number: string | null;
  name: string;
  phone: string;
  email: string | null;
  address: string | null;
  town: string | null;
  service_type: string;
  description: string | null;
  timeline: string | null;
  status: string;
  priority: string | null;
  source: string | null;
  estimated_value_cents: number | null;
  assigned_to: string | null;
  assigned_contractors: string[];
  created_at: string;
  next_follow_up: string | null;
  follow_up_count: number;
};

const STATUSES = ["new", "assigned", "contacted", "site_visit", "quoted", "won", "lost"];
const STATUS_CFG: Record<string, { label: string; color: string }> = {
  new: { label: "New", color: "bg-blue-100 text-blue-700" },
  assigned: { label: "Assigned", color: "bg-purple-100 text-purple-700" },
  contacted: { label: "Contacted", color: "bg-cyan-100 text-cyan-700" },
  site_visit: { label: "Site Visit", color: "bg-amber-100 text-amber-700" },
  quoted: { label: "Quoted", color: "bg-orange-100 text-orange-700" },
  scheduled: { label: "Scheduled", color: "bg-teal-100 text-teal-700" },
  completed: { label: "Completed", color: "bg-green-100 text-green-700" },
  won: { label: "Won", color: "bg-green-100 text-green-700" },
  lost: { label: "Lost", color: "bg-red-100 text-red-700" },
};

const PRIORITY_DOT: Record<string, string> = {
  urgent: "bg-red-500", high: "bg-amber-500", normal: "bg-zinc-400", low: "bg-zinc-300",
};

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [stats, setStats] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [view, setView] = useState<"board" | "list">("board");
  const [showCreate, setShowCreate] = useState(false);

  // Create form
  const [newName, setNewName] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newService, setNewService] = useState("driveways");
  const [newDesc, setNewDesc] = useState("");
  const [newTimeline, setNewTimeline] = useState("this-month");
  const [newPriority, setNewPriority] = useState("normal");
  const [creating, setCreating] = useState(false);

  async function loadLeads() {
    setLoading(true);
    const params = filter !== "all" ? `?status=${filter}` : "";
    const r = await fetch(`/api/admin/leads${params}`);
    if (r.ok) {
      const d = await r.json();
      setLeads(d.leads ?? []);
      setStats(d.stats ?? {});
    }
    setLoading(false);
  }

  useEffect(() => { loadLeads(); }, [filter]);

  async function createLead() {
    if (!newName || !newPhone) return;
    setCreating(true);
    await fetch("/api/admin/leads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: newName, phone: newPhone, service_type: newService,
        description: newDesc, timeline: newTimeline, priority: newPriority,
      }),
    });
    setCreating(false);
    setShowCreate(false);
    setNewName(""); setNewPhone(""); setNewDesc("");
    loadLeads();
  }

  const filtered = search
    ? leads.filter((l) => l.name.toLowerCase().includes(search.toLowerCase()) || l.phone.includes(search) || (l.town ?? "").toLowerCase().includes(search.toLowerCase()))
    : leads;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="[font-family:var(--font-display)] text-3xl text-primary">Service Leads</h1>
          <p className="text-sm text-muted-foreground">{stats.total ?? 0} leads &middot; Pipeline: {formatUsd(stats.pipeline_value ?? 0)}</p>
        </div>
        <div className="flex gap-2">
          <div className="flex rounded-lg border overflow-hidden">
            <button onClick={() => setView("board")} className={`px-3 py-1.5 text-sm font-medium ${view === "board" ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground"}`}>Board</button>
            <button onClick={() => setView("list")} className={`px-3 py-1.5 text-sm font-medium ${view === "list" ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground"}`}>List</button>
          </div>
          <Button onClick={() => setShowCreate(true)}><Plus className="size-4 mr-1" /> New Lead</Button>
        </div>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-4 gap-3 sm:grid-cols-7">
        {STATUSES.map((s) => {
          const cfg = STATUS_CFG[s] ?? STATUS_CFG.new;
          const count = s === "won" ? (stats.won ?? 0) : (stats[s] ?? 0);
          return (
            <button key={s} onClick={() => setFilter(filter === s ? "all" : s)}
              className={`rounded-lg border p-3 text-center transition-colors ${filter === s ? "border-accent bg-accent/5" : "hover:border-muted-foreground/30"}`}>
              <p className="text-lg font-bold">{count}</p>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{cfg.label}</p>
            </button>
          );
        })}
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search leads…" className="pl-9" />
      </div>

      {/* Create lead form */}
      {showCreate && (
        <div className="rounded-xl border bg-card p-5 space-y-3">
          <h3 className="font-semibold">New Service Lead</h3>
          <div className="grid gap-3 sm:grid-cols-3">
            <Input placeholder="Customer name *" value={newName} onChange={(e) => setNewName(e.target.value)} />
            <Input placeholder="Phone *" value={newPhone} onChange={(e) => setNewPhone(e.target.value)} />
            <select value={newService} onChange={(e) => setNewService(e.target.value)} className="rounded-md border bg-background px-3 py-2 text-sm">
              <option value="driveways">Driveways</option>
              <option value="landscaping">Landscaping</option>
              <option value="masonry">Masonry</option>
              <option value="property-maintenance">Property Maintenance</option>
              <option value="other">Other</option>
            </select>
          </div>
          <textarea value={newDesc} onChange={(e) => setNewDesc(e.target.value)} placeholder="Description / notes" rows={2}
            className="w-full rounded-md border bg-background px-3 py-2 text-sm" />
          <div className="grid gap-3 sm:grid-cols-3">
            <select value={newTimeline} onChange={(e) => setNewTimeline(e.target.value)} className="rounded-md border bg-background px-3 py-2 text-sm">
              <option value="asap">ASAP</option>
              <option value="this-week">This Week</option>
              <option value="this-month">This Month</option>
              <option value="spring">Spring</option>
              <option value="flexible">Flexible</option>
            </select>
            <select value={newPriority} onChange={(e) => setNewPriority(e.target.value)} className="rounded-md border bg-background px-3 py-2 text-sm">
              <option value="urgent">Urgent</option>
              <option value="high">High</option>
              <option value="normal">Normal</option>
              <option value="low">Low</option>
            </select>
          </div>
          <div className="flex gap-2">
            <Button onClick={createLead} disabled={creating || !newName || !newPhone}>{creating ? "Creating..." : "Create Lead"}</Button>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
          </div>
        </div>
      )}

      {/* Board view (kanban) */}
      {view === "board" && !loading && (
        <div className="flex gap-3 overflow-x-auto pb-4">
          {STATUSES.map((status) => {
            const cfg = STATUS_CFG[status] ?? STATUS_CFG.new;
            const columnLeads = filtered.filter((l) => l.status === status || (status === "won" && l.status === "completed"));
            return (
              <div key={status} className="w-72 shrink-0 rounded-xl border bg-card">
                <div className="border-b px-3 py-2.5 flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{cfg.label}</span>
                  <Badge variant="secondary" className="text-xs">{columnLeads.length}</Badge>
                </div>
                <div className="space-y-2 p-2 min-h-[100px]">
                  {columnLeads.map((lead) => (
                    <LeadCard key={lead.id} lead={lead} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* List view */}
      {view === "list" && !loading && (
        <div className="rounded-lg border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/30">
              <tr>
                <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">#</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">Customer</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">Service</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">Town</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">Priority</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">Status</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filtered.map((lead) => {
                const cfg = STATUS_CFG[lead.status] ?? STATUS_CFG.new;
                return (
                  <tr key={lead.id} className="hover:bg-muted/20">
                    <td className="px-3 py-2 font-mono text-xs text-muted-foreground">{lead.lead_number ?? "—"}</td>
                    <td className="px-3 py-2">
                      <p className="font-medium">{lead.name}</p>
                      <p className="text-xs text-muted-foreground">{lead.phone}</p>
                    </td>
                    <td className="px-3 py-2 text-muted-foreground">{lead.service_type}</td>
                    <td className="px-3 py-2 text-muted-foreground">{lead.town ?? "—"}</td>
                    <td className="px-3 py-2">
                      <span className={`inline-block size-2.5 rounded-full ${PRIORITY_DOT[lead.priority ?? "normal"]}`} />
                    </td>
                    <td className="px-3 py-2"><Badge className={`text-xs ${cfg.color}`}>{cfg.label}</Badge></td>
                    <td className="px-3 py-2 text-xs text-muted-foreground">{new Date(lead.created_at).toLocaleDateString()}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {loading && <div className="py-20 text-center"><Loader2 className="mx-auto size-6 animate-spin text-muted-foreground" /></div>}
    </div>
  );
}

function LeadCard({ lead }: { lead: Lead }) {
  const cfg = STATUS_CFG[lead.status] ?? STATUS_CFG.new;
  const daysSince = Math.floor((Date.now() - new Date(lead.created_at).getTime()) / 86400000);

  return (
    <div className="rounded-lg border bg-background p-3 space-y-1.5 hover:border-accent/30 transition-colors">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-mono text-muted-foreground">{lead.lead_number}</p>
          <p className="text-sm font-semibold">{lead.name}</p>
        </div>
        <span className={`size-2.5 rounded-full ${PRIORITY_DOT[lead.priority ?? "normal"]}`} />
      </div>
      <p className="text-xs text-muted-foreground">{lead.service_type} &middot; {lead.town ?? "—"}</p>
      {lead.description && <p className="text-xs text-muted-foreground line-clamp-2">{lead.description}</p>}
      <div className="flex items-center justify-between pt-1">
        <span className="text-[10px] text-muted-foreground">{daysSince}d ago</span>
        <div className="flex gap-1">
          <a href={`tel:${lead.phone}`} className="rounded p-1 hover:bg-muted"><Phone className="size-3 text-muted-foreground" /></a>
          <a href={`sms:${lead.phone}`} className="rounded p-1 hover:bg-muted"><MessageSquare className="size-3 text-muted-foreground" /></a>
        </div>
      </div>
    </div>
  );
}
